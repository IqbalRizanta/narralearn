import {
  AlertCircle,
  Ban,
  Clock3,
  RefreshCcw,
  Sparkles,
  Timer,
} from "lucide-react";

import type { Job } from "../lib/types";
import {
  cn,
  formatDateTime,
  jobStageLabel,
} from "../lib/utils";
import { Button } from "./Button";
import { ProgressRing } from "./ProgressRing";
import { JobStatusBadge } from "./StatusBadge";

const FRIENDLY_ERRORS: Record<string, string> = {
  SCANNED_PDF:
    "PDF ini tampak hasil scan dan belum punya teks yang bisa dibaca. Unggah PDF dengan teks atau foto halaman yang lebih jelas.",
  ENCRYPTED_PDF:
    "PDF terkunci dengan password. Buka proteksinya lalu unggah ulang.",
  UNSUPPORTED_DOCUMENT:
    "Format dokumen belum didukung. Gunakan PDF atau PPTX.",
  DOCUMENT_TOO_LONG:
    "Dokumen terlalu panjang untuk diproses. Pecah menjadi beberapa bagian.",
  AUDIO_TOO_LONG:
    "Audio melewati batas durasi. Potong menjadi bagian yang lebih pendek.",
  NO_CONTENT:
    "Tidak ada teks yang bisa diproses. Pastikan audio terdengar jelas atau dokumen punya teks.",
  QUEUE_UNAVAILABLE:
    "Antrean server sedang tidak tersedia. Coba lagi beberapa saat.",
  PROCESSING_FAILED:
    "Pemrosesan berhenti di tengah jalan. Kamu bisa mencoba lagi.",
  GEMINI_KEY_MISSING:
    "Kunci model AI belum dikonfigurasi di server. Hubungi admin atau gunakan mode demo.",
  GEMINI_RATE_LIMITED:
    "Model AI sedang sibuk. Coba lagi dalam beberapa menit.",
  GEMINI_OUTPUT_INVALID:
    "Hasil AI tidak lolos validasi. Coba proses ulang.",
  GEMINI_ERROR:
    "Model AI mengalami gangguan. Coba lagi beberapa saat.",
  STT_UNAVAILABLE:
    "Layanan transkripsi belum tersedia di server. Coba lagi nanti.",
  STT_FAILED:
    "Audio tidak bisa ditranskrip. Pastikan format dan suaranya jelas.",
  EMPTY_AUDIO:
    "Audio tidak berisi suara yang cukup. Rekam ulang dengan suara lebih jelas.",
};

export function JobProgress({
  job,
  onCancel,
  onRetry,
  canceling = false,
  retrying = false,
}: {
  job: Job | null;
  onCancel?: () => void;
  onRetry?: () => void;
  canceling?: boolean;
  retrying?: boolean;
}) {
  if (!job) {
    return (
      <div className="job-card job-card-waiting">
        <div className="job-icon">
          <Clock3 size={22} />
        </div>
        <div>
          <h3>Menunggu antrean</h3>
          <p>Studio akan mulai memproses materi sebentar lagi.</p>
        </div>
      </div>
    );
  }

  const running = job.status === "QUEUED" || job.status === "RUNNING";
  const failed = job.status === "FAILED";
  const succeeded = job.status === "SUCCEEDED";
  const progress = succeeded ? 100 : job.progress;
  const errorText =
    (job.error_code && FRIENDLY_ERRORS[job.error_code]) ||
    job.error_message ||
    "Terjadi kesalahan saat memproses sesi.";

  return (
    <div
      className={cn(
        "job-card",
        running && "job-card-running",
        failed && "job-card-failed",
        succeeded && "job-card-success",
      )}
    >
      <div className="job-ring-wrap">
        <ProgressRing
          value={progress}
          size={116}
          stroke={8}
          color={
            failed
              ? "var(--danger)"
              : succeeded
                ? "var(--success)"
                : "var(--accent)"
          }
          showValue={!failed}
          label={failed ? "gagal" : undefined}
        />
      </div>

      <div className="job-copy">
        <div className="job-title-row">
          <div>
            <p className="eyebrow">Status pemrosesan</p>
            <h3>
              {succeeded
                ? "Modul belajar siap"
                : failed
                  ? "Pemrosesan berhenti"
                  : jobStageLabel(job.stage)}
            </h3>
          </div>
          <JobStatusBadge status={job.status} />
        </div>

        {running && (
          <>
            <div className="progress-track progress-track-lg">
              <span className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <p className="job-hint">
              {job.stage === "TRANSCRIBING"
                ? "Transkripsi berjalan. Kamu boleh menutup halaman ini; proses tetap lanjut di server."
                : "Kamu boleh menutup halaman ini. Progres akan tersimpan dan bisa dicek lagi nanti."}
            </p>
          </>
        )}

        {succeeded && (
          <p className="job-hint">
            Cerita, metode belajar, glosarium, dan kuis sudah dibuat. Pilih gaya
            lain kapan saja di halaman baca.
          </p>
        )}

        {failed && (
          <div className="job-error">
            <AlertCircle size={17} />
            <div>
              <strong>{job.error_code ?? "PROCESSING_FAILED"}</strong>
              <p>{errorText}</p>
            </div>
          </div>
        )}

        <div className="job-meta">
          <span>
            <Timer size={14} /> Percobaan {job.attempts}
          </span>
          <span>
            <Clock3 size={14} /> {formatDateTime(job.created_at)}
          </span>
          {succeeded && (
            <span>
              <Sparkles size={14} /> 1 modul baru
            </span>
          )}
        </div>

        <div className="job-actions">
          {running && onCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              loading={canceling}
              leftIcon={<Ban size={15} />}
            >
              Batalkan
            </Button>
          )}
          {failed && onRetry && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onRetry}
              loading={retrying}
              leftIcon={<RefreshCcw size={15} />}
            >
              Coba proses ulang
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
