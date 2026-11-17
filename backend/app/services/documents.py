from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from pptx import Presentation
from pypdf import PdfReader


class DocumentError(Exception):
    code = "DOCUMENT_ERROR"

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class UnsupportedDocumentError(DocumentError):
    code = "UNSUPPORTED_FORMAT"


class EncryptedDocumentError(DocumentError):
    code = "PDF_ENCRYPTED"


class ScannedDocumentError(DocumentError):
    code = "SCANNED_PDF"


class DocumentLimitError(DocumentError):
    code = "DOCUMENT_LIMIT"


@dataclass(slots=True)
class ExtractedDocument:
    text: str
    page_count: int
    metadata: dict[str, Any] = field(default_factory=dict)


_WHITESPACE = re.compile(r"[ \t\u00a0]+")
_MULTI_NEWLINE = re.compile(r"\n{3,}")


def normalize_text(text: str) -> str:
    text = text.replace("\x00", " ")
    text = _WHITESPACE.sub(" ", text)
    text = _MULTI_NEWLINE.sub("\n\n", text)
    return text.strip()


def extract_pdf(path: Path, max_pages: int) -> ExtractedDocument:
    try:
        reader = PdfReader(str(path))
    except Exception as exc:
        raise UnsupportedDocumentError("PDF tidak dapat dibaca atau rusak.") from exc

    if reader.is_encrypted:
        raise EncryptedDocumentError("PDF terenkripsi. Hapus proteksi lalu unggah ulang.")

    pages = len(reader.pages)
    if pages > max_pages:
        raise DocumentLimitError(f"PDF memiliki {pages} halaman; maksimal {max_pages}.")

    chunks: list[str] = []
    empty_pages = 0
    for index, page in enumerate(reader.pages, start=1):
        try:
            page_text = page.extract_text() or ""
        except Exception:
            page_text = ""
        if not page_text.strip():
            empty_pages += 1
        chunks.append(f"\n\n[Slide/Page {index}]\n{page_text.strip()}")

    text = normalize_text("\n".join(chunks))
    if not text or empty_pages == pages:
        raise ScannedDocumentError(
            "PDF tampaknya berupa hasil scan (tidak ada teks). OCR belum tersedia di MVP."
        )

    return ExtractedDocument(
        text=text,
        page_count=pages,
        metadata={"kind": "pdf", "empty_pages": empty_pages},
    )


def _shape_texts(shape: Any) -> list[str]:
    texts: list[str] = []
    if getattr(shape, "has_text_frame", False):
        value = shape.text_frame.text.strip()
        if value:
            texts.append(value)
    if getattr(shape, "has_table", False):
        for row in shape.table.rows:
            cells = [cell.text.strip() for cell in row.cells if cell.text.strip()]
            if cells:
                texts.append(" | ".join(cells))
    if getattr(shape, "shape_type", None) == 6:  # group
        for child in shape.shapes:
            texts.extend(_shape_texts(child))
    return texts


def extract_pptx(path: Path, max_slides: int) -> ExtractedDocument:
    try:
        presentation = Presentation(str(path))
    except Exception as exc:
        raise UnsupportedDocumentError("PPTX tidak dapat dibaca atau rusak.") from exc

    slides = len(presentation.slides)
    if slides > max_slides:
        raise DocumentLimitError(f"PPTX memiliki {slides} slide; maksimal {max_slides}.")

    chunks: list[str] = []
    for index, slide in enumerate(presentation.slides, start=1):
        texts: list[str] = []
        for shape in slide.shapes:
            texts.extend(_shape_texts(shape))
        if slide.has_notes_slide:
            notes = slide.notes_slide.notes_text_frame.text.strip()
            if notes:
                texts.append(f"[Catatan Presenter]\n{notes}")
        if texts:
            chunks.append(f"\n\n[Slide {index}]\n" + "\n".join(texts))

    text = normalize_text("\n".join(chunks))
    if not text:
        raise ScannedDocumentError(
            "PPTX tidak memiliki teks yang bisa diekstrak. Ubah slide menjadi teks atau PDF."
        )

    return ExtractedDocument(
        text=text,
        page_count=slides,
        metadata={"kind": "pptx", "empty_slides": max(0, slides - len(chunks))},
    )


def extract_document(
    path: Path,
    *,
    max_pdf_pages: int = 100,
    max_pptx_slides: int = 200,
    max_chars: int = 300_000,
) -> ExtractedDocument:
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        result = extract_pdf(path, max_pdf_pages)
    elif suffix == ".pptx":
        result = extract_pptx(path, max_pptx_slides)
    else:
        raise UnsupportedDocumentError(f"Format dokumen {suffix} tidak didukung.")

    if len(result.text) > max_chars:
        result.text = result.text[:max_chars]
        result.metadata["truncated"] = True
    return result
