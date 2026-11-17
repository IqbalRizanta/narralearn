from __future__ import annotations

from fastapi import APIRouter, Request, Response, status
from sqlalchemy import select

from app.core.config import get_settings
from app.core.dependencies import CurrentUser, DbSession, enforce_rate_limit
from app.core.errors import ConflictError, ForbiddenError, UnauthorizedError
from app.core.security import (
    hash_password,
    normalize_email,
    utcnow,
    verify_password,
)
from app.db.models import User
from app.schemas.auth import (
    ConsentRequest,
    DeleteAccountRequest,
    LoginRequest,
    MessageResponse,
    RegisterRequest,
    TokenResponse,
    UserOut,
)
from app.services.auth import (
    clear_refresh_cookie,
    find_refresh_token,
    issue_tokens,
    refresh_token_is_active,
    revoke_refresh_token,
    set_refresh_cookie,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _token_response(access_token: str, expires_in: int, user: User) -> TokenResponse:
    return TokenResponse(
        access_token=access_token,
        expires_in=expires_in,
        user=UserOut.model_validate(user),
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    payload: RegisterRequest,
    request: Request,
    response: Response,
    db: DbSession,
) -> TokenResponse:
    await enforce_rate_limit(request, "auth:register", limit=5, window_seconds=60)
    settings = get_settings()
    email = normalize_email(str(payload.email))
    existing = await db.scalar(select(User.id).where(User.email == email))
    if existing is not None:
        raise ConflictError("Email sudah terdaftar.", code="EMAIL_TAKEN")

    user = User(
        full_name=payload.full_name,
        email=email,
        password_hash=hash_password(payload.password),
    )
    if payload.consent_accepted:
        user.consent_version = payload.consent_version
        user.consent_accepted_at = utcnow()
    db.add(user)
    await db.commit()
    await db.refresh(user)

    tokens = await issue_tokens(db, user, settings)
    set_refresh_cookie(response, tokens.refresh_token, settings)
    return _token_response(tokens.access_token, tokens.expires_in, user)


@router.post("/login", response_model=TokenResponse)
async def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db: DbSession,
) -> TokenResponse:
    await enforce_rate_limit(request, "auth:login", limit=10, window_seconds=60)
    settings = get_settings()
    email = normalize_email(str(payload.email))
    user = await db.scalar(select(User).where(User.email == email))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise UnauthorizedError("Email atau password salah.")
    if not user.is_active:
        raise ForbiddenError("Akun dinonaktifkan.", code="ACCOUNT_DISABLED")

    user.last_login_at = utcnow()
    tokens = await issue_tokens(db, user, settings)
    set_refresh_cookie(response, tokens.refresh_token, settings)
    return _token_response(tokens.access_token, tokens.expires_in, user)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    request: Request,
    response: Response,
    db: DbSession,
) -> TokenResponse:
    await enforce_rate_limit(request, "auth:refresh", limit=30, window_seconds=60)
    settings = get_settings()
    raw_token = request.cookies.get(settings.cookie_name)
    if not raw_token:
        raise UnauthorizedError("Sesi tidak ditemukan. Silakan login.")
    record = await find_refresh_token(db, raw_token)
    if record is None or not refresh_token_is_active(record):
        clear_refresh_cookie(response, settings)
        raise UnauthorizedError("Sesi sudah berakhir. Silakan login kembali.")
    if not record.user.is_active:
        await revoke_refresh_token(db, record)
        clear_refresh_cookie(response, settings)
        raise ForbiddenError("Akun dinonaktifkan.", code="ACCOUNT_DISABLED")

    record.revoked_at = utcnow()
    await db.commit()
    tokens = await issue_tokens(db, record.user, settings)
    set_refresh_cookie(response, tokens.refresh_token, settings)
    return _token_response(tokens.access_token, tokens.expires_in, record.user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(request: Request, db: DbSession) -> Response:
    settings = get_settings()
    raw_token = request.cookies.get(settings.cookie_name)
    if raw_token:
        record = await find_refresh_token(db, raw_token)
        if record is not None:
            await revoke_refresh_token(db, record)
    result = Response(status_code=status.HTTP_204_NO_CONTENT)
    clear_refresh_cookie(result, settings)
    return result


@router.get("/me", response_model=UserOut)
async def me(user: CurrentUser) -> UserOut:
    return UserOut.model_validate(user)


@router.post("/consent", response_model=UserOut)
async def accept_consent(payload: ConsentRequest, user: CurrentUser, db: DbSession) -> UserOut:
    user.consent_version = payload.version
    user.consent_accepted_at = utcnow()
    await db.commit()
    await db.refresh(user)
    return UserOut.model_validate(user)


@router.delete("/me", response_model=MessageResponse)
async def delete_account(
    payload: DeleteAccountRequest,
    user: CurrentUser,
    db: DbSession,
) -> MessageResponse:
    if not verify_password(payload.password, user.password_hash):
        raise UnauthorizedError("Password salah.")
    await db.delete(user)
    await db.commit()
    return MessageResponse(message="Akun dan seluruh data terkait telah dihapus.")
