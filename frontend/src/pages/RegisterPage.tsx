import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { useAuth } from "../lib/auth";
import { errorMessage } from "../lib/utils";
import { AuthShell } from "../components/AuthShell";
import { Button, IconButton } from "../components/Button";
import { Input } from "../components/Input";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [consent, setConsent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (password.length < 10) {
      setError("Password minimal 10 karakter.");
      return;
    }
    if (password !== confirm) {
      setError("Konfirmasi password belum sama.");
      return;
    }
    if (!consent) {
      setError("Centang persetujuan dulu untuk melanjutkan.");
      return;
    }

    setSubmitting(true);
    try {
      await register({
        full_name: fullName.trim(),
        email: email.trim(),
        password,
        consent_accepted: true,
      });
      navigate("/", { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Buat ruang belajar kamu"
      subtitle="Satu akun untuk menyimpan sesi, modul, dan progres. Profil suara tetap tinggal di browser ini."
      footer={
        <p>
          Sudah punya akun? <Link to="/login">Masuk di sini</Link>
        </p>
      }
    >
      <form className="auth-form" onSubmit={(event) => void handleSubmit(event)}>
        <Input
          label="Nama lengkap"
          autoComplete="name"
          placeholder="Nama yang ingin dipanggil"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          required
          minLength={2}
          maxLength={100}
          leftIcon={<UserRound size={16} />}
        />
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="nama@kampus.ac.id"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          leftIcon={<Mail size={16} />}
        />
        <div className="password-field">
          <Input
            label="Password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Minimal 10 karakter"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={10}
            hint="Gunakan minimal 10 karakter. Panjang lebih penting daripada simbol rumit."
          />
          <IconButton
            label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
            className="password-toggle"
            size="sm"
            onClick={() => setShowPassword((value) => !value)}
            type="button"
          >
            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </IconButton>
        </div>
        <Input
          label="Ulangi password"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          placeholder="Ketik ulang password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          required
          minLength={10}
          error={
            confirm && confirm !== password
              ? "Konfirmasi belum sama dengan password."
              : undefined
          }
        />

        <label className="checkbox-row checkbox-row-card">
          <input
            type="checkbox"
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
          />
          <span>
            Saya menyetujui{" "}
            <Link to="/terms" target="_blank">
              Ketentuan Layanan
            </Link>{" "}
            dan{" "}
            <Link to="/privacy" target="_blank">
              Kebijakan Privasi
            </Link>
            , termasuk pemrosesan audio/dokumen yang saya unggah. Saya punya izin
            atas materi tersebut.
          </span>
        </label>

        {error && (
          <div className="form-error-box" role="alert">
            <ShieldCheck size={16} />
            <span>{error}</span>
          </div>
        )}

        <Button
          type="submit"
          size="lg"
          fullWidth
          loading={submitting}
          disabled={!consent}
          rightIcon={<ArrowRight size={17} />}
        >
          Buat akun & mulai belajar
        </Button>
      </form>

      <div className="auth-divider">
        <span>Privasi sejak awal</span>
      </div>
      <div className="auth-demo-note">
        <strong>Rekaman mentah tidak disimpan permanen.</strong>
        <p>
          Server menghapus file audio/dokumen setelah proses sukses atau
          dibatalkan. Profil suara tersimpan di IndexedDB browser dan bisa kamu
          hapus kapan saja.
        </p>
      </div>
    </AuthShell>
  );
}
