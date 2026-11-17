from __future__ import annotations

import asyncio
import re
import uuid
from dataclasses import dataclass
from pathlib import Path, PurePosixPath
from typing import Literal

import aiofiles
from fastapi import UploadFile

from app.core.config import Settings
from app.core.errors import AppError

AUDIO_EXTENSIONS = {".mp3", ".wav", ".m4a", ".ogg", ".webm", ".mp4", ".aac", ".flac"}
DOCUMENT_EXTENSIONS = {".pdf", ".pptx"}

_UNSAFE_NAME = re.compile(r"[^A-Za-z0-9._-]+")


@dataclass(slots=True)
class SavedUpload:
    path: Path
    relative_path: str
    original_name: str
    size_bytes: int
    mime_type: str


def safe_filename(name: str) -> str:
    base = PurePosixPath(name.replace("\\", "/")).name
    base = _UNSAFE_NAME.sub("_", base).strip("._") or "upload"
    return base[:180]


def _audio_magic_ok(header: bytes) -> bool:
    if len(header) < 12:
        return False
    if header.startswith(b"\x1aE\xdf\xa3"):  # WebM/Matroska
        return True
    if header.startswith(b"RIFF") and header[8:12] == b"WAVE":
        return True
    if header.startswith(b"OggS"):
        return True
    if header.startswith(b"ID3"):
        return True
    if header[0] == 0xFF and header[1] in {0xFB, 0xF3, 0xF2, 0xF1, 0xF9}:
        return True
    if header[4:8] == b"ftyp":  # MP4/M4A
        return True
    return bool(header.startswith(b"fLaC"))


def _document_magic_ok(header: bytes) -> bool:
    return bool(header.startswith(b"%PDF") or header.startswith(b"PK\x03\x04"))


class LocalStorage:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        settings.ensure_dirs()

    async def save_upload(
        self,
        upload: UploadFile,
        *,
        kind: Literal["audio", "document"],
        max_bytes: int,
    ) -> SavedUpload:
        original = safe_filename(upload.filename or "upload")
        suffix = Path(original).suffix.lower()
        allowed = AUDIO_EXTENSIONS if kind == "audio" else DOCUMENT_EXTENSIONS
        if suffix not in allowed:
            raise AppError(
                415,
                "UNSUPPORTED_FORMAT",
                "Format tidak didukung",
                f"Format {suffix or '(kosong)'} tidak didukung. Gunakan: {', '.join(sorted(allowed))}.",
            )

        subdir = "audio" if kind == "audio" else "documents"
        target = self.settings.upload_path / subdir / f"{uuid.uuid4().hex}{suffix}"
        target.parent.mkdir(parents=True, exist_ok=True)

        size = 0
        header = b""
        try:
            async with aiofiles.open(target, "wb") as handle:
                while True:
                    chunk = await upload.read(1024 * 1024)
                    if not chunk:
                        break
                    if not header:
                        header = chunk[:32]
                    size += len(chunk)
                    if size > max_bytes:
                        raise AppError(
                            413,
                            "FILE_TOO_LARGE",
                            "File terlalu besar",
                            f"Ukuran maksimal {max_bytes // (1024 * 1024)} MB.",
                        )
                    await handle.write(chunk)
        except Exception:
            target.unlink(missing_ok=True)
            raise
        finally:
            await upload.close()

        if size == 0:
            target.unlink(missing_ok=True)
            raise AppError(422, "EMPTY_FILE", "File kosong", "File yang diunggah kosong.")

        valid = _audio_magic_ok(header) if kind == "audio" else _document_magic_ok(header)
        if not valid:
            target.unlink(missing_ok=True)
            raise AppError(
                415,
                "UNSUPPORTED_FORMAT",
                "Isi file tidak cocok",
                "File tidak sesuai dengan ekstensinya atau rusak.",
            )

        relative = target.relative_to(self.settings.upload_path).as_posix()
        return SavedUpload(
            path=target,
            relative_path=relative,
            original_name=original,
            size_bytes=size,
            mime_type=upload.content_type or "application/octet-stream",
        )

    def resolve(self, relative_path: str) -> Path:
        candidate = (self.settings.upload_path / relative_path).resolve()
        if not candidate.is_relative_to(self.settings.upload_path):
            raise AppError(400, "INVALID_PATH", "Path tidak valid", "Path file tidak diizinkan.")
        if not candidate.exists():
            raise AppError(404, "FILE_NOT_FOUND", "File tidak ditemukan", "File sementara hilang.")
        return candidate

    def delete_relative(self, relative_path: str | None) -> None:
        if not relative_path:
            return
        try:
            candidate = (self.settings.upload_path / relative_path).resolve()
            if candidate.is_relative_to(self.settings.upload_path):
                candidate.unlink(missing_ok=True)
        except OSError:
            pass

    async def cleanup_old_files(self, hours: int) -> int:
        def _cleanup() -> int:
            import time

            cutoff = time.time() - hours * 3600
            removed = 0
            for path in self.settings.upload_path.rglob("*"):
                if path.is_file() and path.stat().st_mtime < cutoff:
                    try:
                        path.unlink()
                        removed += 1
                    except OSError:
                        pass
            return removed

        return await asyncio.to_thread(_cleanup)
