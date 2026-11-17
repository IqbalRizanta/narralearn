from __future__ import annotations

from app.core.config import get_settings
from app.workers.settings import (
    BatchWorkerSettings,
    InteractiveWorkerSettings,
    WorkerSettings,
)
from arq.connections import RedisSettings
from arq.worker import get_kwargs


def _assert_explicit(config: dict, queue_name: str) -> None:
    settings = get_settings()
    resolved = get_kwargs(config)
    assert resolved["redis_settings"] == RedisSettings.from_dsn(settings.redis_url)
    assert resolved["queue_name"] == queue_name
    assert resolved["functions"]
    assert resolved["on_startup"] is not None
    assert resolved["on_shutdown"] is not None


def test_batch_worker_config_is_explicit() -> None:
    _assert_explicit(BatchWorkerSettings, "narralearn:batch")
    assert WorkerSettings is BatchWorkerSettings


def test_interactive_worker_config_is_explicit() -> None:
    _assert_explicit(InteractiveWorkerSettings, "narralearn:interactive")
