import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Lock, Mic2, ShieldCheck, Trash2 } from "lucide-react";

import { useAuth } from "../lib/auth";
import { errorMessage } from "../lib/utils";
import { Button } from "./Button";
import { Modal } from "./Modal";

interface ConsentModalProps {
  open: boolean;
  onClose: () => void;
  onAccepted?: () => void;
}

export function ConsentModal({ open, onClose, onAccepted }: ConsentModalProps) {
  const { acceptConsent, user } = useAuth();
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setChecked(false);
      setError(null);
    }
  }, [open]);

  const handleAccept = async () => {
    if (!checked) return;
    setSaving(true);
    setError(null);
    try {
      await acceptConsent();
      onAccepted?.();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Sebelum merekam, kita sepakat dulu"
      description="NarraLearn memproses rekaman dan dokumenmu untuk membuat materi belajar. Kamu tetap memegang kendali."
      footer={
        <div className="modal-actions">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Nanti saja
          </Button>
          <Button
            onClick={() => void handleAccept()}
            loading={saving}
            disabled={!checked}
            leftIcon={<ShieldCheck size={17} />}
          >
            Saya setuju & lanjut
          </Button>
        </div>
      }
    >
      <div className="consent-list">
        <div className="consent-item">
          <Mic2 size={19} />
          <div>
            <strong>Hanya rekam yang kamu punya izinnya</strong>
            <p>
              Pastikan kamu berhak merekam kelas, rapat, atau materi tersebut.
              Jangan unggah rekaman orang lain tanpa izin.
            </p>
          </div>
        </div>
        <div className="consent-item">
          <Lock size={19} />
          <div>
            <strong>Profil suara tersimpan lokal</strong>
            <p>
              Profil suaramu disimpan di IndexedDB browser ini. Server hanya
              menerima embedding sementara saat memproses audio, bukan sampel
              suara mentah untuk biometrik.
            </p>
          </div>
        </div>
        <div className="consent-item">
          <Trash2 size={19} />
          <div>
            <strong>File mentah bersifat sementara</strong>
            <p>
              Audio dan dokumen dihapus setelah pemrosesan berhasil, dibatalkan,
              atau melewati masa retensi. Kamu bisa menghapus akun dan seluruh
              datanya kapan saja.
            </p>
          </div>
        </div>
      </div>

      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => setChecked(event.target.checked)}
        />
        <span>
          Saya punya izin untuk memproses materi ini dan menyetujui{" "}
          <Link to="/privacy" target="_blank">
            Kebijakan Privasi
          </Link>{" "}
          serta{" "}
          <Link to="/terms" target="_blank">
            Ketentuan Layanan
          </Link>
          .
        </span>
      </label>

      {error && <p className="form-error">{error}</p>}
      <p className="consent-version">
        Versi persetujuan: 1.0 · Akun: {user?.email}
      </p>
    </Modal>
  );
}
