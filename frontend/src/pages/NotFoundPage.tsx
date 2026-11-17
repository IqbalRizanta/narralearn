import { Link } from "react-router-dom";
import { ArrowLeft, Compass } from "lucide-react";

import { Logo } from "../components/Logo";

export function NotFoundPage() {
  return (
    <div className="not-found">
      <Logo size={42} />
      <div className="not-found-code">404</div>
      <Compass size={32} />
      <h1>Halaman ini tidak ada di peta</h1>
      <p>
        Mungkin tautannya berubah, atau kamu membuka alamat yang salah. Kembali
        ke ruang belajar untuk melanjutkan.
      </p>
      <Link to="/" className="btn btn-primary">
        <ArrowLeft size={16} /> Kembali ke beranda
      </Link>
    </div>
  );
}
