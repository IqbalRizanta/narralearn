from __future__ import annotations

import asyncio
import time
import uuid
from dataclasses import asdict
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.core.errors import AppError
from app.core.logging import get_logger
from app.db.models import (
    GeneratedModule,
    JobStatus,
    ProcessingJob,
    SessionDocument,
    SessionStatus,
    StudySession,
    StyleMode,
    utcnow,
)
from app.db.session import async_session_factory
from app.providers.ai import AIProviderError, AIRequest, AIResult, get_ai_provider
from app.providers.stt import TranscriptResult, get_stt_provider
from app.providers.voice import get_voice_provider
from app.schemas.module import ModuleContent, SourceCitation
from app.services.audio import inspect_audio
from app.services.documents import DocumentError, extract_document
from app.services.storage import LocalStorage

logger = get_logger(__name__)

SessionFactory = async_sessionmaker[AsyncSession]


class _JobCanceled(Exception):
    pass


def _collect_paths(metadata: dict[str, Any]) -> list[str]:
    paths: list[str] = []
    audio_path = metadata.get("audio_path")
    if isinstance(audio_path, str):
        paths.append(audio_path)
    for entry in metadata.get("document_paths", []) or []:
        if isinstance(entry, dict) and isinstance(entry.get("path"), str):
            paths.append(entry["path"])
    return paths


def _cleanup(storage: LocalStorage, paths: list[str]) -> None:
    for path in paths:
        storage.delete_relative(path)


async def _load_job(db: AsyncSession, job_id: uuid.UUID) -> ProcessingJob | None:
    result = await db.execute(
        select(ProcessingJob)
        .options(selectinload(ProcessingJob.session).selectinload(StudySession.documents))
        .where(ProcessingJob.id == job_id)
    )
    return result.scalar_one_or_none()


async def _progress(
    db: AsyncSession,
    job: ProcessingJob,
    *,
    stage: str,
    progress: int,
) -> None:
    job.stage = stage
    job.progress = max(0, min(100, progress))
    await db.commit()


async def _check_cancel(db: AsyncSession, job: ProcessingJob) -> None:
    await db.refresh(job)
    if job.status == JobStatus.CANCELED:
        raise _JobCanceled
    metadata = job.metadata_json or {}
    if metadata.get("cancel_requested"):
        raise _JobCanceled


async def _fail_job(
    db: AsyncSession,
    job: ProcessingJob,
    session: StudySession,
    *,
    code: str,
    message: str,
) -> None:
    job.status = JobStatus.FAILED
    job.error_code = code
    job.error_message = message[:1000]
    job.finished_at = utcnow()
    metadata = dict(job.metadata_json or {})
    metadata["retry_available"] = True
    job.metadata_json = metadata
    session.status = SessionStatus.FAILED
    session.error_code = code
    session.error_message = message[:1000]
    try:
        await db.commit()
    except Exception:
        logger.exception("Could not persist failed job state", job_id=str(job.id))
        await db.rollback()


def _build_citations(
    documents: list[SessionDocument], transcript: TranscriptResult | None
) -> list[SourceCitation]:
    citations: list[SourceCitation] = []
    for index, document in enumerate(documents, start=1):
        citations.append(
            SourceCitation(
                id=f"doc:{index}",
                label=document.file_name,
                kind="document",
            )
        )
    if transcript is not None:
        seen: set[str] = set()
        for segment in transcript.segments[:20]:
            citation_id = f"audio:{int(segment.start)}"
            if citation_id in seen:
                continue
            seen.add(citation_id)
            minutes, seconds = divmod(int(segment.start), 60)
            citations.append(
                SourceCitation(
                    id=citation_id,
                    label=f"Transkrip {minutes:02d}:{seconds:02d}",
                    kind="audio",
                )
            )
    if not citations:
        citations.append(SourceCitation(id="source:1", label="Materi", kind="document"))
    return citations


def _context_text(documents: list[SessionDocument], transcript: TranscriptResult | None, limit: int) -> tuple[str, str]:
    document_text = "\n\n".join(document.extracted_text for document in documents)
    transcript_text = transcript.text if transcript is not None else ""
    document_text = document_text[:limit]
    remaining = max(0, limit - len(document_text))
    transcript_text = transcript_text[:remaining]
    return document_text, transcript_text


def _plain_text(content: ModuleContent) -> str:
    lines = [content.summary]
    for section in content.sections:
        lines.append(f"## {section.heading}")
        for block in section.blocks:
            if block.title:
                lines.append(f"### {block.title}")
            if block.text:
                lines.append(block.text)
            if block.latex:
                lines.append(f"$${block.latex}$$")
            if block.explanation:
                lines.append(block.explanation)
    return "\n\n".join(line for line in lines if line.strip())


async def _upsert_module(
    db: AsyncSession,
    session_id: uuid.UUID,
    style_mode: StyleMode,
    result: AIResult,
) -> GeneratedModule:
    existing = await db.execute(
        select(GeneratedModule).where(
            GeneratedModule.session_id == session_id,
            GeneratedModule.style_mode == style_mode,
        )
    )
    module = existing.scalar_one_or_none()
    content = result.content
    if module is None:
        module = GeneratedModule(session_id=session_id, style_mode=style_mode)
        db.add(module)
    module.transformed_content = _plain_text(content)
    module.content_json = content.model_dump(mode="json")
    module.quiz_json = [item.model_dump(mode="json") for item in content.quiz]
    module.recommended_method = content.study_method.name
    module.method_action_items = list(content.study_method.steps)
    module.schema_version = content.schema_version
    module.model_name = result.model_name
    module.prompt_version = result.prompt_version
    module.input_tokens = result.input_tokens
    module.output_tokens = result.output_tokens
    module.latency_ms = result.latency_ms
    module.status = "READY"
    await db.flush()
    return module


async def run_process_session(
    job_id: uuid.UUID,
    session_factory: SessionFactory | None = None,
) -> None:
    factory = session_factory or async_session_factory
    settings = get_settings()
    storage = LocalStorage(settings)

    async with factory() as db:
        job = await _load_job(db, job_id)
        if job is None:
            logger.warning("Job not found", job_id=str(job_id))
            return
        if job.status in {JobStatus.SUCCEEDED, JobStatus.CANCELED}:
            return
        if job.status == JobStatus.FAILED and job.attempts >= 3:
            return

        session = job.session
        metadata = dict(job.metadata_json or {})
        cleanup_paths = _collect_paths(metadata)
        succeeded = False
        canceled = False

        try:
            job.attempts += 1
            job.status = JobStatus.RUNNING
            job.stage = "VALIDATING"
            job.progress = 2
            job.started_at = utcnow()
            job.error_code = None
            job.error_message = None
            session.status = SessionStatus.PROCESSING
            session.error_code = None
            session.error_message = None
            await db.commit()

            await _check_cancel(db, job)
            await _progress(db, job, stage="EXTRACTING_DOCUMENTS", progress=12)

            document_entries = metadata.get("document_paths", []) or []
            if len(document_entries) > settings.max_documents_per_session:
                raise AppError(
                    422,
                    "TOO_MANY_DOCUMENTS",
                    "Terlalu banyak dokumen",
                    f"Maksimal {settings.max_documents_per_session} dokumen per sesi.",
                )

            documents: list[SessionDocument] = []
            for entry in document_entries:
                if not isinstance(entry, dict) or not entry.get("path"):
                    continue
                path = storage.resolve(str(entry["path"]))
                extracted = await asyncio.to_thread(
                    extract_document,
                    path,
                    max_pdf_pages=settings.max_pdf_pages,
                    max_pptx_slides=settings.max_pptx_slides,
                    max_chars=settings.max_document_chars,
                )
                document = SessionDocument(
                    session_id=session.id,
                    file_name=str(entry.get("file_name") or path.name),
                    extracted_text=extracted.text,
                    page_count=extracted.page_count,
                    file_size_bytes=int(entry.get("size_bytes") or 0) or None,
                    mime_type=str(entry.get("mime_type") or "") or None,
                    extraction_metadata=extracted.metadata,
                )
                documents.append(document)
                session.documents.append(document)
            await db.commit()
            await _check_cancel(db, job)

            await _progress(db, job, stage="ANALYZING_AUDIO", progress=28)
            audio_path_value = metadata.get("audio_path")
            audio_path = storage.resolve(str(audio_path_value)) if audio_path_value else None
            transcript_result: TranscriptResult | None = None
            if audio_path is not None:
                info = await asyncio.to_thread(inspect_audio, audio_path)
                if info.duration_seconds is not None:
                    if info.duration_seconds > settings.max_audio_minutes * 60:
                        raise AppError(
                            422,
                            "AUDIO_TOO_LONG",
                            "Audio terlalu panjang",
                            f"Maksimal {settings.max_audio_minutes} menit per sesi.",
                        )
                    session.audio_duration_seconds = round(info.duration_seconds, 2)
                await db.commit()

                embedding = metadata.get("embedding")
                if embedding:
                    voice_provider = get_voice_provider(settings)
                    filtered = await asyncio.to_thread(
                        voice_provider.filter_file, audio_path, str(embedding)
                    )
                    metadata["speaker_filter"] = {
                        "applied": filtered.applied,
                        "reason": filtered.reason,
                        "kept": filtered.kept,
                        "total": filtered.total,
                    }
                    if filtered.applied and filtered.path is not None:
                        audio_path = filtered.path
                        cleanup_paths.append(str(filtered.path))
                    job.metadata_json = metadata
                    await db.commit()

                await _progress(db, job, stage="TRANSCRIBING", progress=45)
                stt_provider = get_stt_provider(settings)
                transcript_result = await asyncio.to_thread(
                    stt_provider.transcribe,
                    audio_path,
                    metadata.get("glossary") or [],
                )
                session.raw_transcript = transcript_result.text
                session.transcript_json = {
                    "provider": transcript_result.provider,
                    "language": transcript_result.language,
                    "duration_seconds": transcript_result.duration_seconds,
                    "warnings": transcript_result.warnings,
                    "segments": [asdict(segment) for segment in transcript_result.segments],
                }
                if transcript_result.duration_seconds and not session.audio_duration_seconds:
                    session.audio_duration_seconds = round(transcript_result.duration_seconds, 2)
                await db.commit()
            await _check_cancel(db, job)

            document_text, transcript_text = _context_text(
                documents, transcript_result, settings.max_context_chars
            )
            if not document_text and not transcript_text:
                raise AppError(
                    422,
                    "NO_CONTENT",
                    "Tidak ada materi",
                    "Tidak ada teks yang bisa diproses dari audio/dokumen.",
                )

            await _progress(db, job, stage="GENERATING_MODULE", progress=65)
            style_mode_value = metadata.get("style_mode") or StyleMode.CASUAL_STORY.value
            try:
                style_mode = StyleMode(style_mode_value)
            except ValueError as exc:
                raise AppError(
                    422,
                    "INVALID_STYLE",
                    "Gaya tidak valid",
                    f"Gaya narasi {style_mode_value} tidak dikenal.",
                ) from exc

            citations = _build_citations(documents, transcript_result)
            ai_request = AIRequest(
                mode=style_mode,
                title=session.title,
                document_text=document_text,
                transcript=transcript_text,
                glossary=list(metadata.get("glossary") or []),
                citations=citations,
            )
            ai_provider = get_ai_provider(settings)
            started = time.perf_counter()
            ai_result = await ai_provider.generate(ai_request)
            await _progress(db, job, stage="SAVING_MODULE", progress=88)
            await _upsert_module(db, session.id, style_mode, ai_result)

            session.status = SessionStatus.READY
            session.error_code = None
            session.error_message = None
            job.status = JobStatus.SUCCEEDED
            job.stage = "DONE"
            job.progress = 100
            job.finished_at = utcnow()
            metadata["generation_ms"] = int((time.perf_counter() - started) * 1000)
            job.metadata_json = metadata
            await db.commit()
            succeeded = True
            logger.info(
                "Session processed",
                session_id=str(session.id),
                job_id=str(job.id),
                mode=style_mode.value,
                model=ai_result.model_name,
            )
        except _JobCanceled:
            canceled = True
            job.status = JobStatus.CANCELED
            job.stage = "CANCELED"
            job.finished_at = utcnow()
            session.status = SessionStatus.CANCELED
            await db.commit()
            logger.info("Job canceled", job_id=str(job.id))
        except DocumentError as exc:
            await _fail_job(db, job, session, code=exc.code, message=exc.message)
            logger.warning("Document processing failed", job_id=str(job.id), error=exc.message)
        except AIProviderError as exc:
            await _fail_job(db, job, session, code=exc.code, message=exc.message)
            logger.warning("AI generation failed", job_id=str(job.id), error=exc.message)
        except AppError as exc:
            await _fail_job(db, job, session, code=exc.code, message=exc.detail)
            logger.warning("Job failed", job_id=str(job.id), error=exc.detail)
        except Exception as exc:
            await _fail_job(
                db,
                job,
                session,
                code="PROCESSING_FAILED",
                message="Terjadi kesalahan saat memproses sesi. Coba lagi.",
            )
            logger.exception("Unexpected processing error: %s", exc, job_id=str(job.id))
        finally:
            if succeeded or canceled:
                _cleanup(storage, cleanup_paths)


async def run_style_switch(
    job_id: uuid.UUID,
    session_factory: SessionFactory | None = None,
) -> None:
    factory = session_factory or async_session_factory
    settings = get_settings()

    async with factory() as db:
        job = await _load_job(db, job_id)
        if job is None:
            return
        if job.status in {JobStatus.SUCCEEDED, JobStatus.CANCELED}:
            return
        session = job.session
        metadata = dict(job.metadata_json or {})
        try:
            job.attempts += 1
            job.status = JobStatus.RUNNING
            job.stage = "LOADING_CONTEXT"
            job.progress = 10
            job.started_at = utcnow()
            await db.commit()
            await _check_cancel(db, job)

            style_mode = StyleMode(str(metadata.get("style_mode") or StyleMode.CASUAL_STORY.value))
            regenerate = bool(metadata.get("regenerate"))
            existing = await db.execute(
                select(GeneratedModule).where(
                    GeneratedModule.session_id == session.id,
                    GeneratedModule.style_mode == style_mode,
                )
            )
            if existing.scalar_one_or_none() is not None and not regenerate:
                job.status = JobStatus.SUCCEEDED
                job.stage = "DONE"
                job.progress = 100
                job.finished_at = utcnow()
                await db.commit()
                return

            await _progress(db, job, stage="GENERATING_MODULE", progress=35)
            transcript_text = session.raw_transcript or ""
            transcript = None
            if session.transcript_json:
                from app.providers.stt import TranscriptSegment

                segments = [
                    TranscriptSegment(
                        start=float(segment.get("start", 0)),
                        end=float(segment.get("end", 0)),
                        text=str(segment.get("text", "")),
                    )
                    for segment in session.transcript_json.get("segments", [])
                ]
                transcript = TranscriptResult(
                    text=transcript_text,
                    segments=segments,
                    language=session.transcript_json.get("language", "id"),
                    duration_seconds=session.transcript_json.get("duration_seconds"),
                    provider=session.transcript_json.get("provider", "unknown"),
                )
            elif transcript_text:
                transcript = TranscriptResult(
                    text=transcript_text,
                    segments=[],
                    language=session.language,
                    duration_seconds=session.audio_duration_seconds,
                    provider="edited",
                )
            document_text, transcript_text = _context_text(
                session.documents, transcript, settings.max_context_chars
            )
            citations = _build_citations(session.documents, transcript)
            ai_provider = get_ai_provider(settings)
            started = time.perf_counter()
            result = await ai_provider.generate(
                AIRequest(
                    mode=style_mode,
                    title=session.title,
                    document_text=document_text,
                    transcript=transcript_text,
                    glossary=[],
                    citations=citations,
                )
            )
            await _progress(db, job, stage="SAVING_MODULE", progress=88)
            await _upsert_module(db, session.id, style_mode, result)
            job.status = JobStatus.SUCCEEDED
            job.stage = "DONE"
            job.progress = 100
            job.finished_at = utcnow()
            metadata["generation_ms"] = int((time.perf_counter() - started) * 1000)
            job.metadata_json = metadata
            await db.commit()
            logger.info(
                "Style switched",
                session_id=str(session.id),
                job_id=str(job.id),
                mode=style_mode.value,
            )
        except _JobCanceled:
            job.status = JobStatus.CANCELED
            job.stage = "CANCELED"
            job.finished_at = utcnow()
            await db.commit()
        except AIProviderError as exc:
            await _fail_job(db, job, session, code=exc.code, message=exc.message)
        except AppError as exc:
            await _fail_job(db, job, session, code=exc.code, message=exc.detail)
        except Exception as exc:
            await _fail_job(
                db,
                job,
                session,
                code="STYLE_SWITCH_FAILED",
                message="Gagal membuat gaya baru. Coba lagi.",
            )
            logger.exception("Unexpected style switch error: %s", exc, job_id=str(job.id))


async def process_session_job(_ctx: dict[str, Any], job_id: str) -> None:
    await run_process_session(uuid.UUID(job_id))


async def switch_style_job(_ctx: dict[str, Any], job_id: str) -> None:
    await run_style_switch(uuid.UUID(job_id))
