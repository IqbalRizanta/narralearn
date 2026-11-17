import { LegalPage } from "../components/LegalPage";

export function PrivacyPage() {
  return (
    <LegalPage
      title="Kebijakan Privasi"
      description="Bagaimana NarraLearn memproses akun, materi audio/dokumen, transkrip, dan profil suara lokal."
    >
      <div className="notice notice-soft">
        <p>
          <strong>Ringkasnya:</strong> kami memproses materi yang kamu unggah
          untuk membuat modul belajar. File mentah bersifat sementara. Profil
          suara disimpan di browser ini. Kamu bisa menghapus akun dan data
          server kapan saja. Dokumen ini adalah kebijakan untuk proyek demo dan
          bukan nasihat hukum.
        </p>
      </div>

      <h2>1. Data yang kami proses</h2>
      <h3>Data akun</h3>
      <p>
        Nama, alamat email, hash password, status aktif, waktu login terakhir,
        versi dan waktu persetujuan. Kami tidak menyimpan password dalam bentuk
        teks biasa.
      </p>
      <h3>Materi belajar</h3>
      <p>
        File audio dan dokumen yang kamu unggah, teks hasil ekstraksi, transkrip,
        metadata file (nama, tipe, ukuran, jumlah halaman), serta modul hasil
        generasi. Jangan unggah materi yang tidak berhak kamu proses.
      </p>
      <h3>Profil suara</h3>
      <p>
        Sampel audio kalibrasi diproses untuk menghasilkan embedding. Embedding
        disimpan di IndexedDB browser ini. Saat kamu membuat sesi dengan profil
        suara, embedding dikirim ke server hanya untuk job pemrosesan terkait dan
        tidak disimpan sebagai profil permanen di server.
      </p>
      <h3>Log teknis</h3>
      <p>
        ID permintaan, status job, kode error, waktu proses, dan informasi
        perangkat/browser yang diperlukan untuk keamanan dan debugging. Log
        tidak digunakan untuk iklan.
      </p>

      <h2>2. Tujuan dan dasar pemrosesan</h2>
      <ul>
        <li>Menyediakan akun, autentikasi, dan penyimpanan sesi belajar.</li>
        <li>Mentranskrip audio, membaca dokumen, dan menghasilkan modul.</li>
        <li>Menyimpan progres baca dan skor kuis untuk akunmu.</li>
        <li>Menjaga keamanan, mencegah penyalahgunaan, dan memperbaiki error.</li>
      </ul>
      <p>
        Pemrosesan materi berdasarkan persetujuanmu saat mendaftar atau sebelum
        merekam. Kamu dapat berhenti menggunakan layanan dan menghapus akun.
      </p>

      <h2>3. Penyedia pihak ketiga</h2>
      <p>
        Dalam mode produksi, materi dapat dikirim ke penyedia model AI (misalnya
        Google Gemini) dan layanan transkripsi (misalnya Faster-Whisper yang
        dijalankan sendiri). Penyedia yang diaktifkan bergantung pada konfigurasi
        deployment. Penyedia tersebut dapat memproses teks/audio sesuai kebijakan
        mereka. Mode demo default tidak mengirim data ke penyedia AI eksternal.
      </p>
      <p>
        Kami tidak menjual data pribadi dan tidak menggunakan materimu untuk
        iklan.
      </p>

      <h2>4. Retensi dan penghapusan</h2>
      <ul>
        <li>
          File audio/dokumen mentah dihapus setelah pemrosesan berhasil atau
          dibatalkan.
        </li>
        <li>
          Jika pemrosesan gagal, file sementara dapat disimpan untuk jendela
          retry yang terbatas (hingga sekitar 24 jam), lalu dibersihkan.
        </li>
        <li>
          Teks terekstraksi, transkrip, modul, dan progres disimpan selama akun
          aktif atau sampai kamu menghapusnya.
        </li>
        <li>
          Log teknis disimpan terbatas untuk keamanan dan debugging, lalu
          dirotasi.
        </li>
      </ul>
      <p>
        Menghapus akun akan menghapus data terkait di server melalui cascade.
        Salinan offline di IndexedDB dan profil suara harus dihapus dari browser
        ini secara terpisah.
      </p>

      <h2>5. Keamanan</h2>
      <p>
        Kami menggunakan password hashing Argon2, access token berumur pendek,
        refresh token HttpOnly yang dirotasi, pembatasan laju, validasi file, dan
        pemisahan akses per pengguna. Tidak ada sistem yang sepenuhnya bebas
        risiko; laporkan masalah keamanan kepada pengelola.
      </p>

      <h2>6. Hak kamu</h2>
      <ul>
        <li>Mengakses dan memperbarui data akun.</li>
        <li>Menghapus akun dan data server melalui Pengaturan.</li>
        <li>Menghapus profil suara dan modul offline dari browser.</li>
        <li>Menarik persetujuan dengan berhenti menggunakan layanan.</li>
      </ul>

      <h2>7. Anak dan usia</h2>
      <p>
        Layanan ditujukan untuk pelajar dewasa. Jika kamu di bawah usia yang
        diwajibkan di yurisdiksimu, gunakan layanan dengan izin orang tua atau
        wali.
      </p>

      <h2>8. Perubahan kebijakan</h2>
      <p>
        Kebijakan dapat diperbarui seiring perubahan fitur. Perubahan material
        akan ditandai dengan tanggal pembaruan baru. Penggunaan berkelanjutan
        berarti kamu menerima versi terbaru.
      </p>

      <h2>9. Kontak</h2>
      <p>
        Untuk pertanyaan privasi atau permintaan penghapusan, hubungi pengelola
        deployment NarraLearn di institusimu. Proyek demo ini tidak menyediakan
        alamat email resmi; ganti bagian ini dengan kontak pengelola sebelum
        digunakan publik.
      </p>
    </LegalPage>
  );
}
