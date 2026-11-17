from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from fastapi import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import Settings
from app.core.security import (
    create_access_token,
    hash_refresh_token,
    new_refresh_token,
    utcnow,
)
from app.db.models import RefreshToken, User


def as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


@dataclass(slots=True)
class IssuedTokens:
    access_token: str
    refresh_token: str
    expires_in: int


async def issue_tokens(db: AsyncSession, user: User, settings: Settings) -> IssuedTokens:
    access_token, expires_in = create_access_token(user.id)
    refresh_token = new_refresh_token()
    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=hash_refresh_token(refresh_token),
            expires_at=utcnow() + timedelta(days=settings.refresh_token_days),
        )
    )
    await db.commit()
    return IssuedTokens(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=expires_in,
    )


def set_refresh_cookie(response: Response, token: str, settings: Settings) -> None:
    response.set_cookie(
        key=settings.cookie_name,
        value=token,
        max_age=settings.refresh_token_days * 24 * 3600,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path=f"{settings.api_prefix}/auth",
        domain=settings.cookie_domain or None,
    )


def clear_refresh_cookie(response: Response, settings: Settings) -> None:
    response.delete_cookie(
        key=settings.cookie_name,
        path=f"{settings.api_prefix}/auth",
        domain=settings.cookie_domain or None,
        secure=settings.cookie_secure,
        httponly=True,
        samesite="lax",
    )


async def find_refresh_token(db: AsyncSession, token: str) -> RefreshToken | None:
    result = await db.execute(
        select(RefreshToken)
        .options(selectinload(RefreshToken.user))
        .where(RefreshToken.token_hash == hash_refresh_token(token))
    )
    return result.scalar_one_or_none()


def refresh_token_is_active(record: RefreshToken) -> bool:
    return record.revoked_at is None and as_utc(record.expires_at) > utcnow()


async def revoke_refresh_token(db: AsyncSession, record: RefreshToken) -> None:
    if record.revoked_at is None:
        record.revoked_at = utcnow()
        await db.commit()
