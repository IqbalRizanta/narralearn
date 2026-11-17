from __future__ import annotations

from typing import Any

from arq.connections import RedisSettings

from app.core.config import get_settings
from app.core.logging import configure_logging
from app.db.session import dispose_engine
from app.workers.processor import process_session_job, switch_style_job

settings = get_settings()


async def _on_startup(_ctx: dict[str, Any]) -> None:
    configure_logging(settings.log_level, settings.log_json)


async def _on_shutdown(_ctx: dict[str, Any]) -> None:
    await dispose_engine()


def _worker_config(queue_name: str, functions: list[Any]) -> dict[str, Any]:
    # ARQ reads attributes from the settings object's own __dict__, so inherited
    # class attributes are silently ignored. A dict keeps every option explicit.
    return {
        "redis_settings": RedisSettings.from_dsn(settings.redis_url),
        "queue_name": queue_name,
        "functions": functions,
        "max_jobs": 2,
        "job_timeout": 3600,
        "keep_result": 3600,
        "health_check_interval": 30,
        "poll_delay": 0.5,
        "on_startup": _on_startup,
        "on_shutdown": _on_shutdown,
    }


BatchWorkerSettings = _worker_config("narralearn:batch", [process_session_job])
InteractiveWorkerSettings = _worker_config("narralearn:interactive", [switch_style_job])

# Backwards-compatible default for `arq app.workers.settings.WorkerSettings`.
WorkerSettings = BatchWorkerSettings
