from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, model_validator


class SourceCitation(BaseModel):
    id: str = Field(min_length=1, max_length=80)
    label: str = Field(min_length=1, max_length=200)
    kind: Literal["document", "audio"]


class ContentBlock(BaseModel):
    type: Literal["paragraph", "callout", "formula", "example", "quote"]
    text: str | None = Field(default=None, max_length=6000)
    title: str | None = Field(default=None, max_length=200)
    latex: str | None = Field(default=None, max_length=2000)
    explanation: str | None = Field(default=None, max_length=2000)
    source_refs: list[str] = Field(default_factory=list, max_length=8)

    @model_validator(mode="after")
    def _validate_shape(self) -> ContentBlock:
        if self.type in {"paragraph", "example", "quote"} and not self.text:
            raise ValueError(f"Block {self.type} membutuhkan text.")
        if self.type == "callout" and not (self.title and self.text):
            raise ValueError("Block callout membutuhkan title dan text.")
        if self.type == "formula" and not (self.latex and self.explanation):
            raise ValueError("Block formula membutuhkan latex dan explanation.")
        return self


class ContentSection(BaseModel):
    heading: str = Field(min_length=1, max_length=200)
    blocks: list[ContentBlock] = Field(min_length=1, max_length=20)


class GlossaryItem(BaseModel):
    term: str = Field(min_length=1, max_length=100)
    definition: str = Field(min_length=1, max_length=1000)
    source_refs: list[str] = Field(default_factory=list, max_length=8)


class StudyMethod(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    why: str = Field(min_length=1, max_length=1000)
    steps: list[str] = Field(min_length=1, max_length=10)
    source_refs: list[str] = Field(default_factory=list, max_length=8)


class QuizItem(BaseModel):
    id: str = Field(min_length=1, max_length=40)
    type: Literal["multiple_choice"] = "multiple_choice"
    question: str = Field(min_length=1, max_length=1000)
    options: list[str] = Field(min_length=2, max_length=6)
    answer_index: int = Field(ge=0)
    explanation: str = Field(min_length=1, max_length=1500)
    source_refs: list[str] = Field(default_factory=list, max_length=8)

    @model_validator(mode="after")
    def _validate_answer(self) -> QuizItem:
        if self.answer_index >= len(self.options):
            raise ValueError("answer_index di luar jumlah options.")
        return self


class ModuleContent(BaseModel):
    schema_version: str = "1.0"
    title: str = Field(min_length=1, max_length=200)
    summary: str = Field(min_length=1, max_length=2000)
    sections: list[ContentSection] = Field(min_length=1, max_length=20)
    glossary: list[GlossaryItem] = Field(default_factory=list, max_length=30)
    study_method: StudyMethod
    quiz: list[QuizItem] = Field(min_length=3, max_length=5)
    citations: list[SourceCitation] = Field(default_factory=list, max_length=100)

    @model_validator(mode="after")
    def _validate_refs(self) -> ModuleContent:
        citation_ids = {citation.id for citation in self.citations}
        if len(citation_ids) != len(self.citations):
            raise ValueError("citation id harus unik.")

        refs: list[str] = []
        for section in self.sections:
            for block in section.blocks:
                refs.extend(block.source_refs)
        for item in self.glossary:
            refs.extend(item.source_refs)
        refs.extend(self.study_method.source_refs)
        for quiz in self.quiz:
            refs.extend(quiz.source_refs)

        missing = sorted({ref for ref in refs if ref not in citation_ids})
        if missing:
            raise ValueError(f"source_refs tidak ada di citations: {missing}")

        quiz_ids = [item.id for item in self.quiz]
        if len(quiz_ids) != len(set(quiz_ids)):
            raise ValueError("quiz id harus unik.")
        return self


class ModuleEvalResult(BaseModel):
    schema_valid: bool
    fidelity_score: float | None = None
    notes: list[str] = Field(default_factory=list)
