from __future__ import annotations

import base64
import logging
import math
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np

from app.core.config import Settings
from app.services.audio import TARGET_SAMPLE_RATE, decode_to_mono16k, write_wav_mono16k

logger = logging.getLogger(__name__)


def encode_embedding(values: list[float]) -> str:
    array = np.asarray(values, dtype=np.float32)
    return base64.b64encode(array.tobytes()).decode("ascii")


def decode_embedding(value: str) -> np.ndarray:
    raw = base64.b64decode(value.encode("ascii"), validate=True)
    return np.frombuffer(raw, dtype=np.float32)


@dataclass(slots=True)
class VoiceAnalysis:
    score: float
    speech_seconds: float
    snr_db: float
    stability: float
    embedding: list[float]
    dimension: int
    provider: str
    ready: bool
    status: str
    warnings: list[str] = field(default_factory=list)


@dataclass(slots=True)
class FilterResult:
    path: Path | None
    applied: bool
    reason: str | None = None
    kept: int = 0
    total: int = 0


class VoiceProvider:
    name = "base"

    def analyze(self, samples: np.ndarray, sample_rate: int = TARGET_SAMPLE_RATE) -> VoiceAnalysis:
        raise NotImplementedError

    def embed(self, samples: np.ndarray, sample_rate: int = TARGET_SAMPLE_RATE) -> list[float]:
        raise NotImplementedError

    def filter_file(self, path: Path, target_embedding: str) -> FilterResult:
        return FilterResult(path=path, applied=False, reason="speaker_filter_not_supported")


class HeuristicVoiceProvider(VoiceProvider):
    """Quality score + spectral fingerprint for demo/local use.

    This is NOT biometric speaker verification. It measures speech activity,
    estimated SNR, and short-term spectral stability. It is intentionally
    dependency-light so the app runs without torch/speechbrain.
    """

    name = "heuristic-v1"
    frame_size = 400  # 25 ms @ 16 kHz
    hop_size = 160  # 10 ms
    bands = 24
    dimension = 32

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def _frames(self, samples: np.ndarray) -> list[np.ndarray]:
        if samples.size < self.frame_size:
            return []
        return [
            samples[start : start + self.frame_size]
            for start in range(0, samples.size - self.frame_size + 1, self.hop_size)
        ]

    @staticmethod
    def _rms(frame: np.ndarray) -> float:
        return float(np.sqrt(np.mean(np.square(frame), dtype=np.float64)) + 1e-12)

    def _features(self, frame: np.ndarray, sample_rate: int) -> np.ndarray:
        windowed = frame * np.hanning(frame.size)
        spectrum = np.abs(np.fft.rfft(windowed))
        freqs = np.fft.rfftfreq(frame.size, d=1.0 / sample_rate)
        nyquist = sample_rate / 2.0
        total = float(spectrum.sum()) + 1e-12

        edges = np.geomspace(80.0, max(160.0, min(7600.0, nyquist)), num=self.bands + 1)
        mel = np.zeros(self.bands, dtype=np.float32)
        for index in range(self.bands):
            mask = (freqs >= edges[index]) & (freqs < edges[index + 1])
            if mask.any():
                mel[index] = float(np.log1p(spectrum[mask].mean() * 10.0))
        norm = float(np.linalg.norm(mel)) + 1e-9
        mel = mel / norm if norm > 0 else mel

        centroid = float((freqs * spectrum).sum() / total) / max(nyquist, 1.0)
        cumulative = np.cumsum(spectrum)
        rolloff_index = int(np.searchsorted(cumulative, 0.85 * cumulative[-1])) if cumulative.size else 0
        rolloff = float(freqs[min(rolloff_index, freqs.size - 1)]) / max(nyquist, 1.0)
        signs = np.signbit(frame)
        zcr = float(np.mean(signs[1:] != signs[:-1])) if frame.size > 1 else 0.0
        rms = self._rms(frame)
        peak = float(np.max(np.abs(frame))) if frame.size else 0.0
        bandwidth = float(
            np.sqrt((((freqs - centroid * nyquist) ** 2) * spectrum).sum() / total)
        ) / max(nyquist, 1.0)
        flatness = float(
            np.exp(np.mean(np.log(spectrum + 1e-12))) / (np.mean(spectrum) + 1e-12)
        )
        crest = min(peak / (rms + 1e-9) / 10.0, 1.0)

        extras = np.array(
            [centroid, rolloff, zcr, min(rms * 4.0, 1.0), min(peak, 1.0), bandwidth, flatness, crest],
            dtype=np.float32,
        )
        return np.concatenate([mel, extras]).astype(np.float32)

    def analyze(self, samples: np.ndarray, sample_rate: int = TARGET_SAMPLE_RATE) -> VoiceAnalysis:
        samples = np.asarray(samples, dtype=np.float32).reshape(-1)
        if sample_rate != TARGET_SAMPLE_RATE:
            # Callers should resample; avoid silent wrong-scale analysis.
            raise ValueError("Voice analysis expects 16 kHz mono samples.")

        if samples.size > TARGET_SAMPLE_RATE * 30:
            samples = samples[-TARGET_SAMPLE_RATE * 30 :]

        frames = self._frames(samples)
        if not frames:
            return self._empty_analysis()

        rms_values = np.array([self._rms(frame) for frame in frames], dtype=np.float32)
        noise_floor = float(np.percentile(rms_values, 10))
        loud_floor = float(np.percentile(rms_values, 90))
        dynamic_range = loud_floor / max(noise_floor, 1e-9)

        # A steady tone (or a recording with no silent gaps) has a high noise
        # floor estimate. Use a lower VAD threshold in that case; otherwise the
        # analyzer would classify the entire signal as silence.
        if dynamic_range < 3.0 and noise_floor > 0.01:
            threshold = max(noise_floor * 0.5, 0.006)
            snr_noise_floor = max(noise_floor * 0.08, 0.001)
        else:
            threshold = max(noise_floor * 2.5, 0.006)
            snr_noise_floor = max(noise_floor, 0.001)

        speech_indices = np.where(rms_values > threshold)[0]
        if speech_indices.size == 0:
            return self._empty_analysis()

        speech_frames = [frames[int(index)] for index in speech_indices]
        speech_seconds = len(speech_frames) * self.hop_size / TARGET_SAMPLE_RATE
        speech_rms = float(np.mean(rms_values[speech_indices]))
        snr_db = 20.0 * math.log10(max(speech_rms, 1e-9) / max(snr_noise_floor, 1e-9))
        snr_db = float(np.clip(snr_db, -10.0, 40.0))

        feature_matrix = np.vstack(
            [self._features(frame, TARGET_SAMPLE_RATE) for frame in speech_frames]
        )
        embedding = feature_matrix.mean(axis=0)
        norm = float(np.linalg.norm(embedding)) + 1e-9
        embedding = embedding / norm

        window_frames = max(1, int(round(1.0 / (self.hop_size / TARGET_SAMPLE_RATE))))
        window_means: list[np.ndarray] = []
        for start in range(0, feature_matrix.shape[0], window_frames):
            chunk = feature_matrix[start : start + window_frames]
            if len(chunk) >= 2:
                window_means.append(chunk.mean(axis=0))
        if len(window_means) >= 2:
            global_mean = np.mean(window_means, axis=0)
            global_norm = float(np.linalg.norm(global_mean)) + 1e-9
            cosines = [
                float(np.dot(window, global_mean) / (np.linalg.norm(window) * global_norm + 1e-9))
                for window in window_means
            ]
            mean_cosine = float(np.clip(np.mean(cosines), 0.0, 1.0))
        else:
            mean_cosine = 0.5

        speech_score = min(speech_seconds / 8.0, 1.0) * 100.0
        snr_score = float(np.clip((snr_db - 5.0) / 15.0, 0.0, 1.0)) * 100.0
        stability_score = float(np.clip((mean_cosine - 0.5) / 0.5, 0.0, 1.0)) * 100.0
        clip_ratio = float(np.mean(np.abs(samples) > 0.98))
        clipping_penalty = min(clip_ratio * 40.0, 10.0)
        mean_flatness = float(np.mean(feature_matrix[:, self.bands + 6]))
        noise_penalty = min(mean_flatness * 40.0, 20.0)
        score = max(
            0.0,
            min(
                100.0,
                0.50 * speech_score
                + 0.30 * snr_score
                + 0.20 * stability_score
                - clipping_penalty
                - noise_penalty,
            ),
        )

        ready = (
            score >= self.settings.voice_ready_threshold
            and speech_seconds >= 8.0
            and snr_db >= 8.0
        )
        warnings = ["Mode demo: skor kualitas, bukan verifikasi biometrik."]
        if speech_seconds < 8.0:
            warnings.append("Rekam minimal 8 detik suara bersih.")
        if snr_db < 10.0:
            warnings.append("Suara latar terlalu bising; dekatkan mikrofon ke pemateri.")
        if clip_ratio > 0.02:
            warnings.append("Sinyal terlalu keras/clipping; kurangi volume input.")

        return VoiceAnalysis(
            score=round(score, 1),
            speech_seconds=round(speech_seconds, 2),
            snr_db=round(snr_db, 1),
            stability=round(mean_cosine, 3),
            embedding=embedding.astype(float).tolist(),
            dimension=self.dimension,
            provider=self.name,
            ready=ready,
            status=self._status(score),
            warnings=warnings,
        )

    def _status(self, score: float) -> str:
        if score < 40:
            return "Mendeteksi suara"
        if score < self.settings.voice_ready_threshold:
            return "Mengenali intonasi"
        return "Suara siap dikunci!"

    def _empty_analysis(self) -> VoiceAnalysis:
        return VoiceAnalysis(
            score=0.0,
            speech_seconds=0.0,
            snr_db=0.0,
            stability=0.0,
            embedding=[0.0] * self.dimension,
            dimension=self.dimension,
            provider=self.name,
            ready=False,
            status="Mendeteksi suara",
            warnings=["Belum ada suara yang terdeteksi."],
        )

    def embed(self, samples: np.ndarray, sample_rate: int = TARGET_SAMPLE_RATE) -> list[float]:
        return self.analyze(samples, sample_rate).embedding


class SpeechBrainVoiceProvider(HeuristicVoiceProvider):
    """Optional ECAPA-TDNN biometric provider.

    Requires the `ai` extra: speechbrain, torch, torchaudio. The model is loaded
    lazily; if loading fails, analysis falls back to heuristic quality scoring
    with a visible warning.
    """

    name = "speechbrain-ecapa-voxceleb"
    dimension = 192

    def __init__(self, settings: Settings) -> None:
        super().__init__(settings)
        self._model = None
        self._torch = None
        self._load_error: str | None = None

    def _load(self) -> bool:
        if self._model is not None:
            return True
        if self._load_error:
            return False
        try:
            import torch
            from speechbrain.inference.speaker import EncoderClassifier

            device = "cuda" if torch.cuda.is_available() else "cpu"
            self._torch = torch
            self._model = EncoderClassifier.from_hparams(
                source="speechbrain/spkrec-ecapa-voxceleb",
                savedir=str(self.settings.voice_model_dir),
                run_opts={"device": device},
            )
            self._model.eval()
            return True
        except Exception as exc:  # pragma: no cover - optional dependency
            self._load_error = str(exc)
            logger.warning("SpeechBrain unavailable, falling back to heuristic: %s", exc)
            return False

    def embed(self, samples: np.ndarray, sample_rate: int = TARGET_SAMPLE_RATE) -> list[float]:
        if not self._load() or self._torch is None or self._model is None:
            return super().embed(samples, sample_rate)
        waveform = self._torch.from_numpy(np.asarray(samples, dtype=np.float32)).unsqueeze(0)
        with self._torch.no_grad():
            embedding = self._model.encode_batch(waveform).detach().cpu().numpy().reshape(-1)
        norm = float(np.linalg.norm(embedding)) + 1e-9
        return (embedding / norm).astype(float).tolist()

    def analyze(self, samples: np.ndarray, sample_rate: int = TARGET_SAMPLE_RATE) -> VoiceAnalysis:
        base = super().analyze(samples, sample_rate)
        embedding = self.embed(samples, sample_rate)
        if len(embedding) == self.dimension:
            base.embedding = embedding
            base.dimension = self.dimension
            base.provider = self.name
            base.warnings = [
                warning
                for warning in base.warnings
                if not warning.startswith("Mode demo")
            ]
            base.warnings.append("Embedding ECAPA-TDNN aktif; skor kualitas tetap heuristik.")
        else:
            base.warnings.append("SpeechBrain gagal dimuat; memakai fingerprint heuristik.")
        return base

    def filter_file(self, path: Path, target_embedding: str) -> FilterResult:
        if not self._load():
            return FilterResult(
                path=path,
                applied=False,
                reason="speechbrain_unavailable",
            )
        try:
            target = decode_embedding(target_embedding)
            if target.size != self.dimension:
                return FilterResult(path=path, applied=False, reason="embedding_dimension_mismatch")

            samples = decode_to_mono16k(path)
            segment_size = TARGET_SAMPLE_RATE * 3
            hop_size = TARGET_SAMPLE_RATE * 3 // 2
            if samples.size < segment_size:
                segments = [samples]
            else:
                starts = list(range(0, samples.size - segment_size + 1, hop_size))
                if starts[-1] + segment_size < samples.size:
                    starts.append(max(0, samples.size - segment_size))
                segments = [samples[start : start + segment_size] for start in starts]

            kept: list[np.ndarray] = []
            for segment in segments:
                embedding = np.asarray(self.embed(segment), dtype=np.float32)
                if embedding.size != self.dimension:
                    continue
                similarity = float(
                    np.dot(embedding, target)
                    / (np.linalg.norm(embedding) * np.linalg.norm(target) + 1e-9)
                )
                if similarity >= self.settings.speaker_similarity_threshold:
                    kept.append(segment)

            if not kept or len(kept) / max(len(segments), 1) < 0.2:
                return FilterResult(
                    path=path,
                    applied=False,
                    reason="target_speaker_not_detected",
                    kept=len(kept),
                    total=len(segments),
                )

            filtered = np.concatenate(kept)
            output = path.with_name(f"{path.stem}-filtered.wav")
            write_wav_mono16k(output, filtered)
            return FilterResult(
                path=output,
                applied=True,
                reason="target_speaker_filtered",
                kept=len(kept),
                total=len(segments),
            )
        except Exception as exc:  # pragma: no cover - optional dependency
            logger.warning("Speaker filter failed: %s", exc)
            return FilterResult(path=path, applied=False, reason="speaker_filter_failed")


def get_voice_provider(settings: Settings) -> VoiceProvider:
    if settings.voice_provider == "speechbrain":
        return SpeechBrainVoiceProvider(settings)
    return HeuristicVoiceProvider(settings)
