import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Mic2,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Square,
} from "lucide-react";

import { api, voiceWebSocketUrl } from "../lib/api";
import { saveProfile } from "../lib/db";
import type { SpeakerProfile, VoiceAnalysis } from "../lib/types";
import {
  cn,
  errorMessage,
  formatDuration,
  STYLE_META,
} from "../lib/utils";
import { Button, Spinner } from "./Button";
import { Input } from "./Input";
import { Modal } from "./Modal";
import { ProgressRing } from "./ProgressRing";

type Phase = "idle" | "connecting" | "recording" | "processing" | "done" | "error";

const MAX_SECONDS = 15;
const WAVE_BARS = [12, 22, 38, 18, 52, 30, 64, 44, 26, 58, 34, 48, 20, 40, 28, 54, 24, 36];

interface VoiceCalibratorProps {
  open: boolean;
  onClose: () => void;
  onSaved?: (profile: SpeakerProfile) => void;
}

export function VoiceCalibrator({ open, onClose, onSaved }: VoiceCalibratorProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [analysis, setAnalysis] = useState<VoiceAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [remaining, setRemaining] = useState(MAX_SECONDS);
  const [saving, setSaving] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);
  const silentGainRef = useRef<GainNode | null>(null);
  const countdownRef = useRef<number | null>(null);
  const autoStopRef = useRef<number | null>(null);
  const finalizeTimeoutRef = useRef<number | null>(null);
  const finalizeRef = useRef<() => void>(() => undefined);
  const phaseRef = useRef<Phase>("idle");
  const completedRef = useRef(false);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const clearTimers = useCallback(() => {
    if (countdownRef.current !== null) {
      window.clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    if (autoStopRef.current !== null) {
      window.clearTimeout(autoStopRef.current);
      autoStopRef.current = null;
    }
    if (finalizeTimeoutRef.current !== null) {
      window.clearTimeout(finalizeTimeoutRef.current);
      finalizeTimeoutRef.current = null;
    }
  }, []);

  const cleanupAudio = useCallback(() => {
    try {
      workletRef.current?.disconnect();
    } catch {
      // already disconnected
    }
    try {
      sourceRef.current?.disconnect();
    } catch {
      // already disconnected
    }
    try {
      silentGainRef.current?.disconnect();
    } catch {
      // already disconnected
    }
    if (workletRef.current) workletRef.current.port.onmessage = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    const context = contextRef.current;
    if (context && context.state !== "closed") {
      void context.close().catch(() => undefined);
    }
    workletRef.current = null;
    sourceRef.current = null;
    silentGainRef.current = null;
    streamRef.current = null;
    contextRef.current = null;
  }, []);

  const closeSocket = useCallback(() => {
    const ws = wsRef.current;
    if (ws) {
      ws.onclose = null;
      ws.onerror = null;
      ws.onmessage = null;
      try {
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close(1000, "client closed");
        }
      } catch {
        // ignore
      }
    }
    wsRef.current = null;
  }, []);

  const cleanupAll = useCallback(() => {
    clearTimers();
    cleanupAudio();
    closeSocket();
  }, [clearTimers, cleanupAudio, closeSocket]);

  const fail = useCallback(
    (message: string) => {
      completedRef.current = true;
      setError(message);
      setPhase("error");
      cleanupAll();
    },
    [cleanupAll],
  );

  const finalize = useCallback(() => {
    if (phaseRef.current !== "recording") return;
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      fail("Koneksi ke server terputus. Coba rekam ulang.");
      return;
    }
    clearTimers();
    setPhase("processing");
    phaseRef.current = "processing";
    try {
      workletRef.current?.port.postMessage("flush");
    } catch {
      // worklet may already be gone
    }
    window.setTimeout(() => {
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "finalize" }));
        } else {
          fail("Koneksi ke server terputus. Coba rekam ulang.");
        }
      } catch {
        fail("Koneksi ke server terputus. Coba rekam ulang.");
      }
    }, 140);
    cleanupAudio();
    finalizeTimeoutRef.current = window.setTimeout(() => {
      fail("Analisis suara terlalu lama. Coba rekam ulang.");
    }, 12_000);
  }, [clearTimers, cleanupAudio, fail]);

  useEffect(() => {
    finalizeRef.current = finalize;
  }, [finalize]);

  const start = useCallback(async () => {
    cleanupAll();
    completedRef.current = false;
    setError(null);
    setAnalysis(null);
    setProgress(0);
    setRemaining(MAX_SECONDS);
    setPhase("connecting");
    phaseRef.current = "connecting";

    if (!window.isSecureContext) {
      fail("Kalibrasi mikrofon membutuhkan HTTPS atau localhost.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      fail("Browser ini tidak mendukung akses mikrofon.");
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch {
      fail(
        "Izin mikrofon ditolak. Aktifkan izin mikrofon di browser, lalu coba lagi.",
      );
      return;
    }
    streamRef.current = stream;

    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error("AudioContext tidak tersedia.");
      }
      const context = new AudioContextClass({ sampleRate: 16_000 });
      contextRef.current = context;
      if (!context.audioWorklet) {
        throw new Error("AudioWorklet tidak tersedia di browser ini.");
      }
      await context.audioWorklet.addModule("/pcm-processor.js");
      const source = context.createMediaStreamSource(stream);
      const worklet = new AudioWorkletNode(context, "pcm-processor");
      const silent = context.createGain();
      silent.gain.value = 0;
      source.connect(worklet);
      worklet.connect(silent);
      silent.connect(context.destination);
      sourceRef.current = source;
      workletRef.current = worklet;
      silentGainRef.current = silent;

      const ticket = await api.voiceTicket();
      const ws = new WebSocket(voiceWebSocketUrl(ticket.ticket));
      ws.binaryType = "arraybuffer";
      wsRef.current = ws;

      worklet.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(event.data);
        }
      };

      ws.onopen = () => {
        try {
          ws.send(JSON.stringify({ type: "start", sample_rate: 16_000 }));
        } catch {
          fail("Gagal memulai koneksi audio.");
          return;
        }
        setPhase("recording");
        phaseRef.current = "recording";
        setRemaining(MAX_SECONDS);
        countdownRef.current = window.setInterval(() => {
          setRemaining((current) => {
            const next = Math.max(0, current - 1);
            if (next === 0 && countdownRef.current !== null) {
              window.clearInterval(countdownRef.current);
              countdownRef.current = null;
            }
            return next;
          });
        }, 1000);
        autoStopRef.current = window.setTimeout(() => {
          finalizeRef.current();
        }, MAX_SECONDS * 1000);
      };

      ws.onmessage = (event: MessageEvent<string>) => {
        let message: Record<string, unknown>;
        try {
          message = JSON.parse(event.data) as Record<string, unknown>;
        } catch {
          return;
        }
        if (message.type === "progress") {
          const percentage = Number(message.percentage ?? 0);
          setProgress(Number.isFinite(percentage) ? percentage : 0);
        } else if (message.type === "final") {
          completedRef.current = true;
          clearTimers();
          const payload = message as unknown as VoiceAnalysis;
          setAnalysis(payload);
          setProgress(payload.score ?? 0);
          setPhase("done");
          phaseRef.current = "done";
          cleanupAudio();
          closeSocket();
        } else if (message.type === "error") {
          fail(String(message.message ?? "Kalibrasi gagal."));
        }
      };

      ws.onerror = () => {
        fail("Koneksi kalibrasi gagal. Periksa jaringan lalu coba lagi.");
      };

      ws.onclose = () => {
        if (
          !completedRef.current &&
          ["connecting", "recording", "processing"].includes(phaseRef.current)
        ) {
          fail("Koneksi kalibrasi terputus. Coba rekam ulang.");
        }
      };
    } catch (err) {
      fail(errorMessage(err));
    }
  }, [cleanupAll, cleanupAudio, clearTimers, closeSocket, fail]);

  const handleClose = useCallback(() => {
    completedRef.current = true;
    cleanupAll();
    setPhase("idle");
    phaseRef.current = "idle";
    onClose();
  }, [cleanupAll, onClose]);

  useEffect(() => {
    if (open) {
      setPhase("idle");
      phaseRef.current = "idle";
      setError(null);
      setAnalysis(null);
      setProgress(0);
      setRemaining(MAX_SECONDS);
      setLabel("");
    } else {
      completedRef.current = true;
      cleanupAll();
    }
  }, [open, cleanupAll]);

  useEffect(() => () => cleanupAll(), [cleanupAll]);

  const handleSave = async () => {
    if (!analysis) return;
    setSaving(true);
    setError(null);
    try {
      const createdAt = new Date().toISOString();
      const record = {
        label:
          label.trim() ||
          `Profil ${new Intl.DateTimeFormat("id-ID", {
            day: "numeric",
            month: "short",
          }).format(new Date())}`,
        embedding: analysis.embedding,
        dimension: analysis.dimension,
        provider: analysis.provider,
        score: analysis.score,
        createdAt,
      };
      const id = await saveProfile(record);
      onSaved?.({ ...record, id });
      handleClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const canSave = analysis !== null && (analysis.ready || analysis.score >= 60);
  const warnings = Array.from(new Set(analysis?.warnings ?? []));

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Kalibrasi suara"
      description="Rekam 8–15 detik suara jelas. Profil dipakai untuk memfilter suara pembicara utama saat memproses audio."
      size="lg"
      dismissible={phase !== "processing"}
      className="voice-modal"
    >
      {phase === "idle" && (
        <div className="voice-intro">
          <div className="voice-orb">
            <span className="voice-orb-ring" />
            <span className="voice-orb-ring voice-orb-ring-2" />
            <Mic2 size={40} />
          </div>
          <div className="voice-steps">
            <div>
              <span>01</span>
              <p>Rekam suara asli kamu, bukan audio dari speaker.</p>
            </div>
            <div>
              <span>02</span>
              <p>Bicara natural selama 8–15 detik dengan noise minimal.</p>
            </div>
            <div>
              <span>03</span>
              <p>Profil disimpan lokal di browser ini, bukan di server.</p>
            </div>
          </div>
          <div className="notice notice-soft">
            <Info size={17} />
            <span>
              Ini kualitas suara, bukan verifikasi biometrik. Dalam mode demo,
              skor dihitung dengan heuristik dan tidak memakai model ECAPA.
            </span>
          </div>
          <Button
            data-autofocus
            onClick={() => void start()}
            leftIcon={<Mic2 size={18} />}
            size="lg"
            fullWidth
          >
            Mulai kalibrasi
          </Button>
        </div>
      )}

      {phase === "connecting" && (
        <div className="voice-center">
          <Spinner size={34} />
          <h3>Menyiapkan mikrofon…</h3>
          <p>Izinkan akses mikrofon saat browser meminta.</p>
        </div>
      )}

      {phase === "recording" && (
        <div className="voice-center">
          <div className="recording-badge">
            <span className="recording-dot" /> Merekam
          </div>
          <ProgressRing
            value={progress}
            size={172}
            stroke={10}
            label="kualitas vokal"
            sublabel={`${remaining} detik tersisa`}
            color="var(--accent)"
          />
          <div className="waveform" aria-hidden="true">
            {WAVE_BARS.map((height, index) => (
              <span
                key={index}
                className="wave-bar"
                style={{
                  height: `${height}px`,
                  animationDelay: `${(index % 7) * 0.09}s`,
                  background:
                    index % 4 === 0
                      ? STYLE_META.GAMING.color
                      : "var(--text-soft)",
                }}
              />
            ))}
          </div>
          <p className="voice-instruction">
            Baca satu kalimat dengan tempo santai. Contoh: “Hari ini saya belajar
            algoritma dan struktur data bersama teman.”
          </p>
          <Button
            variant="danger"
            size="lg"
            onClick={() => finalize()}
            leftIcon={<Square size={16} />}
          >
            Stop & analisis
          </Button>
        </div>
      )}

      {phase === "processing" && (
        <div className="voice-center">
          <Spinner size={34} />
          <h3>Menyusun profil suara…</h3>
          <p>Kami memeriksa durasi bicara, noise, dan kestabilan sinyal.</p>
        </div>
      )}

      {phase === "done" && analysis && (
        <div className="voice-result">
          <div className="voice-result-top">
            <ProgressRing
              value={analysis.score}
              size={150}
              stroke={10}
              color={analysis.ready ? "var(--accent)" : "var(--warn)"}
              label="skor kualitas"
            />
            <div className="voice-result-copy">
              <span className={cn("badge", analysis.ready ? "badge-success" : "badge-warning")}>
                {analysis.ready ? (
                  <>
                    <CheckCircle2 size={14} /> Siap dipakai
                  </>
                ) : (
                  <>
                    <AlertTriangle size={14} /> Perlu diulang
                  </>
                )}
              </span>
              <h3>{analysis.status}</h3>
              <p>
                {analysis.ready
                  ? "Profil ini bisa dipakai untuk memfilter pembicara utama. Kamu tetap bisa menyimpan sebagai profil demo."
                  : "Rekam ulang di tempat tenang, lebih dekat ke mikrofon, dan bicara 8–12 detik tanpa jeda panjang."}
              </p>
              {analysis.provider === "heuristic-v1" && (
                <span className="badge badge-neutral">
                  <Sparkles size={13} /> Mode demo: heuristik
                </span>
              )}
            </div>
          </div>

          <div className="voice-metrics">
            <div>
              <strong>{formatDuration(analysis.speech_seconds)}</strong>
              <span>durasi bicara</span>
            </div>
            <div>
              <strong>{analysis.snr_db.toFixed(1)} dB</strong>
              <span>estimasi SNR</span>
            </div>
            <div>
              <strong>{Math.round(analysis.stability * 100)}%</strong>
              <span>kestabilan</span>
            </div>
            <div>
              <strong>{analysis.dimension}D</strong>
              <span>dimensi embedding</span>
            </div>
          </div>

          {warnings.length > 0 && (
            <ul className="voice-warnings">
              {warnings.map((warning) => (
                <li key={warning}>
                  <Info size={14} /> {warning}
                </li>
              ))}
            </ul>
          )}

          <Input
            label="Nama profil"
            placeholder="Contoh: Suara Rani — kuliah pagi"
            value={label}
            maxLength={60}
            onChange={(event) => setLabel(event.target.value)}
            hint="Nama ini hanya tersimpan di browser ini."
          />

          <div className="modal-actions">
            <Button
              variant="secondary"
              onClick={() => void start()}
              leftIcon={<RotateCcw size={16} />}
            >
              Rekam ulang
            </Button>
            <Button
              onClick={() => void handleSave()}
              loading={saving}
              disabled={!canSave}
              leftIcon={<ShieldCheck size={17} />}
            >
              Simpan profil
            </Button>
          </div>
          {!analysis.ready && analysis.score >= 60 && (
            <p className="field-hint">
              Skor belum ideal. Kamu tetap bisa menyimpan profil, tetapi hasil
              filtering mungkin kurang akurat.
            </p>
          )}
        </div>
      )}

      {phase === "error" && (
        <div className="voice-center">
          <div className="error-icon error-icon-lg">
            <AlertTriangle size={26} />
          </div>
          <h3>Kalibrasi belum berhasil</h3>
          <p>{error}</p>
          <Button
            onClick={() => void start()}
            leftIcon={<RotateCcw size={16} />}
          >
            Coba rekam lagi
          </Button>
        </div>
      )}
    </Modal>
  );
}
