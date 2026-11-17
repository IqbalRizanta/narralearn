import type {
  ApiProblem,
  Job,
  Module,
  ModuleSummary,
  ModuleSwitchResponse,
  SessionCreateResponse,
  SessionListResponse,
  SessionStatus,
  StudySession,
  StyleMode,
  TokenResponse,
  User,
  VoiceAnalysis,
  VoiceTicket,
} from "./types";

const API_BASE = (import.meta.env.VITE_API_BASE || "/api/v1").replace(/\/+$/, "");

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly detail: string;
  readonly requestId?: string;
  readonly problem?: ApiProblem;

  constructor(
    status: number,
    code: string,
    detail: string,
    requestId?: string,
    problem?: ApiProblem,
  ) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.detail = detail;
    this.requestId = requestId;
    this.problem = problem;
  }
}

function notifyUnauthorized(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("narralearn:unauthorized"));
  }
}

export async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    let response: Response;
    try {
      response = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
    } catch {
      return null;
    }

    if (!response.ok) {
      accessToken = null;
      if (response.status === 401) notifyUnauthorized();
      return null;
    }

    try {
      const data = (await response.json()) as TokenResponse;
      accessToken = data.access_token;
      return data.access_token;
    } catch {
      accessToken = null;
      return null;
    }
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: BodyInit | null;
  json?: unknown;
  skipAuthRefresh?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { json, skipAuthRefresh, headers: extraHeaders, ...init } = options;
  const headers = new Headers(extraHeaders);
  headers.set("Accept", "application/json");

  let body = init.body ?? null;
  if (json !== undefined) {
    body = JSON.stringify(json);
    headers.set("Content-Type", "application/json");
  }
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      body,
      headers,
      credentials: "include",
    });
  } catch {
    throw new ApiError(
      0,
      "NETWORK_ERROR",
      "Tidak dapat terhubung ke server. Periksa koneksi internetmu.",
    );
  }

  if (response.status === 401 && !skipAuthRefresh) {
    const token = await refreshAccessToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
      try {
        response = await fetch(`${API_BASE}${path}`, {
          ...init,
          body,
          headers,
          credentials: "include",
        });
      } catch {
        throw new ApiError(
          0,
          "NETWORK_ERROR",
          "Tidak dapat terhubung ke server. Periksa koneksi internetmu.",
        );
      }
    }
  }

  if (response.status === 401) {
    notifyUnauthorized();
  }

  if (!response.ok) {
    let problem: ApiProblem | undefined;
    try {
      const contentType = response.headers.get("content-type") ?? "";
      if (contentType.includes("json")) {
        problem = (await response.json()) as ApiProblem;
      }
    } catch {
      problem = undefined;
    }
    const detail =
      problem?.detail ||
      problem?.title ||
      (response.status === 401
        ? "Sesi sudah berakhir. Silakan login kembali."
        : response.status === 403
          ? "Kamu tidak punya akses ke aksi ini."
          : "Terjadi kesalahan. Coba lagi.");
    throw new ApiError(
      response.status,
      problem?.code || `HTTP_${response.status}`,
      detail,
      problem?.request_id,
      problem,
    );
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  register(payload: {
    full_name: string;
    email: string;
    password: string;
    consent_accepted: boolean;
    consent_version?: string;
  }): Promise<TokenResponse> {
    return request("/auth/register", {
      method: "POST",
      json: payload,
      skipAuthRefresh: true,
    });
  },

  login(payload: { email: string; password: string }): Promise<TokenResponse> {
    return request("/auth/login", {
      method: "POST",
      json: payload,
      skipAuthRefresh: true,
    });
  },

  logout(): Promise<void> {
    return request("/auth/logout", {
      method: "POST",
      skipAuthRefresh: true,
    });
  },

  me(): Promise<User> {
    return request("/auth/me");
  },

  acceptConsent(version = "1.0"): Promise<User> {
    return request("/auth/consent", {
      method: "POST",
      json: { version },
    });
  },

  deleteAccount(password: string): Promise<{ message: string }> {
    return request("/auth/me", {
      method: "DELETE",
      json: { password },
      skipAuthRefresh: true,
    });
  },

  createSession(formData: FormData): Promise<SessionCreateResponse> {
    return request("/sessions", {
      method: "POST",
      body: formData,
      headers: { "Idempotency-Key": crypto.randomUUID() },
    });
  },

  listSessions(cursor?: string, limit = 20): Promise<SessionListResponse> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set("cursor", cursor);
    return request(`/sessions?${params.toString()}`);
  },

  getSession(sessionId: string): Promise<StudySession> {
    return request(`/sessions/${sessionId}`);
  },

  updateSession(
    sessionId: string,
    payload: string | { title?: string; raw_transcript?: string },
  ): Promise<StudySession> {
    const json = typeof payload === "string" ? { title: payload } : payload;
    return request(`/sessions/${sessionId}`, {
      method: "PATCH",
      json,
    });
  },

  deleteSession(sessionId: string): Promise<void> {
    return request(`/sessions/${sessionId}`, { method: "DELETE" });
  },

  retrySession(sessionId: string): Promise<SessionCreateResponse> {
    return request(`/sessions/${sessionId}/retry`, { method: "POST" });
  },

  cancelSession(sessionId: string): Promise<{ message: string }> {
    return request(`/sessions/${sessionId}/cancel`, { method: "POST" });
  },

  getJob(jobId: string): Promise<Job> {
    return request(`/jobs/${jobId}`);
  },

  listModules(sessionId: string): Promise<ModuleSummary[]> {
    return request(`/sessions/${sessionId}/modules`);
  },

  getModule(sessionId: string, style: StyleMode): Promise<Module> {
    return request(`/sessions/${sessionId}/modules/${style}`);
  },

  switchStyle(
    sessionId: string,
    style: StyleMode,
    regenerate = false,
  ): Promise<ModuleSwitchResponse> {
    return request(`/sessions/${sessionId}/modules`, {
      method: "POST",
      json: { style_mode: style, regenerate },
    });
  },

  saveProgress(
    moduleId: string,
    payload: { quiz_score?: number; answers?: Record<string, number> },
  ): Promise<{ message: string }> {
    return request(`/modules/${moduleId}/progress`, {
      method: "PUT",
      json: { ...payload, last_read_at: new Date().toISOString() },
    });
  },

  voiceTicket(): Promise<VoiceTicket> {
    return request("/voice/ws-ticket", { method: "POST" });
  },

  analyzeVoice(file: File): Promise<VoiceAnalysis> {
    const formData = new FormData();
    formData.append("file", file);
    return request("/voice/analyze", { method: "POST", body: formData });
  },
};

export function voiceWebSocketUrl(ticket: string): string {
  const apiUrl = new URL(API_BASE, window.location.origin);
  const protocol = apiUrl.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${apiUrl.host}/ws/voice-calibration?ticket=${encodeURIComponent(ticket)}`;
}

export function isProcessingStatus(status: SessionStatus): boolean {
  return status === "QUEUED" || status === "PROCESSING";
}
