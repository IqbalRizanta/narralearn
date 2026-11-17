# NarraLearn AI

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Python 3.12](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)](./backend/pyproject.toml)
[![React 19 + Vite](https://img.shields.io/badge/Frontend-React%2019%20%2B%20Vite-61DAFB?logo=react&logoColor=black)](./frontend/package.json)
[![PWA Ready](https://img.shields.io/badge/PWA-Installable-5A0FC8)](./frontend/vite.config.ts)

Adaptive multimodal learning platform: record a lecture in class, filter the target speaker, combine it with slides, and turn it into a Gen-Z narrative, study method, and interactive quiz.

This repository is the **executable implementation** of the planning documents in [`Plan/`](./Plan). See [`Plan/8_project_plan_analysis.md`](./Plan/8_project_plan_analysis.md) for the architecture review and [`Plan/9_revised_execution_plan.md`](./Plan/9_revised_execution_plan.md) for the revised execution plan.

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Install & Quick Start](#install--quick-start)
- [Configuration & Providers](#configuration--providers)
- [Usage & Demo Mode](#usage--demo-mode)
- [Project Structure](#project-structure)
- [Key Decisions](#key-decisions)
- [Testing](#testing)
- [Security & Privacy](#security--privacy)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- **Multimodal Session Ingestion**: Upload lecture audio (`.wav`, `.mp3`, `.m4a`, `.webm`, `.ogg`, `.flac`), slide decks / documents (`.pdf`, `.pptx`), or both.
- **In-Browser Lecture Recorder**: Record lectures directly from the studio with **Screen Wake Lock API** support so mobile screens stay awake during class.
- **Local-First Voice Calibration**: Real-time WebSocket calibration (`/ws/voice-calibration`) with AudioWorklet + `ProgressRing`; speaker embeddings are stored locally in IndexedDB (`Dexie.js`) for privacy.
- **Async Task Queue**: Heavy processing (document extraction, speaker filtering, STT, and LLM generation) returns `202 Accepted` + `job_id` and runs in Redis + ARQ workers (`batch` and `interactive` queues).
- **4 Narrative Modes + Instant Style Switcher**: Transform the same source material into **Gaming**, **Sosmed**, **Novel**, or **Casual Story** without re-uploading media.
- **Structured AI Output**: Uses Gemini native `responseSchema` + Pydantic validation for reliable sections, callouts, KaTeX formulas, glossary, study method, 3D flip-card quiz, and source citations.
- **Transcript Editing & Regeneration**: Correct technical terms or names in `raw_transcript` and regenerate modules in-place.
- **Offline Reading & Markdown Export**: Cached modules work offline via IndexedDB + PWA Service Worker, and any module can be exported to `.md` for printing or note-taking.

---

## Architecture

- **Backend**: FastAPI, SQLAlchemy (Async), Alembic, PostgreSQL 16 (SQLite for local demo/tests), Redis 7 + ARQ.
- **Frontend**: React 19, TypeScript, Vite, `vite-plugin-pwa`, TanStack Query, Dexie.js, KaTeX.
- **AI / Speech Providers**: Configurable adapters (`mock` / `heuristic` by default; `gemini`, `faster_whisper`, and `speechbrain` for production).

---

## Install & Quick Start

### 1. Docker Compose (recommended, production-like)

```bash
cp .env.example .env   # Windows: copy .env.example .env
docker compose up --build
```

- **Web PWA**: <http://localhost:8080>
- **API & Swagger Docs**: <http://localhost:8000/docs>

Compose starts PostgreSQL 16, Redis 7, `api`, `worker` (batch), `worker-interactive` (style switching), and `web` (Nginx).

### 2. Local Development (without Docker)

#### Backend

```bash
cd backend
uv sync --extra dev
cp ../.env.example ../.env   # Windows: copy ..\.env.example ..\.env
uv run uvicorn app.main:app --reload --port 8000
```

By default, local development uses SQLite + inline jobs (`QUEUE_MODE=inline`), so PostgreSQL and Redis are optional. For full async worker mode, set `DATABASE_URL`, `QUEUE_MODE=arq`, and `AUTO_CREATE_TABLES=false`, then run:

```bash
uv run arq app.workers.settings.WorkerSettings
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173>.

---

## Configuration & Providers

Copy [`.env.example`](./.env.example) to `.env` and adjust providers as needed:

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=your-api-key
GEMINI_MODEL=gemini-3.5-flash
GEMINI_FALLBACK_MODEL=gemini-3.1-flash-lite
STT_PROVIDER=faster_whisper
VOICE_PROVIDER=speechbrain
```

> **Note on Gemini models**: `gemini-2.5-*` is rejected for new API keys. This project is verified against `gemini-3.5-flash` with fallback `gemini-3.1-flash-lite`.

To install optional ML/AI dependencies (`faster-whisper`, `speechbrain`, `torch`, `torchaudio`):

```bash
cd backend
uv sync --extra dev --extra ai
```

---

## Usage & Demo Mode

There is no seeded account. Register any email and password (minimum 10 characters), accept the recording consent, and create a session.

In default demo mode (`AI_PROVIDER=mock`, `STT_PROVIDER=mock`, `VOICE_PROVIDER=heuristic`):

- **STT** returns a synthetic Indonesian transcript (clearly labelled).
- **AI** returns a deterministic, schema-valid module labelled `Demo AI` in the reader.
- **Voice** computes a heuristic quality score rather than biometric verification.
- **Style switching** and **transcript regeneration** reuse stored text without re-uploading media.

Raw uploads are deleted after a job succeeds or is canceled. Failed jobs retain temporary files for `TEMP_RETENTION_HOURS` (default `24` hours) so retries work without re-uploading.

---

## Project Structure

```text
backend/
  alembic/        database migrations
  app/
    api/          REST & WebSocket routes + dependencies
    core/         config, security, logging, errors, rate limiting
    db/           SQLAlchemy models + async session
    providers/    AI (Mock/Gemini), STT (Mock/Faster-Whisper), Voice (Heuristic/SpeechBrain)
    schemas/      Pydantic request/response & ModuleContent contracts
    services/     storage, pypdf/python-pptx parser, audio, prompts, queue
    workers/      ARQ worker settings + job processor
  tests/          pytest async integration & unit tests
frontend/
  src/
    components/   design system, VoiceCalibrator, LectureRecorder, QuizCard, ModuleRenderer
    lib/          API client, auth, Dexie IndexedDB, Markdown exporter, types
    pages/        auth, dashboard, studio, session, reader, profiles, settings
    styles/       Midnight Slate / Warm Oat design tokens + Bento layout
infra/            Caddy reverse proxy configuration
Plan/             original + revised planning documents
docs/adr/         Architecture Decision Records (ADR 0001–0006)
scripts/          icon generator & end-to-end API smoke test
```

---

## Key Decisions

| Decision | Choice | Why |
| :--- | :--- | :--- |
| PDF parser | `pypdf` | Avoids PyMuPDF AGPL-3.0 / commercial licensing restrictions. |
| Heavy work | Redis + ARQ worker | Long audio cannot run in an HTTP request; enables status, retry, cancel. |
| Auth | Access JWT in memory + opaque refresh cookie | Revocable refresh tokens; no sensitive tokens in `localStorage`. |
| Offline auth | Non-sensitive profile snapshot in `localStorage` | Cached reading works after an offline reload; cleared on logout or `401`. |
| AI output | Gemini `responseSchema` + Pydantic + citations | Reliable UI rendering, schema validation, no raw HTML injection. |
| Voice profiles | IndexedDB + base64 embedding + model version | Local-first privacy; supports export/import and re-enrollment. |
| Raw media | Temporary, deleted after job | Privacy-by-design and minimal server storage footprint. |

---

## Testing

```bash
# Backend
cd backend
uv run ruff check app tests
uv run pytest -q

# Frontend
cd frontend
npm run lint
npm run typecheck
npm test
npm run build
```

With the backend running in demo mode, run the end-to-end API smoke test:

```bash
backend/.venv/Scripts/python.exe scripts/smoke_api.py
```

---

## Security & Privacy

- Change `JWT_SECRET` before any non-local deployment.
- Use HTTPS/WSS in production and set `COOKIE_SECURE=true`.
- Disable `ENABLE_DOCS=false` in public production deployments.
- Review the legal and privacy checklist in [`Plan/9_revised_execution_plan.md`](./Plan/9_revised_execution_plan.md) (consent, UU PDP, copyright, Gemini API terms).
- Run Alembic migrations (`alembic upgrade head`) and set `AUTO_CREATE_TABLES=false` in production.

---

## Contributing

Contributions are welcome! Please open an issue or submit a pull request, and ensure `ruff check app tests`, `pytest`, `npm run lint`, `npm run typecheck`, and `npm test` pass before submitting.

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](./LICENSE) file for details.
