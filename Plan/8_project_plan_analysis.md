# 🔍 ANALISIS PROJECT PLAN — NARRALEARN AI

**Tanggal analisis:** 14 November 2026  
**Dokumen sumber:** `1_software_development_life_cycle_sdlc.md` s.d. `7_master_todo_roadmap_ai_coding_skill.md`, plus `SKILL.md`  
**Status proyek:** Fase perencanaan; belum ada kode aplikasi di workspace  
**Kesimpulan satu baris:** Konsep produk kuat dan dokumentasi baseline di atas rata-rata, tetapi plan **belum execution-ready** untuk target 8 minggu.

---

## 0. Ringkasan Eksekutif

NarraLearn AI memiliki proposition yang jelas dan berbeda: **merekam penjelasan pemateri, memfilter suara dosen, menggabungkannya dengan slide, lalu mengubahnya menjadi narasi Gen-Z + metode belajar + kuis**. Kombinasi *local-first voice profile*, *multilingual/code-switched STT*, dan *narrative transformer* adalah diferensiasi yang nyata, bukan sekadar wrapper LLM.

Namun, setelah cross-check ketujuh dokumen, ada lima masalah yang menentukan:

1. **Scope 8 minggu tidak realistis** untuk voice biometrics, STT, document parsing, 4 mode narasi, PWA, QA lintas perangkat, dan deployment — tanpa tim, estimasi, atau buffer.
2. **Pipeline pemrosesan audio panjang masih sinkron.** Endpoint `POST /sessions/process` mengembalikan modul lengkap, padahal audio 60 menit + PDF 40 halaman bisa memakan waktu jauh lebih lama dari timeout HTTP.
3. **Kualitas AI belum divalidasi.** Ambang kalibrasi 85%, cosine similarity 0.65, performa ECAPA-TDNN pada suara dosen Indonesia di ruangan bising, dan kualitas narasi 4 mode semuanya masih asumsi.
4. **Privasi, consent, dan lisensi belum konsisten.** Klaim *local-only* bertabrakan dengan pengiriman embedding ke server; PyMuPDF berlisensi AGPL-3.0/commercial; belum ada alur consent untuk merekam pemateri.
5. **Production readiness hampir tidak ada.** Tidak ada task eksplisit untuk unit/integration/E2E test, CI/CD, observability, staging, backup restore, runbook, dan release gate.

### Skor Kesiapan

| Aspek | Skor | Alasan Singkat |
| :--- | :---: | :--- |
| Visi & problem statement | 9/10 | Masalah nyata, persona jelas, solusi mudah dijelaskan. |
| Diferensiasi produk | 8/10 | Voice profile lokal + narasi adaptif + metode belajar adalah kombinasi kuat. |
| PRD | 7/10 | Fitur dan user story jelas; belum ada metrik sukses, non-goals, prioritas. |
| SRS | 6/10 | FR/NFR cukup terukur; belum ada verification method, error contract, retensi data. |
| Arsitektur | 6/10 | Stack koheren, ERD dan API awal ada; belum ada async job, status, versioning. |
| AI/ML feasibility | 4/10 | Model dan threshold belum diuji pada data Indonesia/bising. |
| UI/UX | 7,5/10 | Design token, tipografi, dan wireframe kuat; state & aksesibilitas belum lengkap. |
| Keamanan & privasi | 4/10 | JWT/Argon2/HTTPS ada; consent, biometric handling, upload security belum. |
| QA & testing | 3/10 | Baru ada acoustic stress test; belum ada test pyramid dan eval AI. |
| DevOps & operasi | 3/10 | Docker ada; CI/CD, staging, monitoring, backup drill belum. |
| Roadmap & estimasi | 3/10 | TODO tinggi dan horizontal; tanpa owner, estimate, dependency, DoD. |
| **Overall** | **5,5/10** | **Layak masuk Sprint 0; belum layak dikomit ke 8 minggu tanpa validasi.** |

### Lima Keputusan Sebelum Coding

1. **Validasi teknis 2 minggu (Sprint 0):** voice calibration, STT Indonesia di ruangan bising, Gemini 4 mode, dan iOS PWA.
2. **Ubah pipeline berat menjadi asynchronous:** Redis + worker + job status + retry + idempotency.
3. **Selesaikan lisensi dan privasi:** pilihan PDF parser, consent perekaman, retensi audio/transkrip, biometric data.
4. **Kunci kontrak output AI:** JSON schema, sitasi, versioning prompt/model, eval harness.
5. **Revisi timeline:** 12 minggu (direkomendasikan) atau 8 minggu dengan cut scope yang eksplisit.

---

## 1. Metode & Definisi Severity

Analisis dilakukan dengan enam lensa:

- **Completeness:** apakah dokumen menutup produk, teknis, UX, QA, operasi, legal?
- **Consistency:** apakah angka, istilah, alur, dan keputusan saling cocok?
- **Feasibility:** apakah stack dan target waktu realistis?
- **Testability:** apakah requirement bisa diverifikasi?
- **Operability:** apakah sistem bisa di-deploy, dipantau, dipulihkan?
- **Risk & compliance:** apakah ada risiko lisensi, privasi, keamanan, hukum?

Severity:

| Level | Arti | Tindakan |
| :--- | :--- | :--- |
| **P0** | Blocker; jika tidak diperbaiki, proyek berisiko gagal secara teknis/legal. | Wajib sebelum Sprint 1. |
| **P1** | Major; kualitas, keamanan, atau UX terganggu signifikan. | Masuk backlog Sprint 1–5. |
| **P2** | Improvement; tidak menghalangi MVP. | Setelah beta / v1.1. |

---

## 2. Penilaian per Dokumen

| Dokumen | Kekuatan | Kelemahan Utama | Skor |
| :--- | :--- | :--- | :---: |
| **1. SDLC** | Fase jelas, vertical slicing intent, risk table awal, target 8 minggu terukur. | Tidak ada tim, estimasi, dependency, buffer; Sprint 1–4 masing-masing hanya 1 minggu; QA hanya 1 minggu; tidak ada CI/CD/test strategy. | 5/10 |
| **2. PRD** | Problem, visi, persona, 4 fitur inti, dan 5 user story dengan acceptance criteria. | Tidak ada success metrics, non-goals, prioritas (MoSCoW), pricing/kuota, consent, standar kualitas AI. | 7/10 |
| **3. SRS** | FR/NFR ber-ID, ambang 85%, batas file, NFR performa/keamanan. | Tidak ada verification method, error handling, refresh endpoint, retensi, aksesibilitas lengkap; klaim "diarization" tidak akurat. | 6/10 |
| **4. Arsitektur & DB** | Stack koheren, diagram, ERD, DDL, endpoint table. | Tidak ada job queue/status, unique constraint style, index FK, model/prompt version, quiz storage, deployment topology. | 6/10 |
| **5. Workflow** | Happy path kalibrasi, multimodal, style switching; formula kalibrasi. | Tidak ada error/alternate path, timeout, retry, offline, auth WebSocket; asumsi sinkron dan ≤8 detik tidak realistis. | 7/10 |
| **6. UI/UX** | Token warna, tipografi, Bento Grid, wireframe dashboard/calibrator/reader, eye-friendly. | Tidak ada auth/onboarding/loading/error/empty state, accessibility detail, motion spec, komponen quiz, responsif penuh. | 7,5/10 |
| **7. Master TODO** | Actionable, 4 milestone, AI coding rules. | Tidak ada acceptance criteria per task, estimate, dependency, test/ops/legal task; urutan masih horizontal. | 4/10 |
| **SKILL.md** | Prinsip Karpathy bagus: think before coding, simplicity, surgical changes, goal-driven. | Tidak spesifik ke NarraLearn; tidak bisa menggantikan arsitektur/API contract. | 8/10 |

---

## 3. Kekuatan Plan

Yang sudah benar dan sebaiknya dipertahankan:

1. **Problem statement kuat.** Mahasiswa kehilangan konteks lisan dosen saat belajar ulang; solusi narasi + slide + transkrip menjawab masalah nyata.
2. **Diferensiasi jelas.** Voice profile lokal, target speaker filtering, dan 4 persona narasi bukan fitur generik.
3. **Local-first voice profile adalah keputusan privasi yang baik** — asalkan alur pengiriman embedding ke server dijelaskan jujur.
4. **Stack koheren.** React + FastAPI + PostgreSQL + SpeechBrain + Faster-Whisper + Gemini adalah kombinasi yang bisa dibangun oleh tim kecil.
5. **NFR awal sudah terukur.** Ada angka 85%, 2 detik, 5 KB, 8 detik, 100 MB, 25 MB — meskipun sebagian perlu direvisi.
6. **ERD dan sequence diagram** memberi fondasi diskusi teknis yang konkret.
7. **Design system eye-friendly** punya token warna, tipografi, dan prinsip 68ch/1.75 yang matang.
8. **Risk table awal** sudah menyebut noise, iOS lock screen, dan ukuran audio — tiga risiko paling nyata.
9. **AI engineering rules** di `SKILL.md`/Part B bagus untuk menjaga konsistensi agent coding.

---

## 4. Temuan Kritis

### 4.1 P0 — Blocker

| ID | Temuan | Bukti | Dampak | Rekomendasi |
| :--- | :--- | :--- | :--- | :--- |
| **P0-01** | **Timeline 8 minggu tidak realistis** untuk scope yang ada. | SDLC: 4 sprint × 1 minggu + QA 1 minggu + deploy; Master TODO ~18 task besar; tidak ada tim/estimasi/buffer. | Slip jadwal, QA dipotong, kualitas core AI dikorbankan, burnout. | Pilih 12 minggu (6 sprint × 2 minggu) atau 8 minggu dengan cut eksplisit. Wajib Sprint 0 dan buffer 20%. |
| **P0-02** | **Tidak ada async job pipeline** untuk audio panjang. | `POST /api/v1/sessions/process` mengembalikan modul lengkap; tidak ada job table, status, progress, retry, cancel. | Request timeout, upload terputus, duplikasi biaya Gemini, user tidak tahu progres. | Tambah Redis + worker (ARQ/Celery), response `202 + job_id`, endpoint status/progress, retry, idempotency, cancel. |
| **P0-03** | **Kualitas voice calibration & speaker filter belum divalidasi.** | Threshold 85%, cosine 0.65, ECAPA-TDNN pada dosen Indonesia di ruangan bising; tidak ada EER/WER target atau dataset evaluasi. Klaim "diarization" tidak akurat. | Diferensiasi utama bisa gagal; user tidak mencapai 85%; filter malah membuang suara dosen. | Sprint 0 spike: 5 speaker × 3 kondisi bising; ukur EER, calibration success, WER sebelum/sesudah filter. Ganti istilah menjadi *target-speaker filtering*. Siapkan fallback tanpa filter. |
| **P0-04** | **Privasi, consent, dan biometric data belum konsisten.** | PRD/SRS menyebut embedding "local-only", tetapi embedding dikirim ke server untuk filtering; audio "dihapus dari RAM" tetapi tidak ada kebijakan temp file/log; tidak ada consent merekam pemateri. | Risiko hukum (UU PDP), kepercayaan user, kebocoran data biometrik. | Buat data-flow map, consent flow, retention policy, redaksi log, enkripsi at-rest, delete account, privacy policy. |
| **P0-05** | **Lisensi PyMuPDF berisiko.** | Stack memakai PyMuPDF (`fitz`) untuk PDF; PyMuPDF AGPL-3.0 atau lisensi komersial Artifex. | Jika produk proprietary/SaaS, ada kewajiban open-source atau biaya lisensi. | Putuskan: beli lisensi komersial, atau ganti ke `pypdf`/`pdfplumber` (BSD/MIT). Audit lisensi seluruh dependency. |
| **P0-06** | **Output AI terlalu longgar dan tidak punya eval.** | `transformed_content TEXT`, `method_action_items JSONB`; tidak ada kolom quiz, schema, sitasi, prompt version, eval harness. | UI tidak bisa render callout/quiz secara konsisten; hallucination tidak terdeteksi; perubahan prompt tidak terukur. | Definisikan JSON schema + Pydantic, content blocks, citations, prompt/model versioning, golden dataset, eval rubric. |
| **P0-07** | **Production readiness belum ada.** | Tidak ada task test/CI/CD/observability/backup restore/runbook; QA hanya 1 minggu. | Tidak bisa deploy dengan aman, sulit mendeteksi error, tidak bisa pulih dari insiden. | Tambah baseline CI/CD, staging, test pyramid, monitoring, backup drill, release gate. |
| **P0-08** | **Batasan iOS/PWA belum didesain.** | Rencana kompresi Opus/WebM, Screen Wake Lock, offline reading; Safari punya format dan perilaku berbeda. | Pengalaman mobile — target utama — bisa gagal saat layar terkunci atau storage dibersihkan. | Uji iOS lebih awal; sediakan fallback MP4/AAC, wake lock, `storage.persist()`, offline matrix, dan panduan install iOS. |

### 4.2 P1 — Major

| ID | Temuan | Dampak | Rekomendasi |
| :--- | :--- | :--- | :--- |
| **P1-01** | Style switch ≤8 detik tidak realistis untuk generasi LLM penuh. | Janji UX tidak terpenuhi; user mengira aplikasi hang. | Jadikan async + progress; target p95 ≤20 detik; cache hasil; pre-generate mode populer. |
| **P1-02** | Constraint/index database kurang. | Duplikasi modul per style, query lambat, data ganda. | Unique `(session_id, style_mode)`, index `(user_id, created_at DESC)`, index `session_documents(session_id)`, `NOT NULL` timestamp. |
| **P1-03** | Auth belum lengkap. | Tidak ada refresh/logout/me; token tidak bisa dicabut; brute force. | Tambah refresh rotation, logout, me, rate limit, Argon2id params, email normalization. |
| **P1-04** | Upload & output AI belum aman. | Malware/zip bomb, XSS dari Markdown AI, prompt injection dari PDF. | Validasi magic bytes, limit halaman/ukuran, sanitasi Markdown, CSP, perlakukan dokumen sebagai data. |
| **P1-05** | Scanned PDF/OCR tidak ditangani. | Banyak slide kuliah berupa scan; ekstraksi teks kosong. | Deteksi scanned PDF; OCR (Tesseract) atau tolak dengan pesan jelas. |
| **P1-06** | Offline matrix belum jelas. | PWA offline reading diklaim, tetapi API/AI tetap butuh server. | Definisikan: offline = baca modul tersimpan; processing tidak offline; auth/session handling. |
| **P1-07** | Aksesibilitas baru sebatas kontras. | Keyboard, screen reader, reduced motion, quiz flip tidak accessible. | Audit WCAG AA, fokus, aria, reduced motion, alternatif quiz. |
| **P1-08** | Tidak ada model biaya/kuota. | Gemini/STT compute bisa membengkak; tidak ada batas per user. | Catat token/latency, kuota menit audio, budget alert, unit economics. |
| **P1-09** | Tidak ada metrik sukses/analytics. | Tidak tahu apakah produk membantu belajar. | Definisikan north star, funnel, event, target beta. |
| **P1-10** | UX state & halaman legal belum ada. | User bingung saat error/loading; tidak ada consent/privacy. | Tambah auth, onboarding, loading/empty/error, privacy/terms, consent. |
| **P1-11** | Versioning model/prompt/embedding belum ada. | Ganti model membuat profil lama tidak kompatibel; prompt berubah tanpa jejak. | Simpan `embedding_model`, `prompt_version`, `model_name`, `schema_version`; siapkan re-enrollment. |
| **P1-12** | Upload besar belum resumable; transkrip tidak bisa diedit. | Upload 100 MB di jaringan mobile gagal; salah transkrip tidak bisa dikoreksi. | Chunked/resumable upload (tus) atau retry; transcript editor/glossary. |
| **P1-13** | Email verification/password reset belum ada. | User lupa password tidak bisa masuk; akun spam. | Tambah email provider (Resend/SES) atau kebijakan admin reset untuk MVP. |
| **P1-14** | Kapasitas/hardware belum dihitung. | Whisper di CPU bisa sangat lambat; server OOM. | Benchmark; pilih model/quantization/GPU; limit worker concurrency. |
| **P1-15** | Staging/runbook/insiden belum ada. | Deploy pertama berisiko; tidak ada rollback. | Staging, smoke test, runbook deploy/rollback/restore, alert. |

### 4.3 P2 — Improvement

| ID | Temuan | Rekomendasi |
| :--- | :--- | :--- |
| **P2-01** | Versi dependency perlu dikunci dan ditinjau. | Pin versi di `pyproject.toml`/lockfile; cek React 19, Python 3.12+, PostgreSQL 17, Tailwind 4 saat implementasi. |
| **P2-02** | Nama file dokumen tidak konsisten dengan referensi internal. | Samakan referensi `PRD.md` dkk. atau tambahkan index dokumen. |
| **P2-03** | Belum ada i18n. | Putuskan Indonesian-first; siapkan struktur string terpisah. |
| **P2-04** | Belum ada export/share. | Export Markdown/PDF ke v1.1. |
| **P2-05** | Aset desain (logo, ikon, ilustrasi) belum ada. | Siapkan icon set, app icons, OG image, empty-state illustration. |
| **P2-06** | Pencarian/filter riwayat belum ada. | Tambah search/filter setelah volume sesi naik. |
| **P2-07** | Native wrapper/app store belum diputuskan. | PWA-first; native wrapper dievaluasi setelah beta. |
| **P2-08** | Gamification baru sebatas quiz. | Jangan tambah XP/streak sebelum retention terbukti. |

---

## 5. Inkonsistensi & Kontradiksi

| No | Topik | Apa yang Tertulis | Masalah | Rekomendasi |
| :---: | :--- | :--- | :--- | :--- |
| 1 | Ukuran voice embedding | PRD ~1,5 KB; SRS maks 5 KB; NFR 192 float32. | 192 × 4 byte = 768 byte mentah; JSON array bisa 2–4 KB; base64 ~1 KB. Tidak jelas format simpan/kirim. | Simpan sebagai base64 `Float32Array` + metadata; tentukan ukuran wire dan storage; perbarui NFR. |
| 2 | Panjang chunk kalibrasi | SRS: chunk setiap 1,5 detik; ECAPA butuh konteks lebih panjang. | Embedding dari 1,5 detik tidak stabil; skor naik-turun. | Buffer 3–5 detik dengan hop 1,5 detik; minimal 3 window sebelum skor stabil. |
| 3 | "Speaker diarization" | SRS/Workflow menyebut diarization + cosine filtering. | Satu embedding target + cosine bukan diarization; tidak memisahkan pembicara. | Ganti istilah menjadi *target-speaker filtering*; diarization penuh = fitur terpisah. |
| 4 | Style switch ≤8 detik | NFR-PERF-03. | Gemini generation untuk dokumen besar biasanya >8 detik; apalagi Pro. | Async + progress; target p95 ≤20 detik; cache hit <500 ms. |
| 5 | Local-only voice profile | PRD/SRS: embedding disimpan lokal. | Embedding tetap dikirim ke server saat processing untuk filtering. | Jelaskan: disimpan lokal, dikirim sementara untuk filtering, tidak dipersistenkan di server. |
| 6 | Audio dihapus dari RAM | SRS NFR-SEC-01. | Upload multipart biasanya menulis temp file; library audio membaca file; log bisa memuat metadata. | Nyatakan "dihapus dari penyimpanan server setelah diproses"; terapkan temp cleanup, no body logging, enkripsi disk. |
| 7 | 8 minggu vs scope | SDLC 4 sprint + QA + deploy. | Scope jauh lebih besar dari kapasitas. | 12 minggu atau cut scope. |
| 8 | Vertical slicing vs milestone | SDLC menjanjikan vertical slice; TODO disusun per layer (DB → voice → pipeline → UI). | Feedback end-to-end terlambat; integrasi berisiko di akhir. | Susun ulang per slice: walking skeleton → voice slice → AI slice → polish. |
| 9 | PyMuPDF vs lisensi produk | Stack memakai PyMuPDF; tidak ada keputusan lisensi. | AGPL/commercial tidak cocok untuk SaaS proprietary tanpa lisensi. | Ganti ke pypdf/pdfplumber atau beli lisensi. |
| 10 | Gemini 2.5 | Stack menyebut Gemini 2.5 Flash/Pro. | Lineup model berubah cepat; 2.5 bisa legacy saat implementasi. | Pin model ID saat implementasi; abstraksi provider; evaluasi model terbaru. |
| 11 | PWA offline vs server processing | SDLC: service worker untuk offline reading; pipeline tetap butuh server. | Ekspektasi user bisa salah: offline bukan berarti bisa memproses. | Definisikan offline matrix: hanya baca modul tersimpan; processing butuh online. |
| 12 | Raw audio tidak disimpan vs reprocessing | Skema tidak menyimpan audio; hanya transkrip. | Style switch bisa, tetapi transkripsi ulang/audit tidak bisa tanpa upload ulang. | Dokumentasikan trade-off; simpan transkrip + metadata; opsi object storage di v1.1. |

---

## 6. Gap Analysis per Domain

| Domain | Sudah Ada | Gap Utama | Prioritas |
| :--- | :--- | :--- | :---: |
| **Product** | Visi, persona, fitur, user story. | Success metrics, non-goals, prioritas, pricing/kuota, validasi user. | P1 |
| **UX** | Token warna, tipografi, 3 wireframe. | Auth, onboarding, loading/empty/error, consent, settings, accessibility, motion. | P1 |
| **Frontend** | React + TS + Vite + Tailwind. | Arsitektur route/state/form, Markdown/KaTeX, sanitasi, PWA cache, test. | P1 |
| **Backend** | FastAPI, SQLAlchemy, Alembic, JWT. | Async queue, job status, rate limit, temp storage, retry, observability. | P0 |
| **Data** | ERD + DDL 4 tabel. | Status, versioning, constraint, index, quiz/progress, refresh token, consent. | P1 |
| **AI/ML** | SpeechBrain, Faster-Whisper, Gemini, 4 prompt. | Benchmark, threshold, schema, sitasi, eval, fallback, prompt injection. | P0 |
| **Security** | Argon2id, JWT, HTTPS/WSS. | Refresh/revocation, upload validation, XSS, prompt injection, secrets, rate limit. | P0/P1 |
| **QA** | Acoustic stress test. | Test pyramid, AI eval, load, security, accessibility, cross-browser. | P0 |
| **DevOps** | Docker Compose. | CI/CD, staging, observability, backup restore, runbook, rollback. | P0 |
| **Legal** | Belum ada. | Privacy policy, terms, consent, copyright, biometric, license audit, UU PDP. | P0 |
| **Analytics** | Belum ada. | Event, funnel, kualitas, biaya, retensi. | P2 |
| **Project Mgmt** | Fase + TODO. | Estimate, owner, dependency, DoR/DoD, risk review, change control. | P0 |

---

## 7. Analisis Teknis Mendalam

### 7.1 Voice Biometrics & Kalibrasi 0–100%

**Apa yang direncanakan:** Web Audio API merekam chunk, WebSocket mengirim setiap 1,5 detik, SpeechBrain ECAPA-TDNN mengekstrak embedding, skor 0–100 dari VAD + SNR + stabilitas, simpan ke IndexedDB jika ≥85%.

**Yang perlu diperjelas/diperbaiki:**

1. **ECAPA-TDNN bekerja optimal pada audio 16 kHz mono dengan window 3–5 detik.** Chunk 1,5 detik terlalu pendek untuk embedding yang stabil. Solusi: client tetap mengirim chunk 1,5 detik, server melakukan buffering menjadi window 3–5 detik dengan overlap, lalu menghitung embedding per window.
2. **Skor harus punya definisi matematis eksplisit.** Formula di workflow hanya menyebut bobot, bukan cara memetakan SNR dan stabilitas ke 0–100. Contoh yang bisa diuji:

```text
speech_score     = min(speech_seconds / 8, 1) × 100
snr_score        = clamp((snr_db - 5) / 15, 0, 1) × 100
stability_score  = clamp((mean_pairwise_cosine - 0.5) / 0.5, 0, 1) × 100

total = 0.50 × speech_score
      + 0.30 × snr_score
      + 0.20 × stability_score
      - clipping_penalty
```

3. **Skor 85% dan cosine 0.65 adalah hipotesis, bukan kebenaran.** Keduanya harus dikalibrasi pada data nyata: 5 pemateri, 3 kondisi ruangan, mikrofon berbeda. Ukur:
   - distribusi skor saat sampel benar-benar layak;
   - false accept/false reject filter;
   - EER (Equal Error Rate) target-speaker verification;
   - dampak filter terhadap WER.
4. **Final embedding sebaiknya quality-weighted average** dari window terbaik, lalu L2-normalize. Simpan `embedding_model` + `model_version`; jika model berubah, profil lama tidak kompatibel dan user harus enroll ulang.
5. **Format penyimpanan:** base64 dari `Float32Array` (little-endian) lebih ringkas daripada JSON array float. Contoh:

```ts
type SpeakerProfile = {
  id: string;                    // UUID
  speakerName: string;
  embedding: string;             // base64 Float32Array
  dimension: 192;
  embeddingModel: string;        // "speechbrain-ecapa-voxceleb"
  embeddingVersion: string;
  accuracyScore: number;         // 0–100
  speechSeconds: number;
  createdAt: string;
};
```

6. **Fallback MVP:** jika WebSocket real-time terlalu mahal, gunakan kalibrasi dua tahap:
   - client menghitung durasi bicara, clipping, noise floor secara lokal;
   - satu request finalize mengirim sampel 10–15 detik ke server untuk embedding + skor final.
   Ini menghilangkan kompleksitas WebSocket tanpa mengorbankan pengalaman 0–100% secara total.

**Risiko utama:** skor tinggi belum tentu berarti transkripsi lebih akurat. Validasi harus mengaitkan skor kalibrasi dengan WER dan akurasi filter, bukan hanya "suara terdengar jernih".

### 7.2 Speech-to-Text & Target Speaker Filtering

**Pilihan model Faster-Whisper:**

| Model | Kelebihan | Kekurangan | Kapan Dipakai |
| :--- | :--- | :--- | :--- |
| `small` | Cepat, RAM rendah, cocok CPU. | WER lebih tinggi untuk istilah teknis. | Fallback/CPU terbatas. |
| `medium` | Kompromi akurasi/kecepatan. | Masih lambat di CPU untuk audio 60 menit. | CPU dengan waktu tunggu longgar. |
| `large-v3` | Akurasi terbaik untuk Indonesia + code-switching. | Butuh GPU/CPU kuat; model besar. | Produksi dengan GPU. |
| Cloud STT | Cepat, akurat, tanpa GPU. | Biaya per menit, privasi, vendor lock-in. | Alternatif jika GPU tidak tersedia. |

**Rekomendasi teknis:**

- Gunakan VAD (Silero) sebelum STT; buang silence.
- `language="id"` + `initial_prompt` berisi glossary istilah teknis/nama dosen.
- `condition_on_previous_text=False` untuk mengurangi looping.
- `no_speech_threshold`, `compression_ratio_threshold`, dan filter repetisi untuk mengurangi hallucination Whisper.
- `word_timestamps=True` agar bisa membuat sitasi `audio:HH:MM:SS`.
- Filter target speaker sebelum STT: segmentasi VAD 1,5–3 detik, embedding, cosine threshold, hysteresis. Jika terlalu sedikit segmen lolos, fallback ke semua speech dan beri warning.
- Jangan klaim "diarization"; yang dibangun adalah **target-speaker filtering**.
- Benchmark wajib: 30 dan 60 menit audio, CPU vs GPU, WER, RTF (real-time factor), RAM/VRAM.

### 7.3 Document Ingestion

| Library | Lisensi | Catatan |
| :--- | :--- | :--- |
| PyMuPDF (`fitz`) | AGPL-3.0 / commercial | Cepat, kaya fitur; **risiko lisensi** untuk produk proprietary. |
| `pypdf` | BSD | Ringan, teks dasar; layout kompleks kurang akurat. |
| `pdfplumber` | MIT | Bagus untuk teks/tabel; lebih lambat. |
| `python-pptx` | MIT | Ekstraksi text frame, notes, tabel; gambar perlu OCR. |
| Tesseract | Apache 2.0 | OCR untuk scanned PDF; perlu instalasi binary. |

**Gap yang perlu ditutup:**

- **Scanned PDF**: banyak slide dosen berupa hasil scan. Deteksi halaman tanpa teks; OCR atau tolak dengan pesan jelas.
- **Struktur halaman**: simpan nomor halaman/slide, blok teks, dan metadata agar AI bisa memberi sitasi.
- **Tabel, gambar, formula**: ekstraksi teks saja akan kehilangan konteks. Nyatakan sebagai limitasi MVP atau tambahkan OCR/image extraction.
- **Batas**: 25 MB, jumlah halaman/slide, total karakter; tolak PDF terenkripsi; lindungi dari zip bomb PPTX.
- **Sanitasi**: file user adalah input tidak tepercaya; parsing harus dibatasi resource/timeout.

### 7.4 Narrative AI & Study Method

**Kontrak output yang disarankan** (bukan `TEXT` bebas):

```json
{
  "schema_version": "1.0",
  "title": "...",
  "summary": "...",
  "sections": [
    {
      "heading": "...",
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
          "latex": "...",
          "explanation": "...",
          "source_refs": ["doc:5"]
        }
      ]
    }
  ],
  "glossary": [],
  "study_method": {
    "name": "Active Recall",
    "why": "...",
    "steps": ["..."],
    "source_refs": []
  },
  "quiz": [
    {
      "id": "q1",
      "type": "multiple_choice",
      "question": "...",
      "options": ["..."],
      "answer_index": 0,
      "explanation": "...",
      "source_refs": ["doc:3"]
    }
  ],
  "citations": []
}
```

**Prinsip:**

- **Fidelity > gaya bahasa.** Definisi, rumus, dan fakta inti tidak boleh berubah. Mode Gaming/Novel tidak boleh mengarang istilah atau angka.
- **Sitasi wajib** untuk klaim akademis; jika sumber tidak menjelaskan, model harus menulis "tidak dijelaskan di sumber".
- **Quiz harus grounded** ke materi; 3–5 soal, satu jawaban benar, explanation + source_ref.
- **Prompt versioning**: setiap perubahan prompt punya versi dan eval result.
- **Model routing**: Flash untuk default, Pro untuk dokumen kompleks/repair; pin model ID; catat token/latency/cost.
- **Prompt injection**: dokumen dan transkrip adalah data, bukan instruksi. Delimit dengan tag, larang model mengikuti perintah di dalam sumber.
- **Sanitasi output**: render Markdown dengan allowlist; jangan izinkan raw HTML; gunakan KaTeX untuk formula.
- **Eval**: golden dataset 20–30 sesi; rubric factual accuracy, coverage, mode adherence, structure, quiz validity, language; target ≥4/5.

### 7.5 Async Processing

Pipeline saat ini diasumsikan sinkron:

```text
POST /sessions/process -> extract PDF -> filter audio -> STT -> Gemini -> save -> response
```

Untuk audio 60 menit, ini bisa memakan waktu jauh lebih lama dari timeout HTTP, dan user tidak mendapat progress. Desain yang disarankan:

```text
POST /sessions -> 202 { session_id, job_id }
GET /jobs/{job_id} -> { status, stage, progress, error }
GET /sessions/{id} -> data lengkap saat SUCCEEDED
```

Komponen:

- **Queue**: Redis + ARQ (ringan, async) atau Celery (matang).
- **Job table**: `processing_jobs` dengan status, stage, progress, attempts, error, idempotency key.
- **Dua queue**: `interactive` (style switch) dan `batch` (audio/document processing) agar style switch tidak menunggu audio panjang.
- **Retry**: exponential backoff untuk Gemini 429/5xx dan error transient; jangan retry validation error.
- **Idempotency**: `Idempotency-Key` header + unique constraint; cegah double charge.
- **Cancel**: user bisa membatalkan; worker mengecek flag dan membersihkan temp file.
- **Progress**: bobot stage (upload 5%, extract 10%, STT 50%, AI 30%, save 5%).
- **Timeout**: per stage, bukan satu timeout global.

### 7.6 PWA, iOS & Offline

| Isu | Perilaku Nyata | Rencana |
| :--- | :--- | :--- |
| Format rekaman | Chrome: WebM/Opus; Safari: MP4/AAC. | Deteksi `MediaRecorder.isTypeSupported`; server terima `.webm` dan `.m4a`; jangan paksa Opus di iOS. |
| Layar terkunci | iOS Safari bisa menghentikan rekaman saat layar mati. | Screen Wake Lock (iOS 16.4+) + chunk persist ke IndexedDB + panduan foreground. |
| Storage eviction | Data situs bisa dibersihkan setelah periode tidak aktif. | `navigator.storage.persist()`, indikator storage, export/import profil suara. |
| Install PWA | iOS tidak punya `beforeinstallprompt`. | Tampilkan instruksi manual "Share → Add to Home Screen". |
| Offline | Service worker bisa cache app shell/modul, tetapi processing butuh server. | Offline matrix: baca modul tersimpan = ya; upload/process/switch style = tidak. |
| Background sync | Tidak andal di iOS. | Jangan janjikan upload background; simpan chunk dan resume saat foreground. |

### 7.7 Performance, Capacity & Cost

Target awal (harus divalidasi, bukan janji):

| Operasi | Target Awal | Catatan |
| :--- | :--- | :--- |
| Auth/list API | p95 <300 ms | Di luar AI. |
| Kalibrasi update | p95 <2 detik | Sesuai NFR; butuh chunk 1,5 detik + inference cepat. |
| STT 30 menit | p95 <8 menit CPU / <2 menit GPU | Tergantung model/hardware. |
| STT 60 menit | p95 <15 menit CPU / <4 menit GPU | Job async; progress wajib. |
| Gemini generation | p95 <20 detik Flash | Pro bisa lebih lama. |
| Style switch | p95 <15 detik; cache <500 ms | Revisi dari ≤8 detik. |
| Total sesi 30 menit | p95 <12 menit CPU / <6 menit GPU | End-to-end. |

**Kapasitas:** mulai dengan 1 API instance + 1 worker, 8 vCPU/32 GB RAM, model cache 5–10 GB, disk temp untuk audio. Jika GPU tersedia, worker GPU terpisah. Batasi concurrency agar tidak OOM.

**Biaya:** STT compute adalah biaya terbesar, bukan Gemini. Catat token Gemini, durasi audio, dan waktu worker per sesi. Terapkan kuota (mis. 120 menit audio/bulan untuk free tier) dan budget alert.

---

## 8. Risk Register

| ID | Risiko | Prob. | Dampak | Trigger | Mitigasi |
| :--- | :--- | :---: | :---: | :--- | :--- |
| R-01 | Voice calibration tidak mencapai 85% di ruangan bising. | Tinggi | Tinggi | User gagal save berulang. | Noise suppression, panduan mic, threshold adaptif, fallback finalize. |
| R-02 | STT terlalu lambat di CPU. | Tinggi | Tinggi | Job >30 menit. | Benchmark, model kecil, GPU, cloud STT fallback. |
| R-03 | Kualitas narasi/hallucination buruk. | Sedang | Tinggi | Fidelity <4/5. | Schema, sitasi, eval, prompt ketat, human review. |
| R-04 | iOS menghentikan rekaman saat layar terkunci. | Tinggi | Tinggi | Rekaman terpotong. | Wake Lock, chunk persist, uji perangkat nyata. |
| R-05 | Scope creep / timeline slip. | Tinggi | Tinggi | Sprint 1–2 mundur. | Scope freeze, MoSCoW, buffer 20%, cut list. |
| R-06 | Lisensi PyMuPDF. | Sedang | Tinggi | Audit legal. | Ganti library atau beli lisensi. |
| R-07 | Pelanggaran privasi/consent. | Sedang | Tinggi | Komplain/audit. | Consent, retention, privacy policy, delete account. |
| R-08 | Kebocoran data/IDOR/XSS. | Sedang | Tinggi | Security test. | Authz test, sanitasi, rate limit, CSP. |
| R-09 | Kehilangan data/backup gagal. | Rendah | Tinggi | Restore drill gagal. | Backup harian, offsite, restore test. |
| R-10 | Vendor Gemini down/quota. | Sedang | Sedang | 429/5xx. | Retry, queue, fallback model, status message. |
| R-11 | Model deprecated. | Sedang | Sedang | Model 404. | Provider abstraction, pin, changelog. |
| R-12 | Storage browser dibersihkan. | Sedang | Sedang | Profil hilang. | `persist()`, export/import, warning. |
| R-13 | Prompt injection/XSS dari dokumen. | Sedang | Tinggi | Output aneh/script. | Treat as data, sanitasi, CSP. |
| R-14 | Biaya AI membengkak. | Sedang | Sedang | Tagihan naik. | Kuota, logging token, budget alert. |
| R-15 | Bus factor/solo developer. | Tinggi | Tinggi | Developer sakit. | Dokumentasi, ADR, pair review, backlog jelas. |

---

## 9. Rekomendasi Prioritas

1. **Jalankan Sprint 0 (2 minggu) sebelum komit ke fitur.** Validasi voice, STT, Gemini, dan iOS. Hasil spike menentukan arsitektur final.
2. **Async by default.** Jangan bangun endpoint pemrosesan audio yang sinkron. Queue + job status + retry + idempotency adalah fondasi, bukan nice-to-have.
3. **Sederhanakan voice calibration jika perlu.** Real-time 0–100% boleh tetap ada, tetapi siapkan fallback finalize-only. Yang penting user bisa membuat profil suara yang berguna.
4. **Selesaikan lisensi dan privasi lebih awal.** Ganti PyMuPDF atau beli lisensi; buat consent flow dan retention policy sebelum beta.
5. **Kunci schema output AI.** Tanpa schema, UI dan evaluasi tidak bisa dibangun dengan stabil.
6. **Tambahkan production baseline.** CI/CD, staging, test pyramid, monitoring, backup restore, runbook.
7. **Revisi timeline menjadi 12 minggu** atau cut scope ke 6–7 fitur inti untuk 8 minggu.
8. **Lengkapi UX state dan legal page.** Auth, onboarding, loading/error/empty, consent, privacy, terms.
9. **Definisikan metrik sukses dan biaya.** Tanpa itu, sulit tahu apakah produk bekerja dan apakah biayanya sustain.
10. **Uji iOS dan ruangan bising lebih awal**, bukan di minggu 7.

---

## 10. Go/No-Go Criteria

Sebelum masuk Sprint 1, jawab pertanyaan berikut:

| Area | Pertanyaan Go/No-Go | Target Awal |
| :--- | :--- | :--- |
| Voice | Apakah 5 pemateri bisa mencapai skor ≥85% dalam ≤60 detik di ruangan tenang? | ≥80% sesi |
| Voice | Apakah filter meningkatkan WER ≥15% relatif, tanpa membuang terlalu banyak segmen dosen? | EER ≤10% / relative WER gain ≥15% |
| STT | Apakah audio 30 menit selesai dalam waktu yang bisa ditunggu user? | p95 ≤8 menit CPU / ≤2 menit GPU |
| STT | Apakah WER dapat diterima untuk istilah teknis? | ≤20% clean, ≤30% noisy (hipotesis) |
| AI | Apakah 4 mode menghasilkan JSON valid dan narasi faithful? | Schema ≥98%, fidelity ≥4/5 |
| AI | Apakah biaya per modul masuk budget? | Tentukan budget |
| iOS | Apakah rekaman 10 menit bertahan saat layar terkunci? | Ya, dengan fallback |
| Legal | Apakah lisensi PDF dan consent sudah disetujui? | Ya |
| Tim | Apakah tim, timeline, dan budget disetujui? | Ya |

Jika **No-Go** pada voice/filter: jatuhkan real-time calibration ke finalize-only, atau jadikan speaker filter fitur beta. Jika **No-Go** pada STT CPU: pindah ke GPU/cloud STT atau turunkan batas audio MVP.

---

## 11. Verdict

Plan ini **bukan plan buruk**; ini plan yang ambisius tanpa proses de-risking. Dokumen produk, arsitektur, dan desain sudah cukup untuk memulai diskusi teknis serius. Yang belum ada adalah bukti bahwa komponen AI-inti bekerja pada data nyata, dan disiplin operasional untuk merilisnya.

**Status: siap masuk Sprint 0, belum siap masuk Sprint 1.**

Jika hanya lima hal yang bisa diperbaiki, perbaiki ini:

1. **Async pipeline** — tanpa ini, audio panjang tidak akan pernah stabil.
2. **Spike AI 2 minggu** — tanpa ini, risiko utama tidak terukur.
3. **Lisensi + privasi** — tanpa ini, produk tidak aman dirilis.
4. **Schema output + eval** — tanpa ini, kualitas tidak bisa dijaga.
5. **Timeline 12 minggu / cut scope** — tanpa ini, tim akan mengejar tanggal, bukan kualitas.

Dokumen lanjutan: [`9_revised_execution_plan.md`](./9_revised_execution_plan.md) — berisi roadmap 12 minggu, backlog, revisi arsitektur/DB/API, QA, deployment, dan rencana 7 hari pertama.
