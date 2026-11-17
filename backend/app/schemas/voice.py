from __future__ import annotations

from pydantic import BaseModel, Field


class VoiceTicketResponse(BaseModel):
    ticket: str
    expires_in: int = 60


class VoiceAnalysisResponse(BaseModel):
    score: float = Field(ge=0, le=100)
    speech_seconds: float
    snr_db: float
    stability: float
    embedding: str
    dimension: int
    provider: str
    ready: bool
    status: str
    warnings: list[str] = Field(default_factory=list)


class VoiceProgressMessage(BaseModel):
    type: str = "progress"
    percentage: float
    status: str
    ready: bool
