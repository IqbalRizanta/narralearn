# 🗺️ REVISED EXECUTION PLAN — NARRALEARN AI

**Versi:** 2.0  
**Tanggal:** 14 November 2026  
**Basis:** [`8_project_plan_analysis.md`](./8_project_plan_analysis.md)  
**Tujuan:** Mengubah plan 8 minggu menjadi plan yang **executable**, terukur, dan sadar risiko — tanpa menghilangkan visi produk.

---

## 0. Ringkasan

Rekomendasi utama: **12 minggu, 6 sprint (2 minggu per sprint)**, dimulai dengan **Sprint 0 selama 2 minggu** untuk memvalidasi risiko teknis terbesar. Jika tanggal rilis tidak bisa digeser, gunakan **Opsi B: 8 minggu dengan cut scope eksplisit** — tetapi risikonya tinggi.

Plan ini mengubah urutan kerja dari horizontal (DB → voice → pipeline → UI) menjadi **vertical slices**:

```text
Walking skeleton
  → slice voice
  → slice ingestion + STT
  → slice AI + reader
  → slice PWA + polish
  → hardening + deploy
```

Setiap sprint harus menghasilkan sesuatu yang bisa didemokan end-to-end, bukan hanya layer teknis.

### Asumsi Tim

| Peran | Jumlah | Fokus |
| :--- | :---: | :--- |
| Product/UX Designer | 1 (bisa part-time) | Scope, wireframe, usability test, design QA. |
| Full-stack Engineer | 2 | React/PWA + FastAPI/PostgreSQL. |
| ML/AI Engineer | 1 | Voice, STT, Gemini, eval. |
| QA/DevOps | 1 (part-time) | Test, CI/CD, staging, observability. |
| Security/Legal Reviewer | 1 (part-time) | Consent, privacy, license, threat model. |

Jika **solo developer**, estimasi realistis adalah **20+ minggu**; cut scope ke: auth + upload + STT + 2 mode + reader + deploy. Voice filter dan PWA offline masuk v1.1.

### Asumsi Produk

- Indonesian-first; istilah teknis Inggris dipertahankan.
- Satu target speaker per sesi.
- Audio dan dokumen **tidak disimpan permanen** setelah diproses; hanya transkrip, teks dokumen, dan modul.
- Batas MVP: audio 60 menit, dokumen 40 halaman/80 slide.
- PWA-first; belum ada native app.
- 4 mode narasi; jika salah satu mode gagal eval, tandai **beta** dan tampilkan disclaimer.
- Quiz 3–5 soal per modul; progres quiz boleh local-first di MVP.

---

## 1. Prinsip Eksekusi

1. **Risk-first, bukan feature-first.** Validasi voice/STT/Gemini sebelum membangun UI polish.
2. **Walking skeleton sejak Sprint 1.** Auth → upload → job → transcript → reader harus tersambung, meski AI masih mock.
3. **Async by default.** Semua pekerjaan berat lewat queue; API hanya menerima dan melaporkan status.
4. **Contract-first.** OpenAPI, JSON schema, dan ERD disepakati sebelum implementasi.
5. **Eval-driven AI.** Setiap perubahan prompt/model harus melewati golden dataset.
6. **Privacy by design.** Data biometrik dan rekaman diperlakukan sebagai data sensitif.
7. **Ship small, demo weekly.** Setiap sprint punya demo yang bisa dilihat user.
8. **No silent scope creep.** Fitur baru masuk backlog, bukan sprint aktif.

---

## 2. Scope MVP (MoSCoW)

### Must — wajib untuk beta

| Fitur | Definisi Selesai |
| :--- | :--- |
| Auth | Register, login, refresh, logout, me; isolasi data per user; delete account. |
| Session creation | Buat sesi dengan audio dan/atau PDF/PPTX; title; status; history; delete. |
| Async processing | Queue, job status, progress, retry, cancel, idempotency. |
| STT Indonesia | Transkrip dengan timestamp; glossary istilah; VAD; anti-hallucination. |
| Voice profile | Enroll 10–20 detik, skor 0–100, simpan lokal, label, hapus; target-speaker filter dengan fallback. |
| AI narrative | 4 mode (Gaming, Sosmed, Novel, Casual), JSON valid, sitasi, glossary. |
| Study method + quiz | 1 metode belajar + 3–5 soal grounded, explanation + source_ref. |
| Reader | Split view desktop, tab mobile, callout, formula, quiz, style switcher. |
| PWA install | Manifest, icon, service worker, install di Android/desktop; instruksi iOS. |
| Privacy & consent | Consent merekam, privacy policy, terms, retensi, delete account. |
| Production baseline | CI/CD, staging, monitoring, backup, runbook, release gate. |

### Should — target Sprint 4 / v1.1

| Fitur | Alasan |
| :--- | :--- |
| Offline reading | Cache 5 modul terakhir; processing tetap online. |
| Real-time WebSocket calibration | Jika spike membuktikan layak; fallback finalize-only. |
| Quiz progress sync | Local-first dulu; sync server jika retention terbukti. |
| OCR scanned PDF | Banyak slide berupa scan; mulai dengan deteksi + pesan. |
| Transcript editing | Koreksi nama/istilah sebelum generate ulang. |
| Export Markdown | Berguna untuk belajar offline/cetak. |
| Password reset / email verification | Kurangi beban support. |
| Resumable upload | Jaringan mobile tidak stabil. |

### Could — setelah beta

Live transcription, collaboration, cloud voice profile, native app, LMS integration, multilingual UI, social sharing, TTS, advanced gamification.

### Won't — eksplisit di luar scope

BaaS (Supabase/Firebase), video processing, AI chat tutor, real-time lecture notes, multi-tenant organization, app store native launch.

---

## 3. Pilihan Timeline

### Opsi A — 12 Minggu (Direkomendasikan)

| Sprint | Minggu | Fokus | Exit Criteria |
| :--- | :---: | :--- | :--- |
| **Sprint 0** | 1–2 | Discovery, spike, ADR, UX prototype, kontrak API/DB. | Go/No-Go teknis; model/hardware/library dipilih. |
| **Sprint 1** | 3–4 | Foundation, auth, DB, CI/CD, upload, job queue, status, frontend shell. | Register/login; upload audio+PDF; job berjalan; staging live. |
| **Sprint 2** | 5–6 | Voice calibration, target filter, document parsing, STT, transcript. | 30 menit audio + 20 halaman PDF → transkrip; profil suara tersimpan. |
| **Sprint 3** | 7–8 | Gemini 4 mode, study method, quiz, reader, history, style switch. | Sesi end-to-end → modul valid + reader responsif. |
| **Sprint 4** | 9–10 | PWA, offline read, theme polish, accessibility, onboarding/consent, settings. | Install di Android/iOS/desktop; offline read; Lighthouse/a11y. |
| **Sprint 5** | 11–12 | QA, acoustic/load/security test, deploy, beta. | Release gate terpenuhi; backup restore; beta live. |

### Opsi B — 8 Minggu (Hanya Jika Deadline Keras)

| Minggu | Fokus | Cut yang Harus Diterima |
| :---: | :--- | :--- |
| 1 | Discovery + spike voice/STT (dipercepat). | Spike dangkal; risiko tinggi. |
| 2 | Foundation + auth + upload. | Tanpa staging penuh. |
| 3 | Job queue + STT + dokumen. | Hanya PDF; PPTX menyusul. |
| 4 | Voice calibration + filter. | Fallback finalize-only jika gagal. |
| 5 | Gemini 2 mode + reader. | Mode Sosmed/Novel beta atau v1.1. |
| 6 | Style switch + history + polish. | Tanpa offline. |
| 7 | QA + acoustic test. | Load/security test terbatas. |
| 8 | Deploy + beta. | Single VM; tanpa runbook lengkap. |

**Risiko Opsi B:** tidak ada buffer; voice/STT belum tervalidasi; QA sangat sempit; kemungkinan besar slip atau kualitas core AI rendah. Gunakan hanya jika tim ≥4 orang dan spike sudah dilakukan sebelum minggu 1.

**Rekomendasi:** Opsi A. Jika harus 8 minggu, pilih Opsi B dengan cut di atas dan komunikasikan ke stakeholder.

---

## 4. Detail Sprint

### Sprint 0 — De-Risking & Contract (Minggu 1–2)

**Goal:** membuktikan bahwa komponen inti layak, dan menghasilkan kontrak yang bisa dieksekusi.

**Workstreams:**

- **Product/UX:** finalisasi scope, non-goals, success metrics; usability test prototype 5 user; consent flow.
- **ML/AI:** spike voice, STT, Gemini; benchmark hardware; dataset evaluasi.
- **Engineering:** repo skeleton, Docker Compose, CI awal; API/DB contract v0.
- **Legal/ops:** license audit; privacy/retention decision; deployment target.

**Spike wajib:**

1. **Voice:** 5 pemateri × 3 kondisi (tenang, kipas, obrolan); enroll 10–20 detik; ukur calibration success, EER, false reject, dampak filter ke WER.
2. **STT:** 30 dan 60 menit audio Indonesia + code-switching; 2 model (mis. medium dan large-v3); CPU/GPU; ukur WER, RTF, RAM/VRAM.
3. **Gemini:** 40 halaman PDF + transkrip 60 menit; 4 prompt; ukur schema compliance, latency, token cost, fidelity rubric.
4. **iOS/PWA:** rekam 10 menit, layar terkunci, storage, install; tentukan fallback format.
5. **Usability:** 5 mahasiswa mencoba prototype calibration + reader; catat kebingungan.

**Deliverables:**

- Spike report (angka, bukan opini).
- ADR: PDF library/license, queue, STT model/hardware, Gemini model, auth token strategy, offline scope.
- OpenAPI v0 + ERD v1.
- Revised backlog + risk register.
- Consent/privacy flow.

**Exit criteria:**

- Go/No-Go checklist di dokumen 8 terpenuhi atau ada keputusan fallback.
- Tidak ada spike yang menghasilkan "belum tahu".
- Tim, budget, dan tanggal rilis disetujui.

**Demo:** prototype calibration + reader dengan data mock; spike report.

---

### Sprint 1 — Walking Skeleton (Minggu 3–4)

**Goal:** user bisa register, login, membuat sesi, upload audio+PDF, dan melihat status pemrosesan.

**Backend:**

- Monorepo, Docker Compose (Postgres, Redis, API, worker, web).
- FastAPI skeleton: config, logging JSON, error envelope, health/readiness.
- SQLAlchemy async + Alembic baseline: users, sessions, documents, modules, jobs, refresh tokens.
- Auth: register, login, refresh, logout, me; Argon2id; rate limit.
- Upload streaming + validasi + temp storage.
- Job queue (ARQ/Celery) + `processing_jobs` + status endpoint.
- Worker placeholder: extract text + mock transcript (belum AI).
- CI: lint, typecheck, unit, integration, build, container scan.

**Frontend:**

- Vite + React + TS + Tailwind; design tokens dark/light.
- Routing, auth screens, protected layout.
- Dashboard + "Sesi Baru" + upload progress.
- Session detail dengan status/job progress.
- API client typed + error handling.

**Exit criteria:**

- `docker compose up` bersih.
- Register → login → refresh → logout berfungsi.
- Upload 5 menit audio + 10 halaman PDF → job queued → status berubah → transkrip mock tampil.
- CI hijau; staging bisa diakses.
- Tidak ada secret di repo.

**Demo:** alur upload dan status pemrosesan.

---

### Sprint 2 — Voice & Ingestion (Minggu 5–6)

**Goal:** profil suara bisa dibuat dan dipakai; audio/dokumen nyata menghasilkan transkrip.

**Voice:**

- Dexie schema + CRUD + storage estimate.
- Recorder: permission, waveform, format detection, error states.
- WebSocket ticket auth + `/ws/v1/voice-calibrate`.
- Buffering 3–5 detik; VAD; SNR; embedding stability; score formula + unit test.
- UI modal 0–100%, warna merah/kuning/mint, save aktif ≥85%.
- Finalisasi embedding (base64, model version); profile list/rename/delete.
- Target-speaker filter service + threshold config + fallback.

**Ingestion:**

- PDF parser (pypdf/pdfplumber atau PyMuPDF berlisensi) + page structure.
- PPTX parser + notes/tables.
- Scanned PDF detection; OCR decision.
- Audio normalization (ffmpeg, 16 kHz mono).
- Faster-Whisper worker: VAD, language ID, glossary, timestamps, anti-hallucination.
- Transcript merge + source map (`audio:HH:MM:SS`, `doc:page`).

**Exit criteria:**

- 5 test speaker bisa enroll; skor stabil; profil muncul setelah reload.
- 30 menit audio + 20 halaman PDF → transkrip + extracted text dalam batas waktu yang disepakati.
- Filter meningkatkan WER pada test set, atau fallback bekerja.
- Job gagal bisa di-retry; error message jelas.

**Demo:** enroll "Pak Budi", proses sesi, lihat transkrip + halaman PDF.

---

### Sprint 3 — AI & Reader (Minggu 7–8)

**Goal:** sesi lengkap menghasilkan modul 4 mode + metode belajar + kuis, dan bisa dibaca.

**AI:**

- Context builder: outline dokumen + segmen transkrip + token budget + source refs.
- 4 prompt mode v1; prompt versioning.
- JSON schema + Pydantic validation + repair retry.
- Gemini client: timeout, retry, rate limit, model routing, token logging.
- Study method + 3–5 quiz grounded.
- Citations/fidelity guard; glossary.
- Eval harness + golden dataset; prompt regression.

**Frontend:**

- Reader: content blocks, callout, formula (KaTeX), citations.
- Desktop split 65/35; mobile segmented tabs.
- Study method card + 3D flip quiz (keyboard accessible).
- History/detail; style switcher dengan cache + loading.
- Loading/empty/error states.

**Exit criteria:**

- 4 mode menghasilkan JSON valid ≥98% pada test set.
- Fidelity rubric ≥4/5; quiz punya source_ref dan jawaban valid.
- Reader responsif 360 px dan 1280 px.
- Style switch berfungsi dari sesi tersimpan; cache hit <500 ms.
- p95 generation sesuai target awal (≤20 detik Flash).

**Demo:** dari upload → pilih mode → baca modul → ganti mode.

---

### Sprint 4 — PWA & Polish (Minggu 9–10)

**Goal:** aplikasi bisa di-install, nyaman dipakai, dan siap diuji di lapangan.

**PWA:**

- Manifest, icons, service worker, app shell cache.
- Install prompt Android/desktop; instruksi iOS.
- Offline read 5 modul terakhir; indikator offline.
- `navigator.storage.persist()` + storage estimate + export/import profil.
- Cache invalidation saat modul berubah.

**UX:**

- Onboarding + consent sebelum rekaman.
- Settings/profile/theme; delete account.
- Motion tokens + reduced motion; haptic fallback.
- Dynamic accent per mode; kontras dark/light.
- Error boundaries, retry, toast, skeleton.
- Accessibility: focus, keyboard, aria, screen reader, quiz alternatif.
- Responsive penuh 360/768/1024/1280.

**Exit criteria:**

- Lighthouse PWA ≥90; accessibility ≥95.
- Install di Android Chrome, iOS Safari, desktop Chrome/Edge.
- Offline read berfungsi; processing menampilkan pesan "butuh online".
- Tidak ada teks kontras <4.5:1.
- Reduced motion dihormati.

**Demo:** install di HP, baca modul offline.

---

### Sprint 5 — Hardening, QA & Launch (Minggu 11–12)

**Goal:** beta yang stabil, aman, dan bisa dipulihkan.

**QA:**

- Unit/integration/E2E critical paths.
- AI eval regression (4 mode, quiz, fidelity).
- Acoustic field test: 3 ruangan × 3 noise × 5 speaker.
- Load/soak: 10/50 concurrent, queue depth, memory.
- Failure injection: Gemini timeout/429, worker crash, disk full, upload putus.
- Security: IDOR, upload fuzzing, XSS, prompt injection, dependency scan.
- Accessibility & cross-browser/device.
- Bug bash + release candidate.

**Deploy/Ops:**

- Production Docker Compose + Caddy/TLS; non-root containers; resource limits.
- Migrations job; healthchecks; log rotation.
- Backup harian + restore drill.
- Monitoring: API, queue, job failure, Gemini, disk, p95.
- Alerts + runbook deploy/rollback/restore/rotate key.
- Staging → prod pipeline + smoke test.
- Beta invite + feedback form.

**Exit criteria:**

- Semua release gate di §10.5 terpenuhi.
- Tidak ada P0/P1 terbuka.
- Backup restore berhasil.
- Rollback <15 menit.
- Beta live dan dimonitor 72 jam.

**Demo:** beta production + laporan QA.

---

## 5. Arsitektur Revisi

### 5.1 Topologi Target

```mermaid
graph TB
    U["User Browser / PWA"] -->|HTTPS| C["Caddy Reverse Proxy + TLS"]
    C -->|static| FE["React Build (PWA)"]
    C -->|"/api/*"| API["FastAPI API"]
    C -->|"/ws/*"| API

    API --> PG[("PostgreSQL 16")]
    API --> R[("Redis Queue + Cache")]
    API --> T[("Temp Storage<br/>audio upload sementara")]

    W["Worker (ARQ/Celery)"] --> R
    W --> PG
    W --> T
    W --> M["Model Cache<br/>SpeechBrain + Faster-Whisper"]
    W --> G["Gemini API"]

    API -.->|"job status"| PG
    W -.->|"progress"| PG
```

### 5.2 Komponen & Tanggung Jawab

| Komponen | Tanggung Jawab | Catatan |
| :--- | :--- | :--- |
| **Caddy** | TLS, reverse proxy, static frontend, WebSocket upgrade. | Konfigurasi body size untuk upload 100 MB. |
| **React PWA** | UI, rekaman, IndexedDB, offline cache, reader. | Tidak menyimpan token di localStorage. |
| **FastAPI** | Auth, CRUD sesi, upload, enqueue job, status, WebSocket calibration. | Tidak menjalankan STT/LLM di event loop. |
| **Worker** | Extract dokumen, STT, speaker filter, Gemini, simpan hasil. | Proses terpisah; concurrency dibatasi. |
| **PostgreSQL** | Sumber kebenaran data. | Backup + migration. |
| **Redis** | Queue, rate limit, cache job progress. | Bisa tanpa persistensi untuk MVP. |
| **Temp storage** | File upload sementara. | Dibersihkan setelah job selesai/gagal. |
| **Model cache** | Bobot SpeechBrain/Whisper. | Volume persisten; warmup saat start. |
| **Gemini API** | Narrative + method + quiz. | Retry, timeout, rate limit. |

### 5.3 Async Job Design

**Alur:**

```text
POST /api/v1/sessions
  → validasi + simpan file sementara
  → buat study_session (status QUEUED)
  → enqueue PROCESS_SESSION
  → 202 { session_id, job_id }

Worker:
  VALIDATING → EXTRACTING → FILTERING → TRANSCRIBING → GENERATING → SAVING → READY

GET /api/v1/jobs/{job_id}
  → { status, stage, progress, error, timestamps }
```

**Status job:** `QUEUED`, `RUNNING`, `SUCCEEDED`, `FAILED`, `CANCELED`.

**Queue:**

- `interactive`: style switch, regenerasi kecil — prioritas tinggi.
- `batch`: audio/document processing — prioritas rendah, concurrency terbatas.

**Retry:**

- Transient (network, Gemini 429/5xx, worker crash): maksimal 3× exponential backoff.
- Validation/permanent (file rusak, PDF terenkripsi, schema invalid setelah repair): tidak retry; tampilkan error.
- Dead-letter: job FAILED dengan `error_code`; user bisa retry manual.

**Idempotency:**

- Header `Idempotency-Key` pada POST sessions/modules.
- Unique index pada `processing_jobs.idempotency_key`.
- Cegah double charge Gemini.

**Progress:**

| Stage | Bobot |
| :--- | :---: |
| Validating | 5% |
| Extracting document | 10% |
| Filtering audio | 15% |
| Transcribing | 40% |
| Generating module | 25% |
| Saving | 5% |

**Timeout per stage:** extract 2 menit, STT 30 menit, Gemini 2 menit, save 30 detik. Timeout total mengikuti batas audio.

### 5.4 Voice Pipeline

**Enrollment flow:**

1. User klik "Kunci Suara Pemateri".
2. Browser minta izin mikrofon; pilih format yang didukung.
3. Client stream chunk 1,5 detik via WebSocket.
4. Server buffer 3–5 detik; hitung VAD, SNR, embedding per window.
5. Server kirim progress + feedback.
6. Saat skor ≥85% dan minimal 8 detik bicara, user memberi label.
7. Finalize: quality-weighted mean embedding, L2-normalize, kirim ke client.
8. Client simpan ke IndexedDB (base64 + metadata); server tidak menyimpan.

**Score formula (hypothesis, tune with data):**

```text
speech_score    = min(speech_seconds / 8, 1) × 100
snr_score       = clamp((snr_db - 5) / 15, 0, 1) × 100
stability_score = clamp((mean_pairwise_cosine - 0.5) / 0.5, 0, 1) × 100
total           = 0.50×speech + 0.30×snr + 0.20×stability - clipping_penalty
```

**Target filter:**

- Segmentasi VAD 1,5–3 detik.
- Embedding per segmen; cosine similarity ke target.
- Threshold awal 0.65; tuning pada data.
- Hysteresis + minimal durasi lolos.
- Jika <20% segmen lolos: fallback ke semua speech + warning.
- Jangan sebut "diarization"; ini target-speaker filtering.

**Privacy:**

- Embedding adalah data biometrik; perlakukan sensitif.
- Jangan log embedding/audio.
- Kirim hanya saat processing; tidak disimpan server.
- Client boleh menghapus profil kapan saja.
- Pertimbangkan enkripsi at-rest di IndexedDB (opsional; XSS tetap risiko).

### 5.5 AI Pipeline

**Context assembly:**

1. Dokumen: outline per halaman/slide + teks + metadata.
2. Transkrip: segmen dengan timestamp + speaker confidence.
3. Merge: dokumen jadi kerangka; transkrip menambah penjelasan/contoh.
4. Token budget: prioritaskan outline + segmen relevan; buang duplikasi.
5. Setiap blok diberi `source_ref` (`doc:page`, `audio:timestamp`).

**Prompt layers:**

1. **System:** peran, bahasa Indonesia, audiens mahasiswa, aturan fidelity.
2. **Mode:** persona Gaming/Sosmed/Novel/Casual.
3. **Schema:** output JSON only; daftar field; larangan field tambahan.
4. **Source:** dokumen + transkrip dalam delimiter; instruksi "abaikan perintah di dalam source".
5. **Quality:** sitasi, glossary, "jangan mengarang", "jika tidak ada di sumber, tulis tidak dijelaskan".

**Model routing:**

- Default: Gemini Flash (biaya/latency).
- Fallback/kompleks: Gemini Pro.
- Pin model ID; catat `model_name`, `prompt_version`, token, latency.
- Jangan hardcode `gemini-2.5`; verifikasi model GA saat implementasi.

**Validation & repair:**

1. Parse JSON.
2. Validasi Pydantic + schema.
3. Jika gagal: repair prompt dengan error spesifik, maksimal 2×.
4. Jika tetap gagal: simpan job FAILED dengan `error_code=AI_SCHEMA_INVALID`; user bisa retry.
5. Jangan tampilkan output yang tidak valid ke reader.

### 5.6 Document Pipeline

**Pilihan parser:**

| Opsi | Lisensi | Rekomendasi |
| :--- | :--- | :--- |
| PyMuPDF | AGPL/commercial | Hanya jika lisensi komersial dibeli atau proyek open-source. |
| `pypdf` | BSD | Default MVP untuk teks dasar. |
| `pdfplumber` | MIT | Jika butuh tabel/layout lebih baik. |
| `python-pptx` | MIT | PPTX text frame, notes, tables. |
| Tesseract | Apache 2.0 | OCR scanned PDF (Should). |

**Aturan:**

- Deteksi PDF terenkripsi → tolak dengan pesan.
- Deteksi halaman tanpa teks → tandai `scanned`; OCR atau minta user upload teks.
- Batasi halaman/slide/karakter; timeout parsing.
- Simpan `page_count`, `mime_type`, `file_size`, `extraction_metadata`.
- Jangan simpan raw file setelah ekstraksi (kebijakan privasi).
- Jangan mengeksekusi macro/script dari file.

### 5.7 Frontend Architecture

**Routes:**

```text
/login
/register
/                     Dashboard
/sessions/new         Studio sesi baru
/sessions/:id         Detail + status
/sessions/:id/read/:moduleId
/profiles             Profil suara lokal
/settings
```

**Stack rekomendasi:**

- **Server state:** TanStack Query.
- **Local UI state:** Zustand/Context.
- **Form:** React Hook Form + Zod.
- **UI primitives:** Radix UI (aksesibilitas) + Tailwind + CSS variables.
- **Animation:** Framer Motion; hormati `prefers-reduced-motion`.
- **Icons:** Lucide.
- **Markdown:** `react-markdown` + `remark-gfm` + `rehype-katex` + `rehype-sanitize`.
- **Audio:** MediaRecorder + AudioWorklet; WaveSurfer opsional.
- **PWA:** `vite-plugin-pwa` (Workbox).
- **Testing:** Vitest + React Testing Library + Playwright.

**Aturan:**

- Jangan render raw HTML dari AI.
- Token akses disimpan di memory; refresh token di HttpOnly cookie.
- Semua request punya error boundary + retry terbatas.
- Loading skeleton untuk job/reader.
- Aksesibilitas: fokus, keyboard, aria, kontras, reduced motion.

### 5.8 Backend Architecture

**Struktur:**

```text
backend/
  app/
    api/routers/       auth, sessions, jobs, modules, voice, health
    core/              config, security, logging, errors, rate_limit
    models/            SQLAlchemy
    schemas/           Pydantic
    services/          auth, session, document, voice, stt, ai, job
    repositories/      query per entitas
    workers/           arq/celery tasks
    db/                session, migrations
  tests/
    unit/ integration/ e2e/
```

**Aturan:**

- Router tipis; logic di service.
- Semua query user-scoped (`user_id`) untuk mencegah IDOR.
- Error envelope konsisten (`application/problem+json`).
- Logging JSON + request_id; redaksi token/audio/transcript.
- Config via Pydantic Settings + env; tidak ada secret default.
- Rate limit login/upload/AI.
- Temp file dibersihkan di `finally`.
- Worker tidak menulis ke disk kecuali temp; hasil ke Postgres.

---

## 6. Data Model Revisi

### 6.1 Perubahan Tabel

| Tabel | Perubahan | Alasan |
| :--- | :--- | :--- |
| `users` | `email CITEXT UNIQUE`, `is_active`, `updated_at`, `consent_version`, `consent_accepted_at`, `last_login_at`. | Email case-insensitive; consent; akun nonaktif. |
| `study_sessions` | `status`, `error_code`, `error_message`, `audio_duration_seconds`, `language`, `transcript_json`, `updated_at`. | Job state; metadata; transkrip terstruktur. |
| `session_documents` | `page_count`, `file_size_bytes`, `mime_type`, `extraction_metadata`, index `session_id`. | Audit/quality; query cepat. |
| `generated_modules` | `content_json`, `quiz_json`, `schema_version`, `model_name`, `prompt_version`, `input_tokens`, `output_tokens`, `latency_ms`, `status`, `updated_at`; unique `(session_id, style_mode)`. | Render terstruktur; reproducibility; cegah duplikat. |
| `processing_jobs` | **Tabel baru**: status, stage, progress, attempts, error, idempotency, timestamps. | Async processing. |
| `refresh_tokens` | **Tabel baru**: token hash, expiry, revoked. | Refresh rotation/revocation. |
| `module_progress` | **Opsional**: last_read_at, quiz_score, answers. | Progress lintas device (Should). |

### 6.2 DDL Inti

```sql
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- users: email case-insensitive
ALTER TABLE users
  ALTER COLUMN email TYPE CITEXT,
  ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN consent_version VARCHAR(20),
  ADD COLUMN consent_accepted_at TIMESTAMPTZ,
  ADD COLUMN last_login_at TIMESTAMPTZ;

-- study_sessions
ALTER TABLE study_sessions
  ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'QUEUED'
    CHECK (status IN ('QUEUED','PROCESSING','READY','FAILED','CANCELED')),
  ADD COLUMN error_code VARCHAR(50),
  ADD COLUMN error_message TEXT,
  ADD COLUMN audio_duration_seconds INTEGER,
  ADD COLUMN language VARCHAR(10) DEFAULT 'id',
  ADD COLUMN transcript_json JSONB,
  ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- session_documents
ALTER TABLE session_documents
  ADD COLUMN page_count INTEGER,
  ADD COLUMN file_size_bytes BIGINT,
  ADD COLUMN mime_type VARCHAR(100),
  ADD COLUMN extraction_metadata JSONB;

CREATE INDEX idx_documents_session ON session_documents(session_id);

-- generated_modules
ALTER TABLE generated_modules
  ADD COLUMN content_json JSONB,
  ADD COLUMN quiz_json JSONB,
  ADD COLUMN schema_version VARCHAR(10) NOT NULL DEFAULT '1.0',
  ADD COLUMN model_name VARCHAR(100),
  ADD COLUMN prompt_version VARCHAR(20),
  ADD COLUMN input_tokens INTEGER,
  ADD COLUMN output_tokens INTEGER,
  ADD COLUMN latency_ms INTEGER,
  ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'READY',
  ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX uq_modules_session_style
  ON generated_modules(session_id, style_mode);

-- indexes
CREATE INDEX idx_sessions_user_created
  ON study_sessions(user_id, created_at DESC);

-- processing_jobs
CREATE TABLE processing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_type VARCHAR(20) NOT NULL
    CHECK (job_type IN ('PROCESS_SESSION','SWITCH_STYLE')),
  status VARCHAR(20) NOT NULL DEFAULT 'QUEUED'
    CHECK (status IN ('QUEUED','RUNNING','SUCCEEDED','FAILED','CANCELED')),
  stage VARCHAR(30),
  progress SMALLINT NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  attempts SMALLINT NOT NULL DEFAULT 0,
  idempotency_key VARCHAR(100),
  error_code VARCHAR(50),
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX uq_jobs_idempotency
  ON processing_jobs(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX idx_jobs_status_created
  ON processing_jobs(status, created_at);

-- refresh_tokens
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_refresh_user ON refresh_tokens(user_id);
```

**Catatan:** karena belum ada kode, ubah baseline migration langsung (bukan migration bertumpuk). Jika sudah ada data, gunakan Alembic bertahap + backup.

### 6.3 Migrasi & Retensi

- Satu migration per sprint; review di staging.
- Tidak ada `DROP`/rename destruktif tanpa backup.
- `alembic upgrade head` dijalankan sebagai job sebelum API baru live.
- Retensi:
  - Audio mentah: dihapus setelah job selesai/gagal.
  - Dokumen mentah: dihapus setelah ekstraksi; hanya teks + metadata disimpan.
  - Transkrip/modul: disimpan sampai user menghapus sesi/akun.
  - Backup: 7 harian, 4 mingguan, 3 bulanan; retensi 30 hari untuk data terhapus.
  - Log: 30 hari; tanpa audio/transkrip/embedding/token.

---

## 7. API Contract v1

### 7.1 Endpoint

| Method | Path | Auth | Request | Response | Catatan |
| :--- | :--- | :--- | :--- | :--- | :--- |
| POST | `/api/v1/auth/register` | Public | `{full_name,email,password}` | `201 {user}` + tokens | Rate limit. |
| POST | `/api/v1/auth/login` | Public | `{email,password}` | `{access_token}` + refresh cookie | Rate limit. |
| POST | `/api/v1/auth/refresh` | Cookie | - | `{access_token}` | Rotasi refresh. |
| POST | `/api/v1/auth/logout` | Cookie | - | `204` | Revoke. |
| GET | `/api/v1/auth/me` | Bearer | - | `{user}` | - |
| DELETE | `/api/v1/auth/me` | Bearer | `{password}` | `204` | Cascade delete. |
| POST | `/api/v1/sessions` | Bearer | Multipart: `audio?`, `documents?`, `style_mode`, `speaker_label?`, `embedding?`, `glossary?` | `202 {session_id,job_id}` | Idempotency-Key. |
| GET | `/api/v1/sessions` | Bearer | `cursor,limit,status` | `{items,next_cursor}` | Pagination. |
| GET | `/api/v1/sessions/{id}` | Bearer | - | Session + docs + modules | - |
| PATCH | `/api/v1/sessions/{id}` | Bearer | `{title}` | `{session}` | - |
| DELETE | `/api/v1/sessions/{id}` | Bearer | - | `204` | Cascade. |
| POST | `/api/v1/sessions/{id}/retry` | Bearer | - | `202 {job_id}` | Job FAILED. |
| POST | `/api/v1/sessions/{id}/cancel` | Bearer | - | `202` | Set cancel flag. |
| GET | `/api/v1/jobs/{id}` | Bearer | - | `{job}` | Polling. |
| POST | `/api/v1/sessions/{id}/modules` | Bearer | `{style_mode}` | `202 {job_id}` | Style switch. |
| GET | `/api/v1/sessions/{id}/modules/{style}` | Bearer | - | `{module}` | Cache. |
| PUT | `/api/v1/modules/{id}/progress` | Bearer | `{last_read_at,answers?}` | `204` | Opsional. |
| POST | `/api/v1/voice/ws-ticket` | Bearer | - | `{ticket,expires_in}` | Ticket 60 detik. |
| WS | `/ws/v1/voice-calibrate?ticket=...` | Ticket | Binary + JSON | Progress/final | Auth via ticket. |
| POST | `/api/v1/voice/embedding` | Bearer | Multipart audio | `{embedding,score}` | Fallback finalize. |
| GET | `/healthz` | Public | - | `200` | Liveness. |
| GET | `/readyz` | Public | - | `200/503` | DB/Redis. |

### 7.2 Job Response

```json
{
  "id": "0f3c...",
  "session_id": "7a1b...",
  "job_type": "PROCESS_SESSION",
  "status": "RUNNING",
  "stage": "TRANSCRIBING",
  "progress": 62,
  "attempts": 1,
  "error": null,
  "created_at": "2026-11-14T10:00:00Z",
  "started_at": "2026-11-14T10:00:03Z",
  "finished_at": null
}
```

### 7.3 Error Format

Gunakan `application/problem+json`:

```json
{
  "type": "https://narralearn.app/errors/file-too-large",
  "title": "File terlalu besar",
  "status": 413,
  "detail": "Ukuran audio maksimal 100 MB.",
  "code": "FILE_TOO_LARGE",
  "request_id": "req_..."
}
```

Kode error awal: `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `FILE_TOO_LARGE`, `UNSUPPORTED_FORMAT`, `PDF_ENCRYPTED`, `SCANNED_PDF`, `JOB_FAILED`, `AI_SCHEMA_INVALID`, `RATE_LIMITED`, `QUOTA_EXCEEDED`, `INTERNAL_ERROR`.

### 7.4 WebSocket Protocol

**Ticket:** `POST /api/v1/voice/ws-ticket` → `{ticket, expires_in: 60}`. Jangan taruh JWT di query string (bisa masuk log).

**Client → server:**

```json
{"type":"start","format":"audio/webm;codecs=opus","sampleRate":48000}
```
lalu binary chunk 1,5 detik.

```json
{"type":"finalize","speakerName":"Pak Budi - Basis Data"}
```

**Server → client:**

```json
{"type":"progress","percentage":68,"status":"Mengenali intonasi","ready":false}
{"type":"final","embedding":"<base64>","score":94,"speechSeconds":12.4}
{"type":"error","code":"AUDIO_TOO_NOISY","message":"Coba dekatkan mikrofon."}
```

**Batas:** max frame 1 MB; heartbeat 15 detik; close code 4001 auth, 4002 invalid message, 4003 too large, 4004 rate limit.

### 7.5 Auth Token Strategy

- **Access token:** JWT 15 menit, disimpan di memory (bukan localStorage).
- **Refresh token:** 7 hari, HttpOnly + Secure + SameSite=Lax, di-hash di DB, rotasi setiap refresh.
- **CSRF:** same-site + custom header untuk endpoint refresh/logout; jika cross-site, tambahkan CSRF token.
- **Argon2id:** memory 64 MB, iterations 3, parallelism 4 (tune).
- **Rate limit:** login 5/menit/IP, register 3/jam/IP, refresh 10/menit/user.
- **Email:** normalisasi lowercase + `CITEXT`; verifikasi email opsional untuk MVP.

### 7.6 OpenAPI & Types

- FastAPI menghasilkan `openapi.json`.
- Generate tipe frontend dengan `openapi-typescript`.
- Contract test: frontend build gagal jika schema berubah tanpa update tipe.
- Dokumentasi endpoint di `/docs` hanya untuk staging; prod bisa dimatikan.

---

## 8. AI Output Schema & Prompt Contract

### 8.1 Schema Ringkas

```json
{
  "schema_version": "1.0",
  "title": "Quest: Normalisasi Database",
  "summary": "...",
  "sections": [
    {
      "heading": "Level 1 — Mengenal 1NF",
      "blocks": [
        {
          "type": "paragraph",
          "text": "...",
          "source_refs": ["doc:3", "audio:00:12:30"]
        },
        {
          "type": "callout",
          "title": "Konsep Kunci",
          "text": "...",
          "source_refs": ["doc:4"]
        },
        {
          "type": "formula",
          "latex": "R = (A, B, C)",
          "explanation": "...",
          "source_refs": ["doc:5"]
        }
      ]
    }
  ],
  "glossary": [
    {"term": "1NF", "definition": "...", "source_refs": ["doc:3"]}
  ],
  "study_method": {
    "name": "Active Recall",
    "why": "...",
    "steps": ["..."],
    "source_refs": ["doc:3"]
  },
  "quiz": [
    {
      "id": "q1",
      "type": "multiple_choice",
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "answer_index": 0,
      "explanation": "...",
      "source_refs": ["doc:3"]
    }
  ],
  "citations": [
    {"id": "doc:3", "label": "Slide 3", "kind": "document"},
    {"id": "audio:00:12:30", "label": "Audio 12:30", "kind": "audio"}
  ]
}
```

### 8.2 Validation Rules

- `schema_version` wajib.
- `sections` minimal 2; setiap section punya minimal 1 block.
- `quiz` 3–5 item; 4 opsi; `answer_index` valid; explanation wajib.
- `source_refs` harus ada di `citations`.
- `formula.latex` valid (KaTeX parse).
- Bahasa Indonesia; istilah Inggris dipertahankan.
- Tidak ada HTML mentah.
- Tidak ada field tambahan di luar schema.

### 8.3 Fidelity & Citations

- Definisi, rumus, angka, dan fakta inti tidak boleh diubah.
- Mode narasi hanya mengubah **cara penyampaian**, bukan substansi.
- Jika sumber tidak menjelaskan, tulis "tidak dijelaskan di sumber".
- Setiap klaim akademis punya `source_ref`.
- Quiz tidak boleh menanyakan hal yang tidak ada di sumber.
- Glosarium membantu code-switching dan istilah teknis.

### 8.4 Prompt Versioning & Eval

- Setiap prompt punya `prompt_version` (mis. `gaming-v1.2`).
- Perubahan prompt → jalankan eval → bandingkan dengan baseline.
- Simpan hasil eval di repo (`evals/results/`).
- Eval rubric: factual accuracy, coverage, mode adherence, structure, quiz validity, language (1–5).
- Target: schema valid ≥98%, fidelity ≥4/5, quiz valid ≥95%.
- Model routing: Flash default; Pro untuk repair/kompleks; catat biaya.

---

## 9. Security, Privacy & Legal

### 9.1 Auth & Account

- Access 15 menit; refresh 7 hari; rotasi; revoke.
- Jangan simpan token di localStorage.
- Rate limit login/register/refresh.
- Password minimal 10 karakter; cek password umum (opsional).
- Email case-insensitive; verifikasi opsional.
- Delete account: konfirmasi password; cascade; backup retention 30 hari.
- IDOR test untuk semua endpoint sesi/modul.

### 9.2 Upload Security

- Validasi ekstensi + MIME + magic bytes.
- Batas audio 100 MB; dokumen 25 MB; halaman/slide; total karakter.
- Tolak PDF terenkripsi; deteksi scanned.
- Lindungi PPTX dari zip bomb (uncompressed size, file count).
- Parser timeout + resource limit.
- Temp file permission ketat; hapus di `finally`.
- Jangan gunakan nama file user sebagai path.
- Jangan jalankan macro/script.

### 9.3 AI Security

- Prompt injection: dokumen/transkrip adalah data; delimiter + instruksi eksplisit.
- Sanitasi Markdown; `rehype-sanitize`; larang raw HTML.
- CSP ketat; jangan izinkan inline script.
- Rate limit + kuota per user.
- Jangan kirim secret/API key ke prompt.
- Jangan log output mentah yang mengandung PII.
- Validasi schema sebelum render.

### 9.4 Data Classification & Retention

| Data | Klasifikasi | Retensi | Catatan |
| :--- | :--- | :--- | :--- |
| Audio mentah | Sensitif | Hapus setelah job | Temp storage; no backup. |
| Voice embedding | Biometrik | Lokal di device | Server hanya memproses sementara. |
| Transkrip | Personal | Sampai user hapus | Bisa mengandung suara orang lain. |
| Dokumen teks | Personal/copyright | Sampai user hapus | User bertanggung jawab atas hak. |
| Modul AI | Personal | Sampai user hapus | Bisa diexport. |
| Log | Internal | 30 hari | Redaksi PII. |
| Backup | Sangat sensitif | 30 hari | Enkripsi; restore drill. |

### 9.5 Consent Flow

1. Sebelum rekaman pertama, tampilkan modal:
   - "Pastikan Anda memiliki izin merekam pemateri/kelas."
   - Penjelasan audio diproses server, tidak disimpan permanen.
   - Link privacy policy.
2. Checkbox wajib; simpan `consent_version` + `consent_accepted_at`.
3. Tampilkan indikator rekaman yang jelas.
4. Sediakan cara menghapus sesi/profil suara.
5. Jangan gunakan rekaman untuk training tanpa consent eksplisit.

### 9.6 Legal Checklist

- [ ] Privacy policy (data, retensi, pihak ketiga, hak user).
- [ ] Terms of service (copyright slide, consent rekaman, batasan AI).
- [ ] Consent recording + biometric.
- [ ] Kepatuhan UU PDP (Indonesia): dasar pemrosesan, hak akses/hapus, breach notification.
- [ ] License audit: PyMuPDF, model weights, fonts, library.
- [ ] Gemini API terms/DPA; paid tier jika data tidak boleh untuk training.
- [ ] Data residency/region jika diperlukan.
- [ ] Copyright disclaimer untuk materi upload.
- [ ] Kebijakan AI: disclaimer hallucination, bukan pengganti dosen.

---

## 10. QA & Testing

### 10.1 Test Pyramid

| Layer | Tools | Fokus |
| :--- | :--- | :--- |
| Unit | pytest, Vitest | Score formula, cosine, parser, schema, auth, utils. |
| Integration | pytest + testcontainers | API + Postgres + Redis + queue + WS; Gemini/STT mocked. |
| E2E | Playwright | Register/login, upload, job, reader, switch style, quiz, delete. |
| AI Eval | Python harness | 4 mode, schema, fidelity, quiz, cost/latency. |
| Load | k6/Locust | 10/50 concurrent, queue, memory, WS. |
| Security | OWASP ZAP/manual | IDOR, upload, XSS, prompt injection. |
| Accessibility | axe + manual | Keyboard, screen reader, contrast, reduced motion. |
| PWA | Lighthouse + device | Install, offline, iOS/Android/desktop. |

### 10.2 AI Eval

**Dataset:** 20–30 sesi dengan consent; variasi mata kuliah, durasi, noise, code-switching.

**Metrik:**

- WER/CER (clean vs noisy).
- Speaker verification EER; false reject rate.
- Dampak filter ke WER.
- Schema validity.
- Fidelity rubric (1–5).
- Quiz validity (jawaban benar, grounded).
- Latency dan token cost.

**Regression:** setiap perubahan prompt/model harus lulus baseline; jika turun, rollback.

### 10.3 Acoustic Field Test Protocol

- 5 pemateri; 3 ruangan (tenang, kipas, obrolan); 2 mikrofon (laptop, HP).
- Enroll 10–20 detik; catat waktu mencapai 85%.
- Rekam 10 menit; bandingkan transkrip dengan ground truth.
- Ukur: calibration success, false reject, WER, user feedback.
- Simpan hasil di `evals/acoustic/`.

### 10.4 Release Gates

| Gate | Target |
| :--- | :--- |
| Critical path E2E | 100% lulus. |
| Unit test critical modules | ≥80% line coverage (bukan target kosmetik). |
| AI schema validity | ≥98%. |
| AI fidelity | ≥4/5. |
| Quiz validity | ≥95%. |
| Job success rate | ≥95% (non-validation). |
| p95 API latency | <300 ms (non-AI). |
| p95 generation | ≤20 detik Flash; style switch ≤15 detik. |
| Security | Tidak ada P0/P1; IDOR/XSS/upload lulus. |
| Accessibility | Lighthouse ≥95; manual keyboard/screen reader lulus. |
| PWA | Lighthouse ≥90; install/offline lulus. |
| Backup restore | Berhasil dalam 60 menit. |
| Rollback | <15 menit. |

### 10.5 Definition of Done

- Acceptance criteria terpenuhi.
- Unit/integration test ditambah dan lulus.
- Lint/typecheck/build hijau.
- Code review disetujui.
- Dokumentasi/ADR diperbarui.
- Observability: log/metric/error tracking.
- Keamanan: tidak ada secret, input divalidasi.
- Aksesibilitas: keyboard + kontras.
- Deploy ke staging + smoke test.
- Demo ke stakeholder.

---

## 11. Deployment & Operations

### 11.1 Environments

| Environment | Tujuan | Data |
| :--- | :--- | :--- |
| Local | Development | Dummy + sample audio. |
| Staging | QA/demo | Data sintetis/consented. |
| Production | Beta/user | Data nyata; backup. |

### 11.2 Production Compose (Baseline)

```yaml
services:
  caddy:
    image: caddy:2
    ports: ["80:80", "443:443"]
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
    depends_on: [api, web]

  web:
    build: ./frontend
    # static build disajikan Caddy; container ini opsional jika build di CI

  api:
    build: ./backend
    env_file: .env.prod
    depends_on:
      postgres: {condition: service_healthy}
      redis: {condition: service_healthy}
    healthcheck: ...

  worker:
    build: ./backend
    command: ["arq", "app.workers.tasks.WorkerSettings"]
    env_file: .env.prod
    volumes:
      - model_cache:/models
      - tmp:/tmp/narralearn
    depends_on: [postgres, redis]

  postgres:
    image: postgres:16
    volumes: [pgdata:/var/lib/postgresql/data]
    healthcheck: ...

  redis:
    image: redis:7
    healthcheck: ...

volumes:
  pgdata:
  model_cache:
  tmp:
  caddy_data:
```

**Catatan:** untuk produksi nyata, pertimbangkan managed PostgreSQL + object storage; Compose single-VM cukup untuk beta.

### 11.3 CI/CD Pipeline

```text
Push/PR
  → lint (ruff/eslint)
  → typecheck (mypy/pyright, tsc)
  → unit test
  → integration test (Postgres/Redis)
  → build images
  → container scan (Trivy)
  → deploy staging
  → smoke test
  → manual approval
  → backup prod
  → alembic upgrade
  → deploy prod
  → smoke test
  → rollback jika gagal
```

### 11.4 Backup & Restore

- `pg_dump` harian + WAL archiving jika memungkinkan.
- Retensi: 7 harian, 4 mingguan, 3 bulanan.
- Offsite/encrypted.
- Restore drill sebelum launch dan setiap kuartal.
- Uji restore ke staging, bukan prod.

### 11.5 Monitoring & Alerts

**Metrik:**

- API request rate, error rate, p95 latency.
- Job queue depth, job success/failure, stage duration.
- Gemini error/429, token usage, cost.
- STT duration/RTF, worker memory.
- DB connections, slow queries, disk.
- PWA install/offline events (opsional).

**Alert:**

- API down >2 menit.
- Job failure >5% dalam 15 menit.
- Queue depth >10 menit.
- Disk >80%.
- Backup gagal.
- Gemini 429/5xx >10%.
- p95 generation >30 detik.

### 11.6 Runbooks

- Deploy & rollback.
- Restore database.
- Rotate JWT/Gemini key.
- Disable AI/queue saat insiden.
- Handle disk full.
- Handle model cache corrupt.
- Incident communication.

### 11.7 Cost & Quota

- Catat `input_tokens`, `output_tokens`, `latency_ms`, audio duration, worker time.
- Kuota free: mis. 120 menit audio/bulan, 20 modul/bulan.
- Budget alert Gemini dan compute.
- Dashboard biaya per modul; review mingguan.

### 11.8 Launch Checklist

- [ ] Domain + TLS + HSTS.
- [ ] Secrets di env/secret manager.
- [ ] Migrations berhasil.
- [ ] Backup + restore drill.
- [ ] Monitoring + alert.
- [ ] Privacy/terms/consent live.
- [ ] Rate limit + kuota.
- [ ] Smoke test semua critical path.
- [ ] Rollback diuji.
- [ ] Beta invite + feedback channel.
- [ ] Support contact.

---

## 12. Backlog

**Estimasi:** S ≤2 hari, M 3–5 hari, L 6–10 hari (per engineer, termasuk test).

### E0 — Discovery & De-Risking

| ID | Task | Acceptance Criteria | Est | Dep |
| :--- | :--- | :--- | :---: | :--- |
| E0.1 | Scope & non-goals workshop | PRD addendum disetujui; cut list jelas. | S | - |
| E0.2 | License audit | Decision record PDF parser, model, font, Gemini. | S | - |
| E0.3 | Voice spike | 5 speaker × 3 noise; EER, calibration, filter WER. | M | Sample audio |
| E0.4 | STT spike | 30/60 menit; WER, RTF, RAM/VRAM; model dipilih. | M | Sample audio |
| E0.5 | Gemini spike | 4 prompt; schema compliance, fidelity, latency, cost. | M | API key |
| E0.6 | iOS/PWA spike | Rekam 10 menit; lock screen; storage; fallback. | S | Device |
| E0.7 | Usability test | 5 user; findings + revisi flow. | M | Prototype |
| E0.8 | Contract v0 | OpenAPI, ERD, ADR, error format. | M | E0.1–E0.6 |

### E1 — Foundation & Walking Skeleton

| ID | Task | Acceptance Criteria | Est | Dep |
| :--- | :--- | :--- | :---: | :--- |
| E1.1 | Monorepo + Compose | `docker compose up` bersih. | S | E0.8 |
| E1.2 | FastAPI skeleton | Health, logging, error envelope. | S | E1.1 |
| E1.3 | DB + Alembic | Baseline migration; tabel baru. | M | E1.2 |
| E1.4 | Auth | Register/login/refresh/logout/me; test. | M | E1.3 |
| E1.5 | CI pipeline | Lint/type/test/build/scan hijau. | S | E1.1 |
| E1.6 | Frontend shell | Route, token, auth screens. | M | E1.1 |
| E1.7 | API client | Typed; error handling; refresh. | S | E1.4, E1.6 |
| E1.8 | Upload + job + status | 202 + job_id; progress; retry. | L | E1.3 |
| E1.9 | Dashboard/history | List/detail/delete. | M | E1.7, E1.8 |
| E1.10 | Staging deploy | Smoke test; HTTPS. | M | E1.5 |

### E2 — Voice

| ID | Task | Acceptance Criteria | Est | Dep |
| :--- | :--- | :--- | :---: | :--- |
| E2.1 | Dexie CRUD | Profile list/rename/delete; storage estimate. | S | E1.6 |
| E2.2 | Recorder | Permission, waveform, format fallback. | M | E2.1 |
| E2.3 | WS ticket + endpoint | Auth ticket; limit; heartbeat. | M | E1.4 |
| E2.4 | Score formula | Unit test; threshold configurable. | M | E2.3 |
| E2.5 | Calibration UI | 0–100; colors; save ≥85. | M | E2.2, E2.4 |
| E2.6 | Embedding finalize | Base64; model version; no server persist. | S | E2.4 |
| E2.7 | Target filter | Cosine; hysteresis; fallback. | M | E2.6, E3.5 |
| E2.8 | Field test | Report calibration/filter. | M | E2.5, E2.7 |

### E3 — Ingestion & STT

| ID | Task | Acceptance Criteria | Est | Dep |
| :--- | :--- | :--- | :---: | :--- |
| E3.1 | Upload validation | Magic bytes, size, temp cleanup. | M | E1.8 |
| E3.2 | PDF parser | Page structure; encrypted reject. | M | E0.2 |
| E3.3 | PPTX parser | Text, notes, tables. | M | E0.2 |
| E3.4 | Scanned detection | Flag/OCR decision. | S | E3.2 |
| E3.5 | Audio normalize | ffmpeg 16k mono; duration. | M | E3.1 |
| E3.6 | STT worker | VAD, glossary, timestamps. | L | E3.5 |
| E3.7 | Anti-hallucination | Threshold/filter; test. | M | E3.6 |
| E3.8 | Source map | `doc:page`, `audio:time`. | M | E3.2, E3.6 |
| E3.9 | Filter + STT | Integration; fallback. | M | E2.7, E3.6 |
| E3.10 | Long audio test | 60 menit sukses; memory aman. | M | E3.9 |

### E4 — AI Narrative

| ID | Task | Acceptance Criteria | Est | Dep |
| :--- | :--- | :--- | :---: | :--- |
| E4.1 | Context builder | Token budget; source refs. | M | E3.8 |
| E4.2 | 4 prompts | Versioned; mode konsisten. | M | E4.1 |
| E4.3 | Schema + validation | Pydantic; repair retry. | M | E4.2 |
| E4.4 | Gemini client | Timeout/retry/rate limit. | M | E1.2 |
| E4.5 | Method + quiz | 3–5 soal; grounded. | M | E4.3 |
| E4.6 | Citations/fidelity | Source refs valid; no invention. | M | E4.3 |
| E4.7 | Eval harness | Golden set; baseline. | L | E4.5 |
| E4.8 | Prompt logging | Version/model/token/latency. | S | E4.4 |
| E4.9 | Model routing | Flash/Pro; cost log. | S | E4.4 |

### E5 — Reader & UX

| ID | Task | Acceptance Criteria | Est | Dep |
| :--- | :--- | :--- | :---: | :--- |
| E5.1 | Reader layout | Blocks, split view, mobile tabs. | L | E4.3 |
| E5.2 | Markdown/KaTeX | Sanitized; formula render. | M | E5.1 |
| E5.3 | Method + quiz card | 3D flip; keyboard; feedback. | M | E4.5 |
| E5.4 | Style switcher | Cache; loading; error. | M | E4.1 |
| E5.5 | History/detail | List, rename, delete. | M | E1.9 |
| E5.6 | States | Loading/empty/error/retry. | S | E5.1 |
| E5.7 | Onboarding/consent | Checkbox; policy link. | M | E0.2 |
| E5.8 | Settings/profile | Theme, delete account, voices. | S | E5.7 |
| E5.9 | Responsive/a11y | 360–1280; keyboard; contrast. | M | E5.1 |

### E6 — PWA & Polish

| ID | Task | Acceptance Criteria | Est | Dep |
| :--- | :--- | :--- | :---: | :--- |
| E6.1 | Manifest/icons/SW | Installable; cache app shell. | M | E5.1 |
| E6.2 | Install prompts | Android/desktop; iOS instructions. | S | E6.1 |
| E6.3 | Offline read | 5 modul; offline badge. | M | E6.1 |
| E6.4 | Storage persistence | `persist()`; warning; export. | S | E6.3 |
| E6.5 | Motion | Tokens; reduced motion. | S | E5.1 |
| E6.6 | Theme polish | Dark/light; dynamic accent. | M | E5.1 |
| E6.7 | Lighthouse/a11y | PWA ≥90; a11y ≥95. | S | E6.1–E6.6 |

### E7 — QA, Security & Field Test

| ID | Task | Acceptance Criteria | Est | Dep |
| :--- | :--- | :--- | :---: | :--- |
| E7.1 | Unit/integration | Critical modules; CI. | M | E1–E5 |
| E7.2 | E2E | Critical paths lulus. | M | E5 |
| E7.3 | AI eval regression | Baseline + report. | M | E4.7 |
| E7.4 | Acoustic test | Protocol; report. | M | E2.8, E3.9 |
| E7.5 | Load/soak/failure | 10/50 concurrent; recovery. | M | E1.8 |
| E7.6 | Security review | IDOR/upload/XSS/prompt injection. | M | E5 |
| E7.7 | Accessibility audit | Manual + axe. | S | E5.9 |
| E7.8 | Cross-browser/device | Matrix lulus. | M | E6 |
| E7.9 | Bug bash/RC | No P0/P1; release candidate. | M | E7.1–E7.8 |

### E8 — Deploy & Ops

| ID | Task | Acceptance Criteria | Est | Dep |
| :--- | :--- | :--- | :---: | :--- |
| E8.1 | Production Compose | TLS, non-root, limits. | M | E1.10 |
| E8.2 | Backup/restore | Drill berhasil. | M | E8.1 |
| E8.3 | Monitoring/alerts | Dashboard + alert. | M | E8.1 |
| E8.4 | Runbooks | Deploy/rollback/restore/rotate. | S | E8.1 |
| E8.5 | CI/CD prod | Manual approval; smoke. | M | E1.5 |
| E8.6 | Beta launch | Invite; monitoring 72 jam. | S | E7.9 |

---

## 13. Metrik & Analytics

### 13.1 North Star

**Weekly active learners who complete at least one module.**

### 13.2 Metrik

| Kategori | Metrik | Target Awal (hipotesis) |
| :--- | :--- | :--- |
| Activation | User baru membuat modul pertama dalam 24 jam | ≥40% |
| Calibration | Mencapai ≥85% dalam 60 detik | ≥80% tenang / ≥60% bising |
| Time to value | Waktu upload → modul siap (15 menit audio) | p50 ≤5 menit |
| Processing | Job success rate | ≥95% |
| Engagement | Sesi yang mengganti style | ≥25% |
| Learning | Quiz completion | ≥50% |
| Retention | 7-day / 30-day | ≥25% / ≥10% |
| Quality | WER clean/noisy | ≤20% / ≤30% |
| Quality | Fidelity rubric | ≥4/5 |
| Reliability | API p95 non-AI | <300 ms |
| Cost | Gemini cost per module | Dalam budget |
| Satisfaction | CSAT | ≥4/5 |

### 13.3 Event (tanpa PII)

`signup`, `login`, `session_created`, `voice_enroll_started`, `voice_enroll_completed`, `job_started`, `job_succeeded`, `job_failed`, `module_opened`, `style_switched`, `quiz_answered`, `quiz_completed`, `pwa_installed`, `offline_read`, `session_deleted`.

Analytics privacy-friendly (mis. Plausible/Umami) atau self-hosted; jangan kirim transkrip/audio.

---

## 14. Governance

### 14.1 Ceremonies

- Daily standup 15 menit.
- Sprint planning 2 jam.
- Weekly demo 30 menit.
- Retrospective 1 jam.
- Risk review mingguan.
- Scope freeze setelah Sprint 1; perubahan masuk backlog.

### 14.2 Definition of Ready

- User story + acceptance criteria.
- Desain/wireframe (jika UI).
- API contract/schema.
- Dependency jelas.
- Estimasi.
- Test plan.
- Tidak ada pertanyaan blocker.

### 14.3 Definition of Done

Lihat §10.5.

### 14.4 Code Review

- Minimal 1 approval.
- Test lulus; lint/type bersih.
- Tidak ada secret.
- Perubahan DB punya migration.
- Perubahan prompt punya eval.
- Perubahan API memperbarui OpenAPI/tipe.

### 14.5 ADR

Simpan di `docs/adr/`:

- `0001-database-postgresql.md`
- `0002-async-queue.md`
- `0003-pdf-library-license.md`
- `0004-voice-embedding-format.md`
- `0005-auth-token-strategy.md`
- `0006-gemini-model-routing.md`
- `0007-offline-scope.md`
- `0008-data-retention.md`

### 14.6 RACI

| Aktivitas | Product | Eng | ML | QA/DevOps | Legal |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Scope & prioritas | A | C | C | C | I |
| Arsitektur | C | A | C | C | I |
| Voice/STT | I | C | A | C | I |
| Keamanan/privasi | C | R | C | C | A |
| QA/release | C | R | C | A | I |
| Deploy/ops | I | R | C | A | I |

---

## 15. Keputusan yang Harus Diambil

| ID | Keputusan | Opsi | Rekomendasi | Deadline |
| :--- | :--- | :--- | :--- | :--- |
| D-01 | Lisensi PDF | PyMuPDF commercial vs pypdf/pdfplumber | pypdf/pdfplumber untuk MVP | Sprint 0 |
| D-02 | Queue | ARQ vs Celery | ARQ (ringan) jika tim nyaman; Celery jika butuh ekosistem | Sprint 0 |
| D-03 | Kalibrasi | WebSocket real-time vs finalize-only | WebSocket jika spike lulus; fallback finalize | Sprint 0 |
| D-04 | Speaker filter | Wajib vs opsional | Wajib dengan fallback; bukan blocker rilis | Sprint 0 |
| D-05 | STT/hardware | small/medium/large; CPU/GPU | Berdasarkan spike | Sprint 0 |
| D-06 | Gemini model | Flash/Pro, versi | Pin model GA saat implementasi | Sprint 0 |
| D-07 | Auth token | Cookie refresh vs memory | HttpOnly cookie + access memory | Sprint 1 |
| D-08 | Offline | Read-only vs record offline | Read-only | Sprint 4 |
| D-09 | Audio retention | Hapus vs simpan | Hapus setelah proses | Sprint 0 |
| D-10 | Lisensi produk | Open-source vs proprietary | Menentukan PyMuPDF | Sprint 0 |
| D-11 | Email provider | Resend/SES/Postmark | Resend untuk MVP | Sprint 4 |
| D-12 | Deploy target | VPS/cloud/GPU | VPS 8 vCPU/32 GB; GPU jika spike menuntut | Sprint 0 |

---

## 16. Rencana 7 Hari Pertama

| Hari | Aktivitas | Output |
| :---: | :--- | :--- |
| 1 | Scope workshop; putuskan lisensi, tim, budget, target rilis. | PRD addendum; decision log. |
| 2 | Buat repo/monorepo, Docker, CI skeleton; kumpulkan 10 sampel audio ber-consent; siapkan Gemini key. | Repo jalan; dataset awal. |
| 3–4 | Spike voice + STT; benchmark CPU/GPU. | Spike report awal. |
| 5 | Spike Gemini 4 mode + iOS PWA. | Prompt v1; schema; laporan iOS. |
| 6 | Review hasil; Go/No-Go; update OpenAPI/ERD/ADR. | Keputusan arsitektur. |
| 7 | Sprint planning; buat tiket E1; mulai foundation. | Backlog sprint; kickoff. |

**Deliverable 7 hari:**

- [ ] Spike report voice/STT/Gemini/iOS.
- [ ] License & privacy decision.
- [ ] OpenAPI v0 + ERD v1.
- [ ] ADR 0001–0004.
- [ ] Revised backlog + risk register.
- [ ] Sprint 1 board siap.

---

## 17. Traceability Matrix

| Requirement | Epic | Verifikasi |
| :--- | :--- | :--- |
| FR-AUTH-01..03 | E1 | Unit + integration + E2E auth; IDOR test. |
| FR-VOC-01..05 | E2 | Unit score; acoustic test; E2E enroll. |
| FR-INP-01..04 | E3 | Integration upload; load; WER eval. |
| FR-AI-01..03 | E4 | Schema test; eval rubric; E2E reader. |
| FR-DB-01 | E1/E3 | Integration persistence; migration test. |
| NFR-PERF-01..03 | E7 | Load test; latency dashboard. |
| NFR-SEC-01..03 | E1/E7 | Security review; TLS/WSS check. |
| NFR-UX-01..02 | E5/E6 | Lighthouse; a11y audit; responsive. |
| PWA install/offline | E6 | Device matrix; Lighthouse. |
| Consent/privacy | E5/E8 | Manual audit; legal review. |

---

## 18. Cara Memakai Plan Ini dengan AI Coding Agent

1. **Mulai dari dokumen 8**, bukan langsung coding. Pastikan keputusan D-01..D-12 sudah dijawab.
2. **Kerjakan per epic**, bukan per file. Untuk setiap task:
   - baca acceptance criteria;
   - tulis/ubah test terlebih dahulu;
   - implementasi minimum;
   - jalankan lint/type/test;
   - update dokumentasi/ADR jika mengubah kontrak.
3. **Jangan lewati spike.** Jika spike belum selesai, jangan bangun UI calibration/reader final.
4. **Jaga kontrak.** OpenAPI, JSON schema, dan ERD adalah sumber kebenaran. Perubahan harus disengaja.
5. **Demo setiap sprint.** Jika tidak bisa didemokan end-to-end, sprint belum selesai.
6. **Berhenti jika ragu.** Tanyakan keputusan produk/arsitektur daripada menebak.

**Definisi sukses plan ini:** pada akhir minggu ke-12, ada beta yang bisa di-install, menerima audio + PDF, menghasilkan transkrip, menampilkan 4 mode narasi + kuis, menyimpan riwayat, dan berjalan dengan monitoring + backup — tanpa melanggar privasi atau lisensi.
