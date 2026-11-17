from __future__ import annotations

import logging
import threading
from dataclasses import dataclass, field
from pathlib import Path

from app.core.config import Settings
from app.core.errors import ProviderUnavailableError
from app.services.audio import inspect_audio

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class TranscriptSegment:
    start: float
    end: float
    text: str


@dataclass(slots=True)
class TranscriptResult:
    text: str
    segments: list[TranscriptSegment]
    language: str
    duration_seconds: float | None
    provider: str
    warnings: list[str] = field(default_factory=list)


class MockSTTProvider:
    name = "mock-stt"

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def transcribe(self, path: Path, glossary: list[str] | None = None) -> TranscriptResult:
        info = inspect_audio(path)
        duration = info.duration_seconds or 60.0
        glossary_text = ", ".join(glossary or []) or "materi perkuliahan"
        base = (
            "Ini adalah transkrip demo karena STT_PROVIDER=mock. "
            f"Materi membahas {glossary_text}. "
            "Aktifkan Faster-Whisper untuk transkripsi nyata pada audio Anda."
        )
        third = duration / 3.0
        segments = [
            TranscriptSegment(0.0, third, base),
            TranscriptSegment(
                third,
                third * 2,
                "Poin utama: pahami definisi, konteks, dan contoh penerapan dari materi.",
            ),
            TranscriptSegment(
                third * 2,
                duration,
                "Latihan: jelaskan ulang konsep dengan kata sendiri dan uji dengan pertanyaan.",
            ),
        ]
        return TranscriptResult(
            text=" ".join(segment.text for segment in segments),
            segments=segments,
            language="id",
            duration_seconds=duration,
            provider=self.name,
            warnings=["Mode demo: transkrip tidak berasal dari audio asli."],
        )


class FasterWhisperSTTProvider:
    name = "faster-whisper"

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._model = None
        self._lock = threading.Lock()

    def _load(self):
        if self._model is not None:
            return self._model
        try:
            from faster_whisper import WhisperModel
        except ImportError as exc:
            raise ProviderUnavailableError(
                "faster-whisper belum terpasang. Jalankan `uv sync --extra ai`."
            ) from exc
        with self._lock:
            if self._model is None:
                self._model = WhisperModel(
                    self.settings.whisper_model,
                    device=self.settings.whisper_device,
                    compute_type=self.settings.whisper_compute_type,
                )
        return self._model

    def transcribe(self, path: Path, glossary: list[str] | None = None) -> TranscriptResult:
        model = self._load()
        prompt = ", ".join(glossary or []) or None
        segments, info = model.transcribe(
            str(path),
            language="id",
            beam_size=5,
            vad_filter=True,
            vad_parameters={"min_silence_duration_ms": 500},
            condition_on_previous_text=False,
            initial_prompt=prompt,
            word_timestamps=False,
        )
        collected: list[TranscriptSegment] = []
        for segment in segments:
            text = segment.text.strip()
            if text:
                collected.append(
                    TranscriptSegment(
                        start=float(segment.start),
                        end=float(segment.end),
                        text=text,
                    )
                )
        text = " ".join(segment.text for segment in collected).strip()
        if not text:
            raise ProviderUnavailableError("Transkripsi kosong; audio mungkin tidak mengandung suara.")
        return TranscriptResult(
            text=text,
            segments=collected,
            language=getattr(info, "language", "id") or "id",
            duration_seconds=getattr(info, "duration", None),
            provider=self.name,
        )


def get_stt_provider(settings: Settings):
    if settings.stt_provider == "faster_whisper":
        return FasterWhisperSTTProvider(settings)
    return MockSTTProvider(settings)
