import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Clock3,
  FileAudio2,
  FileText,
  Info,
  Layers3,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
  WandSparkles,
} from "lucide-react";

import { api } from "../lib/api";
import {
  errorMessage,
  formatBytes,
  formatDateTime,
  formatDuration,
  modeStyle,
  STYLE_META,
} from "../lib/utils";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { JobProgress } from "../components/JobProgress";
import { Modal } from "../components/Modal";
import { PageHeader } from "../components/PageHeader";
import { ErrorState } from "../components/States";
import { SessionStatusBadge } from "../components/StatusBadge";
import { StyleBadge } from "../components/StyleSwitcher";

export function SessionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [editingTranscript, setEditingTranscript] = useState(false);
  const [transcriptDraft, setTranscriptDraft] = useState("");
  const [transcriptNotice, setTranscriptNotice] = useState<string | null>(null);

  const sessionQuery = useQuery({
    queryKey: ["session", id],
    queryFn: () => api.getSession(id as string),
    enabled: Boolean(id),
    refetchInterval: (query) => {
      const data = query.state.data;
      return data && (data.status === "QUEUED" || data.status === "PROCESSING")
        ? 2500
        : false;
    },
  });

  const retryMutation = useMutation({
    mutationFn: () => api.retrySession(id as string),
    onSuccess: async () => {
      setActionError(null);
      await queryClient.invalidateQueries({ queryKey: ["session", id] });
      await queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
    onError: (error) => setActionError(errorMessage(error)),
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.cancelSession(id as string),
    onSuccess: async () => {
      setActionError(null);
      await queryClient.invalidateQueries({ queryKey: ["session", id] });
      await queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
    onError: (error) => setActionError(errorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteSession(id as string),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["sessions"] });
      navigate("/", { replace: true });
    },
    onError: (error) => setActionError(errorMessage(error)),
  });

  const transcriptMutation = useMutation({
    mutationFn: async ({
      rawTranscript,
      regenerateStyle,
    }: {
      rawTranscript: string;
      regenerateStyle?: (typeof modules)[number]["style_mode"];
    }) => {
      const updated = await api.updateSession(id as string, {
        raw_transcript: rawTranscript,
      });
      if (regenerateStyle) {
        await api.switchStyle(id as string, regenerateStyle, true);
      }
      return { updated, regenerated: Boolean(regenerateStyle) };
    },
    onSuccess: async ({ regenerated }) => {
      setActionError(null);
      setEditingTranscript(false);
      setTranscriptNotice(
        regenerated
          ? "Transkrip disimpan dan modul sedang dibuat ulang."
          : "Transkrip berhasil diperbarui.",
      );
      await queryClient.invalidateQueries({ queryKey: ["session", id] });
      await queryClient.invalidateQueries({ queryKey: ["module", id] });
    },
    onError: (error) => setActionError(errorMessage(error)),
  });

  if (sessionQuery.isLoading) {
    return (
      <div className="page">
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-hero" />
        <div className="skeleton skeleton-list" />
      </div>
    );
  }

  if (sessionQuery.isError || !sessionQuery.data) {
    return (
      <div className="page">
        <ErrorState
          title="Sesi tidak ditemukan"
          message={errorMessage(sessionQuery.error)}
          onRetry={() => void sessionQuery.refetch()}
        />
        <Link to="/" className="text-link">
          <ArrowLeft size={14} /> Kembali ke beranda
        </Link>
      </div>
    );
  }

  const session = sessionQuery.data;
  const modules = session.modules;
  const sourceLabel =
    session.source_type === "HYBRID"
      ? "Audio + dokumen"
      : session.source_type === "AUDIO"
        ? "Rekaman audio"
        : "Dokumen";
  const canRetry =
    session.status === "FAILED" || session.status === "CANCELED";
  const firstModule = modules[0];

  return (
    <div className="page session-page">
      <PageHeader
        eyebrow="Sesi belajar"
        title={session.title}
        description={
          session.speaker_label
            ? `Pembicara: ${session.speaker_label}`
            : "Materi multimoda"
        }
        actions={
          <>
            {firstModule && (
              <Link
                to={`/sessions/${session.id}/read/${firstModule.style_mode}`}
                className="btn btn-primary"
              >
                <BookOpen size={17} /> Baca modul
              </Link>
            )}
            <Button
              variant="ghost"
              size="md"
              onClick={() => setShowDelete(true)}
              leftIcon={<Trash2 size={16} />}
            >
              Hapus
            </Button>
          </>
        }
      />

      <div className="session-hero-strip">
        <div className="session-strip-item">
          <SessionStatusBadge status={session.status} />
        </div>
        <div className="session-strip-item">
          <Layers3 size={16} /> {sourceLabel}
        </div>
        <div className="session-strip-item">
          <Clock3 size={16} /> {formatDuration(session.audio_duration_seconds)}
        </div>
        <div className="session-strip-item">
          <CalendarDays size={16} /> {formatDateTime(session.created_at)}
        </div>
        <div className="session-strip-item session-strip-language">
          {session.language.toUpperCase()}
        </div>
      </div>

      {actionError && (
        <div className="notice notice-warning" role="alert">
          <Info size={18} />
          <div>
            <strong>Aksi belum berhasil</strong>
            <p>{actionError}</p>
          </div>
        </div>
      )}

      <JobProgress
        job={session.latest_job}
        onCancel={() => cancelMutation.mutate()}
        onRetry={() => retryMutation.mutate()}
        canceling={cancelMutation.isPending}
        retrying={retryMutation.isPending}
      />

      {canRetry && (
        <div className="notice notice-warning">
          <Info size={18} />
          <div>
            <strong>Butuh unggah ulang?</strong>
            <p>
              File sementara disimpan sebentar untuk retry. Kalau sudah
              dibersihkan, buat sesi baru dengan materi yang sama.
            </p>
          </div>
          <Link to="/sessions/new" className="btn btn-secondary btn-sm">
            <Plus size={15} /> Sesi baru
          </Link>
        </div>
      )}

      <div className="session-detail-grid">
        <div className="session-detail-main">
          <Card className="session-modules-card">
            <div className="section-head">
              <div>
                <p className="eyebrow">Hasil studio</p>
                <h2>Modul belajar</h2>
              </div>
              {modules.length > 0 && (
                <span className="soft-label">{modules.length} gaya tersedia</span>
              )}
            </div>

            {modules.length === 0 ? (
              <div className="module-empty">
                <WandSparkles size={24} />
                <h3>
                  {session.status === "READY"
                    ? "Modul belum tersedia"
                    : "Modul sedang disiapkan"}
                </h3>
                <p>
                  {session.status === "READY"
                    ? "Coba buka ulang beberapa saat atau buat gaya baru dari reader."
                    : "Setelah proses selesai, modul pertama akan muncul di sini."}
                </p>
              </div>
            ) : (
              <div className="module-grid">
                {modules.map((module) => (
                  <Link
                    key={module.id}
                    to={`/sessions/${session.id}/read/${module.style_mode}`}
                    className="module-card"
                    style={modeStyle(STYLE_META[module.style_mode].color)}
                  >
                    <div className="module-card-top">
                      <StyleBadge style={module.style_mode} />
                      <span className="module-schema">v{module.schema_version}</span>
                    </div>
                    <h3>{STYLE_META[module.style_mode].label}</h3>
                    <p>
                      {module.recommended_method
                        ? `Metode: ${module.recommended_method}`
                        : "Modul siap dibaca."}
                    </p>
                    <span className="module-card-open">
                      Buka modul <ArrowRight size={14} />
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          {session.raw_transcript && (
            <Card className="session-transcript">
              <div className="section-head">
                <div>
                  <p className="eyebrow">Teks sumber</p>
                  <h2>Transkrip audio</h2>
                </div>
                {!editingTranscript && session.status === "READY" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setTranscriptDraft(session.raw_transcript ?? "");
                      setTranscriptNotice(null);
                      setEditingTranscript(true);
                    }}
                    leftIcon={<Pencil size={14} />}
                  >
                    Edit transkrip
                  </Button>
                )}
              </div>

              {transcriptNotice && (
                <div className="notice notice-soft">
                  <Info size={16} />
                  <span>{transcriptNotice}</span>
                </div>
              )}

              {editingTranscript ? (
                <div className="session-transcript-editor">
                  <textarea
                    className="input textarea"
                    rows={8}
                    value={transcriptDraft}
                    onChange={(event) => setTranscriptDraft(event.target.value)}
                    aria-label="Edit transkrip audio"
                  />
                  <div className="session-transcript-actions">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={transcriptMutation.isPending}
                      onClick={() => setEditingTranscript(false)}
                    >
                      Batal
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={transcriptMutation.isPending}
                      onClick={() =>
                        transcriptMutation.mutate({ rawTranscript: transcriptDraft })
                      }
                      leftIcon={<Save size={14} />}
                    >
                      Simpan
                    </Button>
                    {firstModule && (
                      <Button
                        size="sm"
                        variant="primary"
                        loading={transcriptMutation.isPending}
                        onClick={() =>
                          transcriptMutation.mutate({
                            rawTranscript: transcriptDraft,
                            regenerateStyle: firstModule.style_mode,
                          })
                        }
                        leftIcon={<RotateCcw size={14} />}
                      >
                        Simpan &amp; generate ulang
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <details>
                  <summary>
                    <span>
                      <FileAudio2 size={17} /> Lihat isi transkrip
                    </span>
                    <span className="soft-label">Buka</span>
                  </summary>
                  <p>{session.raw_transcript}</p>
                </details>
              )}
            </Card>
          )}
        </div>

        <aside className="session-detail-aside">
          <Card className="session-docs">
            <div className="section-head">
              <div>
                <p className="eyebrow">Sumber</p>
                <h2>Dokumen</h2>
              </div>
              <span className="soft-label">{session.documents.length} file</span>
            </div>
            {session.documents.length === 0 ? (
              <p className="muted">Tidak ada dokumen. Sesi ini berbasis audio.</p>
            ) : (
              <ul className="doc-list">
                {session.documents.map((document) => (
                  <li key={document.id}>
                    <FileText size={17} />
                    <span>
                      <strong>{document.file_name}</strong>
                      <small>
                        {document.page_count
                          ? `${document.page_count} halaman · `
                          : ""}
                        {formatBytes(document.file_size_bytes)}
                      </small>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="session-meta-card">
            <p className="eyebrow">Detail</p>
            <dl className="meta-list">
              <div>
                <dt>Dibuat</dt>
                <dd>{formatDateTime(session.created_at)}</dd>
              </div>
              <div>
                <dt>Diperbarui</dt>
                <dd>{formatDateTime(session.updated_at)}</dd>
              </div>
              <div>
                <dt>Bahasa</dt>
                <dd>{session.language.toUpperCase()}</dd>
              </div>
              <div>
                <dt>Durasi audio</dt>
                <dd>{formatDuration(session.audio_duration_seconds)}</dd>
              </div>
              <div>
                <dt>Job terakhir</dt>
                <dd>{session.latest_job?.status ?? "—"}</dd>
              </div>
            </dl>
          </Card>

          <Card className="session-tip-card">
            <Sparkles size={20} />
            <h3>Baca dengan aktif</h3>
            <p>
              Setelah satu bagian, tutup modul dan jelaskan ulang dengan
              bahasamu. Baru jawab kuis. Ini lebih efektif daripada membaca
              ulang terus-menerus.
            </p>
          </Card>
        </aside>
      </div>

      <Modal
        open={showDelete}
        onClose={() => setShowDelete(false)}
        title="Hapus sesi ini?"
        description="Seluruh dokumen, transkrip, modul, dan progres kuis akan dihapus permanen."
        size="sm"
        footer={
          <div className="modal-actions">
            <Button variant="ghost" onClick={() => setShowDelete(false)}>
              Batal
            </Button>
            <Button
              variant="danger"
              loading={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
              leftIcon={<Trash2 size={16} />}
            >
              Hapus permanen
            </Button>
          </div>
        }
      >
        <div className="notice notice-warning">
          <Info size={18} />
          <span>
            Tindakan ini tidak bisa dibatalkan. File offline di browser juga
            perlu dihapus terpisah dari halaman pengaturan.
          </span>
        </div>
      </Modal>
    </div>
  );
}
