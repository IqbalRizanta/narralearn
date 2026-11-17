# ADR 0006 — Consent, Retention & Raw Media

**Status:** Accepted  
**Date:** 2026-11-14

## Context

Users may record lecturers and classmates. Voice embeddings are biometric data.
The original plan claimed "local-only" storage while also sending embeddings to
the server, and claimed audio is deleted from RAM without a retention policy.

## Decision

- A recording-consent checkbox is required before the first session
  (`POST /api/v1/auth/consent`, versioned).
- Users must confirm they have permission to record the speaker/class.
- Raw audio/documents are written to a temporary shared volume and processed.
  They are deleted after a successful or canceled job.
- On failure, raw files are retained for a bounded retry window (default 24
  hours, configurable via `TEMP_RETENTION_HOURS`) so the user can
  retry without re-uploading. A scheduled cleanup removes expired files; retry
  is unavailable once the files are gone.
- Only transcript, extracted document text, metadata, and generated modules are
  persisted long-term.
- Logs must not contain audio, transcripts, embeddings, tokens, or passwords.
- Account/session deletion cascades persisted content.
- Privacy policy, terms, and copyright disclaimer are linked in the UI.
- Backups are encrypted and retained per the plan; deleted data ages out of
  backups within 30 days.

## Consequences

- Failed jobs can be retried for a limited window; after cleanup, the user must
  re-upload the source material.
- Successful and canceled jobs cannot be reprocessed from raw audio, so a new
  style must reuse the stored transcript/extracted text.
- Stronger privacy posture and simpler storage.
- Consent must be versioned and auditable.
- Legal review is still required before public launch (UU PDP, copyright,
  Gemini data-processing terms).
