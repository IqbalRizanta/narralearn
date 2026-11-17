# 🏗️ SYSTEM ARCHITECTURE & DATABASE DESIGN
**Proyek:** NarraLearn AI

---

## 1. Tech Stack Terpilih

| Lapisan Sistem | Teknologi | Peran & Alasan Pemilihan |
| :--- | :--- | :--- |
| **Frontend & PWA** | **React 18 + TypeScript + Vite + Tailwind CSS** | Ekosistem cepat dan ringan untuk interaksi *real-time* (animasi kalibrasi suara, perekam audio) dengan dukungan `vite-plugin-pwa` untuk instalasi Mobile & Desktop. |
| **Client Local Storage** | **IndexedDB (via Dexie.js)** | Menyimpan vektor *voice embedding* (~1.5 KB/profil), label nama dosen, dan *cache* bacaan offline secara asinkron tanpa membebani memori utama. |
| **Backend Framework** | **Python 3.11 + FastAPI** | Performa tinggi untuk REST API dan WebSocket *real-time*, serta integrasi native dengan pustaka pemrosesan audio dan AI Python. |
| **Voice Biometrics** | **SpeechBrain (ECAPA-TDNN) + Silero VAD** | Mendeteksi aktivitas vokal (*Voice Activity Detection*), mengukur SNR, mengekstrak *voice fingerprint*, dan menghitung kemiripan suara (*Cosine Similarity*). |
| **Speech-to-Text** | **Faster-Whisper (CTranslate2)** | Transkripsi audio berkecepatan tinggi dengan akurasi tinggi untuk bahasa Indonesia dan istilah akademis bahasa Inggris. |
| **Document Parser** | **PyMuPDF (`fitz`) & `python-pptx`** | Ekstraksi teks yang cepat dan bersih dari file slide kuliah PDF maupun PowerPoint. |
| **Generative AI** | **Google Gemini 2.5 Flash / Pro API** | *Context window* sangat besar untuk menggabungkan dokumen puluhan halaman dan transkrip panjang menjadi narasi terstruktur (*Structured JSON Output*). |
| **Primary Database** | **PostgreSQL 16 + SQLAlchemy (Async) + Alembic** | Database relasional tangguh dengan dukungan tipe data `UUID` dan `JSONB` untuk menyimpan struktur kuis dan metode belajar secara fleksibel. |
| **Containerization** | **Docker & Docker Compose** | Menyatukan PostgreSQL, Backend, dan Frontend dalam satu lingkungan yang mudah dijalankan. |

---

## 2. Diagram Arsitektur Sistem

```mermaid
graph TB
    subgraph ClientDevice ["Client Device (Web / Mobile PWA / Desktop)"]
        UI["React UI (Eye-Friendly Bento Design)"]
        AudioCap["Web Audio API (MediaRecorder & Streamer)"]
        DexieDB[("IndexedDB via Dexie.js<br/>• speaker_profiles (1.5 KB)<br/>• offline_modules")]
        UI <--> AudioCap
        UI <--> DexieDB
    end

    subgraph BackendServer ["Backend Server (Python + FastAPI)"]
        Gateway["REST & WebSocket API Gateway"]
        Auth["JWT Security & Auth Service"]
        
        subgraph AudioAI ["Voice & Speech Pipeline"]
            Calibrator["Voice Calibrator (VAD + SNR + % Score)"]
            Embedder["ECAPA-TDNN Embedding Extractor"]
            SpeakerFilter["Target Speaker Filter (Cosine Sim)"]
            STT["Faster-Whisper Transcriber"]
        end

        subgraph NarrativeAI ["Multimodal & Narrative Pipeline"]
            DocParser["PDF / PPTX Text Extractor"]
            Merger["Hybrid Context Orchestrator"]
            Gemini["Gemini API Storyteller & Method Gen"]
        end

        Gateway --> Auth
        Gateway <--> Calibrator
        Calibrator --> Embedder
        Gateway --> SpeakerFilter
        SpeakerFilter --> STT
        Gateway --> DocParser
        STT --> Merger
        DocParser --> Merger
        Merger --> Gemini
    end

    subgraph Database ["PostgreSQL 16 Server"]
        PG[("PostgreSQL Database<br/>• users<br/>• study_sessions<br/>• session_documents<br/>• generated_modules")]
    end

    AudioCap <-->|"WSS /ws/v1/voice-calibrate"| Gateway
    UI <-->|"HTTPS /api/v1/*"| Gateway
    Gateway <--> PG
```

---

## 3. Skema Database PostgreSQL (ERD & DDL)

```mermaid
erDiagram
    USERS ||--o{ STUDY_SESSIONS : owns
    STUDY_SESSIONS ||--o{ SESSION_DOCUMENTS : includes
    STUDY_SESSIONS ||--o{ GENERATED_MODULES : generates

    USERS {
        uuid id PK
        varchar full_name
        varchar email UK
        text password_hash
        timestamptz created_at
    }

    STUDY_SESSIONS {
        uuid id PK
        uuid user_id FK
        varchar title
        varchar speaker_label
        varchar source_type
        text raw_transcript
        timestamptz created_at
    }

    SESSION_DOCUMENTS {
        uuid id PK
        uuid session_id FK
        varchar file_name
        text extracted_text
        timestamptz uploaded_at
    }

    GENERATED_MODULES {
        uuid id PK
        uuid session_id FK
        varchar style_mode
        text transformed_content
        varchar recommended_method
        jsonb method_action_items
        timestamptz created_at
    }
```

### SQL Migration Script (PostgreSQL)
```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE study_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    speaker_label VARCHAR(100),
    source_type VARCHAR(20) NOT NULL CHECK (source_type IN ('AUDIO', 'DOCUMENT', 'HYBRID')),
    raw_transcript TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE session_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    extracted_text TEXT NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE generated_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
    style_mode VARCHAR(30) NOT NULL CHECK (style_mode IN ('GAMING', 'SOSMED', 'NOVEL', 'CASUAL_STORY')),
    transformed_content TEXT NOT NULL,
    recommended_method VARCHAR(100) NOT NULL,
    method_action_items JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_user_id ON study_sessions(user_id);
CREATE INDEX idx_modules_session_id ON generated_modules(session_id);
```

---

## 4. Spesifikasi Endpoint API

| Method | Endpoint | Protokol | Deskripsi |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | HTTPS | Mendaftarkan pengguna baru. |
| `POST` | `/api/v1/auth/login` | HTTPS | Autentikasi pengguna dan mengembalikan JWT. |
| `WS` | `/ws/v1/voice-calibrate` | WSS | Menerima *stream* audio sampel secara *real-time*, mengirim progres `0%–100%`, dan mengembalikan `embeddingVector` final. |
| `POST` | `/api/v1/sessions/process` | HTTPS | Memproses unggahan Audio + Dokumen + `embeddingVector` + `style_mode` menjadi modul cerita & metode belajar. |
| `POST` | `/api/v1/sessions/{id}/switch-style` | HTTPS | Menghasilkan gaya narasi baru dari transkrip & teks dokumen yang sudah tersimpan di PostgreSQL. |
| `GET` | `/api/v1/sessions` | HTTPS | Mengambil daftar seluruh sesi belajar pengguna. |
| `GET` | `/api/v1/sessions/{id}` | HTTPS | Mengambil detail sesi beserta seluruh variasi gaya narasi yang pernah dibuat. |