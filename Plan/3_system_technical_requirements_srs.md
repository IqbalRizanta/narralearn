# 📋 SYSTEM & TECHNICAL REQUIREMENTS SPECIFICATION (SRS)
**Proyek:** NarraLearn AI  
**Standar Referensi:** ISO/IEC/IEEE 29148

---

## 1. Functional Requirements (FR)

### 1.1 Autentikasi & Manajemen Pengguna
* **FR-AUTH-01:** Sistem menyediakan fitur registrasi pengguna baru menggunakan Nama Lengkap, Email, dan Password.
* **FR-AUTH-02:** Sistem melakukan autentikasi menggunakan JWT (*JSON Web Token*) dengan masa berlaku *Access Token* 60 menit dan *Refresh Token* 7 hari.
* **FR-AUTH-03:** Setiap pengguna hanya dapat mengakses riwayat sesi belajar (`study_sessions`) miliknya sendiri.

### 1.2 Modul Voice Calibration & Client-Side Storage
* **FR-VOC-01:** Sistem menyediakan perekam sampel suara berbasis browser menggunakan *Web Audio API*.
* **FR-VOC-02:** Sistem membuka koneksi WebSocket (`WSS`) untuk menerima potongan audio (*chunks*) setiap 1.5 detik dan mengembalikan skor persentase kesiapan profil (`0%–100%`) beserta pesan umpan balik kualitas audio.
* **FR-VOC-03:** Sistem memvalidasi ambang batas minimal kelayakan suara sebesar **85%** sebelum mengizinkan pembuatan vektor *voice embedding* final.
* **FR-VOC-04:** Sistem menyimpan profil suara ke penyimpanan lokal perangkat klien (**IndexedDB** via Dexie.js) dengan struktur: `{ uuid, speakerName, embeddingVector, accuracyScore, createdAt }`.
* **FR-VOC-05:** Pengguna dapat melihat daftar profil suara lokal, melihat ukuran penyimpanan yang terpakai, mengubah nama profil, atau menghapus profil.

### 1.3 Modul Multimodal Ingestion & Speech-to-Text
* **FR-INP-01:** Sistem menerima unggahan file audio maksimal **100 MB** dengan format `.mp3`, `.wav`, `.m4a`, `.ogg`, dan `.webm`.
* **FR-INP-02:** Sistem menerima unggahan file dokumen maksimal **25 MB** dengan format `.pdf` dan `.pptx`.
* **FR-INP-03:** Jika pengguna menyertakan `embeddingVector` pemateri, sistem melakukan *Speaker Diarization & Cosine Similarity Filtering* untuk memprioritaskan segmen suara pemateri dan mengabaikan kebisingan latar belakang.
* **FR-INP-04:** Sistem mentranskripsi sinyal audio menjadi teks menggunakan mesin Speech-to-Text yang mendukung bahasa Indonesia dan istilah teknis bahasa Inggris (*code-switching*).

### 1.4 Modul AI Narrative Transformation & Database Persistence
* **FR-AI-01:** Sistem menggabungkan teks dokumen dan transkrip suara ke dalam satu konteks terstruktur sebelum dikirim ke LLM (**Gemini API**).
* **FR-AI-02:** Sistem mendukung 4 mode narasi wajib (`GAMING`, `SOSMED`, `NOVEL`, `CASUAL_STORY`) dengan menjaga keutuhan definisi akademis, rumus, dan fakta inti.
* **FR-AI-03:** Sistem menghasilkan rekomendasi 1 metode belajar terbaik beserta langkah praktis dan minimal 3 soal latihan dalam format JSON tervalidasi.
* **FR-DB-01:** Seluruh data sesi belajar, teks dokumen terekstrak, transkrip mentah, dan modul hasil AI disimpan secara persisten di database **PostgreSQL**.

---

## 2. Non-Functional Requirements (NFR)

### 2.1 Performa & Efisiensi Penyimpanan
* **NFR-PERF-01:** Latensi pembaruan indikator persentase kalibrasi suara pada antarmuka pengguna tidak boleh melebihi **2 detik** per siklus pembaruan.
* **NFR-PERF-02:** Ukuran setiap profil suara yang disimpan di penyimpanan lokal klien tidak boleh melebihi **5 KB** (vektor float32 192-dimensi).
* **NFR-PERF-03:** Proses regenerasi gaya narasi baru pada sesi yang sudah tersimpan di PostgreSQL harus selesai dalam waktu $\le 8$ detik.

### 2.2 Keamanan & Privasi Data
* **NFR-SEC-01:** Audio mentah yang dikirim selama proses kalibrasi suara diproses sepenuhnya di memori (RAM) server dan langsung dihapus setelah *voice embedding* dikirim kembali ke klien.
* **NFR-SEC-02:** Password pengguna di-hash menggunakan algoritma **Argon2id** sebelum disimpan ke PostgreSQL.
* **NFR-SEC-03:** Seluruh komunikasi jaringan produksi wajib menggunakan enkripsi **HTTPS** dan **WSS**.

### 2.3 Usability & Aksesibilitas (Eye-Friendly)
* **NFR-UX-01:** Antarmuka menyediakan tema gelap (*Midnight Slate*) dan tema terang (*Warm Oat Paper*) dengan rasio kontras teks minimal **4.5:1** (WCAG AA) untuk mencegah kelelahan mata saat membaca materi panjang.
* **NFR-UX-02:** Aplikasi memenuhi standar **Progressive Web App (PWA)** sehingga dapat di-install dan dijalankan secara responsif pada layar smartphone (`360px+`), tablet, maupun desktop (`1280px+`).

---

## 3. Batasan Arsitektur (*Architectural Constraints*)
1. **Pure PostgreSQL:** Sistem database menggunakan **PostgreSQL 16** murni yang dikelola melalui SQLAlchemy dan Alembic tanpa menggunakan layanan BaaS seperti Supabase atau Firebase.
2. **Local-First Voice Profiles:** Profil suara pemateri disimpan secara eksklusif di sisi klien (*IndexedDB*) untuk menjaga privasi dan efisiensi ruang penyimpanan server.