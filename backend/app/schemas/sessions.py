from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.db.models import SessionStatus, SourceType, StyleMode
from app.schemas.jobs import JobOut


class SessionCreateResponse(BaseModel):
    session_id: uuid.UUID
    job_id: uuid.UUID


class SessionDocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    file_name: str
    page_count: int | None = None
    file_size_bytes: int | None = None
    mime_type: str | None = None
    uploaded_at: datetime


class ModuleSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    style_mode: StyleMode
    recommended_method: str | None = None
    schema_version: str
    status: str
    created_at: datetime


class SessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    speaker_label: str | None = None
    source_type: SourceType
    status: SessionStatus
    error_code: str | None = None
    error_message: str | None = None
    audio_duration_seconds: float | None = None
    language: str
    raw_transcript: str | None = None
    created_at: datetime
    updated_at: datetime
    documents: list[SessionDocumentOut] = Field(default_factory=list)
    modules: list[ModuleSummary] = Field(default_factory=list)
    latest_job: JobOut | None = None


class SessionListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    speaker_label: str | None = None
    source_type: SourceType
    status: SessionStatus
    error_code: str | None = None
    audio_duration_seconds: float | None = None
    created_at: datetime
    updated_at: datetime
    module_count: int = 0
    latest_job: JobOut | None = None


class SessionListResponse(BaseModel):
    items: list[SessionListItem]
    next_cursor: str | None = None


class SessionUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    raw_transcript: str | None = Field(default=None, max_length=300_000)


class ModuleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    session_id: uuid.UUID
    style_mode: StyleMode
    content_json: dict = Field(default_factory=dict)
    quiz_json: list[dict] = Field(default_factory=list)
    recommended_method: str | None = None
    method_action_items: list | None = None
    schema_version: str
    model_name: str | None = None
    prompt_version: str | None = None
    status: str
    created_at: datetime


class ModuleSwitchRequest(BaseModel):
    style_mode: StyleMode
    regenerate: bool = False


class ModuleSwitchResponse(BaseModel):
    status: str
    job_id: uuid.UUID | None = None
    module: ModuleOut | None = None


class ProgressUpdateRequest(BaseModel):
    last_read_at: datetime | None = None
    quiz_score: float | None = Field(default=None, ge=0, le=100)
    answers: dict | None = None
