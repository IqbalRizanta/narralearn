from __future__ import annotations

import base64
import re
import uuid
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, Query, Request, Response, UploadFile, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.core.dependencies import (
    CurrentUser,
    DbSession,
    enforce_rate_limit,
    get_queue,
    get_storage,
    require_consent,
)
from app.core.errors import AppError, ConflictError, NotFoundError, ProviderUnavailableError
from app.db.models import (
    GeneratedModule,
    JobStatus,
    JobType,
    ProcessingJob,
    SessionStatus,
    SourceType,
    StudySession,
    StyleMode,
    utcnow,
)
from app.schemas.auth import MessageResponse
from app.schemas.jobs import JobOut
from app.schemas.sessions import (
    SessionCreateResponse,
    SessionListItem,
    SessionListResponse,
    SessionOut,
    SessionUpdateRequest,
)
from app.services.queue import TaskQueue
from app.services.storage import LocalStorage

router = APIRouter(prefix="/sessions", tags=["sessions"])

_GLOSSARY_SPLIT = re.compile(r"[,\n;]+")


def _encode_cursor(created_at: datetime, session_id: uuid.UUID) -> str:
    raw = f"{created_at.isoformat()}|{session_id}"
    return base64.urlsafe_b64encode(raw.encode("utf-8")).decode("ascii").rstrip("=")


def _decode_cursor(cursor: str) -> tuple[datetime, uuid.UUID]:
    try:
        padded = cursor + "=" * (-len(cursor) % 4)
        raw = base64.urlsafe_b64decode(padded.encode("ascii")).decode("utf-8")
        timestamp, identifier = raw.split("|", 1)
        parsed = datetime.fromisoformat(timestamp)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=UTC)
        return parsed, uuid.UUID(identifier)
    except Exception as exc:
        raise AppError(400, "INVALID_CURSOR", "Cursor tidak valid", "Cursor pagination rusak.") from exc


def _latest_job(session: StudySession) -> ProcessingJob | None:
    if not session.jobs:
        return None
    return max(session.jobs, key=lambda job: job.created_at)


def _parse_glossary(raw: str | None) -> list[str]:
    if not raw:
        return []
    result: list[str] = []
    for part in _GLOSSARY_SPLIT.split(raw):
        value = " ".join(part.split()).strip()
        if value and value not in result:
            result.append(value[:60])
        if len(result) >= 20:
            break
    return result


def _validate_embedding(embedding: str | None) -> str | None:
    if not embedding:
        return None
    try:
        raw = base64.b64decode(embedding.encode("ascii"), validate=True)
    except Exception as exc:
        raise AppError(
            422,
            "INVALID_EMBEDDING",
            "Profil suara tidak valid",
            "Embedding harus berupa base64 dari Float32Array.",
        ) from exc
    if not raw or len(raw) % 4 != 0 or len(raw) > 4096:
        raise AppError(
            422,
            "INVALID_EMBEDDING",
            "Profil suara tidak valid",
            "Ukuran embedding tidak masuk akal.",
        )
    return embedding


async def _get_session(
    db: DbSession,
    user: CurrentUser,
    session_id: uuid.UUID,
    *,
    detail: bool = False,
) -> StudySession:
    stmt = select(StudySession).where(
        StudySession.id == session_id,
        StudySession.user_id == user.id,
    )
    if detail:
        stmt = stmt.options(
            selectinload(StudySession.documents),
            selectinload(StudySession.modules),
            selectinload(StudySession.jobs),
        )
    result = await db.execute(stmt)
    session = result.scalar_one_or_none()
    if session is None:
        raise NotFoundError("Sesi belajar tidak ditemukan.")
    return session


@router.post("", response_model=SessionCreateResponse, status_code=status.HTTP_202_ACCEPTED)
async def create_session(
    request: Request,
    user: CurrentUser,
    db: DbSession,
    storage: Annotated[LocalStorage, Depends(get_storage)],
    queue: Annotated[TaskQueue, Depends(get_queue)],
    title: Annotated[str, Form(min_length=1, max_length=200)],
    style_mode: Annotated[StyleMode, Form()] = StyleMode.CASUAL_STORY,
    speaker_label: Annotated[str | None, Form(max_length=100)] = None,
    glossary: Annotated[str | None, Form()] = None,
    embedding: Annotated[str | None, Form()] = None,
    audio: UploadFile | None = File(default=None),
    documents: list[UploadFile] | None = File(default=None),
) -> SessionCreateResponse:
    await enforce_rate_limit(request, "sessions:create", limit=10, window_seconds=300)
    require_consent(user)
    settings = get_settings()

    clean_title = " ".join(title.split())
    if not clean_title:
        raise AppError(422, "INVALID_TITLE", "Judul tidak valid", "Judul sesi wajib diisi.")
    if documents and len(documents) > settings.max_documents_per_session:
        raise AppError(
            422,
            "TOO_MANY_DOCUMENTS",
            "Terlalu banyak dokumen",
            f"Maksimal {settings.max_documents_per_session} dokumen per sesi.",
        )
    if audio is None and not documents:
        raise AppError(
            422,
            "NO_INPUT",
            "Materi kosong",
            "Unggah audio, dokumen, atau keduanya.",
        )

    idempotency_key = request.headers.get("Idempotency-Key")
    if idempotency_key:
        idempotency_key = idempotency_key.strip()[:100]
        existing = await db.scalar(
            select(ProcessingJob).where(ProcessingJob.idempotency_key == idempotency_key)
        )
        if existing is not None:
            if existing.user_id != user.id:
                raise ConflictError("Idempotency key sudah digunakan.", code="IDEMPOTENCY_CONFLICT")
            return SessionCreateResponse(session_id=existing.session_id, job_id=existing.id)

    embedding = _validate_embedding(embedding)
    saved_paths: list[str] = []
    job: ProcessingJob | None = None
    session: StudySession | None = None
    try:
        audio_saved = None
        if audio is not None:
            audio_saved = await storage.save_upload(
                audio, kind="audio", max_bytes=settings.max_audio_bytes
            )
            saved_paths.append(audio_saved.relative_path)

        documents_metadata: list[dict[str, object]] = []
        for upload in documents or []:
            saved = await storage.save_upload(
                upload, kind="document", max_bytes=settings.max_document_bytes
            )
            saved_paths.append(saved.relative_path)
            documents_metadata.append(
                {
                    "path": saved.relative_path,
                    "file_name": saved.original_name,
                    "mime_type": saved.mime_type,
                    "size_bytes": saved.size_bytes,
                }
            )

        if audio_saved is not None and documents_metadata:
            source_type = SourceType.HYBRID
        elif audio_saved is not None:
            source_type = SourceType.AUDIO
        else:
            source_type = SourceType.DOCUMENT

        session = StudySession(
            user_id=user.id,
            title=clean_title,
            speaker_label=" ".join(speaker_label.split()) if speaker_label else None,
            source_type=source_type,
            status=SessionStatus.QUEUED,
        )
        db.add(session)
        await db.flush()

        metadata = {
            "audio_path": audio_saved.relative_path if audio_saved else None,
            "document_paths": documents_metadata,
            "style_mode": style_mode.value,
            "speaker_label": session.speaker_label,
            "glossary": _parse_glossary(glossary),
            "embedding": embedding,
        }
        job = ProcessingJob(
            session_id=session.id,
            user_id=user.id,
            job_type=JobType.PROCESS_SESSION,
            status=JobStatus.QUEUED,
            progress=0,
            idempotency_key=idempotency_key or None,
            metadata_json=metadata,
        )
        db.add(job)
        await db.commit()
        await db.refresh(session)
        await db.refresh(job)
    except Exception:
        for path in saved_paths:
            storage.delete_relative(path)
        raise

    try:
        await queue.enqueue(JobType.PROCESS_SESSION, job.id)
    except Exception as exc:
        job.status = JobStatus.FAILED
        job.error_code = "QUEUE_UNAVAILABLE"
        job.error_message = "Antrean pemrosesan tidak tersedia."
        job.finished_at = utcnow()
        session.status = SessionStatus.FAILED
        session.error_code = "QUEUE_UNAVAILABLE"
        session.error_message = job.error_message
        await db.commit()
        for path in saved_paths:
            storage.delete_relative(path)
        raise ProviderUnavailableError(
            "Antrean pemrosesan tidak tersedia. Coba lagi beberapa saat."
        ) from exc

    return SessionCreateResponse(session_id=session.id, job_id=job.id)


@router.get("", response_model=SessionListResponse)
async def list_sessions(
    user: CurrentUser,
    db: DbSession,
    limit: Annotated[int, Query(ge=1, le=50)] = 20,
    cursor: Annotated[str | None, Query()] = None,
) -> SessionListResponse:
    module_count = (
        select(func.count(GeneratedModule.id))
        .where(GeneratedModule.session_id == StudySession.id)
        .correlate(StudySession)
        .scalar_subquery()
    )
    stmt = (
        select(StudySession, module_count.label("module_count"))
        .options(selectinload(StudySession.jobs))
        .where(StudySession.user_id == user.id)
        .order_by(StudySession.created_at.desc(), StudySession.id.desc())
        .limit(limit + 1)
    )
    if cursor:
        created_at, session_id = _decode_cursor(cursor)
        stmt = stmt.where(
            or_(
                StudySession.created_at < created_at,
                and_(StudySession.created_at == created_at, StudySession.id < session_id),
            )
        )

    rows = (await db.execute(stmt)).all()
    has_more = len(rows) > limit
    rows = rows[:limit]
    items: list[SessionListItem] = []
    for session, count in rows:
        latest = _latest_job(session)
        items.append(
            SessionListItem(
                id=session.id,
                title=session.title,
                speaker_label=session.speaker_label,
                source_type=session.source_type,
                status=session.status,
                error_code=session.error_code,
                audio_duration_seconds=session.audio_duration_seconds,
                created_at=session.created_at,
                updated_at=session.updated_at,
                module_count=int(count or 0),
                latest_job=JobOut.model_validate(latest) if latest else None,
            )
        )
    next_cursor = None
    if has_more and rows:
        last = rows[-1][0]
        next_cursor = _encode_cursor(last.created_at, last.id)
    return SessionListResponse(items=items, next_cursor=next_cursor)


@router.get("/{session_id}", response_model=SessionOut)
async def get_session(
    session_id: uuid.UUID,
    user: CurrentUser,
    db: DbSession,
) -> SessionOut:
    session = await _get_session(db, user, session_id, detail=True)
    latest = _latest_job(session)
    payload = SessionOut.model_validate(session)
    return payload.model_copy(
        update={"latest_job": JobOut.model_validate(latest) if latest else None}
    )


@router.patch("/{session_id}", response_model=SessionOut)
async def update_session(
    session_id: uuid.UUID,
    payload: SessionUpdateRequest,
    user: CurrentUser,
    db: DbSession,
) -> SessionOut:
    session = await _get_session(db, user, session_id, detail=True)
    if payload.title is None and payload.raw_transcript is None:
        raise AppError(
            422,
            "EMPTY_UPDATE",
            "Tidak ada perubahan",
            "Sertakan judul atau transkrip yang ingin diperbarui.",
        )
    if payload.title is not None:
        title = " ".join(payload.title.split())
        if not title:
            raise AppError(422, "INVALID_TITLE", "Judul tidak valid", "Judul sesi wajib diisi.")
        session.title = title
    if payload.raw_transcript is not None:
        cleaned = payload.raw_transcript.strip()
        if not cleaned and not session.documents:
            raise AppError(
                422,
                "EMPTY_TRANSCRIPT",
                "Transkrip kosong",
                "Sesi tanpa dokumen tidak boleh memiliki transkrip kosong.",
            )
        session.raw_transcript = cleaned or None
    await db.commit()
    await db.refresh(session)
    latest = _latest_job(session)
    result = SessionOut.model_validate(session)
    return result.model_copy(
        update={"latest_job": JobOut.model_validate(latest) if latest else None}
    )


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    session_id: uuid.UUID,
    user: CurrentUser,
    db: DbSession,
) -> Response:
    session = await _get_session(db, user, session_id)
    await db.delete(session)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


def _paths_from_metadata(metadata: dict | None) -> list[str]:
    if not metadata:
        return []
    paths: list[str] = []
    audio_path = metadata.get("audio_path")
    if isinstance(audio_path, str):
        paths.append(audio_path)
    for entry in metadata.get("document_paths", []) or []:
        if isinstance(entry, dict) and isinstance(entry.get("path"), str):
            paths.append(entry["path"])
    return paths


@router.post("/{session_id}/retry", response_model=SessionCreateResponse, status_code=202)
async def retry_session(
    session_id: uuid.UUID,
    user: CurrentUser,
    db: DbSession,
    storage: Annotated[LocalStorage, Depends(get_storage)],
    queue: Annotated[TaskQueue, Depends(get_queue)],
) -> SessionCreateResponse:
    session = await _get_session(db, user, session_id, detail=True)
    latest = _latest_job(session)
    if latest is None:
        raise NotFoundError("Job pemrosesan tidak ditemukan.")
    if session.status not in {SessionStatus.FAILED, SessionStatus.CANCELED} and latest.status not in {
        JobStatus.FAILED,
        JobStatus.CANCELED,
    }:
        raise ConflictError("Sesi ini belum gagal; retry tidak diperlukan.", code="RETRY_NOT_ALLOWED")

    metadata = dict(latest.metadata_json or {})
    for relative in _paths_from_metadata(metadata):
        try:
            storage.resolve(relative)
        except AppError as exc:
            raise ConflictError(
                "File sementara sudah dibersihkan. Unggah ulang materi untuk melanjutkan.",
                code="RETRY_UNAVAILABLE",
            ) from exc

    metadata.pop("cancel_requested", None)
    metadata.pop("retry_available", None)
    job = ProcessingJob(
        session_id=session.id,
        user_id=user.id,
        job_type=JobType.PROCESS_SESSION,
        status=JobStatus.QUEUED,
        progress=0,
        metadata_json=metadata,
    )
    db.add(job)
    session.status = SessionStatus.QUEUED
    session.error_code = None
    session.error_message = None
    await db.commit()
    await db.refresh(job)
    try:
        await queue.enqueue(JobType.PROCESS_SESSION, job.id)
    except Exception as exc:
        job.status = JobStatus.FAILED
        job.error_code = "QUEUE_UNAVAILABLE"
        job.error_message = "Antrean pemrosesan tidak tersedia."
        await db.commit()
        raise ProviderUnavailableError(
            "Antrean pemrosesan tidak tersedia. Coba lagi beberapa saat."
        ) from exc
    return SessionCreateResponse(session_id=session.id, job_id=job.id)


@router.post("/{session_id}/cancel", response_model=MessageResponse, status_code=202)
async def cancel_session(
    session_id: uuid.UUID,
    user: CurrentUser,
    db: DbSession,
) -> MessageResponse:
    session = await _get_session(db, user, session_id, detail=True)
    latest = _latest_job(session)
    if latest is None:
        raise NotFoundError("Job pemrosesan tidak ditemukan.")
    if latest.status == JobStatus.SUCCEEDED:
        raise ConflictError("Sesi sudah selesai; tidak bisa dibatalkan.", code="CANCEL_NOT_ALLOWED")

    if latest.status in {JobStatus.QUEUED, JobStatus.FAILED}:
        latest.status = JobStatus.CANCELED
        latest.stage = "CANCELED"
        latest.finished_at = utcnow()
        session.status = SessionStatus.CANCELED
    elif latest.status == JobStatus.RUNNING:
        metadata = dict(latest.metadata_json or {})
        metadata["cancel_requested"] = True
        latest.metadata_json = metadata
    await db.commit()
    return MessageResponse(message="Permintaan pembatalan diterima.")
