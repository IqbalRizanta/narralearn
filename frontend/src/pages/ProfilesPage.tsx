import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Database,
  Download,
  Fingerprint,
  HardDrive,
  Info,
  Mic2,
  Pencil,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import {
  deleteProfile,
  exportProfiles,
  importProfiles,
  renameProfile,
  db,
} from "../lib/db";
import type { SpeakerProfile } from "../lib/types";
import {
  downloadText,
  errorMessage,
  formatBytes,
  formatDate,
  pluralize,
} from "../lib/utils";
import { Badge } from "../components/Card";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { EmptyState } from "../components/States";
import { Input } from "../components/Input";
import { Modal } from "../components/Modal";
import { PageHeader } from "../components/PageHeader";
import { VoiceCalibrator } from "../components/VoiceCalibrator";

export function ProfilesPage() {
  const profiles = useLiveQuery(
    () => db.speakerProfiles.orderBy("createdAt").reverse().toArray(),
    [],
    [] as SpeakerProfile[],
  );
  const [showCalibrator, setShowCalibrator] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SpeakerProfile | null>(null);
  const [editing, setEditing] = useState<SpeakerProfile | null>(null);
  const [editingLabel, setEditingLabel] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [storage, setStorage] = useState<{ usage: number; quota: number } | null>(
    null,
  );
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!navigator.storage?.estimate) return;
    void navigator.storage.estimate().then((estimate) => {
      setStorage({
        usage: estimate.usage ?? 0,
        quota: estimate.quota ?? 0,
      });
    });
  }, [profiles.length]);

  const handleExport = async () => {
    setError(null);
    try {
      downloadText(
        `narralearn-profiles-${new Date().toISOString().slice(0, 10)}.json`,
        await exportProfiles(),
      );
      setMessage("Profil diekspor. Simpan file JSON di tempat aman.");
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);
    setMessage(null);
    try {
      const imported = await importProfiles(await file.text());
      setMessage(`${pluralize(imported, "profil", "profil")} berhasil diimpor.`);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const handleRename = async () => {
    if (!editing?.id) return;
    const label = editingLabel.trim();
    if (!label) return;
    await renameProfile(editing.id, label);
    setEditing(null);
    setEditingLabel("");
  };

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    await deleteProfile(deleteTarget.id);
    setDeleteTarget(null);
  };

  const requestPersist = async () => {
    if (!navigator.storage?.persist) {
      setError("Browser ini belum mendukung penyimpanan persisten.");
      return;
    }
    const granted = await navigator.storage.persist();
    setMessage(
      granted
        ? "Penyimpanan persisten aktif. Browser tidak akan menghapus profil secara otomatis."
        : "Browser belum memberikan izin penyimpanan persisten. Profil tetap tersimpan, tetapi bisa dibersihkan saat ruang menipis.",
    );
  };

  const usagePercent =
    storage && storage.quota > 0
      ? Math.min(100, (storage.usage / storage.quota) * 100)
      : 0;

  return (
    <div className="page profiles-page">
      <PageHeader
        eyebrow="Data lokal"
        title="Profil suara"
        description="Simpan karakter suara pembicara utama untuk memfilter audio. Profil tinggal di browser ini."
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => importRef.current?.click()}
              leftIcon={<Upload size={16} />}
            >
              Impor
            </Button>
            <Button
              onClick={() => setShowCalibrator(true)}
              leftIcon={<Mic2 size={17} />}
            >
              Kalibrasi suara
            </Button>
          </>
        }
      />

      <input
        ref={importRef}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        onChange={(event) => void handleImport(event)}
      />

      <div className="notice notice-soft">
        <ShieldCheck size={19} />
        <div>
          <strong>Profil suara bukan pengganti verifikasi biometrik</strong>
          <p>
            Embedding dipakai untuk memperkirakan pembicara utama. Skor mode demo
            memakai heuristik kualitas suara, bukan model ECAPA. Jangan gunakan
            untuk autentikasi atau keputusan sensitif.
          </p>
        </div>
      </div>

      {message && (
        <div className="notice notice-success" role="status">
          <CheckCircleMessage />
          <div>
            <strong>Berhasil</strong>
            <p>{message}</p>
          </div>
          <button
            type="button"
            className="notice-close"
            onClick={() => setMessage(null)}
            aria-label="Tutup pesan"
          >
            <X size={15} />
          </button>
        </div>
      )}
      {error && (
        <div className="notice notice-warning" role="alert">
          <Info size={18} />
          <div>
            <strong>Ada yang perlu dicek</strong>
            <p>{error}</p>
          </div>
          <button
            type="button"
            className="notice-close"
            onClick={() => setError(null)}
            aria-label="Tutup pesan"
          >
            <X size={15} />
          </button>
        </div>
      )}

      <div className="profiles-layout">
        <div className="profiles-main">
          <Card className="profiles-list-card">
            <div className="section-head">
              <div>
                <p className="eyebrow">Tersimpan di IndexedDB</p>
                <h2>{pluralize(profiles.length, "profil", "profil")}</h2>
              </div>
              {profiles.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void handleExport()}
                  leftIcon={<Download size={15} />}
                >
                  Ekspor JSON
                </Button>
              )}
            </div>

            {profiles.length === 0 ? (
              <EmptyState
                icon={<Fingerprint size={26} />}
                title="Belum ada profil suara"
                description="Rekam 8–15 detik suara yang jelas. Profil bisa dipakai saat membuat sesi untuk memfilter pembicara utama."
                action={
                  <Button
                    onClick={() => setShowCalibrator(true)}
                    leftIcon={<Mic2 size={16} />}
                  >
                    Kalibrasi pertama
                  </Button>
                }
              />
            ) : (
              <div className="profile-grid">
                {profiles.map((profile) => (
                  <article key={profile.id} className="profile-card">
                    <div className="profile-card-top">
                      <span className="profile-avatar">
                        <Fingerprint size={20} />
                      </span>
                      <Badge tone="neutral">
                        {profile.provider === "heuristic-v1" ? (
                          <>
                            <Sparkles size={12} /> Demo
                          </>
                        ) : (
                          "Model ECAPA"
                        )}
                      </Badge>
                    </div>
                    <h3>{profile.label}</h3>
                    <p className="profile-meta">
                      {profile.dimension}D · skor {Math.round(profile.score)} ·
                      lokal
                    </p>

                    <div className="profile-score-row">
                      <div className="progress-track">
                        <span
                          className="progress-fill"
                          style={{ width: `${Math.min(100, profile.score)}%` }}
                        />
                      </div>
                      <strong>{Math.round(profile.score)}%</strong>
                    </div>

                    <div className="profile-card-foot">
                      <span>{formatDate(profile.createdAt)}</span>
                      <div className="profile-actions">
                        <button
                          type="button"
                          className="icon-text-btn"
                          onClick={() => {
                            setEditing(profile);
                            setEditingLabel(profile.label);
                          }}
                        >
                          <Pencil size={14} /> Ubah
                        </button>
                        <button
                          type="button"
                          className="icon-text-btn is-danger"
                          onClick={() => setDeleteTarget(profile)}
                        >
                          <Trash2 size={14} /> Hapus
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </Card>
        </div>

        <aside className="profiles-aside">
          <Card className="storage-card">
            <span className="storage-icon">
              <HardDrive size={20} />
            </span>
            <p className="eyebrow">Penyimpanan browser</p>
            <h2>{usagePercent.toFixed(1)}% terpakai</h2>
            <p>
              {storage
                ? `${formatBytes(storage.usage)} dari ${formatBytes(storage.quota)}`
                : "Memeriksa penyimpanan…"}
            </p>
            <div className="progress-track">
              <span className="progress-fill" style={{ width: `${usagePercent}%` }} />
            </div>
            <Button
              variant="secondary"
              size="sm"
              fullWidth
              onClick={() => void requestPersist()}
              leftIcon={<Database size={15} />}
            >
              Minta penyimpanan persisten
            </Button>
            <p className="field-hint">
              Profil bisa hilang jika kamu membersihkan data situs atau memakai
              mode privat. Ekspor cadangan secara berkala.
            </p>
          </Card>

          <Card className="profile-tips">
            <h3>Tips rekaman yang bersih</h3>
            <ul>
              <li>Gunakan ruangan dengan gema minimal.</li>
              <li>Jarak mikrofon sekitar satu jengkal.</li>
              <li>Bicara 8–12 detik tanpa berbisik.</li>
              <li>Hindari musik, kipas, atau suara TV.</li>
            </ul>
          </Card>

          <Card className="profile-import-note">
            <Info size={18} />
            <div>
              <strong>Pindah perangkat?</strong>
              <p>
                Ekspor JSON lalu impor di browser lain. File ini berisi embedding
                suara; perlakukan seperti data pribadi.
              </p>
            </div>
          </Card>
        </aside>
      </div>

      <VoiceCalibrator
        open={showCalibrator}
        onClose={() => setShowCalibrator(false)}
        onSaved={() => {
          setMessage("Profil suara tersimpan di browser ini.");
        }}
      />

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title="Ubah nama profil"
        description="Nama hanya tersimpan lokal dan dipakai untuk memilih profil di studio."
        size="sm"
        footer={
          <div className="modal-actions">
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Batal
            </Button>
            <Button onClick={() => void handleRename()} disabled={!editingLabel.trim()}>
              Simpan nama
            </Button>
          </div>
        }
      >
        <Input
          label="Nama profil"
          value={editingLabel}
          maxLength={60}
          onChange={(event) => setEditingLabel(event.target.value)}
          data-autofocus
        />
      </Modal>

      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Hapus profil suara?"
        description="Embedding akan dihapus dari browser ini. Modul yang sudah dibuat tidak terpengaruh."
        size="sm"
        footer={
          <div className="modal-actions">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Batal
            </Button>
            <Button
              variant="danger"
              onClick={() => void handleDelete()}
              leftIcon={<Trash2 size={16} />}
            >
              Hapus profil
            </Button>
          </div>
        }
      >
        <p className="muted">
          Profil <strong>{deleteTarget?.label}</strong> akan dihapus permanen dari
          perangkat ini.
        </p>
      </Modal>
    </div>
  );
}

function CheckCircleMessage() {
  return (
    <span className="notice-icon">
      <ShieldCheck size={18} />
    </span>
  );
}
