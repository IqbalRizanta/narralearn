from __future__ import annotations

from pathlib import Path

import pytest
from app.services.documents import (
    ScannedDocumentError,
    UnsupportedDocumentError,
    extract_document,
)

from tests.conftest import make_blank_pdf_bytes, make_pdf_bytes, make_pptx_bytes


def test_extract_pdf_text(tmp_path: Path) -> None:
    path = tmp_path / "materi.pdf"
    path.write_bytes(make_pdf_bytes("Algoritma dan struktur data dibahas di sini."))
    result = extract_document(path)
    assert result.page_count == 1
    assert "Algoritma" in result.text


def test_extract_pptx_text(tmp_path: Path) -> None:
    path = tmp_path / "materi.pptx"
    path.write_bytes(make_pptx_bytes())
    result = extract_document(path)
    assert result.page_count == 1
    assert "Algoritma" in result.text


def test_scanned_pdf_is_rejected(tmp_path: Path) -> None:
    path = tmp_path / "scan.pdf"
    path.write_bytes(make_blank_pdf_bytes())
    with pytest.raises(ScannedDocumentError):
        extract_document(path)


def test_unsupported_document_is_rejected(tmp_path: Path) -> None:
    path = tmp_path / "notes.txt"
    path.write_text("hello", encoding="utf-8")
    with pytest.raises(UnsupportedDocumentError):
        extract_document(path)
