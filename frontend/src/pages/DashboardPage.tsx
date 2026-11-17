import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowRight,
  BookOpenCheck,
  Clock3,
  Download,
  Layers3,
  Mic2,
  Plus,
  Sparkles,
  WandSparkles,
} from "lucide-react";

import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { db } from "../lib/db";
import { useInstallPrompt } from "../lib/useInstallPrompt";
import {
  errorMessage,
  modeStyle,
  pluralize,
  STYLE_META,
  STYLE_ORDER,
} from "../lib/utils";
import { Button } from "../components/Button";
import { EmptyState, ErrorState } from "../components/States";
import { PageHeader } from "../components/PageHeader";
import { SessionCard } from "../components/SessionCard";

function DashboardSkeleton() {
  return (
    <div className="dashboard-grid">
      <div className="bento skeleton skeleton-hero" />
      <div className="bento skeleton skeleton-stat" />
      <div className="bento skeleton skeleton-stat" />
      <div className="bento skeleton skeleton-stat" />
      <div className="bento skeleton skeleton-list" />
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const { canInstall, promptInstall } = useInstallPrompt();
  const sessionsQuery = useQuery({
    queryKey: ["sessions"],
    queryFn: () => api.listSessions(undefined, 20),
  });
  const profileCount = useLiveQuery(() => db.speakerProfiles.count(), [], 0);

  const items = sessionsQuery.data?.items ?? [];
  const recent = items.slice(0, 6);
  const readyCount = items.filter((item) => item.status === "READY").length;
  const moduleCount = items.reduce((sum, item) => sum + item.module_count, 0);
  const firstName = user?.full_name.split(/\s+/)[0] ?? "Sobat";

  return (
    <div className="page dashboard-page">
      <PageHeader
        eyebrow="Ruang belajar"
        title={`Hai, ${firstName}. Mau belajar dari apa hari ini?`}
        description="Ubah rekaman atau slide jadi pengalaman belajar yang terasa dibuat khusus untukmu."
        actions={
          <Link to="/sessions/new" className="btn btn-primary">
            <Plus size={17} />
            <span>Buat sesi</span>
          </Link>
        }
      />

      {canInstall && (
        <div className="install-banner">
          <div className="install-banner-icon">
            <Download size={20} />
          </div>
          <div>
            <strong>Pasang NarraLearn di perangkatmu</strong>
            <p>Akses lebih cepat dan baca modul offline setelah dibuka sekali.</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => void promptInstall()}>
            Pasang app
          </Button>
        </div>
      )}

      {sessionsQuery.isLoading ? (
        <DashboardSkeleton />
      ) : sessionsQuery.isError ? (
        <ErrorState
          title="Tidak bisa memuat sesi"
          message={errorMessage(sessionsQuery.error)}
          onRetry={() => void sessionsQuery.refetch()}
        />
      ) : (
        <div className="dashboard-grid">
          <section className="bento dashboard-hero">
            <div className="hero-copy">
              <span className="hero-kicker">
                <WandSparkles size={15} /> Studio multimodal
              </span>
              <h2>
                Materi yang padat,
                <br />
                diubah jadi <em>cerita</em> yang nempel.
              </h2>
              <p>
                Unggah audio kuliah dan slide. NarraLearn membuat ringkasan
                bercerita, glosarium, metode belajar, dan kuis dengan sumber yang
                bisa dilacak.
              </p>
              <div className="hero-actions">
                <Link to="/sessions/new" className="btn btn-primary">
                  Mulai dari rekaman <ArrowRight size={16} />
                </Link>
                <Link to="/profiles" className="btn btn-ghost">
                  Siapkan profil suara
                </Link>
              </div>
            </div>

            <div className="hero-stack" aria-hidden="true">
              <div className="hero-stack-card card-gaming">
                <span>01 · Quest</span>
                <strong>Algoritma sebagai boss fight</strong>
                <small>“Setiap level membuka konsep baru.”</small>
              </div>
              <div className="hero-stack-card card-sosmed">
                <span>02 · Thread</span>
                <strong>5 poin yang harus kamu tahu</strong>
                <small>Ringkas, tajam, langsung ke inti.</small>
              </div>
              <div className="hero-stack-card card-novel">
                <span>03 · Cerita</span>
                <strong>Kompleksitas waktu seperti perjalanan</strong>
                <small>Metafora membuat konsep abstrak terasa nyata.</small>
              </div>
            </div>
          </section>

          <section className="bento stat-card">
            <div className="stat-icon stat-icon-mint">
              <BookOpenCheck size={20} />
            </div>
            <strong>{readyCount}</strong>
            <span>sesi siap belajar</span>
            <p>Modul pertama otomatis dibuat setelah proses selesai.</p>
          </section>

          <section className="bento stat-card">
            <div className="stat-icon stat-icon-lime">
              <Layers3 size={20} />
            </div>
            <strong>{moduleCount}</strong>
            <span>gaya belajar tersedia</span>
            <p>Ganti gaya kapan saja tanpa mengunggah ulang materi.</p>
          </section>

          <section className="bento stat-card stat-card-profiles">
            <div className="stat-icon stat-icon-warm">
              <Mic2 size={20} />
            </div>
            <strong>{profileCount ?? 0}</strong>
            <span>profil suara lokal</span>
            <p>Disimpan di browser, tidak di server.</p>
            <Link to="/profiles" className="stat-link">
              Kelola profil <ArrowRight size={14} />
            </Link>
          </section>

          <section className="bento dashboard-sessions">
            <div className="section-head">
              <div>
                <p className="eyebrow">Terbaru</p>
                <h2>Sesi belajarmu</h2>
              </div>
              <Link to="/sessions/new" className="text-link">
                Sesi baru <Plus size={14} />
              </Link>
            </div>

            {recent.length === 0 ? (
              <EmptyState
                icon={<Sparkles size={26} />}
                title="Belum ada cerita belajar"
                description="Mulai dari rekaman kuliah 3 menit atau satu file slide. Proses pertama biasanya selesai dalam hitungan detik di mode demo."
                action={
                  <Link to="/sessions/new" className="btn btn-primary">
                    <Plus size={16} /> Buat sesi pertama
                  </Link>
                }
              />
            ) : (
              <div className="session-grid">
                {recent.map((session) => (
                  <SessionCard key={session.id} session={session} />
                ))}
              </div>
            )}
          </section>

          <section className="bento dashboard-styles">
            <div className="section-head">
              <div>
                <p className="eyebrow">Pilih sudut pandang</p>
                <h2>Empat gaya, satu materi</h2>
              </div>
            </div>
            <div className="style-showcase">
              {STYLE_ORDER.map((style, index) => {
                const meta = STYLE_META[style];
                return (
                  <div
                    key={style}
                    className="style-showcase-item"
                    style={modeStyle(meta.color)}
                  >
                    <span className="style-showcase-index">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <strong>{meta.label}</strong>
                    <p>{meta.description}</p>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="bento dashboard-tip">
            <span className="tip-icon">
              <Clock3 size={20} />
            </span>
            <p className="eyebrow">Metode minggu ini</p>
            <h2>Belajar 25 menit, jeda 5 menit</h2>
            <p>
              Setelah membaca satu bagian, tutup modul dan jelaskan ulang dengan
              bahasamu sendiri. Baru cek kuis. Teknik ini melatih recall, bukan
              sekadar mengenali teks.
            </p>
            <span className="tip-foot">{pluralize(3, "kuis pendek", "kuis pendek")} menunggu di setiap modul.</span>
          </section>
        </div>
      )}
    </div>
  );
}
