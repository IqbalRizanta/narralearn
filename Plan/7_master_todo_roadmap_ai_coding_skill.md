# ✅ MASTER TODO ROADMAP & AI AGENT SKILL
**Proyek:** NarraLearn AI

---

## PART A: ACTIONABLE PROJECT TODO LIST

### Milestone 1: Setup & PostgreSQL Foundation
- [ ] Buat struktur direktori monorepo (`backend/`, `frontend/`, `docs/`).
- [ ] Buat file `docker-compose.yml` untuk menjalankan **PostgreSQL 16**, **FastAPI**, dan **React Vite**.
- [ ] Inisialisasi proyek FastAPI dan konfigurasi koneksi SQLAlchemy Async ke PostgreSQL.
- [ ] Buat skrip migrasi Alembic untuk tabel `users`, `study_sessions`, `session_documents`, dan `generated_modules`.
- [ ] Implementasikan endpoint autentikasi `/api/v1/auth/register` dan `/api/v1/auth/login` (JWT).

### Milestone 2: Voice Biometrics & Local Storage (`0%–100%`)
- [ ] Setup **React + TypeScript + Tailwind CSS** dengan tema warna *Midnight Slate* & *Warm Oat Paper*.
- [ ] Konfigurasi **Dexie.js** (`src/db/localDatabase.ts`) untuk menyimpan `speaker_profiles` di *IndexedDB*.
- [ ] Bangun komponen perekam audio browser dengan visualisasi gelombang suara (*Web Audio API*).
- [ ] Buat endpoint WebSocket `/ws/v1/voice-calibrate` di FastAPI.
- [ ] Integrasikan **SpeechBrain (ECAPA-TDNN)** untuk menghitung skor kalibrasi (`0%–100%`) dan mengekstrak *voice embedding* 192-dimensi.
- [ ] Bangun UI Modal `VoiceCalibrator.tsx` dengan animasi cincin progres dan tombol simpan aktif saat $\ge 85\%$.

### Milestone 3: Multimodal Pipeline & AI Storyteller
- [ ] Buat layanan ekstraksi dokumen (`app/services/doc_service.py`) menggunakan **PyMuPDF** dan **python-pptx**.
- [ ] Buat layanan penyaringan suara pemateri (`Cosine Similarity`) dan transkripsi audio menggunakan **Faster-Whisper**.
- [ ] Buat layanan orchestrator **Gemini API** (`app/services/llm_service.py`) dengan 4 *System Prompts* (*Gaming, Sosmed, Novel, Cerita Santai*) + *Structured JSON Output* untuk metode belajar dan kuis.
- [ ] Hubungkan endpoint `POST /api/v1/sessions/process` untuk menyimpan hasil ke PostgreSQL.

### Milestone 4: Interactive Reader & Cross-Platform PWA
- [ ] Bangun halaman `ModuleReader.tsx` dengan *Floating Style Switcher* dan kotak sorotan konsep akademis.
- [ ] Bangun komponen `StudyMethodCard.tsx` dengan kartu kuis *3D Flip* interaktif.
- [ ] Konfigurasi `vite-plugin-pwa` (Manifest, Icons, Service Workers) agar aplikasi bisa di-install di Mobile & Desktop.
- [ ] Lakukan pengujian akhir di lingkungan kelas/ruangan bising.

---

## PART B: AI CODING ASSISTANT SKILL (`SKILL.md`)

Simpan bagian di bawah ini sebagai file `.cursorrules` atau `SKILL.md` di root proyek Anda agar AI asisten coding selalu mematuhi aturan arsitektur dan UX proyek ini:

```markdown
---
name: narralearn-fullstack-architect
description: Standar arsitektur, database PostgreSQL murni, penyimpanan biometrik suara lokal, dan desain UI/UX Eye-Friendly Gen-Z untuk proyek NarraLearn AI.
---

# NarraLearn AI Engineering Rules

1. **Database Policy (Strict PostgreSQL):**
   - Gunakan murni **PostgreSQL 16** dengan **SQLAlchemy (Async)** dan **Alembic**.
   - Dilarang menyarankan atau menggunakan Supabase, Firebase, atau BaaS pihak ketiga lainnya.

2. **Client-Side Voice Biometrics Storage:**
   - Semua *voice embedding* pemateri (~1.5 KB) dan label namanya wajib disimpan di browser pengguna menggunakan **IndexedDB (Dexie.js)**, bukan di server PostgreSQL.
   - Audio mentah saat kalibrasi suara wajib dihapus dari memori server segera setelah vektor *embedding* diekstrak.

3. **UX Voice Calibration Standard:**
   - Proses kalibrasi suara wajib menampilkan indikator persentase `0%–100%` secara *real-time* melalui WebSocket.
   - Tombol simpan profil suara hanya aktif apabila skor kalibrasi mencapai minimal **85%**.

4. **UI/UX Design Guidelines:**
   - Gunakan tata letak **Bento Grid** dengan tema warna ramah mata (*Midnight Slate* `#0F1117` untuk Dark Mode dan *Warm Oat Paper* `#F7F5F0` untuk Light Mode). Hindari warna `#000000` murni.
   - Terapkan warna aksen dinamis sesuai mode narasi terpilih (`GAMING`, `SOSMED`, `NOVEL`, `CASUAL_STORY`).

5. **Pedagogical Integrity in AI Prompts:**
   - Apapun gaya cerita yang dihasilkan LLM, definisi istilah teknis, rumus, dan fakta inti dari slide PDF/transkrip dosen tidak boleh dihilangkan atau diubah maknanya.
```