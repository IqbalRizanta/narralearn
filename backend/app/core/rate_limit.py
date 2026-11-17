from __future__ import annotations

import asyncio
import time
from collections import defaultdict, deque

from redis.asyncio import Redis

from app.core.config import Settings
from app.core.errors import RateLimitedError


class RateLimiter:
    """Redis-backed fixed window limiter with an in-memory fallback.

    The fallback is intentionally simple and per-process; it is acceptable for
    local/dev and tests. Production should use Redis.
    """

    def __init__(self, settings: Settings, redis: Redis | None = None) -> None:
        self.settings = settings
        self.redis = redis
        self._memory: dict[str, deque[float]] = defaultdict(deque)
        self._lock = asyncio.Lock()

    async def check(self, key: str, limit: int, window_seconds: int) -> None:
        if not self.settings.rate_limit_enabled:
            return

        if self.redis is not None:
            try:
                count = await self.redis.incr(key)
                if count == 1:
                    await self.redis.expire(key, window_seconds)
                if count > limit:
                    raise RateLimitedError()
                return
            except RateLimitedError:
                raise
            except Exception:
                # Redis unavailable: degrade to in-memory instead of failing auth.
                pass

        now = time.monotonic()
        cutoff = now - window_seconds
        async with self._lock:
            bucket = self._memory[key]
            while bucket and bucket[0] < cutoff:
                bucket.popleft()
            if len(bucket) >= limit:
                raise RateLimitedError()
            bucket.append(now)

    async def close(self) -> None:
        if self.redis is not None:
            await self.redis.aclose()
