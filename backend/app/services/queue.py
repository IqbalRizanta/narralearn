from __future__ import annotations

import asyncio
import logging
from typing import Protocol
from uuid import UUID

from arq import ArqRedis

from app.db.models import JobType

logger = logging.getLogger(__name__)


class TaskQueue(Protocol):
    async def enqueue(self, job_type: JobType, job_id: UUID) -> None: ...


class ArqTaskQueue:
    def __init__(self, pool: ArqRedis) -> None:
        self.pool = pool

    async def enqueue(self, job_type: JobType, job_id: UUID) -> None:
        if job_type == JobType.PROCESS_SESSION:
            await self.pool.enqueue_job(
                "process_session_job", str(job_id), _queue_name="narralearn:batch"
            )
        else:
            await self.pool.enqueue_job(
                "switch_style_job", str(job_id), _queue_name="narralearn:interactive"
            )


class InlineTaskQueue:
    """Dev-only queue: runs the job in the API process."""

    def __init__(self) -> None:
        self._tasks: set[asyncio.Task] = set()

    async def enqueue(self, job_type: JobType, job_id: UUID) -> None:
        from app.workers.processor import run_process_session, run_style_switch

        coro = (
            run_process_session(job_id)
            if job_type == JobType.PROCESS_SESSION
            else run_style_switch(job_id)
        )
        task = asyncio.create_task(coro, name=f"inline-{job_type.value}-{job_id}")
        self._tasks.add(task)
        task.add_done_callback(self._tasks.discard)


class ManualTaskQueue:
    """Test queue: records jobs; tests call the processor explicitly."""

    def __init__(self) -> None:
        self.jobs: list[tuple[JobType, UUID]] = []

    async def enqueue(self, job_type: JobType, job_id: UUID) -> None:
        self.jobs.append((job_type, job_id))
