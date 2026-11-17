# 🎯 PRODUCT REQUIREMENTS DOCUMENT (PRD)
**Nama Produk:** NarraLearn AI  
**Versi Dokumen:** 1.0 (MVP Release)  
**Platform:** Progressive Web App (Web, Mobile Android/iOS, Desktop)

---

## 1. Latar Belakang Masalah & Visi Produk

### 1.1 Pernyataan Masalah (*Problem Statement*)
Mahasiswa, pelajar, maupun peserta seminar/bootcamp sering kali mengalami kesulitan memahami materi yang disampaikan oleh pemateri karena penyampaian yang terlalu teoretis, kaku, atau bertempo cepat. Ketika mencoba mempelajari ulang materi tersebut secara mandiri, mereka sering kali *stuck*, kehilangan konteks penjelasan lisan pemateri, dan kesulitan membayangkan konsep abstrak tersebut.

### 1.2 Visi Solusi (*Product Vision*)
**NarraLearn AI** adalah pendamping belajar adaptif lintas perangkat yang membantu pengguna menangkap, mengurai, dan mengimajinasikan ulang materi pembelajaran. Aplikasi ini mengunci profil suara spesifik pemateri secara lokal untuk menghasilkan transkrip akurat, menggabungkannya dengan dokumen materi (PDF/PPTX), lalu menyajikannya kembali dalam gaya narasi yang akrab dengan dunia pengguna (*Gaming, Sosmed, Novel, Cerita*) lengkap dengan rekomendasi metode belajar yang paling sesuai.

---

## 2. Target Pengguna (*User Personas*)

1. **Mahasiswa & Pelajar (Usia 16–24 tahun):**
   * *Kebutuhan:* Merekam penjelasan dosen di kelas yang ramai, menggabungkannya dengan slide PPT/PDF, dan mengubah materi sulit menjadi bahasa yang seru dan mudah dibayangkan menjelang ujian.
2. **Peserta Bootcamp & Webinar (Usia 20–35 tahun):**
   * *Kebutuhan:* Merangkum sesi pelatihan teknis berdurasi panjang menjadi poin-poin praktis beserta latihan *active recall* untuk menguji pemahaman.
3. **Pembelajar Mandiri / Masyarakat Umum:**
   * *Kebutuhan:* Mempelajari topik baru dari seminar, rekaman diskusi, atau dokumen bacaan dengan pendekatan cerita yang tidak membosankan.

---

## 3. Fitur Utama & Spesifikasi Produk

### 3.1 Fitur 1: Voice Biometrics Calibration (Penyimpanan Lokal)
* **Tujuan:** Mempermudah sistem mengenali suara spesifik dosen/pemateri agar proses *Speech-to-Text* jauh lebih akurat dan tidak terganggu suara bising sekitar.
* **Alur UX:**
  1. Pengguna menekan tombol **"+ Kunci Suara Pemateri"**.
  2. Pengguna mulai merekam suara pemateri saat berbicara.
  3. Sistem menganalisis kejernihan dan karakteristik vokal secara *real-time*, menampilkan indikator lingkaran persentase dari **`0%` hingga `100%`**.
  4. Indikator warna berubah secara dinamis: Merah (`0%–40%` — *Mendeteksi suara*), Kuning (`41%–84%` — *Mengenali intonasi*), Hijau Mint (`85%–100%` — *Suara siap dikunci!*).
  5. Setelah mencapai minimal `85%`, pengguna memberi label nama (contoh: *"Pak Budi - Basis Data"*) dan menyimpannya ke penyimpanan lokal browser (**IndexedDB**).
  6. Data yang disimpan hanyalah vektor karakteristik suara (*embedding* ~1.5 KB), sehingga sangat ringan dan tidak membebani penyimpanan perangkat maupun kuota server.

### 3.2 Fitur 2: Multimodal Input (Audio + Dokumen Materi)
* Pengguna dapat membuat sesi belajar baru dengan menggabungkan:
  * **Rekaman Suara Langsung / Unggah Audio:** Mendukung pemilihan profil suara pemateri yang sudah tersimpan di perangkat.
  * **Unggah Dokumen Materi (`.pdf` / `.pptx`):** Sistem mengekstrak teks slide dan menggabungkannya secara cerdas dengan transkrip penjelasan lisan pemateri.

### 3.3 Fitur 3: Narrative Style Transformer (4 Persona Utama)
Pengguna dapat memilih bagaimana materi akan diurai dan dijelaskan ulang:
1. **🎮 Mode Gaming (RPG & Strategy):** Mengubah konsep materi menjadi analogi *Quest*, *Character Stats*, *Skill Tree*, *Boss Fight* (studi kasus/soal sulit), dan *Cheat Sheet* (rumus/aturan baku).
2. **📱 Mode Sosmed (Thread & Story):** Penjelasan bergaya utas media sosial yang ringkas, bahasa santai sehari-hari, poin-poin *punchy*, dan analogi tren masa kini.
3. **📖 Mode Novel (Fiksi Naratif):** Mengubah teori abstrak menjadi alur cerita dengan tokoh, latar tempat, dan konflik masalah yang diselesaikan menggunakan konsep materi tersebut.
4. **☕ Mode Cerita Santai (Mentor Sebaya):** Penjelasan mengalir hangat seperti teman pintar yang sedang mengajari saat diskusi santai—terstruktur dan langsung ke inti pemahaman.

### 3.4 Fitur 4: Adaptive Study Method & Interactive Practice
* Sistem otomatis menganalisis jenis materi (konseptual, prosedural, hitungan, atau hafalan) dan merekomendasikan **1 Metode Belajar Terbaik** (misal: *Feynman Technique*, *Active Recall*, *Chunking*, atau *Mind Mapping*).
* Disertai **3–5 kartu latihan interaktif** (kuis *flip-card* / studi kasus mini) yang dapat langsung dikerjakan pengguna di halaman baca.

---

## 4. User Stories & Acceptance Criteria

| ID | User Story | Acceptance Criteria (Kriteria Penerimaan) |
| :--- | :--- | :--- |
| **US-01** | Sebagai mahasiswa, saya ingin melihat persentase pengenalan suara dosen secara *real-time* saat merekam sampel suara beliau. | - Lingkaran progres bergerak mulus dari `0%` ke `100%`.<br>- Tombol simpan aktif jika persentase $\ge 85\%$.<br>- Profil suara tersimpan di penyimpanan lokal dengan nama kustom dan muncul di daftar pilihan sesi berikutnya. |
| **US-02** | Sebagai mahasiswa, saya ingin menggabungkan slide PDF dosen dengan rekaman penjelasan lisan beliau dalam satu sesi. | - Pengguna dapat memilih profil suara + unggah PDF + rekam audio dalam satu layar.<br>- Output AI menggabungkan kerangka teori dari PDF dan penekanan contoh dari suara dosen. |
| **US-03** | Sebagai pengguna, saya ingin mengganti gaya narasi dari *Mode Gaming* ke *Mode Novel* pada materi yang sudah jadi tanpa merekam ulang. | - Tersedia *Style Switcher* di halaman baca.<br>- Pergantian mode menggunakan data transkrip & PDF yang sudah tersimpan di PostgreSQL. |
| **US-04** | Sebagai pengguna, saya ingin mendapatkan panduan metode belajar yang cocok untuk materi tersebut beserta kuis singkatnya. | - Bagian akhir modul menampilkan kartu rekomendasi metode belajar dan minimal 3 kartu latihan interaktif. |
| **US-05** | Sebagai pengguna Mobile & Desktop, saya ingin meng-install aplikasi ini langsung ke perangkat saya. | - Mendukung instalasi PWA (*Add to Home Screen* / *Install App*) dengan tampilan responsif. |