# ADR 0005 — Voice Profile Format & Providers

**Status:** Accepted  
**Date:** 2026-11-14

## Context

The plan stores ~1.5 KB voice embeddings in IndexedDB, but 192 float32 values
are 768 bytes raw; JSON arrays are larger. The server also needs the embedding
temporarily for target-speaker filtering. ECAPA-TDNN is the intended biometric
model, but it is not available in the default install.

## Decision

- Store profiles **locally only** in IndexedDB.
- Wire/storage format: `base64(Float32Array)` + `dimension` + `embeddingModel`
  + `embeddingVersion`.
- Default provider: `heuristic` (quality metrics + spectral fingerprint) for
  demo/dev. It is **not** biometric verification and is labelled as such.
- Production provider: `speechbrain` (`spkrec-ecapa-voxceleb`, 192-dim),
  enabled via `VOICE_PROVIDER=speechbrain` and the `ai` optional dependencies.
- Server never persists embeddings; it receives one only for a processing job.
- If the model/version changes, profiles must be re-enrolled.
- Target filtering is called **target-speaker filtering**, not diarization.

## Consequences

- Demo mode works without heavy ML dependencies.
- Real biometric filtering requires SpeechBrain + model download/hardware.
- The UI must show the provider and warning when heuristic mode is active.
- The scoring threshold (85%) and cosine threshold (0.65) remain hypotheses to
  calibrate with real data.
