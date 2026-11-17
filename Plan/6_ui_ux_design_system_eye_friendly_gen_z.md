# 🎨 UI/UX DESIGN SPECIFICATION: EYE-FRIENDLY & GEN-Z CHARACTER
**Proyek:** NarraLearn AI  
**Konsep Visual:** *"Cozy Cyber-Paper & Bento Grid UI"*

---

## 1. Filosofi Desain Utama

1. **Eye-Friendly First (Nyaman untuk Maraton Belajar):**
   * Menghindari hitam pekat (`#000000`) dan putih menyilaukan (`#FFFFFF`) pada latar belakang utama guna mencegah kelelahan mata (*eye strain* / efek *halation*) saat membaca rangkuman materi panjang.
   * Lebar kolom baca dibatasi maksimal `68ch` (68 karakter per baris) dengan spasi baris lega (`1.75`).
2. **Gen-Z Aesthetic & Tactile Interaction:**
   * **Bento Grid Modular:** Pengelompokan fitur dalam kartu-kartu rapi bersudut membulat (`border-radius: 20px`) yang familiar seperti Notion, Spotify, dan Discord.
   * **Dynamic Mood Shifting:** Seluruh aksen warna halaman otomatis menyesuaikan persona cerita yang dipilih (*Gaming, Sosmed, Novel, Cerita Santai*).
   * **Micro-Feedback & Gamification:** Animasi gelombang suara *real-time*, efek getaran ringan (*haptic feedback*) saat kalibrasi suara mencapai `85%`, dan kartu kuis interaktif yang bisa dibalik (*3D Flip Card*).

---

## 2. Sistem Warna (*Color Tokens*)

### 2.1 Tema Dasar (*Surface & Text*)
| Token | Dark Mode (*Midnight Slate* - Default) | Light Mode (*Warm Oat Paper*) | Fungsi |
| :--- | :--- | :--- | :--- |
| `--bg-canvas` | `#0F1117` | `#F7F5F0` | Latar belakang utama layar |
| `--bg-card` | `#181B24` | `#FFFFFF` | Latar belakang kartu Bento & area baca |
| `--bg-elevated` | `#222634` | `#EFECE6` | Input field, tombol sekunder, hover state |
| `--text-primary` | `#F1F5F9` | `#1E293B` | Judul dan teks bacaan utama |
| `--text-secondary` | `#94A3B8` | `#64748B` | Subtitle, metadata waktu, label |
| `--border-subtle` | `rgba(255, 255, 255, 0.08)` | `rgba(15, 23, 42, 0.08)` | Garis tepi halus kartu |

### 2.2 Warna Aksen Persona (*Adaptive Mode Accents*)
* **🎮 Mode Gaming:** Primary `#6366F1` (*Electric Indigo*) | Glow `#34D399` (*Mint XP*)
* **📱 Mode Sosmed:** Primary `#F472B6` (*Coral Pink*) | Glow `#38BDF8` (*Sky Cyan*)
* **📖 Mode Novel:** Primary `#F59E0B` (*Warm Amber*) | Glow `#D97706` (*Sepia Gold*)
* **☕ Mode Cerita Santai:** Primary `#10B981` (*Sage Emerald*) | Glow `#2DD4BF` (*Soft Teal*)

### 2.3 Indikator Kalibrasi Suara (`0%–100%`)
* `0% – 40%` (*Mendeteksi Suara*): `#FB7185` (Soft Rose)
* `41% – 84%` (*Mengenali Intonasi*): `#FBBF24` (Warm Amber)
* `85% – 100%` (*Siap Dikunci!*): `#34D399` (Mint Green + Subtle Pulse Glow)

---

## 3. Tipografi (*Font Stack*)
* **Display & Headings:** `Plus Jakarta Sans` (Weight: 600, 700, 800) — Modern, geometris, ekspresif.
* **Body & Narrative Reader:** `Inter` (Weight: 400, 500; Size: `16px` mobile / `17px` desktop; Line-height: `1.75`).
* **Numbers, Timers & Percentages:** `JetBrains Mono` (Tabular numerals agar angka persentase `0%–100%` dan durasi rekaman tidak bergeser saat berubah cepat).

---

## 4. Wireframe & Blueprint Layar Utama

### 4.1 Layar 1: Dashboard & Studio Sesi Baru (Bento Grid)
```text
+-------------------------------------------------------------------------+
|  ✨ NarraLearn                   [ 🌙 Midnight / ☀️ Paper ]   [ Profil ] |
+-------------------------------------------------------------------------+
|  Halo, Iqbal! Siap ubah materi kuliah hari ini jadi lebih seru?        |
|                                                                         |
|  +-----------------------------------+  +-----------------------------+ |
|  | 🎙️ STUDIO REKAM & MATERI          |  | 🗣️ PROFIL SUARA PEMATERI    | |
|  |                                   |  | (Tersimpan Lokal • 3.2 KB)  | |
|  | Pemateri: [ Pak Budi (94%)   ▼ ]  |  | • Pak Budi - Basis Data 94% | |
|  |                                   |  | • Bu Nita - Skripsi     91% | |
|  | [ 🔴 Mulai Rekam Penjelasan ]     |  |                             | |
|  | [ 📄 Unggah Slide PDF / PPTX ]    |  | [ + Kunci Suara Baru ]      | |
|  +-----------------------------------+  +-----------------------------+ |
|                                                                         |
|  PILIH GAYA PENJELASAN FAVORITMU:                                       |
|  [ 🎮 Gaming RPG ]  [ 📱 Sosmed Thread ]  [ 📖 Novel ]  [ ☕ Santai ]   |
|                                                                         |
|  📚 RIWAYAT MATERI TERAKHIR                                             |
|  +-----------------------+  +-----------------------+  +--------------+ |
|  | 🎮 Quest: Normalisasi |  | 📱 Thread: ISO 25010  |  | 📖 Novel:    | |
|  | Database 1NF - 3NF    |  | Kualitas Perangkat... |  | Multi-Agent  | |
|  | Pak Budi • 2 jam lalu |  | Bu Nita • Kemarin     |  | 3 hari lalu  | |
|  +-----------------------+  +-----------------------+  +--------------+ |
+-------------------------------------------------------------------------+
```

### 4.2 Layar 2: Modal Kalibrasi Suara Pemateri (*Voice Radar UI*)
```text
+-------------------------------------------------------+
|  🎙️ Kunci Suara Pemateri                         [X]  |
|  Rekam 10–15 detik saat dosen mulai menjelaskan       |
|                                                       |
|               . - ~ ~ ~ - .                           |
|           . '   ( ( 🎙️ ) )   ' .                       |
|          /       92% READY       \                    |
|         |   ~~~~~~~~~~~~~~~~~~~   |  <-- Audio Wave   |
|          \   Suara Jernih & Kunci /                    |
|           ' .                 . '                     |
|               ' - . _ _ . - '                         |
|                                                       |
|  Status: "Intonasi vokal terdeteksi dengan sangat     |
|           jelas! Profil suara siap disimpan."         |
|                                                       |
|  Label Nama Pemateri:                                 |
|  [ Pak Budi - Pemrograman Web                       ] |
|                                                       |
|  [ 🔄 Ulangi Rekam ]     [ 💾 Simpan ke Perangkat ]   |
+-------------------------------------------------------+
```

### 4.3 Layar 3: Split-Focus Interactive Reader
* **Desktop:** Layar terbagi dua kolom (`65%` area baca narasi di kiri, `35%` panel metode belajar & kuis interaktif di kanan).
* **Mobile:** Navigasi *Segmented Tab* di bagian atas untuk berpindah mulus antara tab **📖 Cerita Materi** dan **🧠 Metode & Kuis**.
* **Callout Box Konsep Inti:** Di dalam narasi cerita (misal *Mode Gaming*), setiap istilah akademis atau rumus dibungkus dalam kotak sorotan (*Highlight Card*) bertajuk *"📜 Konsep Kunci / Rumus Inti"* sehingga pengguna tetap mendapatkan definisi akurat untuk ujian.