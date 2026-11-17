# ADR 0003 — Authentication Tokens

**Status:** Accepted  
**Date:** 2026-11-14

## Context

The original SRS mentions access + refresh tokens but does not define storage,
rotation, or revocation. Storing tokens in `localStorage` exposes them to XSS.

## Decision

- **Access token:** short-lived JWT (15 minutes), returned in JSON, stored in
  memory by the frontend. Never in `localStorage`.
- **Refresh token:** opaque random token (not JWT), stored **hashed** in
  `refresh_tokens`, sent as `HttpOnly; Secure; SameSite=Lax` cookie scoped to
  `/api/v1/auth`.
- Refresh rotates on every use; the old token is revoked.
- Logout revokes the current refresh token.
- Passwords are hashed with **Argon2id** (64 MB, 3 iterations, parallelism 4).
- Login/register/refresh are rate-limited.
- Account deletion requires the password and cascades user data.

## Consequences

- Page reload restores the session via `/auth/refresh`.
- No access token in browser storage.
- Cross-site deployments need CSRF review; default is same-origin.
- Email verification/password reset are v1.1 (see plan §2 Should).
