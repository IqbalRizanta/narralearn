from __future__ import annotations

import io
import math
import os
import uuid
import wave
from collections.abc import AsyncIterator
from pathlib import Path

import numpy as np
import pytest
from asgi_lifespan import LifespanManager
from httpx import ASGITransport, AsyncClient

TEST_DIR = Path(__file__).parent
(TEST_DIR / ".tmp").mkdir(exist_ok=True)
TMP_ROOT = TEST_DIR / ".tmp" / "pytest"
TMP_ROOT.mkdir(parents=True, exist_ok=True)
TEST_DB = TEST_DIR / ".tmp" / "narralearn-test.db"
TEST_DB.unlink(missing_ok=True)

os.environ.update(
    {
        "ENVIRONMENT": "test",
        "DEBUG": "false",
        "DATABASE_URL": f"sqlite+aiosqlite:///{TEST_DB.as_posix()}",
        "QUEUE_MODE": "manual",
        "JWT_SECRET": "test-secret-test-secret-test-secret-123456",
        "AUTO_CREATE_TABLES": "true",
        "RATE_LIMIT_ENABLED": "false",
        "AI_PROVIDER": "mock",
        "STT_PROVIDER": "mock",
        "VOICE_PROVIDER": "heuristic",
        "UPLOAD_DIR": (TEST_DIR / ".tmp" / "uploads").as_posix(),
        "ENABLE_DOCS": "false",
        "CORS_ORIGINS": '["http://localhost:5173","http://test"]',
    }
)


@pytest.fixture
def tmp_path() -> Path:
    """Local tmp_path replacement; the system temp dir is very slow here."""
    path = TMP_ROOT / f"case-{uuid.uuid4().hex[:12]}"
    path.mkdir(parents=True, exist_ok=True)
    return path


@pytest.fixture
async def app_instance() -> AsyncIterator:
    from app.db.models import Base
    from app.db.session import engine
    from app.main import app as fastapi_app

    async with LifespanManager(fastapi_app, startup_timeout=30):
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.drop_all)
            await connection.run_sync(Base.metadata.create_all)
        yield fastapi_app


@pytest.fixture
async def client(app_instance) -> AsyncIterator[AsyncClient]:
    transport = ASGITransport(app=app_instance)
    async with AsyncClient(
        transport=transport,
        base_url="http://test",
        headers={"Origin": "http://localhost:5173"},
    ) as http_client:
        yield http_client


async def register(
    client: AsyncClient,
    *,
    email: str | None = None,
    password: str = "password12345",
    consent: bool = True,
) -> dict:
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Rani Belajar",
            "email": email or f"user-{uuid.uuid4().hex[:10]}@example.com",
            "password": password,
            "consent_accepted": consent,
            "consent_version": "1.0",
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def make_pdf_bytes(text: str = "NarraLearn menjelaskan konsep dasar algoritma.") -> bytes:
    from reportlab.pdfgen import canvas

    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer)
    pdf.drawString(72, 720, text)
    pdf.showPage()
    pdf.save()
    return buffer.getvalue()


def make_blank_pdf_bytes() -> bytes:
    from pypdf import PdfWriter

    buffer = io.BytesIO()
    writer = PdfWriter()
    writer.add_blank_page(width=612, height=792)
    writer.write(buffer)
    return buffer.getvalue()


def make_pptx_bytes(text: str = "Algoritma adalah urutan langkah untuk menyelesaikan masalah.") -> bytes:
    from pptx import Presentation
    from pptx.util import Inches

    presentation = Presentation()
    slide = presentation.slides.add_slide(presentation.slide_layouts[6])
    textbox = slide.shapes.add_textbox(Inches(1), Inches(1), Inches(8), Inches(2))
    textbox.text_frame.text = text
    buffer = io.BytesIO()
    presentation.save(buffer)
    return buffer.getvalue()


def make_wav_bytes(
    *,
    duration: float = 3.0,
    frequency: float = 440.0,
    noise: float = 0.0,
    sample_rate: int = 16_000,
) -> bytes:
    samples = int(duration * sample_rate)
    t = np.arange(samples, dtype=np.float64) / sample_rate
    signal = 0.25 * np.sin(2 * math.pi * frequency * t)
    if noise:
        rng = np.random.default_rng(7)
        signal = signal + noise * rng.standard_normal(samples)
    pcm = (np.clip(signal, -1.0, 1.0) * 32767).astype(np.int16)
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as handle:
        handle.setnchannels(1)
        handle.setsampwidth(2)
        handle.setframerate(sample_rate)
        handle.writeframes(pcm.tobytes())
    return buffer.getvalue()
