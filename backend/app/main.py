from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager

import structlog
from arq import create_pool
from arq.connections import RedisSettings
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from redis.asyncio import Redis
from sqlalchemy.exc import SQLAlchemyError

from app import __version__
from app.api.routes import auth, health, jobs, modules, sessions, voice
from app.core.config import get_settings
from app.core.errors import AppError, app_error_handler, problem_payload
from app.core.logging import configure_logging, new_request_id, request_id_ctx
from app.core.rate_limit import RateLimiter
from app.db.session import dispose_engine, init_models
from app.services.queue import ArqTaskQueue, InlineTaskQueue, ManualTaskQueue
from app.services.storage import LocalStorage

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    configure_logging(settings.log_level, settings.log_json)
    settings.ensure_dirs()

    if settings.auto_create_tables:
        await init_models()

    storage = LocalStorage(settings)
    redis: Redis | None = None
    arq_pool = None

    if settings.queue_mode == "arq":
        redis = Redis.from_url(
            settings.redis_url,
            decode_responses=True,
            socket_connect_timeout=2,
            socket_timeout=2,
        )
        try:
            await redis.ping()
            arq_pool = await create_pool(RedisSettings.from_dsn(settings.redis_url))
            queue = ArqTaskQueue(arq_pool)
        except Exception:
            if arq_pool is not None:
                await arq_pool.aclose()
            await redis.aclose()
            raise RuntimeError(
                "QUEUE_MODE=arq requires Redis. Start Redis or use QUEUE_MODE=inline."
            ) from None
    elif settings.queue_mode == "inline":
        queue = InlineTaskQueue()
    else:
        queue = ManualTaskQueue()

    if settings.queue_mode != "arq" and settings.rate_limit_enabled:
        # Optional Redis for rate limiting in dev. Never fail startup if absent.
        try:
            candidate = Redis.from_url(
                settings.redis_url,
                decode_responses=True,
                socket_connect_timeout=1,
                socket_timeout=1,
            )
            await candidate.ping()
            redis = candidate
        except Exception:
            redis = None

    app.state.settings = settings
    app.state.storage = storage
    app.state.queue = queue
    app.state.redis = redis
    app.state.arq_pool = arq_pool
    app.state.rate_limiter = RateLimiter(settings, redis)

    cleanup_task = asyncio.create_task(
        storage.cleanup_old_files(settings.temp_retention_hours),
        name="cleanup-old-uploads",
    )
    logger.info(
        "NarraLearn API started",
        extra={"environment": settings.environment, "queue_mode": settings.queue_mode},
    )
    try:
        yield
    finally:
        cleanup_task.cancel()
        try:
            await cleanup_task
        except (asyncio.CancelledError, Exception):
            pass
        if arq_pool is not None:
            await arq_pool.aclose()
        if redis is not None:
            await redis.aclose()
        await dispose_engine()
        logger.info("NarraLearn API stopped")


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        version=__version__,
        description="Adaptive multimodal learning API. Async jobs, structured AI output.",
        docs_url="/docs" if settings.enable_docs else None,
        redoc_url=None,
        openapi_url="/openapi.json" if settings.enable_docs else None,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "Idempotency-Key", "X-Requested-With"],
        expose_headers=["X-Request-ID"],
        max_age=600,
    )

    @app.middleware("http")
    async def request_context(request: Request, call_next):
        rid = new_request_id()
        request.state.request_id = rid
        token = request_id_ctx.set(rid)
        structlog.contextvars.bind_contextvars(request_id=rid)
        try:
            if request.method in {"POST", "PUT", "PATCH", "DELETE"}:
                origin = request.headers.get("origin")
                if origin and origin not in settings.cors_origins:
                    return JSONResponse(
                        status_code=403,
                        content=problem_payload(
                            request,
                            403,
                            "ORIGIN_NOT_ALLOWED",
                            "Origin tidak diizinkan",
                            "Permintaan lintas origin ditolak.",
                        ),
                        media_type="application/problem+json",
                    )
            response = await call_next(request)
        finally:
            request_id_ctx.reset(token)
            structlog.contextvars.clear_contextvars()

        response.headers["X-Request-ID"] = rid
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(self), geolocation=()"
        response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
        return response

    @app.exception_handler(AppError)
    async def _app_error(request: Request, exc: AppError):
        return await app_error_handler(request, exc)

    @app.exception_handler(RequestValidationError)
    async def _validation_error(request: Request, exc: RequestValidationError):
        errors = [
            {
                "loc": list(error.get("loc", [])),
                "msg": error.get("msg", "Input tidak valid"),
                "type": error.get("type", "value_error"),
            }
            for error in exc.errors()
        ]
        payload = problem_payload(
            request,
            422,
            "VALIDATION_ERROR",
            "Input tidak valid",
            "Periksa kembali data yang dikirim.",
        )
        payload["errors"] = errors
        return JSONResponse(
            status_code=422, content=payload, media_type="application/problem+json"
        )

    @app.exception_handler(HTTPException)
    async def _http_error(request: Request, exc: HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content=problem_payload(
                request,
                exc.status_code,
                "HTTP_ERROR",
                "Permintaan gagal",
                str(exc.detail),
            ),
            headers=exc.headers,
            media_type="application/problem+json",
        )

    @app.exception_handler(SQLAlchemyError)
    async def _db_error(request: Request, exc: SQLAlchemyError):
        logger.exception("Database error", exc_info=exc)
        return JSONResponse(
            status_code=500,
            content=problem_payload(
                request,
                500,
                "DATABASE_ERROR",
                "Kesalahan database",
                "Terjadi kesalahan pada penyimpanan data.",
            ),
            media_type="application/problem+json",
        )

    @app.exception_handler(Exception)
    async def _unhandled(request: Request, exc: Exception):
        logger.exception("Unhandled error", exc_info=exc)
        return JSONResponse(
            status_code=500,
            content=problem_payload(
                request,
                500,
                "INTERNAL_ERROR",
                "Kesalahan server",
                "Terjadi kesalahan yang tidak terduga.",
            ),
            media_type="application/problem+json",
        )

    app.include_router(health.router)
    app.include_router(auth.router, prefix=settings.api_prefix)
    app.include_router(sessions.router, prefix=settings.api_prefix)
    app.include_router(modules.router, prefix=settings.api_prefix)
    app.include_router(jobs.router, prefix=settings.api_prefix)
    app.include_router(voice.router, prefix=settings.api_prefix)
    app.include_router(voice.ws_router)

    @app.get("/", include_in_schema=False)
    async def root():
        return {
            "name": settings.app_name,
            "version": __version__,
            "docs": "/docs" if settings.enable_docs else None,
            "health": "/healthz",
        }

    return app


app = create_app()
