import clsx, { type ClassValue } from "clsx";
import type { CSSProperties } from "react";

import { ApiError } from "./api";
import type { JobStatus, SessionStatus, StyleMode } from "./types";

export function cn(...values: ClassValue[]): string {
  return clsx(values);
}

/** Type-safe bridge for the `--mode-color` CSS custom property. */
export function modeStyle(color: string): CSSProperties {
  return { "--mode-color": color } as CSSProperties;
}

export const STYLE_META: Record<
  StyleMode,
  {
    label: string;
    short: string;
    description: string;
    color: string;
  }
> = {
  GAMING: {
    label: "Gaming",
    short: "Quest",
    description:
      "Materi jadi misi, level, dan boss fight. Cocok saat butuh energi dan momentum.",
    color: "#d8f36a",
  },
  SOSMED: {
    label: "Sosmed",
    short: "Feed",
    description:
      "Ringkas, cepat, dan scrollable. Poin penting disusun seperti thread yang enak dibaca.",
    color: "#7ee7c4",
  },
  NOVEL: {
    label: "Novel",
    short: "Cerita",
    description:
      "Konsep dibungkus narasi dan metafora. Pas untuk materi abstrak yang butuh imajinasi.",
    color: "#ffb86b",
  },
  CASUAL_STORY: {
    label: "Cerita santai",
    short: "Santai",
    description:
      "Bahasa percakapan yang hangat, seperti teman yang menjelaskan ulang dengan sabar.",
    color: "#a8c7ff",
  },
};

export const STYLE_ORDER: StyleMode[] = [
  "GAMING",
  "SOSMED",
  "NOVEL",
  "CASUAL_STORY",
];

export function isStyleMode(value: string | undefined): value is StyleMode {
  return (
    value === "GAMING" ||
    value === "SOSMED" ||
    value === "NOVEL" ||
    value === "CASUAL_STORY"
  );
}

export function styleLabel(style: StyleMode): string {
  return STYLE_META[style].label;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return "—";
  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  const remaining = total % 60;
  if (minutes === 0) return `${remaining} dtk`;
  return `${minutes} mnt ${remaining.toString().padStart(2, "0")} dtk`;
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export function formatRelative(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} hari lalu`;
  return formatDate(value);
}

export interface StatusMeta {
  label: string;
  tone: "neutral" | "info" | "success" | "warning" | "danger";
}

export const SESSION_STATUS_META: Record<SessionStatus, StatusMeta> = {
  QUEUED: { label: "Menunggu antrean", tone: "info" },
  PROCESSING: { label: "Sedang diproses", tone: "warning" },
  READY: { label: "Siap belajar", tone: "success" },
  FAILED: { label: "Gagal", tone: "danger" },
  CANCELED: { label: "Dibatalkan", tone: "neutral" },
};

export const JOB_STATUS_META: Record<JobStatus, StatusMeta> = {
  QUEUED: { label: "Menunggu", tone: "info" },
  RUNNING: { label: "Berjalan", tone: "warning" },
  SUCCEEDED: { label: "Selesai", tone: "success" },
  FAILED: { label: "Gagal", tone: "danger" },
  CANCELED: { label: "Dibatalkan", tone: "neutral" },
};

export const JOB_STAGE_LABELS: Record<string, string> = {
  QUEUED: "Menunggu antrean",
  VALIDATING: "Memeriksa materi",
  EXTRACTING_DOCUMENTS: "Membaca dokumen",
  ANALYZING_AUDIO: "Menganalisis audio",
  TRANSCRIBING: "Mentranskrip rekaman",
  LOADING_CONTEXT: "Memuat materi",
  GENERATING_MODULE: "Menyusun cerita & kuis",
  SAVING_MODULE: "Menyimpan hasil",
  DONE: "Selesai",
  CANCELED: "Dibatalkan",
};

export function jobStageLabel(stage: string | null | undefined): string {
  if (!stage) return "Menunggu antrean";
  return JOB_STAGE_LABELS[stage] ?? stage;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "NETWORK_ERROR") return error.detail;
    return error.detail || "Terjadi kesalahan. Coba lagi.";
  }
  if (error instanceof Error) return error.message;
  return "Terjadi kesalahan. Coba lagi.";
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function downloadText(filename: string, content: string): void {
  const blob = new Blob([content], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function pluralize(
  count: number,
  singular: string,
  plural: string,
): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
