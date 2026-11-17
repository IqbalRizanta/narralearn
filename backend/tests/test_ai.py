from __future__ import annotations

import pytest
from app.core.config import get_settings
from app.db.models import StyleMode
from app.providers.ai import AIRequest, MockAIProvider, gemini_module_response_schema
from app.schemas.module import ModuleContent, SourceCitation
from pydantic import ValidationError


async def test_mock_ai_produces_schema_valid_module() -> None:
    provider = MockAIProvider(get_settings())
    result = await provider.generate(
        AIRequest(
            mode=StyleMode.GAMING,
            title="Algoritma dan Struktur Data",
            document_text=(
                "Algoritma adalah urutan langkah logis untuk menyelesaikan masalah. "
                "Struktur data mengatur cara data disimpan agar efisien. "
                "Kompleksitas waktu mengukur pertumbuhan waktu eksekusi."
            ),
            transcript="Dosen menjelaskan bahwa latihan soal penting untuk memahami kompleksitas.",
            glossary=["algoritma", "kompleksitas"],
            citations=[
                SourceCitation(id="doc:1", label="slide.pdf", kind="document"),
                SourceCitation(id="audio:0", label="Transkrip 00:00", kind="audio"),
            ],
        )
    )
    content = result.content
    assert content.title.startswith("Gaming:")
    assert len(content.sections) == 3
    assert len(content.quiz) == 3
    assert content.study_method.name
    assert content.glossary
    assert result.model_name == "mock-narralearn"
    assert content.citations[0].id == "doc:1"


def test_module_rejects_unknown_citation_refs() -> None:
    with pytest.raises(ValidationError):
        ModuleContent.model_validate(
            {
                "schema_version": "1.0",
                "title": "Test",
                "summary": "Ringkasan yang cukup panjang untuk validasi schema.",
                "sections": [
                    {
                        "heading": "Bagian",
                        "blocks": [
                            {
                                "type": "paragraph",
                                "text": "Teks yang merujuk ke sumber yang tidak ada.",
                                "source_refs": ["doc:999"],
                            }
                        ],
                    }
                ],
                "study_method": {
                    "name": "Active Recall",
                    "why": "Menguji pemahaman.",
                    "steps": ["Tutup materi"],
                    "source_refs": [],
                },
                "quiz": [
                    {
                        "id": f"q{i}",
                        "question": "Pertanyaan?",
                        "options": ["A", "B", "C"],
                        "answer_index": 0,
                        "explanation": "Karena A.",
                        "source_refs": [],
                    }
                    for i in range(3)
                ],
                "citations": [],
            }
        )


def test_gemini_response_schema_covers_module_content() -> None:
    schema = gemini_module_response_schema()
    assert schema["type"] == "OBJECT"
    assert set(schema["required"]) == set(ModuleContent.model_fields.keys())
    block_types = schema["properties"]["sections"]["items"]["properties"]["blocks"]["items"]["properties"]["type"]
    assert block_types["enum"] == ["paragraph", "callout", "formula", "example", "quote"]
