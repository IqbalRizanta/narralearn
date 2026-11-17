import { LegalPage } from "../components/LegalPage";

export function TermsPage() {
  return (
    <LegalPage
      title="Ketentuan Layanan"
      description="Aturan penggunaan NarraLearn AI, hak atas materi, batasan hasil AI, dan tanggung jawab pengguna."
    >
      <div className="notice notice-soft">
        <p>
          <strong>Ringkasnya:</strong> gunakan hanya materi yang berhak kamu
          proses. Hasil AI bisa salah dan harus diverifikasi. Jangan memakai
          NarraLearn untuk menyalin karya orang lain atau membuat keputusan
          penting tanpa pengecekan manusia.
        </p>
      </div>

      <h2>1. Layanan</h2>
      <p>
        NarraLearn AI adalah studio belajar yang mengubah audio, PDF, dan PPTX
        menjadi ringkasan bercerita, glosarium, metode belajar, dan kuis. Layanan
        dapat berjalan dalam mode demo dengan output tiruan untuk keperluan
        pengembangan.
      </p>

      <h2>2. Akun</h2>
      <p>
        Kamu bertanggung jawab menjaga password dan perangkat. Jangan berbagi
        akses akun. Kami dapat menonaktifkan akun yang melanggar ketentuan atau
        membahayakan layanan.
      </p>

      <h2>3. Materi dan hak</h2>
      <p>
        Dengan mengunggah materi, kamu menyatakan bahwa kamu memiliki izin untuk
        memprosesnya, termasuk merekam pembicara dan menggunakan slide. Kamu
        memberi NarraLearn lisensi terbatas untuk memproses materi tersebut
        semata-mata untuk menghasilkan output untukmu.
      </p>
      <p>
        Jangan mengunggah konten ilegal, rahasia dagang tanpa izin, data pribadi
        orang lain tanpa dasar yang sah, atau konten yang melanggar hak cipta.
      </p>

      <h2>4. Batasan AI</h2>
      <p>
        Output AI dapat tidak lengkap, tidak akurat, atau salah menafsirkan
        sumber. Selalu verifikasi dengan materi asli, dosen, atau sumber resmi.
        NarraLearn bukan pengganti penilaian akademik, nasihat medis, hukum, atau
        keuangan.
      </p>
      <p>
        Kutipan sumber membantu penelusuran, tetapi tidak menjamin setiap
        pernyataan terhubung sempurna ke halaman atau detik yang tepat.
      </p>

      <h2>5. Penggunaan yang dilarang</h2>
      <ul>
        <li>Merekam orang tanpa izin atau melanggar privasi.</li>
        <li>Mengunggah malware, konten eksploitasi, atau materi ilegal.</li>
        <li>Mencoba mengakses akun, data, atau sistem orang lain.</li>
        <li>Membebani layanan secara berlebihan atau mengakali batas laju.</li>
        <li>Menggunakan output untuk menipu, memfitnah, atau melanggar hukum.</li>
      </ul>

      <h2>6. Ketersediaan dan perubahan</h2>
      <p>
        Layanan disediakan “sebagaimana adanya” untuk proyek demo. Fitur, model,
        kuota, dan harga dapat berubah. Kami dapat menghentikan sementara layanan
        untuk pemeliharaan atau alasan keamanan.
      </p>

      <h2>7. Kekayaan intelektual</h2>
      <p>
        Kode dan desain NarraLearn tetap milik pengelola. Materi yang kamu unggah
        tetap milikmu. Output dapat digunakan untuk keperluan belajar pribadi;
        periksa kembali hak pihak ketiga sebelum menyebarkan.
      </p>

      <h2>8. Batasan tanggung jawab</h2>
      <p>
        Sejauh diizinkan hukum, pengelola tidak bertanggung jawab atas kerugian
        tidak langsung, kehilangan data akibat pembersihan browser, atau
        keputusan yang diambil berdasarkan output AI. Cadangkan materi penting
        secara mandiri.
      </p>

      <h2>9. Penghentian</h2>
      <p>
        Kamu dapat berhenti kapan saja dan menghapus akun. Kami dapat menangguhkan
        akun yang melanggar ketentuan. Ketentuan yang secara wajar bertahan
        setelah penghentian tetap berlaku.
      </p>

      <h2>10. Kontak</h2>
      <p>
        Pertanyaan tentang ketentuan ini dapat disampaikan kepada pengelola
        deployment NarraLearn di institusimu. Ganti bagian ini dengan kontak
        resmi sebelum digunakan publik.
      </p>
    </LegalPage>
  );
}
