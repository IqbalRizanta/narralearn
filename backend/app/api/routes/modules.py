from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy import select

from app.core.dependencies import CurrentUser, DbSession, get_queue
from app.core.errors import ConflictError, NotFoundError, ProviderUnavailableError
from app.db.models import (
    GeneratedModule,
    JobStatus,
    JobType,
    ModuleProgress,
    ProcessingJob,
    SessionStatus,
    StudySession,
    StyleMode,
    utcnow,
)
from app.schemas.auth import MessageResponse
from app.schemas.sessions import (
    ModuleOut,
    ModuleSummary,
    ModuleSwitchRequest,
    ModuleSwitchResponse,
    ProgressUpdateRequest,
)
from app.services.queue import TaskQueue

router = APIRouter(tags=["modules"])


async def _owned_session(db: DbSession, user: CurrentUser, session_id: uuid.UUID) -> StudySession:
    session = await db.scalar(
        select(StudySession).where(
            StudySession.id == session_id,
            StudySession.user_id == user.id,
        )
    )
    if session is None:
        raise NotFoundError("Sesi belajar tidak ditemukan.")
    return session


@router.get("/sessions/{session_id}/modules", response_model=list[ModuleSummary])
async def list_modules(
    session_id: uuid.UUID,
    user: CurrentUser,
    db: DbSession,
) -> list[ModuleSummary]:
    session = await _owned_session(db, user, session_id)
    result = await db.execute(
        select(GeneratedModule)
        .where(GeneratedModule.session_id == session.id)
        .order_by(GeneratedModule.created_at.asc())
    )
    return [ModuleSummary.model_validate(module) for module in result.scalars().all()]


@router.post(
    "/sessions/{session_id}/modules",
    response_model=ModuleSwitchResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def switch_style(
    session_id: uuid.UUID,
    payload: ModuleSwitchRequest,
    user: CurrentUser,
    db: DbSession,
    queue: Annotated[TaskQueue, Depends(get_queue)],
) -> ModuleSwitchResponse:
    session = await _owned_session(db, user, session_id)
    if session.status != SessionStatus.READY:
        raise ConflictError(
            "Sesi belum selesai diproses. Tunggu hingga modul pertama siap.",
            code="SESSION_NOT_READY",
        )

    existing = await db.scalar(
        select(GeneratedModule).where(
            GeneratedModule.session_id == session.id,
            GeneratedModule.style_mode == payload.style_mode,
        )
    )
    if existing is not None and not payload.regenerate:
        return ModuleSwitchResponse(
            status="READY",
            module=ModuleOut.model_validate(existing),
        )

    job = ProcessingJob(
        session_id=session.id,
        user_id=user.id,
        job_type=JobType.SWITCH_STYLE,
        status=JobStatus.QUEUED,
        progress=0,
        metadata_json={
            "style_mode": payload.style_mode.value,
            "regenerate": payload.regenerate,
        },
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)
    try:
        await queue.enqueue(JobType.SWITCH_STYLE, job.id)
    except Exception as exc:
        job.status = JobStatus.FAILED
        job.error_code = "QUEUE_UNAVAILABLE"
        job.error_message = "Antrean pemrosesan tidak tersedia."
        job.finished_at = utcnow()
        await db.commit()
        raise ProviderUnavailableError(
            "Antrean pemrosesan tidak tersedia. Coba lagi beberapa saat."
        ) from exc
    return ModuleSwitchResponse(status="QUEUED", job_id=job.id)


@router.get("/sessions/{session_id}/modules/{style_mode}", response_model=ModuleOut)
async def get_module(
    session_id: uuid.UUID,
    style_mode: StyleMode,
    user: CurrentUser,
    db: DbSession,
) -> ModuleOut:
    session = await _owned_session(db, user, session_id)
    module = await db.scalar(
        select(GeneratedModule).where(
            GeneratedModule.session_id == session.id,
            GeneratedModule.style_mode == style_mode,
        )
    )
    if module is None:
        raise NotFoundError("Modul dengan gaya tersebut belum tersedia.")
    return ModuleOut.model_validate(module)


@router.put("/modules/{module_id}/progress", response_model=MessageResponse)
async def update_progress(
    module_id: uuid.UUID,
    payload: ProgressUpdateRequest,
    user: CurrentUser,
    db: DbSession,
) -> MessageResponse:
    module = await db.scalar(
        select(GeneratedModule)
        .join(StudySession, StudySession.id == GeneratedModule.session_id)
        .where(GeneratedModule.id == module_id, StudySession.user_id == user.id)
    )
    if module is None:
        raise NotFoundError("Modul tidak ditemukan.")

    progress = await db.scalar(
        select(ModuleProgress).where(
            ModuleProgress.user_id == user.id,
            ModuleProgress.module_id == module.id,
        )
    )
    if progress is None:
        progress = ModuleProgress(user_id=user.id, module_id=module.id)
        db.add(progress)

    progress.last_read_at = payload.last_read_at or utcnow()
    if payload.quiz_score is not None:
        progress.quiz_score = payload.quiz_score
    if payload.answers is not None:
        progress.answers = payload.answers
    await db.commit()
    return MessageResponse(message="Progres belajar tersimpan.")
