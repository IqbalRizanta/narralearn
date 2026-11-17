from __future__ import annotations

import asyncio
import json
import logging
import re
import time
from dataclasses import dataclass, field
from typing import Any

import httpx

from app.core.config import Settings
from app.db.models import StyleMode
from app.schemas.module import (
    ContentBlock,
    ContentSection,
    GlossaryItem,
    ModuleContent,
    QuizItem,
    SourceCitation,
    StudyMethod,
)
from app.services.prompts import MODE_LABELS, build_prompts

logger = logging.getLogger(__name__)

_SENTENCE_SPLIT = re.compile(r"(?<=[.!?])\s+|\n+")
_TERM_RE = re.compile(r"\b[A-Z][A-Za-z0-9]{2,}\b")


class AIProviderError(Exception):
    def __init__(self, message: str, *, code: str = "AI_PROVIDER_ERROR", retryable: bool = False):
        super().__init__(message)
        self.message = message
        self.code = code
        self.retryable = retryable


@dataclass(slots=True)
class AIRequest:
    mode: StyleMode
    title: str
    document_text: str
    transcript: str
    glossary: list[str] = field(default_factory=list)
    citations: list[SourceCitation] = field(default_factory=list)


@dataclass(slots=True)
class AIResult:
    content: ModuleContent
    model_name: str
    prompt_version: str
    input_tokens: int | None = None
    output_tokens: int | None = None
    latency_ms: int | None = None


def _sentences(text: str, limit: int = 12) -> list[str]:
    cleaned = re.sub(r"\[(Slide|Page)\s+\d+\]", " ", text)
    parts = [part.strip(" -•\t") for part in _SENTENCE_SPLIT.split(cleaned)]
    result = [part for part in parts if len(part) >= 20]
    if len(result) < 3:
        result.extend(
            [
                "Materi ini menjelaskan konsep utama dan konteks penerapannya.",
                "Pahami definisi, contoh, dan langkah penyelesaian yang dibahas.",
                "Uji pemahaman dengan menjelaskan ulang materi menggunakan kata sendiri.",
            ]
        )
    return result[:limit]


def _clip(text: str, limit: int = 220) -> str:
    text = " ".join(text.split())
    if len(text) <= limit:
        return text
    return text[: limit - 1].rsplit(" ", 1)[0] + "…"


def _terms(text: str, glossary: list[str], limit: int = 6) -> list[str]:
    found: list[str] = []
    for term in glossary:
        term = term.strip()
        if term and term not in found:
            found.append(term)
    for match in _TERM_RE.findall(text):
        if match not in found:
            found.append(match)
        if len(found) >= limit:
            break
    return found[:limit]


def _method(text: str) -> StudyMethod:
    lowered = text.lower()
    if any(keyword in lowered for keyword in ("rumus", "hitung", "angka", "persamaan")):
        return StudyMethod(
            name="Active Recall + Latihan Soal",
            why="Materi berisi prosedur/angka; mengingat aktif dan latihan soal lebih efektif.",
            steps=[
                "Baca ringkasan lalu tutup materi.",
                "Tulis ulang rumus/langkah dari memori.",
                "Kerjakan 3 soal dan cek kesalahan.",
            ],
            source_refs=[],
        )
    if any(keyword in lowered for keyword in ("langkah", "proses", "tahap", "alur")):
        return StudyMethod(
            name="Feynman Technique",
            why="Materi berisi proses; menjelaskan ulang dengan bahasa sederhana mengungkap gap.",
            steps=[
                "Pilih satu proses lalu jelaskan seolah ke teman.",
                "Tandai bagian yang masih kabur.",
                "Kembali ke sumber dan ulangi tanpa catatan.",
            ],
            source_refs=[],
        )
    if any(keyword in lowered for keyword in ("definisi", "konsep", "teori", "istilah")):
        return StudyMethod(
            name="Chunking",
            why="Materi konseptual; memecah konsep besar menjadi bagian kecil memudahkan retensi.",
            steps=[
                "Kelompokkan istilah menjadi 3 chunk.",
                "Buat koneksi antar chunk.",
                "Uji tiap chunk sebelum menggabungkan.",
            ],
            source_refs=[],
        )
    return StudyMethod(
        name="Active Recall",
        why="Metode serbaguna untuk menguji pemahaman tanpa membaca ulang pasif.",
        steps=[
            "Tutup materi dan tulis 3 poin utama.",
            "Jawab pertanyaan kuis tanpa melihat.",
            "Buka sumber hanya untuk mengoreksi.",
        ],
        source_refs=[],
    )


class MockAIProvider:
    """Deterministic, schema-valid module generator for local/demo use."""

    name = "mock-narralearn"

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def generate(self, request: AIRequest) -> AIResult:
        started = time.perf_counter()
        citations = list(request.citations)
        if not citations:
            citations = [SourceCitation(id="source:1", label="Materi", kind="document")]
        ref = citations[0].id
        source_text = "\n".join(
            part for part in (request.document_text, request.transcript) if part
        ).strip()
        if not source_text:
            source_text = request.title
        sentences = _sentences(source_text)
        summary = " ".join(sentences[:2])
        if len(summary) < 40:
            summary = f"Modul demo untuk {request.title}. Aktifkan AI_PROVIDER=gemini untuk hasil nyata."

        section_titles = ["Gambaran Besar", "Konsep Kunci", "Cara Mengingat & Menerapkan"]
        sections: list[ContentSection] = []
        for index, heading in enumerate(section_titles):
            primary = sentences[index % len(sentences)]
            secondary = sentences[(index + 1) % len(sentences)]
            blocks = [
                ContentBlock(
                    type="paragraph",
                    text=_clip(primary, 500),
                    source_refs=[ref],
                ),
                ContentBlock(
                    type="callout",
                    title="Konsep Kunci",
                    text=_clip(secondary, 350),
                    source_refs=[ref],
                ),
            ]
            if index == 2:
                blocks.append(
                    ContentBlock(
                        type="example",
                        text="Coba jelaskan ulang bagian ini tanpa melihat catatan, lalu bandingkan dengan sumber.",
                        source_refs=[ref],
                    )
                )
            sections.append(ContentSection(heading=heading, blocks=blocks))

        glossary = [
            GlossaryItem(
                term=term,
                definition=f"Istilah yang muncul dalam materi: {term}. Lihat sumber untuk definisi lengkap.",
                source_refs=[ref],
            )
            for term in _terms(source_text, request.glossary)
        ]

        method = _method(source_text)
        method.source_refs = [ref]

        quiz: list[QuizItem] = []
        for index in range(3):
            correct = _clip(sentences[index % len(sentences)], 180)
            quiz.append(
                QuizItem(
                    id=f"q{index + 1}",
                    question=(
                        "Manakah pernyataan yang paling sesuai dengan materi?"
                        if index == 0
                        else f"Pernyataan mana yang sesuai dengan bagian materi ke-{index + 1}?"
                    ),
                    options=[
                        correct,
                        "Materi tidak membahas topik ini.",
                        "Semua pernyataan di atas salah.",
                        "Hanya istilah teknis yang penting.",
                    ],
                    answer_index=0,
                    explanation="Pernyataan ini diambil dari sumber materi.",
                    source_refs=[ref],
                )
            )

        mode_label = MODE_LABELS[request.mode]
        title_words = " ".join(request.title.split()[:7])
        content = ModuleContent(
            schema_version="1.0",
            title=f"{mode_label}: {title_words}",
            summary=_clip(summary, 900),
            sections=sections,
            glossary=glossary,
            study_method=method,
            quiz=quiz,
            citations=citations,
        )
        elapsed = int((time.perf_counter() - started) * 1000)
        return AIResult(
            content=content,
            model_name=self.name,
            prompt_version="mock-v1",
            input_tokens=max(1, len(source_text) // 4),
            output_tokens=max(1, len(content.model_dump_json()) // 4),
            latency_ms=elapsed,
        )


def gemini_module_response_schema() -> dict[str, Any]:
    """Return an OpenAPI 3.0 responseSchema compatible with Gemini Structured Outputs."""
    source_refs_field: dict[str, Any] = {
        "type": "ARRAY",
        "items": {"type": "STRING"},
    }
    return {
        "type": "OBJECT",
        "required": [
            "schema_version",
            "title",
            "summary",
            "sections",
            "glossary",
            "study_method",
            "quiz",
            "citations",
        ],
        "properties": {
            "schema_version": {"type": "STRING"},
            "title": {"type": "STRING"},
            "summary": {"type": "STRING"},
            "sections": {
                "type": "ARRAY",
                "items": {
                    "type": "OBJECT",
                    "required": ["heading", "blocks"],
                    "properties": {
                        "heading": {"type": "STRING"},
                        "blocks": {
                            "type": "ARRAY",
                            "items": {
                                "type": "OBJECT",
                                "required": ["type"],
                                "properties": {
                                    "type": {
                                        "type": "STRING",
                                        "enum": ["paragraph", "callout", "formula", "example", "quote"],
                                    },
                                    "text": {"type": "STRING", "nullable": True},
                                    "title": {"type": "STRING", "nullable": True},
                                    "latex": {"type": "STRING", "nullable": True},
                                    "explanation": {"type": "STRING", "nullable": True},
                                    "source_refs": source_refs_field,
                                },
                            },
                        },
                    },
                },
            },
            "glossary": {
                "type": "ARRAY",
                "items": {
                    "type": "OBJECT",
                    "required": ["term", "definition", "source_refs"],
                    "properties": {
                        "term": {"type": "STRING"},
                        "definition": {"type": "STRING"},
                        "source_refs": source_refs_field,
                    },
                },
            },
            "study_method": {
                "type": "OBJECT",
                "required": ["name", "why", "steps", "source_refs"],
                "properties": {
                    "name": {"type": "STRING"},
                    "why": {"type": "STRING"},
                    "steps": {"type": "ARRAY", "items": {"type": "STRING"}},
                    "source_refs": source_refs_field,
                },
            },
            "quiz": {
                "type": "ARRAY",
                "items": {
                    "type": "OBJECT",
                    "required": [
                        "id",
                        "type",
                        "question",
                        "options",
                        "answer_index",
                        "explanation",
                        "source_refs",
                    ],
                    "properties": {
                        "id": {"type": "STRING"},
                        "type": {"type": "STRING", "enum": ["multiple_choice"]},
                        "question": {"type": "STRING"},
                        "options": {"type": "ARRAY", "items": {"type": "STRING"}},
                        "answer_index": {"type": "INTEGER"},
                        "explanation": {"type": "STRING"},
                        "source_refs": source_refs_field,
                    },
                },
            },
            "citations": {
                "type": "ARRAY",
                "items": {
                    "type": "OBJECT",
                    "required": ["id", "label", "kind"],
                    "properties": {
                        "id": {"type": "STRING"},
                        "label": {"type": "STRING"},
                        "kind": {"type": "STRING", "enum": ["document", "audio"]},
                    },
                },
            },
        },
    }


class GeminiAIProvider:
    name = "gemini"

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.api_key = settings.gemini_api_key.strip()
        self.model = settings.gemini_model
        self.fallback_model = settings.gemini_fallback_model

    async def generate(self, request: AIRequest) -> AIResult:
        if not self.api_key:
            raise AIProviderError(
                "GEMINI_API_KEY belum diatur. Set AI_PROVIDER=mock untuk demo.",
                code="GEMINI_KEY_MISSING",
            )
        system, user = build_prompts(
            mode=request.mode,
            title=request.title,
            document_text=request.document_text,
            transcript=request.transcript,
            glossary=request.glossary,
            citations=request.citations
            or [SourceCitation(id="source:1", label="Materi", kind="document")],
        )
        started = time.perf_counter()
        last_error: Exception | None = None
        for model in [self.model, self.fallback_model]:
            try:
                raw, usage = await self._call(model, system, user)
                content = self._parse(raw)
                elapsed = int((time.perf_counter() - started) * 1000)
                return AIResult(
                    content=content,
                    model_name=model,
                    prompt_version=f"{request.mode.value.lower()}-v1",
                    input_tokens=usage.get("promptTokenCount"),
                    output_tokens=usage.get("candidatesTokenCount"),
                    latency_ms=elapsed,
                )
            except AIProviderError as exc:
                last_error = exc
                if exc.code in {"AI_SCHEMA_INVALID", "AI_EMPTY_RESPONSE"}:
                    try:
                        repaired = await self._repair(model, system, user, str(exc))
                        elapsed = int((time.perf_counter() - started) * 1000)
                        return AIResult(
                            content=repaired,
                            model_name=model,
                            prompt_version=f"{request.mode.value.lower()}-v1",
                            latency_ms=elapsed,
                        )
                    except AIProviderError as repair_exc:
                        last_error = repair_exc
                if not exc.retryable:
                    break
                logger.warning("Gemini model %s failed: %s", model, exc)
        raise last_error or AIProviderError("Gemini gagal menghasilkan modul.", code="AI_FAILED")

    async def _call(self, model: str, system: str, user: str) -> tuple[str, dict[str, Any]]:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
        payload = {
            "systemInstruction": {"parts": [{"text": system}]},
            "contents": [{"role": "user", "parts": [{"text": user}]}],
            "generationConfig": {
                "temperature": 0.4,
                "maxOutputTokens": 8192,
                "responseMimeType": "application/json",
                "responseSchema": gemini_module_response_schema(),
            },
        }
        attempts = 3
        async with httpx.AsyncClient(timeout=self.settings.gemini_timeout_seconds) as client:
            for attempt in range(attempts):
                try:
                    response = await client.post(
                        url,
                        headers={"x-goog-api-key": self.api_key},
                        json=payload,
                    )
                except httpx.HTTPError as exc:
                    if attempt == attempts - 1:
                        raise AIProviderError(
                            f"Gemini network error: {exc}", code="AI_NETWORK", retryable=True
                        ) from exc
                    await asyncio.sleep(2**attempt)
                    continue

                if response.status_code in {429, 500, 502, 503, 504}:
                    if attempt == attempts - 1:
                        raise AIProviderError(
                            f"Gemini HTTP {response.status_code}", code="AI_RATE_LIMIT", retryable=True
                        )
                    await asyncio.sleep(2**attempt)
                    continue
                if response.status_code >= 400:
                    raise AIProviderError(
                        f"Gemini HTTP {response.status_code}: {response.text[:300]}",
                        code="AI_HTTP_ERROR",
                        retryable=False,
                    )
                data = response.json()
                feedback = data.get("promptFeedback", {})
                if feedback.get("blockReason"):
                    raise AIProviderError(
                        f"Gemini memblokir konten: {feedback['blockReason']}",
                        code="AI_BLOCKED",
                    )
                candidates = data.get("candidates") or []
                if not candidates:
                    raise AIProviderError("Gemini tidak mengembalikan kandidat.", code="AI_EMPTY_RESPONSE")
                parts = candidates[0].get("content", {}).get("parts", [])
                text = "".join(part.get("text", "") for part in parts).strip()
                if not text:
                    raise AIProviderError("Gemini mengembalikan teks kosong.", code="AI_EMPTY_RESPONSE")
                return text, data.get("usageMetadata", {})
        raise AIProviderError("Gemini gagal setelah retry.", code="AI_FAILED", retryable=True)

    async def _repair(self, model: str, system: str, user: str, error: str) -> ModuleContent:
        repair_user = (
            user
            + "\n\nOUTPUT SEBELUMNYA TIDAK VALID:\n"
            + error
            + "\nPerbaiki dan kembalikan HANYA JSON valid sesuai schema. Jangan menambahkan teks lain."
        )
        raw, _ = await self._call(model, system, repair_user)
        return self._parse(raw)

    def _parse(self, raw: str) -> ModuleContent:
        text = raw.strip()
        if text.startswith("```"):
            text = re.sub(r"^```(?:json)?\s*", "", text)
            text = re.sub(r"\s*```$", "", text)
        start = text.find("{")
        end = text.rfind("}")
        if start >= 0 and end > start:
            text = text[start : end + 1]
        try:
            data = json.loads(text)
        except json.JSONDecodeError as exc:
            raise AIProviderError(
                f"JSON Gemini tidak valid: {exc}", code="AI_SCHEMA_INVALID"
            ) from exc
        try:
            return ModuleContent.model_validate(data)
        except Exception as exc:
            raise AIProviderError(
                f"Schema modul tidak valid: {exc}", code="AI_SCHEMA_INVALID"
            ) from exc


def get_ai_provider(settings: Settings):
    if settings.ai_provider == "gemini":
        return GeminiAIProvider(settings)
    return MockAIProvider(settings)
