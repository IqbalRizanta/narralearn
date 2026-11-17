# ADR 0004 — AI Output Contract

**Status:** Accepted  
**Date:** 2026-11-14

## Context

The original schema stored `transformed_content TEXT` and
`method_action_items JSONB`, with no quiz column, citations, schema version, or
eval harness. The reader cannot reliably render callouts, formulas, quizzes,
or source references from free text.

## Decision

- The LLM returns **JSON only**, validated by Pydantic (`ModuleContent`).
- Content is stored in `generated_modules.content_json` + `quiz_json`.
- Every academic claim carries `source_refs` (`doc:<page>` or `audio:<time>`).
- `schema_version`, `model_name`, and `prompt_version` are persisted.
- Invalid output is repaired once/twice; otherwise the job fails with
  `AI_SCHEMA_INVALID`.
- The frontend renders with `react-markdown` + `rehype-sanitize`; raw HTML is
  never allowed. Formulas use KaTeX.
- Prompt/model changes require a golden-dataset eval (see plan §10.2).

## Consequences

- UI is stable and testable.
- Generation can fail on schema violations; retries and clear errors are needed.
- Prompt changes are auditable and reversible.
- Citations are limited to what the source map provides; missing refs must be
  reported as "tidak dijelaskan di sumber".
