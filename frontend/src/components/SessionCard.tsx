import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  FileAudio2,
  FileText,
  Layers3,
  Sparkles,
} from "lucide-react";

import { isProcessingStatus } from "../lib/api";
import type { SessionListItem } from "../lib/types";
import {
  cn,
  formatDuration,
  formatRelative,
  pluralize,
  SESSION_STATUS_META,
} from "../lib/utils";
import { Badge } from "./Card";
import { SessionStatusBadge } from "./StatusBadge";

function SourceIcon({ type }: { type: SessionListItem["source_type"] }) {
  if (type === "AUDIO") return <FileAudio2 size={16} />;
  if (type === "DOCUMENT") return <FileText size={16} />;
  return <Layers3 size={16} />;
}

export function SessionCard({ session }: { session: SessionListItem }) {
  const processing = isProcessingStatus(session.status);
  const progress = session.latest_job?.progress ?? 0;
  const meta = SESSION_STATUS_META[session.status];

  return (
    <Link
      to={`/sessions/${session.id}`}
      className={cn(
        "session-card",
        processing && "is-processing",
        session.status === "FAILED" && "is-failed",
      )}
    >
      <div className="session-card-top">
        <span className="source-chip">
          <SourceIcon type={session.source_type} />
          {session.source_type === "HYBRID"
            ? "Audio + dokumen"
            : session.source_type === "AUDIO"
              ? "Audio"
              : "Dokumen"}
        </span>
        <SessionStatusBadge status={session.status} />
      </div>

      <div className="session-card-body">
        <h3>{session.title}</h3>
        <p className="session-card-sub">
          {session.speaker_label ? `${session.speaker_label} · ` : ""}
          {formatRelative(session.created_at)}
        </p>
      </div>

      {processing && (
        <div className="mini-progress">
          <div className="mini-progress-labels">
            <span>{meta.label}</span>
            <span>{progress}%</span>
          </div>
          <div className="progress-track">
            <span className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {session.status === "FAILED" && session.error_code && (
        <p className="session-card-error">Kode: {session.error_code}</p>
      )}

      <div className="session-card-foot">
        <span>
          <Sparkles size={14} /> {pluralize(session.module_count, "gaya", "gaya")}
        </span>
        <span>
          <FileAudio2 size={14} /> {formatDuration(session.audio_duration_seconds)}
        </span>
        <span className="session-open">
          Buka <ArrowUpRight size={14} />
        </span>
      </div>

      {session.module_count > 0 && (
        <span className="session-ribbon">
          <Badge tone="neutral">{session.module_count} modul</Badge>
        </span>
      )}
    </Link>
  );
}
