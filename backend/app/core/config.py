from __future__ import annotations

import logging
import secrets
from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # App
    app_name: str = "NarraLearn AI"
    environment: Literal["development", "staging", "production", "test"] = "development"
    debug: bool = False
    log_level: str = "INFO"
    enable_docs: bool = True
    frontend_url: str = "http://localhost:5173"
    api_prefix: str = "/api/v1"

    # Database / queue
    database_url: str = "sqlite+aiosqlite:///./narralearn.db"
    redis_url: str = "redis://localhost:6379/0"
    queue_mode: Literal["inline", "arq", "manual"] = "inline"
    auto_create_tables: bool = True

    # Auth
    jwt_secret: str = Field(default_factory=lambda: secrets.token_urlsafe(48))
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 15
    refresh_token_days: int = 7
    cookie_name: str = "narralearn_refresh"
    cookie_secure: bool = False
    cookie_domain: str | None = None
    password_min_length: int = 10

    # Uploads
    upload_dir: Path = Path("var/uploads")
    temp_retention_hours: int = 24
    max_audio_mb: int = 100
    max_audio_minutes: int = 180
    max_documents_per_session: int = 5
    max_document_mb: int = 25
    max_pdf_pages: int = 100
    max_pptx_slides: int = 200
    max_document_chars: int = 300_000
    max_context_chars: int = 120_000

    # Providers
    ai_provider: Literal["mock", "gemini"] = "mock"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.5-flash"
    gemini_fallback_model: str = "gemini-3.1-flash-lite"
    gemini_timeout_seconds: int = 90

    stt_provider: Literal["mock", "faster_whisper"] = "mock"
    whisper_model: str = "small"
    whisper_device: str = "cpu"
    whisper_compute_type: str = "int8"

    voice_provider: Literal["heuristic", "speechbrain"] = "heuristic"
    voice_ready_threshold: int = 85
    speaker_similarity_threshold: float = 0.65
    voice_model_dir: Path = Path("var/models/speechbrain")

    # Security / limits
    rate_limit_enabled: bool = True
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://localhost:8080",
        "http://localhost:8000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8000",
    ]
    trusted_hosts: list[str] = ["localhost", "127.0.0.1", "test", "api", "web"]

    # Cookie / logs
    log_json: bool = False

    @field_validator("cors_origins", "trusted_hosts", mode="before")
    @classmethod
    def _split_csv(cls, value: object) -> object:
        if isinstance(value, str) and not value.strip().startswith("["):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def max_audio_bytes(self) -> int:
        return self.max_audio_mb * 1024 * 1024

    @property
    def max_document_bytes(self) -> int:
        return self.max_document_mb * 1024 * 1024

    @property
    def upload_path(self) -> Path:
        return self.upload_dir.resolve()

    def ensure_dirs(self) -> None:
        self.upload_path.mkdir(parents=True, exist_ok=True)
        (self.upload_path / "audio").mkdir(parents=True, exist_ok=True)
        (self.upload_path / "documents").mkdir(parents=True, exist_ok=True)
        (self.upload_path / "tmp").mkdir(parents=True, exist_ok=True)
        self.voice_model_dir.mkdir(parents=True, exist_ok=True)


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    if settings.is_production and settings.jwt_secret.startswith("change-me"):
        logging.getLogger(__name__).warning(
            "JWT_SECRET is still the development default; set a strong secret before launch."
        )
    return settings
