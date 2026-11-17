from __future__ import annotations

import uuid
from typing import Annotated

import jwt
from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.errors import ForbiddenError, UnauthorizedError
from app.core.security import decode_token
from app.db.models import User
from app.db.session import get_db
from app.services.queue import TaskQueue
from app.services.storage import LocalStorage

bearer_scheme = HTTPBearer(auto_error=False)

DbSession = Annotated[AsyncSession, Depends(get_db)]


def settings_dep() -> Settings:
    return get_settings()


def get_storage(request: Request) -> LocalStorage:
    return request.app.state.storage


def get_queue(request: Request) -> TaskQueue:
    return request.app.state.queue


def get_client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


async def enforce_rate_limit(
    request: Request,
    scope: str,
    limit: int,
    window_seconds: int,
    identifier: str | None = None,
) -> None:
    limiter = getattr(request.app.state, "rate_limiter", None)
    if limiter is None:
        return
    key = f"rl:{scope}:{identifier or get_client_ip(request)}"
    await limiter.check(key, limit, window_seconds)


async def get_current_user(
    db: DbSession,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> User:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise UnauthorizedError("Bearer token diperlukan.")
    try:
        payload = decode_token(credentials.credentials, expected_type="access")
        user_id = uuid.UUID(str(payload["sub"]))
    except (jwt.InvalidTokenError, ValueError, KeyError) as exc:
        raise UnauthorizedError("Token tidak valid atau sudah kedaluwarsa.") from exc

    user = await db.get(User, user_id)
    if user is None:
        raise UnauthorizedError("Akun tidak ditemukan.")
    if not user.is_active:
        raise ForbiddenError("Akun dinonaktifkan.", code="ACCOUNT_DISABLED")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_consent(user: User) -> None:
    if user.consent_accepted_at is None:
        raise ForbiddenError(
            "Persetujuan rekaman diperlukan sebelum membuat sesi.",
            code="CONSENT_REQUIRED",
        )
