from __future__ import annotations

import logging
import wave
from dataclasses import dataclass
from pathlib import Path

import av
import numpy as np
from mutagen import File as MutagenFile

logger = logging.getLogger(__name__)

TARGET_SAMPLE_RATE = 16_000


@dataclass(slots=True)
class AudioInfo:
    duration_seconds: float | None
    sample_rate: int | None
    channels: int | None
    codec: str | None


def inspect_audio(path: Path) -> AudioInfo:
    try:
        with av.open(str(path)) as container:
            duration = (
                float(container.duration / av.time_base) if container.duration is not None else None
            )
            stream = next((item for item in container.streams if item.type == "audio"), None)
            if stream is None:
                return AudioInfo(duration, None, None, None)
            return AudioInfo(
                duration_seconds=duration,
                sample_rate=stream.rate,
                channels=stream.channels,
                codec=stream.codec_context.name,
            )
    except Exception:
        logger.debug("av could not inspect %s; trying mutagen", path, exc_info=True)

    try:
        media = MutagenFile(str(path))
        if media is not None and media.info is not None:
            info = media.info
            return AudioInfo(
                duration_seconds=float(getattr(info, "length", 0.0)) or None,
                sample_rate=getattr(info, "sample_rate", None),
                channels=getattr(info, "channels", None),
                codec=type(media).__name__.lower(),
            )
    except Exception:
        logger.warning("Could not inspect audio metadata for %s", path, exc_info=True)

    return AudioInfo(None, None, None, None)


def decode_to_mono16k(path: Path) -> np.ndarray:
    """Decode any supported audio file to mono float32 at 16 kHz."""
    chunks: list[np.ndarray] = []
    with av.open(str(path)) as container:
        stream = next((item for item in container.streams if item.type == "audio"), None)
        if stream is None:
            raise ValueError("File tidak memiliki stream audio.")
        resampler = av.AudioResampler(format="flt", layout="mono", rate=TARGET_SAMPLE_RATE)
        for frame in container.decode(stream):
            for converted in resampler.resample(frame):
                chunks.append(converted.to_ndarray().reshape(-1))
        for converted in resampler.resample(None):
            chunks.append(converted.to_ndarray().reshape(-1))

    if not chunks:
        return np.zeros(0, dtype=np.float32)
    samples = np.concatenate(chunks).astype(np.float32, copy=False)
    return np.clip(samples, -1.0, 1.0)


def resample_linear(samples: np.ndarray, source_rate: int, target_rate: int = TARGET_SAMPLE_RATE) -> np.ndarray:
    if source_rate == target_rate or samples.size == 0:
        return samples.astype(np.float32, copy=False)
    duration = samples.size / float(source_rate)
    target_length = max(1, int(round(duration * target_rate)))
    source_positions = np.linspace(0.0, samples.size - 1, num=target_length, dtype=np.float64)
    return np.interp(source_positions, np.arange(samples.size), samples).astype(np.float32)


def write_wav_mono16k(path: Path, samples: np.ndarray) -> None:
    clipped = np.clip(samples, -1.0, 1.0)
    pcm = (clipped * 32767.0).astype(np.int16)
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as handle:
        handle.setnchannels(1)
        handle.setsampwidth(2)
        handle.setframerate(TARGET_SAMPLE_RATE)
        handle.writeframes(pcm.tobytes())
