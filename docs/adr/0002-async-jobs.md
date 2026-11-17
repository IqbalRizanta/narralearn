# ADR 0002 — Async Job Processing

**Status:** Accepted  
**Date:** 2026-11-14

## Context

`POST /sessions/process` in the original plan was synchronous. A 60-minute
audio file plus a 40-page PDF can take minutes; HTTP requests and reverse
proxies will time out. Users also need progress, retry, and cancellation.

## Decision

- API creates a `study_session` + `processing_jobs` row and returns
  `202 { session_id, job_id }`.
- Heavy work runs in an **ARQ worker** backed by **Redis**.
- Two queues: `interactive` (style switch) and `batch` (audio/document).
- Job states: `QUEUED → RUNNING → SUCCEEDED | FAILED | CANCELED`.
- Progress is stored on the job and exposed via `GET /api/v1/jobs/{id}`.
- Retries: transient errors only, max 3 with exponential backoff.
- `Idempotency-Key` prevents duplicate jobs/charges.
- Local/test modes: `QUEUE_MODE=inline` (background task) and
  `QUEUE_MODE=manual` (tests call the processor directly).

## Consequences

- Requires Redis in Docker/production.
- API is fast and stateless; workers can scale independently.
- Temporary upload files must be on shared storage between API and worker.
- Raw files are deleted after the job; retry after cleanup requires re-upload.
