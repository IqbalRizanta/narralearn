# 🔄 SOFTWARE DEVELOPMENT LIFE CYCLE (SDLC)
**Proyek:** NarraLearn AI (Adaptive Multimodal & Voice-Calibrated Learning Platform)  
**Metodologi:** Agile-Iterative (4 Sprints — 8 Minggu)  
**Target Platform:** Cross-Platform PWA (Web, Mobile Android/iOS, Desktop Windows/macOS/Linux)

---

## 1. Strategi Pengembangan: Vertical Slicing
Pengembangan perangkat lunak ini menggunakan pendekatan **Vertical Slicing**. Artinya, setiap iterasi menghasilkan fitur fungsional utuh dari ujung ke ujung (*Frontend UI → Local Storage / Backend API → AI Pipeline → PostgreSQL*), sehingga setiap komponen dapat langsung diuji pengalaman penggunanya (*UX*) sejak minggu-minggu awal.

---

## 2. Rincian Tahapan Pengembangan (5 Fase)

### Fase 1: Discovery, Planning & UX Prototyping (Minggu 1)
* **Tujuan:** Mengunci ruang lingkup produk (MVP), merancang skema database relasional PostgreSQL, mendefinisikan kontrak API, dan merancang antarmuka (*UI/UX*) yang ramah mata (*Eye-Friendly*) dan berkarakter Gen-Z.
* **Aktivitas Utama:**
  * Finalisasi dokumen `PRD.md`, `REQUIREMENTS.md`, `ARCHITECTURE.md`, dan `UI_UX_DESIGN.md`.
  * Perancangan alur UX *Voice Calibration (`0%–100%`)* dan penyimpanannya di *IndexedDB*.
  * Pembuatan skema tabel PostgreSQL dan relasi antar entitas.
* **Exit Criteria (Kriteria Selesai):** Seluruh dokumen arsitektur disetujui, wireframe layar utama selesai, dan kontrak API terdefinisi jelas.

### Fase 2: Environment & Foundation Setup (Minggu 2)
* **Tujuan:** Menyiapkan lingkungan kerja yang terisolasi, bersih, dan konsisten menggunakan Docker tanpa ketergantungan layanan BaaS pihak ketiga.
* **Aktivitas Utama:**
  * Konfigurasi `docker-compose.yml` untuk menjalankan **PostgreSQL 16**, **Backend FastAPI (Python 3.11)**, dan **Frontend React (Vite + TypeScript)**.
  * Inisialisasi migrasi database menggunakan **Alembic** dan ORM **SQLAlchemy (Async)**.
  * Pembangunan sistem autentikasi JWT (*Access Token* & *Refresh Token*) serta *hashing* password menggunakan `Argon2id`.
  * Konfigurasi **Dexie.js (IndexedDB)** di sisi klien untuk menyimpan *voice embedding* lokal.
* **Exit Criteria:** Perintah `docker-compose up` menjalankan seluruh layanan tanpa error, skema database ter-migrasi otomatis, dan autentikasi pengguna berfungsi.

### Fase 3: Iterative Core Development (Minggu 3–6)

#### Sprint 1: Voice Biometrics & Local Storage Engine (Minggu 3)
* **Fokus:** Membangun fitur unggulan identifikasi suara pemateri dengan indikator persentase *real-time*.
* **Task Teknis:**
  * Implementasi perekam audio browser menggunakan *Web Audio API* (`MediaRecorder` / `AudioWorklet`).
  * Pembangunan endpoint WebSocket `/ws/v1/voice-calibrate` di FastAPI.
  * Integrasi model **SpeechBrain (ECAPA-TDNN)** untuk mengekstrak karakteristik vokal dan menghitung skor kualitas sinyal (*Signal-to-Noise Ratio* & *Feature Completeness*) dari `0%` hingga `100%`.
  * Penyimpanan vektor *voice embedding* (~1.5 KB) beserta label nama pemateri ke *IndexedDB* klien.

#### Sprint 2: Multimodal Ingestion & Filtered Speech-to-Text (Minggu 4)
* **Fokus:** Memproses input gabungan antara rekaman suara kelas dan file slide materi (PDF/PPTX).
* **Task Teknis:**
  * Implementasi *Target Speaker Verification* (*Cosine Similarity*) untuk memfilter suara dosen dari suara bising sekitar berdasarkan *embedding* yang dikirim klien.
  * Integrasi **Faster-Whisper** untuk transkripsi audio bahasa Indonesia dan istilah teknis campuran.
  * Integrasi **PyMuPDF (`fitz`)** dan **`python-pptx`** untuk mengekstrak teks terstruktur dari dokumen materi.

#### Sprint 3: Generative AI Storyteller & Study Method Engine (Minggu 5)
* **Fokus:** Mengurai materi mentah dan mengubahnya menjadi narasi imajinatif beserta metode belajar adaptif.
* **Task Teknis:**
  * Perancangan *Prompt Engineering* terstruktur untuk **Gemini API** dengan 4 mode narasi: *Gaming (RPG/Quest)*, *Sosmed (Thread/Carousel)*, *Novel (Fiksi Naratif)*, dan *Cerita Santai*.
  * Pembangunan *Study Method Analyzer* yang menentukan 1 metode belajar paling efektif (*Active Recall, Feynman Technique, Chunking, Mind Mapping*) beserta kartu kuis interaktif dalam format JSON.

#### Sprint 4: Cross-Platform PWA & UX Polish (Minggu 6)
* **Fokus:** Menjadikan aplikasi dapat di-install di Mobile & Desktop serta menyempurnakan animasi dan aksesibilitas.
* **Task Teknis:**
  * Konfigurasi `vite-plugin-pwa` (Web App Manifest, App Icons, Service Workers untuk *offline reading*).
  * Implementasi fitur *Instant Style Switcher* (mengganti gaya narasi dari sesi yang sudah tersimpan di PostgreSQL tanpa merekam ulang).
  * Penyempurnaan tema *Midnight Slate (Dark)* dan *Warm Oat Paper (Light)*.

### Fase 4: Quality Assurance & Acoustic Field Testing (Minggu 7)
* **Tujuan:** Memastikan keandalan sistem di kondisi ruang kelas/seminar yang sesungguhnya.
* **Aktivitas Utama:**
  * **Acoustic Stress Test:** Menguji kalibrasi suara `0%–100%` di ruangan dengan kebisingan latar (kipas angin, obrolan mahasiswa).
  * **Performance & Load Test:** Menguji pemrosesan rekaman berdurasi 60 menit digabung file PDF 40 halaman.
  * **Cross-Device PWA Test:** Menguji instalasi dan izin mikrofon pada Chrome/Edge Desktop, Android Chrome, dan iOS Safari.

### Fase 5: Deployment & Maintenance (Minggu 8+)
* **Tujuan:** Merilis aplikasi ke server produksi dengan protokol terenkripsi HTTPS/WSS (wajib untuk akses mikrofon browser).
* **Aktivitas Utama:** Setup Reverse Proxy (Caddy/Nginx dengan SSL otomatis), deployment container Docker, dan jadwal *backup* harian database PostgreSQL.

---

## 3. Manajemen Risiko & Mitigasi

| Risiko Teknis | Dampak | Strategi Mitigasi |
| :--- | :--- | :--- |
| Ruangan kelas terlalu bising saat kalibrasi suara dosen | Persentase sulit mencapai 85% | Implementasi *Noise Suppression* ringan di Web Audio API (`noiseSuppression: true`) dan panduan visual bagi pengguna untuk mengarahkan mikrofon ke sumber suara. |
| Browser iOS Safari membatasi perekaman audio saat layar terkunci | Rekaman terputus di tengah kuliah | Menggunakan *Screen Wake Lock API* agar layar tetap menyala redup selama sesi perekaman aktif dan menyimpan *chunk* audio berkala di IndexedDB. |
| Ukuran file audio kuliah berdurasi panjang (1–2 jam) terlalu besar | Gagal unggah atau *timeout* | Kompresi audio otomatis di sisi klien ke format `Opus/WebM` (bitrate 32–48 kbps; 1 jam audio hanya ~15–20 MB) sebelum dikirim ke backend. |