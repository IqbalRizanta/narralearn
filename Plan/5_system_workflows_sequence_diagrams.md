# ⚙️ SYSTEM WORKFLOWS & SEQUENCE DIAGRAMS
**Proyek:** NarraLearn AI

---

## 1. Workflow 1: Kalibrasi & Penyimpanan Profil Suara Lokal (`0%–100%`)

Alur ini menjelaskan bagaimana aplikasi mengenali suara dosen/pemateri secara *real-time* dan menyimpannya ke perangkat pengguna tanpa membebani server.

```mermaid
sequenceDiagram
    actor User as Mahasiswa / Pengguna
    participant UI as Frontend (React + Dexie.js)
    participant WS as Backend (FastAPI WebSocket)
    participant VE as Voice Engine (SpeechBrain)

    User->>UI: Klik "+ Kunci Suara Pemateri" & mulai rekam
    UI->>WS: Buka koneksi WSS /ws/v1/voice-calibrate
    loop Setiap 1.5 Detik saat Pemateri Berbicara
        UI->>WS: Kirim potongan audio (binary chunk)
        WS->>VE: Hitung VAD (durasi vokal) + SNR (kejernihan) + konsistensi
        VE-->>WS: Skor progres (misal: 30% -> 68% -> 94%)
        WS-->>UI: JSON { "percentage": 94, "status": "Suara sangat jernih!", "ready": true }
        UI->>User: Animasi lingkaran progres naik + indikator berubah Hijau Mint
    end
    User->>UI: Input nama ("Pak Budi - Algoritma") & klik "Simpan ke Perangkat"
    UI->>WS: Kirim perintah finalize
    WS->>VE: Ekstrak final Voice Embedding (192-dim float32, ~1.5 KB)
    VE-->>WS: Return embeddingVector & hapus audio dari RAM server
    WS-->>UI: JSON { "embeddingVector": [...], "finalScore": 94 }
    UI->>UI: Simpan profil suara ke IndexedDB (Dexie.js)
    UI->>User: Tampilkan notifikasi sukses & profil siap digunakan
```

### Formula Perhitungan Persentase Kalibrasi
$$\text{Total Score (\%)} = (0.50 \times \text{ActiveSpeechScore}) + (0.30 \times \text{SNRQualityScore}) + (0.20 \times \text{EmbeddingStability})$$
* **Active Speech (50%):** Mencapai nilai penuh setelah tertangkap minimal 8 detik suara manusia bersih.
* **SNR Quality (30%):** Mengukur kejernihan suara terhadap kebisingan kelas.
* **Embedding Stability (20%):** Memastikan hanya ada satu suara dominan yang konsisten terekam.

---

## 2. Workflow 2: Pemrosesan Materi Multimodal & Transformasi AI

Alur ini menjelaskan penggabungan suara dosen yang sudah difilter dengan slide PDF/PPTX, lalu mengubahnya menjadi narasi pilihan pengguna.

```mermaid
sequenceDiagram
    actor User as Mahasiswa / Pengguna
    participant UI as Frontend PWA
    participant API as Backend REST API
    participant Pipeline as Audio & Doc Pipeline
    participant LLM as Gemini API
    participant DB as PostgreSQL 16

    User->>UI: Pilih profil suara "Pak Budi" (ambil embedding dari IndexedDB)
    User->>UI: Rekam/Upload Audio + Upload PDF + Pilih Mode "GAMING"
    UI->>API: POST /api/v1/sessions/process (Multipart Form + Embedding JSON)
    
    par Pemrosesan Audio & Dokumen Paralel
        API->>Pipeline: Filter segmen audio menggunakan Cosine Similarity (> 0.65)
        Pipeline->>Pipeline: Transkripsi suara terfilter via Faster-Whisper
        API->>Pipeline: Ekstrak teks & struktur halaman dari PDF/PPTX
    end

    Pipeline->>LLM: Kirim Hybrid Context (Teks Dokumen + Transkrip Dosen) + Instruksi Mode GAMING
    LLM-->>Pipeline: Return Narasi Gaming + Rekomendasi Metode Belajar + 4 Soal Kuis JSON
    Pipeline->>DB: Simpan ke study_sessions, session_documents, dan generated_modules
    DB-->>API: Konfirmasi penyimpanan berhasil
    API-->>UI: Return JSON Modul Belajar Lengkap
    UI->>User: Tampilkan halaman baca interaktif & kartu kuis
```

---

## 3. Workflow 3: Instant Style Switching (Ganti Gaya Tanpa Rekam Ulang)

```mermaid
flowchart LR
    A[User di Halaman Baca<br/>Mode: GAMING] -->|Klik Tombol 'Mode Novel'| B{Cek apakah Mode NOVEL<br/>sudah ada di DB?}
    B -->|Sudah Ada| C[Ambil langsung dari PostgreSQL<br/>Tampil < 0.5 detik]
    B -->|Belum Ada| D[Ambil raw_transcript & extracted_text<br/>dari PostgreSQL]
    D --> E[Kirim ke Gemini API dengan<br/>Persona Prompt: NOVEL]
    E --> F[Simpan variasi baru ke<br/>tabel generated_modules]
    F --> G[Tampilkan Narasi Mode Novel<br/>ke layar User]
```