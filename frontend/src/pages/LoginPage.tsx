import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";

import { useAuth } from "../lib/auth";
import { errorMessage } from "../lib/utils";
import { AuthShell } from "../components/AuthShell";
import { Button, IconButton } from "../components/Button";
import { Input } from "../components/Input";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const from =
    (location.state as { from?: string } | null)?.from ?? "/";

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Selamat datang kembali"
      subtitle="Lanjutkan sesi belajar yang sudah kamu mulai, atau buat cerita baru dari materi hari ini."
      footer={
        <p>
          Belum punya akun? <Link to="/register">Buat akun gratis</Link>
        </p>
      }
    >
      <form className="auth-form" onSubmit={(event) => void handleSubmit(event)}>
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
            autoComplete="current-password"
            placeholder="Minimal 10 karakter"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
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

        {error && (
          <div className="form-error-box" role="alert">
            <LockKeyhole size={16} />
            <span>{error}</span>
          </div>
        )}

        <Button
          type="submit"
          size="lg"
          fullWidth
          loading={submitting}
          rightIcon={<ArrowRight size={17} />}
        >
          Masuk ke ruang belajar
        </Button>
      </form>

      <div className="auth-divider">
        <span>Mode demo</span>
      </div>
      <div className="auth-demo-note">
        <strong>Belum menghubungkan API key?</strong>
        <p>
          Backend default memakai mock AI, mock STT, dan heuristik suara. Semua
          alur tetap bisa dicoba tanpa biaya. Daftar akun lalu unggah audio atau
          slide pertama.
        </p>
      </div>
    </AuthShell>
  );
}
