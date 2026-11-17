import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../lib/auth";
import { Logo } from "./Logo";

export function LegalPage({
  title,
  description,
  updatedAt = "14 November 2026",
  children,
}: {
  title: string;
  description: string;
  updatedAt?: string;
  children: ReactNode;
}) {
  const { user } = useAuth();
  return (
    <div className="legal-shell">
      <header className="legal-header">
        <Link to={user ? "/" : "/login"} aria-label="NarraLearn">
          <Logo size={36} />
        </Link>
        <nav>
          <Link to="/privacy">Privasi</Link>
          <Link to="/terms">Ketentuan</Link>
          <Link to={user ? "/" : "/login"} className="btn btn-secondary btn-sm">
            {user ? "Kembali ke app" : "Masuk"}
          </Link>
        </nav>
      </header>

      <main className="legal-body">
        <p className="eyebrow">Dokumen legal</p>
        <h1>{title}</h1>
        <p className="legal-description">{description}</p>
        <p className="legal-updated">Terakhir diperbarui: {updatedAt}</p>
        <div className="legal-prose">{children}</div>
      </main>

      <footer className="legal-footer">
        <span>NarraLearn AI · demo project</span>
        <div>
          <Link to="/privacy">Kebijakan Privasi</Link>
          <Link to="/terms">Ketentuan Layanan</Link>
        </div>
      </footer>
    </div>
  );
}
