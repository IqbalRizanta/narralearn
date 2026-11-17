from __future__ import annotations

import uuid

from fastapi import APIRouter
from sqlalchemy import select

from app.core.dependencies import CurrentUser, DbSession
from app.core.errors import NotFoundError
from app.db.models import ProcessingJob
from app.schemas.jobs import JobOut

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("/{job_id}", response_model=JobOut)
async def get_job(job_id: uuid.UUID, user: CurrentUser, db: DbSession) -> JobOut:
    job = await db.scalar(
        select(ProcessingJob).where(
            ProcessingJob.id == job_id,
            ProcessingJob.user_id == user.id,
        )
    )
    if job is None:
        raise NotFoundError("Job tidak ditemukan.")
    return JobOut.model_validate(job)
