from __future__ import annotations

import math
from pathlib import Path

import numpy as np
from app.core.config import get_settings
from app.providers.voice import HeuristicVoiceProvider, decode_embedding, encode_embedding
from app.services.audio import decode_to_mono16k
from httpx import AsyncClient

from tests.conftest import auth_header, make_wav_bytes, register


def _tone(seconds: float, amplitude: float = 0.25, frequency: float = 220.0) -> np.ndarray:
    sample_rate = 16_000
    t = np.arange(int(seconds * sample_rate), dtype=np.float32) / sample_rate
    return (amplitude * np.sin(2 * math.pi * frequency * t)).astype(np.float32)


def test_heuristic_voice_scores_clean_speech_higher_than_noise() -> None:
    provider = HeuristicVoiceProvider(get_settings())
    clean = provider.analyze(_tone(9.0))
    assert clean.score >= 80
    assert clean.ready is True
    assert clean.dimension == 32
    assert len(clean.embedding) == 32
    assert clean.speech_seconds >= 8.0
    assert clean.snr_db > 8.0

    rng = np.random.default_rng(3)
    noisy = provider.analyze((_tone(9.0, 0.08) + 0.08 * rng.standard_normal(9 * 16_000)).astype(np.float32))
    assert clean.score > noisy.score
    assert "Mode demo" in " ".join(clean.warnings)


def test_heuristic_voice_silence_is_zero() -> None:
    provider = HeuristicVoiceProvider(get_settings())
    result = provider.analyze(np.zeros(16_000 * 3, dtype=np.float32))
    assert result.score == 0
    assert result.speech_seconds == 0
    assert result.ready is False


def test_embedding_roundtrip() -> None:
    values = [0.1, 0.2, 0.3, 0.4]
    encoded = encode_embedding(values)
    decoded = decode_embedding(encoded)
    assert np.allclose(decoded, values)


def test_decode_wav_to_16k(tmp_path: Path) -> None:
    path = tmp_path / "voice.wav"
    path.write_bytes(make_wav_bytes(duration=2.0))
    samples = decode_to_mono16k(path)
    assert samples.dtype == np.float32
    assert 31_000 <= samples.size <= 33_000


async def test_voice_analyze_endpoint(client: AsyncClient) -> None:
    data = await register(client)
    response = await client.post(
        "/api/v1/voice/analyze",
        headers=auth_header(data["access_token"]),
        files={"file": ("voice.wav", make_wav_bytes(duration=2.0), "audio/wav")},
    )
    assert response.status_code == 200, response.text
    payload = response.json()
    assert 0 <= payload["score"] <= 100
    assert payload["dimension"] == 32
    assert payload["embedding"]
    assert payload["provider"] == "heuristic-v1"
