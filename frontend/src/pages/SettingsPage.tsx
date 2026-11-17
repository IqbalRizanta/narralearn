import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import {
  CheckCircle2,
  Download,
  HardDrive,
  Info,
  LogOut,
  Moon,
  ShieldCheck,
  Sun,
  Trash2,
  UserRound,
} from "lucide-react";

import { useAuth } from "../lib/auth";
import { clearOfflineModules, db } from "../lib/db";
import { useInstallPrompt } from "../lib/useInstallPrompt";
import { useTheme } from "../lib/theme";
import { errorMessage, formatDate, initials, pluralize } from "../lib/utils";
import { Badge } from "../components/Card";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { PageHeader } from "../components/PageHeader";

export function SettingsPage() {
  const { user, logout, deleteAccount } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { canInstall, installed, isIOS, promptInstall } = useInstallPrompt();
  const navigate = useNavigate();
  const offlineCount = useLiveQuery(() => db.offlineModules.count(), [], 0);
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const handleClearOffline = async () => {
    await clearOfflineModules();
    setMessage("Salinan modul offline dihapus dari perangkat ini.");
  };

  const handleDeleteAccount = async () => {
    setError(null);
    if (!password) {
      setError("Masukkan password untuk menghapus akun.");
      return;
    }
    if (confirmText !== "HAPUS") {
      setError('Ketik "HAPUS" untuk mengonfirmasi.');
      return;
    }
    setDeleting(true);
    try {
      await deleteAccount(password);
      navigate("/register", { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="page settings-page">
      <PageHeader
        eyebrow="Preferensi"
        title="Pengaturan"
        description="Kelola akun, tampilan, penyimpanan lokal, dan data yang tersimpan di perangkat."
      />

      {message && (
        <div className="notice notice-success" role="status">
          <CheckCircle2 size={18} />
          <div>
            <strong>Berhasil</strong>
            <p>{message}</p>
          </div>
        </div>
      )}
      {error && (
        <div className="notice notice-warning" role="alert">
          <Info size={18} />
          <div>
            <strong>Ada yang perlu dicek</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      <div className="settings-layout">
        <div className="settings-main">
          <Card className="settings-section">
            <div className="section-head">
              <div>
                <p className="eyebrow">Akun</p>
                <h2>Profil kamu</h2>
              </div>
              <Badge tone="success">
                <CheckCircle2 size={13} /> Aktif
              </Badge>
            </div>
            <div className="account-card">
              <span className="avatar avatar-lg">{initials(user?.full_name ?? "N")}</span>
              <div>
                <strong>{user?.full_name}</strong>
                <span>{user?.email}</span>
                <small>Bergabung {formatDate(user?.created_at)}</small>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void handleLogout()}
                leftIcon={<LogOut size={15} />}
              >
                Keluar
              </Button>
            </div>

            <div className="settings-row">
              <div>
                <strong>Persetujuan pemrosesan</strong>
                <p>
                  {user?.consent_accepted_at
                    ? `Disetujui ${formatDate(user.consent_accepted_at)} · versi ${user.consent_version ?? "1.0"}`
                    : "Belum disetujui. Kamu akan diminta saat membuat sesi pertama."}
                </p>
              </div>
              <Badge tone={user?.consent_accepted_at ? "success" : "warning"}>
                {user?.consent_accepted_at ? "Aktif" : "Belum"}
              </Badge>
            </div>
          </Card>

          <Card className="settings-section">
            <div className="section-head">
              <div>
                <p className="eyebrow">Tampilan</p>
                <h2>Tema & akses</h2>
              </div>
            </div>
            <div className="settings-row">
              <div>
                <strong>Mode {theme === "dark" ? "gelap" : "terang"}</strong>
                <p>
                  Tema disimpan di perangkat. Pilih yang paling nyaman untuk
                  sesi baca panjang.
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={toggleTheme}
                leftIcon={theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
              >
                Ganti ke {theme === "dark" ? "terang" : "gelap"}
              </Button>
            </div>

            <div className="settings-row">
              <div>
                <strong>Aplikasi PWA</strong>
                <p>
                  {installed
                    ? "NarraLearn sudah terpasang di perangkat ini."
                    : isIOS
                      ? "Di iPhone/iPad: buka menu Bagikan lalu pilih “Tambah ke Layar Utama”."
                      : canInstall
                        ? "Pasang untuk akses lebih cepat dan pengalaman layar penuh."
                        : "Gunakan menu browser untuk memasang aplikasi."}
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                disabled={!canInstall}
                onClick={() => void promptInstall()}
                leftIcon={<Download size={15} />}
              >
                {installed ? "Terpasang" : "Pasang app"}
              </Button>
            </div>
          </Card>

          <Card className="settings-section">
            <div className="section-head">
              <div>
                <p className="eyebrow">Penyimpanan lokal</p>
                <h2>Data di perangkat ini</h2>
              </div>
              <HardDrive size={20} />
            </div>
            <div className="settings-row">
              <div>
                <strong>Modul offline</strong>
                <p>
                  {pluralize(offlineCount ?? 0, "modul", "modul")} tersimpan di
                  IndexedDB. Modul dibaca otomatis saat online, bisa dibuka lagi
                  tanpa koneksi.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void handleClearOffline()}
                disabled={!offlineCount}
              >
                Hapus salinan
              </Button>
            </div>
            <div className="settings-row">
              <div>
                <strong>Profil suara</strong>
                <p>
                  Dikelola terpisah. Buka halaman profil untuk mengubah, mengekspor,
                  atau menghapus embedding suara.
                </p>
              </div>
              <Link to="/profiles" className="btn btn-secondary btn-sm">
                <UserRound size={15} /> Kelola profil
              </Link>
            </div>
          </Card>

          <Card className="settings-section">
            <div className="section-head">
              <div>
                <p className="eyebrow">Privasi</p>
                <h2>Kebijakan & ketentuan</h2>
              </div>
              <ShieldCheck size={20} />
            </div>
            <div className="legal-links">
              <Link to="/privacy">
                <strong>Kebijakan Privasi</strong>
                <span>Retensi file, profil suara, dan hak penghapusan.</span>
              </Link>
              <Link to="/terms">
                <strong>Ketentuan Layanan</strong>
                <span>Izin materi, batasan AI, dan penggunaan yang wajar.</span>
              </Link>
            </div>
          </Card>

          <Card className="settings-section settings-danger">
            <div className="section-head">
              <div>
                <p className="eyebrow">Zona bahaya</p>
                <h2>Hapus akun</h2>
              </div>
              <Trash2 size={20} />
            </div>
            <p className="muted">
              Semua sesi, dokumen, transkrip, modul, dan progres di server akan
              dihapus permanen. Profil suara dan modul offline di browser ini
              perlu dihapus terpisah.
            </p>
            <div className="delete-account-form">
              <Input
                label="Password saat ini"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <Input
                label='Ketik "HAPUS" untuk konfirmasi'
                value={confirmText}
                onChange={(event) => setConfirmText(event.target.value)}
              />
              <Button
                variant="danger"
                loading={deleting}
                onClick={() => void handleDeleteAccount()}
                leftIcon={<Trash2 size={16} />}
              >
                Hapus akun permanen
              </Button>
            </div>
          </Card>
        </div>

        <aside className="settings-aside">
          <Card className="settings-about">
            <p className="eyebrow">Tentang</p>
            <h2>NarraLearn AI</h2>
            <p>
              Studio belajar multimodal yang mengubah audio dan dokumen menjadi
              cerita, metode belajar, glosarium, dan kuis dengan sumber yang bisa
              dilacak.
            </p>
            <dl className="meta-list">
              <div>
                <dt>Versi</dt>
                <dd>0.1.0</dd>
              </div>
              <div>
                <dt>Mode AI</dt>
                <dd>Demo / configurable</dd>
              </div>
              <div>
                <dt>Penyimpanan</dt>
                <dd>Server + IndexedDB</dd>
              </div>
            </dl>
          </Card>

          <Card className="settings-demo">
            <Info size={19} />
            <h3>Apakah ini AI sungguhan?</h3>
            <p>
              Default demo memakai mock AI dan mock STT agar alur bisa dicoba
              tanpa API key. Hasil demo bukan rangkuman akademik. Hubungkan
              Gemini dan Faster-Whisper di environment backend untuk kualitas
              produksi.
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}
