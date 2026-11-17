from __future__ import annotations

from typing import Any

from fastapi import Request
from fastapi.responses import JSONResponse


class AppError(Exception):
    """Application error rendered as RFC 7807 problem+json."""

    def __init__(
        self,
        status_code: int,
        code: str,
        title: str,
        detail: str | None = None,
        headers: dict[str, str] | None = None,
    ) -> None:
        self.status_code = status_code
        self.code = code
        self.title = title
        self.detail = detail or title
        self.headers = headers or {}
        super().__init__(self.detail)


class NotFoundError(AppError):
    def __init__(self, detail: str = "Resource tidak ditemukan.") -> None:
        super().__init__(404, "NOT_FOUND", "Tidak ditemukan", detail)


class ConflictError(AppError):
    def __init__(self, detail: str, code: str = "CONFLICT") -> None:
        super().__init__(409, code, "Konflik", detail)


class ForbiddenError(AppError):
    def __init__(self, detail: str = "Akses ditolak.", code: str = "FORBIDDEN") -> None:
        super().__init__(403, code, "Akses ditolak", detail)


class UnauthorizedError(AppError):
    def __init__(self, detail: str = "Autentikasi diperlukan.") -> None:
        super().__init__(
            401,
            "UNAUTHORIZED",
            "Tidak terautentikasi",
            detail,
            headers={"WWW-Authenticate": "Bearer"},
        )


class RateLimitedError(AppError):
    def __init__(self, detail: str = "Terlalu banyak permintaan. Coba lagi nanti.") -> None:
        super().__init__(429, "RATE_LIMITED", "Terlalu banyak permintaan", detail)


class ProviderUnavailableError(AppError):
    def __init__(self, detail: str = "Layanan AI sedang tidak tersedia.") -> None:
        super().__init__(503, "PROVIDER_UNAVAILABLE", "Layanan tidak tersedia", detail)


def problem_payload(
    request: Request,
    status: int,
    code: str,
    title: str,
    detail: str,
) -> dict[str, Any]:
    return {
        "type": f"https://narralearn.app/errors/{code.lower().replace('_', '-')}",
        "title": title,
        "status": status,
        "detail": detail,
        "code": code,
        "request_id": getattr(request.state, "request_id", None),
    }


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content=problem_payload(request, exc.status_code, exc.code, exc.title, exc.detail),
        headers=exc.headers,
        media_type="application/problem+json",
    )
