# 📚 NARRALEARN AI — PLAN INDEX

**Status:** Baseline perencanaan + **implementasi MVP sudah berjalan** di root repo.  
**Rekomendasi status:** Demo end-to-end siap; stack Docker (PostgreSQL + Redis + ARQ + Gemini) sudah diverifikasi. Validasi STT/voice nyata dan hardening produksi masih tersisa.  
**Target eksekusi:** 12 minggu (6 sprint × 2 minggu) — lihat dokumen 9.

---

## Urutan Baca

| # | Dokumen | Isi | Status |
| :---: | :--- | :--- | :--- |
| 1 | [`1_software_development_life_cycle_sdlc.md`](./1_software_development_life_cycle_sdlc.md) | SDLC, fase, sprint, risk table awal. | Baseline |
| 2 | [`2_product_requirements_document_prd.md`](./2_product_requirements_document_prd.md) | Problem, persona, fitur, user story. | Baseline |
| 3 | [`3_system_technical_requirements_srs.md`](./3_system_technical_requirements_srs.md) | FR/NFR, batasan arsitektur. | Baseline |
| 4 | [`4_system_architecture_database_design.md`](./4_system_architecture_database_design.md) | Stack, diagram, ERD, DDL, endpoint. | Baseline |
| 5 | [`5_system_workflows_sequence_diagrams.md`](./5_system_workflows_sequence_diagrams.md) | Sequence kalibrasi, pipeline, style switch. | Baseline |
| 6 | [`6_ui_ux_design_system_eye_friendly_gen_z.md`](./6_ui_ux_design_system_eye_friendly_gen_z.md) | Design token, tipografi, wireframe. | Baseline |
| 7 | [`7_master_todo_roadmap_ai_coding_skill.md`](./7_master_todo_roadmap_ai_coding_skill.md) | TODO 4 milestone + AI coding rules. | Baseline |
| 8 | [`8_project_plan_analysis.md`](./8_project_plan_analysis.md) | **Analisis kritis:** skor, P0/P1/P2, inkonsistensi, feasibility, risk, go/no-go. | **Baru** |
| 9 | [`9_revised_execution_plan.md`](./9_revised_execution_plan.md) | **Plan revisi:** scope, roadmap 12 minggu, arsitektur, DB/API, QA, ops, backlog, 7 hari pertama. | **Baru** |
| - | [`SKILL.md`](./SKILL.md) | Prinsip kerja AI coding agent (Karpathy guidelines). | Pendukung |

**Cara membaca cepat:**

1. Baca dokumen **8** untuk memahami risiko dan keputusan yang harus diambil.
2. Baca dokumen **9** untuk mengeksekusi.
3. Gunakan dokumen **1–7** sebagai referensi produk/desain, bukan sebagai kontrak final.

---

## Lima Temuan Utama

1. **Timeline 8 minggu tidak realistis** untuk scope voice biometrics + STT + LLM + PWA + QA.
2. **Pipeline audio panjang masih sinkron**; butuh queue, job status, retry, idempotency.
3. **Kualitas AI belum divalidasi**; threshold 85% dan cosine 0.65 masih asumsi.
4. **Privasi/consent/lisensi** belum konsisten; PyMuPDF AGPL, embedding dikirim ke server.
5. **Production readiness** (test, CI/CD, observability, backup) belum ada.

---

## Lima Keputusan Sebelum Coding

| # | Keputusan | Rekomendasi |
| :---: | :--- | :--- |
| 1 | Lisensi PDF | `pypdf`/`pdfplumber` untuk MVP, atau beli lisensi PyMuPDF. |
| 2 | Queue | Redis + ARQ (atau Celery jika tim sudah familiar). |
| 3 | Kalibrasi suara | WebSocket real-time jika spike lulus; fallback finalize-only. |
| 4 | Speaker filter | Wajib dengan fallback; jangan klaim "diarization". |
| 5 | Timeline | 12 minggu; atau 8 minggu dengan cut scope eksplisit. |

---

## Langkah Berikutnya

1. Jalankan demo produksi lokal via Docker Compose (PostgreSQL + Redis + ARQ + Gemini) di `http://localhost:8080`; pipeline dan UI sudah diverifikasi end-to-end.
2. Validasi kualitas STT Faster-Whisper, target-speaker SpeechBrain, dan PWA iOS; lakukan evaluasi kualitas keluaran AI.
3. Sebelum produksi: migrasi Alembic terkontrol, HTTPS + secure cookie, observability, backup, dan review legal.

> Baseline dokumen 1–7 tidak diubah; keputusan dan koreksi ada di dokumen 8–9.
