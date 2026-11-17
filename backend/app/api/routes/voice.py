from __future__ import annotations

import asyncio
import json
import uuid
from typing import Annotated

import jwt
import numpy as np
from fastapi import APIRouter, Depends, File, Request, UploadFile, WebSocket, WebSocketDisconnect

from app.core.config import get_settings
from app.core.dependencies import CurrentUser, enforce_rate_limit, get_storage
from app.core.errors import AppError
from app.core.security import create_voice_ticket, decode_token
from app.db.models import User
from app.db.session import async_session_factory
from app.providers.voice import VoiceAnalysis, encode_embedding, get_voice_provider
from app.schemas.voice import VoiceAnalysisResponse, VoiceTicketResponse
from app.services.audio import decode_to_mono16k, resample_linear
from app.services.storage import LocalStorage

router = APIRouter(prefix="/voice", tags=["voice"])
ws_router = APIRouter(prefix="/ws", tags=["voice"])

TARGET_RATE = 16_000
MAX_SECONDS = 30
PROGRESS_SAMPLES = int(1.5 * TARGET_RATE)


def _analysis_response(analysis: VoiceAnalysis) -> VoiceAnalysisResponse:
    return VoiceAnalysisResponse(
        score=analysis.score,
        speech_seconds=analysis.speech_seconds,
        snr_db=analysis.snr_db,
        stability=analysis.stability,
        embedding=encode_embedding(analysis.embedding),
        dimension=analysis.dimension,
        provider=analysis.provider,
        ready=analysis.ready,
        status=analysis.status,
        warnings=analysis.warnings,
    )


@router.post("/ws-ticket", response_model=VoiceTicketResponse)
async def create_ticket(request: Request, user: CurrentUser) -> VoiceTicketResponse:
    await enforce_rate_limit(request, "voice:ticket", limit=30, window_seconds=60, identifier=str(user.id))
    return VoiceTicketResponse(ticket=create_voice_ticket(user.id))


@router.post("/analyze", response_model=VoiceAnalysisResponse)
async def analyze_upload(
    request: Request,
    user: CurrentUser,
    storage: Annotated[LocalStorage, Depends(get_storage)],
    file: UploadFile = File(...),
) -> VoiceAnalysisResponse:
    await enforce_rate_limit(request, "voice:analyze", limit=10, window_seconds=60, identifier=str(user.id))
    settings = get_settings()
    saved = await storage.save_upload(file, kind="audio", max_bytes=settings.max_audio_bytes)
    try:
        samples = await asyncio.to_thread(decode_to_mono16k, saved.path)
        if samples.size == 0:
            raise AppError(422, "EMPTY_AUDIO", "Audio kosong", "Tidak ada sampel audio.")
        provider = get_voice_provider(settings)
        analysis = await asyncio.to_thread(provider.analyze, samples, TARGET_RATE)
        return _analysis_response(analysis)
    finally:
        storage.delete_relative(saved.relative_path)


async def _close_with_error(websocket: WebSocket, code: int, message: str) -> None:
    try:
        await websocket.send_json({"type": "error", "code": code, "message": message})
    except Exception:
        pass
    try:
        await websocket.close(code=code)
    except Exception:
        pass


async def _authenticate_ws(websocket: WebSocket) -> uuid.UUID | None:
    ticket = websocket.query_params.get("ticket")
    if not ticket:
        await websocket.close(code=4401)
        return None
    try:
        payload = decode_token(ticket, expected_type="voice")
        user_id = uuid.UUID(str(payload["sub"]))
    except (jwt.InvalidTokenError, ValueError, KeyError):
        await websocket.close(code=4401)
        return None

    origin = websocket.headers.get("origin")
    settings = get_settings()
    if origin and origin not in settings.cors_origins:
        await websocket.close(code=4403)
        return None

    async with async_session_factory() as db:
        user = await db.get(User, user_id)
        if user is None or not user.is_active:
            await websocket.close(code=4401)
            return None
    return user_id


@ws_router.websocket("/voice-calibration")
async def voice_calibration(websocket: WebSocket) -> None:
    user_id = await _authenticate_ws(websocket)
    if user_id is None:
        return
    await websocket.accept()

    settings = get_settings()
    provider = get_voice_provider(settings)
    chunks: list[np.ndarray] = []
    total_samples = 0
    last_analysis_total = 0
    input_rate = TARGET_RATE
    max_samples = MAX_SECONDS * TARGET_RATE

    await websocket.send_json(
        {
            "type": "ready",
            "sample_rate": TARGET_RATE,
            "provider": provider.name,
            "max_seconds": MAX_SECONDS,
        }
    )

    try:
        while True:
            message = await websocket.receive()
            if message["type"] == "websocket.disconnect":
                return

            if "text" in message and message["text"] is not None:
                try:
                    payload = json.loads(message["text"])
                except json.JSONDecodeError:
                    await _close_with_error(websocket, 4422, "Payload JSON tidak valid.")
                    return
                action = payload.get("type")
                if action == "start":
                    try:
                        input_rate = int(payload.get("sample_rate", TARGET_RATE))
                    except (TypeError, ValueError):
                        input_rate = TARGET_RATE
                    input_rate = max(8000, min(input_rate, 48000))
                    await websocket.send_json({"type": "started", "sample_rate": TARGET_RATE})
                    continue
                if action in {"finalize", "stop"}:
                    if not chunks:
                        await _close_with_error(websocket, 4422, "Belum ada audio yang direkam.")
                        return
                    samples = np.concatenate(chunks)
                    if samples.size < TARGET_RATE:
                        await _close_with_error(
                            websocket, 4422, "Rekam minimal 1 detik sebelum menyelesaikan."
                        )
                        return
                    analysis = await asyncio.to_thread(provider.analyze, samples, TARGET_RATE)
                    result = _analysis_response(analysis).model_dump()
                    await websocket.send_json({"type": "final", **result})
                    await websocket.close()
                    return
                if action == "ping":
                    await websocket.send_json({"type": "pong"})
                    continue
                await _close_with_error(websocket, 4422, "Aksi tidak dikenal.")
                return

            data = message.get("bytes")
            if not data:
                continue
            if len(data) > 1_000_000:
                await _close_with_error(websocket, 4422, "Frame audio terlalu besar.")
                return
            frame = np.frombuffer(data, dtype=np.float32).astype(np.float32, copy=True)
            if input_rate != TARGET_RATE:
                frame = resample_linear(frame, input_rate, TARGET_RATE)
            if frame.size == 0:
                continue
            chunks.append(frame)
            total_samples += frame.size

            if total_samples > max_samples:
                joined = np.concatenate(chunks)[-max_samples:]
                chunks = [joined]
                total_samples = joined.size
                last_analysis_total = max(0, total_samples - PROGRESS_SAMPLES)

            if total_samples - last_analysis_total >= PROGRESS_SAMPLES:
                window = np.concatenate(chunks)[-4 * TARGET_RATE :]
                analysis = await asyncio.to_thread(provider.analyze, window, TARGET_RATE)
                await websocket.send_json(
                    {
                        "type": "progress",
                        "percentage": analysis.score,
                        "speech_seconds": analysis.speech_seconds,
                        "snr_db": analysis.snr_db,
                        "stability": analysis.stability,
                        "status": analysis.status,
                        "ready": analysis.ready,
                        "provider": analysis.provider,
                        "warnings": analysis.warnings,
                    }
                )
                last_analysis_total = total_samples
    except WebSocketDisconnect:
        return
    except ValueError as exc:
        await _close_with_error(websocket, 4422, str(exc))
    except Exception as exc:
        await _close_with_error(websocket, 1011, f"Gagal menganalisis suara: {exc}")
