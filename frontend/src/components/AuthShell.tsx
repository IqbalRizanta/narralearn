import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { AudioLines, FileText, Fingerprint, Sparkles } from "lucide-react";

import { Logo, OrbitGlyph } from "./Logo";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="auth-shell">
      <section className="auth-visual">
        <div className="auth-visual-top">
          <Logo size={40} />
          <span className="auth-demo-pill">
            <Sparkles size={13} /> Demo mode siap
          </span>
        </div>

        <div className="auth-hero">
          <p className="eyebrow">Multimodal learning studio</p>
          <h1>
            Belajar bukan soal menghafal.
            <br />
            Ini soal menemukan <em>cerita</em> yang klik.
          </h1>
          <p>
            Rekaman kuliah dan slide yang membosankan diubah jadi cerita, metode
            belajar, dan kuis yang terasa dibuat untukmu.
          </p>
          <div className="auth-chips">
            <span>
              <AudioLines size={15} /> Audio → cerita
            </span>
            <span>
              <FileText size={15} /> PDF/PPTX → kuis
            </span>
            <span>
              <Fingerprint size={15} /> Profil suara lokal
            </span>
          </div>
        </div>

        <div className="auth-orbit" aria-hidden="true">
          <OrbitGlyph />
          <div className="auth-orbit-card auth-orbit-card-a">
            <span>04 gaya</span>
            <strong>Gaming · Sosmed · Novel · Santai</strong>
          </div>
          <div className="auth-orbit-card auth-orbit-card-b">
            <span>struktur</span>
            <strong>Ringkasan · Kuis · Metode belajar</strong>
          </div>
        </div>

        <div className="auth-visual-foot">
          <span>Audio & dokumen diproses sebagai job async.</span>
          <Link to="/privacy">Privasi</Link>
          <Link to="/terms">Ketentuan</Link>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <div className="auth-card-head">
            <p className="eyebrow">NarraLearn AI</p>
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>
          {children}
          <div className="auth-card-foot">{footer}</div>
        </div>
        <p className="auth-panel-note">
          Dengan masuk, kamu menyetujui pemrosesan materi sesuai kebijakan
          privasi. Jangan unggah rekaman tanpa izin.
        </p>
      </section>
    </div>
  );
}
