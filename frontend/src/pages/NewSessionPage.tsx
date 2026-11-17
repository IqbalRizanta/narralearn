import {
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowRight,
  BookOpen,
  Coffee,
  FileAudio2,
  FileText,
  Gamepad2,
  Info,
  Mic2,
  Plus,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";

import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { db } from "../lib/db";
import type { SpeakerProfile, StyleMode } from "../lib/types";
import {
  cn,
  errorMessage,
  formatBytes,
  modeStyle,
  STYLE_META,
  STYLE_ORDER,
} from "../lib/utils";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { ConsentModal } from "../components/ConsentModal";
import { Input, Select } from "../components/Input";
import { LectureRecorder } from "../components/LectureRecorder";
import { PageHeader } from "../components/PageHeader";
import { VoiceCalibrator } from "../components/VoiceCalibrator";

const STYLE_ICONS: Record<StyleMode, ReactNode> = {
  GAMING: <Gamepad2 size={22} />,
  SOSMED: <Smartphone size={22} />,
  NOVEL: <BookOpen size={22} />,
  CASUAL_STORY: <Coffee size={22} />,
};

const AUDIO_ACCEPT = ".wav,.mp3,.m4a,.webm,.ogg,.flac,audio/*";
const DOC_ACCEPT =
  ".pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation";
const MAX_AUDIO_BYTES = 100 * 1024 * 1024;
const MAX_DOC_BYTES = 25 * 1024 * 1024;
const MAX_DOCS = 5;

function UploadZone({
  accept,
  multiple = false,
  title,
  description,
  icon,
  fileLabel,
  onFiles,
  onClear,
}: {
  accept: string;
  multiple?: boolean;
  title: string;
  description: string;
  icon: ReactNode;
  fileLabel?: string;
  onFiles: (files: File[]) => void;
  onClear?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = (list: FileList | null) => {
    if (!list) return;
    onFiles(Array.from(list));
  };

  return (
    <div
      className={cn("upload-zone", dragging && "is-dragging", fileLabel && "has-file")}
      onDragOver={(event: DragEvent) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event: DragEvent) => {
        event.preventDefault();
        setDragging(false);
        handleFiles(event.dataTransfer.files);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          handleFiles(event.target.files);
          event.target.value = "";
        }}
      />
      <div className="upload-icon">{icon}</div>
      <div className="upload-copy">
        <strong>{fileLabel ?? title}</strong>
        <p>{fileLabel ? "Klik untuk mengganti file" : description}</p>
      </div>
      <div className="upload-actions">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => inputRef.current?.click()}
          leftIcon={<UploadCloud size={15} />}
        >
          {fileLabel ? "Ganti" : "Pilih file"}
        </Button>
        {fileLabel && onClear && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClear}
            leftIcon={<X size={15} />}
          >
            Hapus
          </Button>
        )}
      </div>
    </div>
  );
}

export function NewSessionPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [speakerLabel, setSpeakerLabel] = useState("");
  const [glossary, setGlossary] = useState("");
  const [styleMode, setStyleMode] = useState<StyleMode>("GAMING");
  const [audio, setAudio] = useState<File | null>(null);
  const [documents, setDocuments] = useState<File[]>([]);
  const [profileId, setProfileId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [showCalibrator, setShowCalibrator] = useState(false);

  const profiles = useLiveQuery(
    () => db.speakerProfiles.orderBy("createdAt").reverse().toArray(),
    [],
    [] as SpeakerProfile[],
  );
  const selectedProfile =
    profiles.find((profile) => String(profile.id) === profileId) ?? null;

  const setAudioFile = (files: File[]) => {
    const file = files[0];
    if (!file) return;
    if (file.size > MAX_AUDIO_BYTES) {
      setError(`Audio maksimal ${formatBytes(MAX_AUDIO_BYTES)}.`);
      return;
    }
    setError(null);
    setAudio(file);
  };

  const setDocumentFiles = (files: File[]) => {
    const accepted = [...documents];
    for (const file of files) {
      const lower = file.name.toLowerCase();
      if (!lower.endsWith(".pdf") && !lower.endsWith(".pptx")) {
        setError("Dokumen harus PDF atau PPTX.");
        continue;
      }
      if (file.size > MAX_DOC_BYTES) {
        setError(`${file.name} melebihi ${formatBytes(MAX_DOC_BYTES)}.`);
        continue;
      }
      if (
        accepted.length >= MAX_DOCS ||
        accepted.some((item) => item.name === file.name && item.size === file.size)
      ) {
        continue;
      }
      accepted.push(file);
    }
    setDocuments(accepted.slice(0, MAX_DOCS));
  };

  const removeDocument = (index: number) => {
    setDocuments((items) => items.filter((_, itemIndex) => itemIndex !== index));
  };

  const submit = async () => {
    setError(null);
    if (!user?.consent_accepted_at) {
      setShowConsent(true);
      return;
    }
    if (!title.trim()) {
      setError("Beri judul sesi dulu supaya mudah ditemukan.");
      return;
    }
    if (!audio && documents.length === 0) {
      setError("Unggah minimal satu audio atau dokumen.");
      return;
    }

    const formData = new FormData();
    formData.append("title", title.trim());
    formData.append("style_mode", styleMode);
    if (speakerLabel.trim()) formData.append("speaker_label", speakerLabel.trim());
    if (glossary.trim()) formData.append("glossary", glossary.trim());
    if (selectedProfile?.embedding) {
      formData.append("embedding", selectedProfile.embedding);
    }
    if (audio) formData.append("audio", audio);
    for (const document of documents) formData.append("documents", document);

    setSubmitting(true);
    try {
      const created = await api.createSession(formData);
      await queryClient.invalidateQueries({ queryKey: ["sessions"] });
      navigate(`/sessions/${created.session_id}`, {
        state: { jobId: created.job_id },
      });
    } catch (err) {
      const message = errorMessage(err);
      setError(message);
      if (message.toLowerCase().includes("persetujuan")) {
        setShowConsent(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const selectedMeta = STYLE_META[styleMode];

  return (
    <div className="page studio-page">
      <PageHeader
        eyebrow="Studio baru"
        title="Mulai dari materi mentahmu"
        description="Unggah rekaman, slide, atau keduanya. Kami susun jadi cerita belajar, metode, dan kuis."
        actions={
          <Link to="/" className="btn btn-ghost">
            Batal
          </Link>
        }
      />

      {!user?.consent_accepted_at && (
        <div className="notice notice-warning">
          <ShieldCheck size={19} />
          <div>
            <strong>Persetujuan rekaman belum diberikan</strong>
            <p>
              Kamu perlu menyetujui pemrosesan materi sebelum membuat sesi
              pertama.
            </p>
          </div>
          <Button size="sm" variant="secondary" onClick={() => setShowConsent(true)}>
            Beri persetujuan
          </Button>
        </div>
      )}

      <div className="studio-grid">
        <div className="studio-main">
          <Card className="form-section">
            <div className="section-head">
              <div>
                <p className="eyebrow">01 · Identitas sesi</p>
                <h2>Beri nama yang mudah diingat</h2>
              </div>
            </div>
            <div className="form-grid">
              <Input
                label="Judul sesi"
                placeholder="Contoh: Algoritma & Struktur Data — Pertemuan 4"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={200}
                required
              />
              <Input
                label="Nama pembicara"
                placeholder="Contoh: Bu Rina / aku sendiri"
                value={speakerLabel}
                onChange={(event) => setSpeakerLabel(event.target.value)}
                maxLength={100}
                optional
              />
            </div>
          </Card>

          <Card className="form-section">
            <div className="section-head">
              <div>
                <p className="eyebrow">02 · Sumber materi</p>
                <h2>Audio dan dokumen pendukung</h2>
              </div>
              <span className="soft-label">Maks. 100 MB audio · 25 MB/dokumen</span>
            </div>

            <div className="upload-grid">
              <UploadZone
                accept={AUDIO_ACCEPT}
                title="Rekaman audio"
                description="WAV, MP3, M4A, WebM, OGG, atau FLAC. Satu file per sesi."
                icon={<FileAudio2 size={24} />}
                fileLabel={
                  audio ? `${audio.name} · ${formatBytes(audio.size)}` : undefined
                }
                onFiles={setAudioFile}
                onClear={() => setAudio(null)}
              />
              <UploadZone
                accept={DOC_ACCEPT}
                multiple
                title="Slide atau PDF"
                description="PDF dengan teks atau PPTX. Maksimal 5 dokumen."
                icon={<FileText size={24} />}
                fileLabel={
                  documents.length > 0
                    ? `${documents.length} dokumen dipilih`
                    : undefined
                }
                onFiles={setDocumentFiles}
                onClear={() => setDocuments([])}
              />
            </div>

            <LectureRecorder
              disabled={submitting}
              onRecorded={(file) => setAudioFile([file])}
            />

            {documents.length > 0 && (
              <ul className="file-list">
                {documents.map((document, index) => (
                  <li key={`${document.name}-${document.size}`}>
                    <FileText size={16} />
                    <span>
                      <strong>{document.name}</strong>
                      <small>{formatBytes(document.size)}</small>
                    </span>
                    <button
                      type="button"
                      className="file-remove"
                      onClick={() => removeDocument(index)}
                      aria-label={`Hapus ${document.name}`}
                    >
                      <X size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="notice notice-soft">
              <Info size={17} />
              <span>
                File mentah dihapus setelah proses sukses/dibatalkan. Untuk PDF
                hasil scan, tempel teks atau gunakan dokumen digital agar bisa
                dibaca.
              </span>
            </div>
          </Card>

          <Card className="form-section">
            <div className="section-head">
              <div>
                <p className="eyebrow">03 · Sudut pandang</p>
                <h2>Pilih rasa ceritanya</h2>
              </div>
            </div>
            <div className="mode-grid" role="radiogroup" aria-label="Gaya narasi">
              {STYLE_ORDER.map((style) => {
                const meta = STYLE_META[style];
                const active = styleMode === style;
                return (
                  <button
                    key={style}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    className={cn("mode-card", active && "is-selected")}
                    style={modeStyle(meta.color)}
                    onClick={() => setStyleMode(style)}
                  >
                    <span className="mode-icon">{STYLE_ICONS[style]}</span>
                    <strong>{meta.label}</strong>
                    <p>{meta.description}</p>
                    <span className="mode-check">{active ? "Dipilih" : "Pilih"}</span>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card className="form-section">
            <div className="section-head">
              <div>
                <p className="eyebrow">04 · Fokus pembicara</p>
                <h2>Filter suara utama</h2>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowCalibrator(true)}
                leftIcon={<Mic2 size={15} />}
              >
                Kalibrasi suara
              </Button>
            </div>
            <div className="form-grid">
              <Select
                label="Profil suara"
                value={profileId}
                onChange={(event) => setProfileId(event.target.value)}
                hint="Opsional. Tanpa profil, seluruh audio diproses apa adanya."
              >
                <option value="">Tanpa filter pembicara</option>
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.label} · skor {Math.round(profile.score)}
                  </option>
                ))}
              </Select>
              <Input
                label="Glosarium / istilah penting"
                placeholder="algoritma, kompleksitas, graph"
                value={glossary}
                onChange={(event) => setGlossary(event.target.value)}
                hint="Pisahkan dengan koma. Membantu transkripsi dan konsistensi istilah."
                optional
              />
            </div>

            {selectedProfile ? (
              <div className="profile-inline">
                <Mic2 size={18} />
                <div>
                  <strong>{selectedProfile.label}</strong>
                  <span>
                    {selectedProfile.dimension}D · {selectedProfile.provider} ·
                    skor {Math.round(selectedProfile.score)}
                  </span>
                </div>
                <span className="badge badge-neutral">Lokal</span>
              </div>
            ) : profiles.length === 0 ? (
              <div className="notice notice-soft">
                <Sparkles size={17} />
                <span>
                  Belum ada profil suara. Kalibrasi 8–15 detik untuk membuat
                  profil pertama, atau lanjut tanpa filter.
                </span>
              </div>
            ) : null}
          </Card>
        </div>

        <aside className="studio-aside">
          <Card className="studio-summary">
            <p className="eyebrow">Ringkasan</p>
            <h2>{title.trim() || "Sesi baru"}</h2>
            <span
              className="summary-style"
              style={modeStyle(selectedMeta.color)}
            >
              <span className="style-dot" /> {selectedMeta.label}
            </span>

            <div className="summary-rows">
              <div>
                <span>Audio</span>
                <strong>{audio ? formatBytes(audio.size) : "—"}</strong>
              </div>
              <div>
                <span>Dokumen</span>
                <strong>{documents.length} file</strong>
              </div>
              <div>
                <span>Profil suara</span>
                <strong>{selectedProfile ? selectedProfile.label : "Tanpa filter"}</strong>
              </div>
              <div>
                <span>Output</span>
                <strong>Cerita + kuis</strong>
              </div>
            </div>

            {error && (
              <div className="form-error-box" role="alert">
                <Info size={16} />
                <span>{error}</span>
              </div>
            )}

            <Button
              size="lg"
              fullWidth
              loading={submitting}
              onClick={() => void submit()}
              rightIcon={<ArrowRight size={17} />}
            >
              Buat sesi belajar
            </Button>
            <p className="summary-note">
              Proses berjalan di latar belakang. Kamu akan diarahkan ke halaman
              progres dan bisa meninggalkannya kapan saja.
            </p>
          </Card>

          <Card className="studio-demo">
            <div className="demo-badge">
              <Sparkles size={14} /> Mode demo
            </div>
            <h3>Belum pasang API key?</h3>
            <p>
              Default backend memakai mock AI dan mock STT. Hasilnya deterministik
              untuk demo, bukan materi akademik sungguhan. Ganti provider di
              environment untuk kualitas produksi.
            </p>
            <Link to="/settings" className="text-link">
              Lihat pengaturan <ArrowRight size={14} />
            </Link>
          </Card>

          <Card className="studio-checklist">
            <h3>Sebelum mulai</h3>
            <ul>
              <li className={title.trim() ? "is-done" : ""}>Judul sesi</li>
              <li className={audio || documents.length ? "is-done" : ""}>
                Audio atau dokumen
              </li>
              <li className={styleMode ? "is-done" : ""}>Gaya narasi</li>
              <li className={user?.consent_accepted_at ? "is-done" : ""}>
                Persetujuan rekaman
              </li>
            </ul>
            {!user?.consent_accepted_at && (
              <button
                type="button"
                className="text-link"
                onClick={() => setShowConsent(true)}
              >
                <Plus size={14} /> Beri persetujuan
              </button>
            )}
          </Card>
        </aside>
      </div>

      <ConsentModal
        open={showConsent}
        onClose={() => setShowConsent(false)}
        onAccepted={() => setError(null)}
      />
      <VoiceCalibrator
        open={showCalibrator}
        onClose={() => setShowCalibrator(false)}
        onSaved={(profile) => {
          if (profile.id !== undefined) setProfileId(String(profile.id));
        }}
      />
    </div>
  );
}
