import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Pause, Play, ShieldAlert, Smartphone, Square } from "lucide-react";

import { formatDuration } from "../lib/utils";
import { Button } from "./Button";

interface LectureRecorderProps {
  onRecorded: (file: File) => void;
  disabled?: boolean;
}

type RecorderPhase = "idle" | "recording" | "paused";

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
}

function extensionForMime(mime: string): string {
  if (mime.includes("mp4")) return "m4a";
  if (mime.includes("ogg")) return "ogg";
  return "webm";
}

export function LectureRecorder({ onRecorded, disabled }: LectureRecorderProps) {
  const [phase, setPhase] = useState<RecorderPhase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const phaseRef = useRef<RecorderPhase>("idle");

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const stopTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    timerRef.current = window.setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
  }, [stopTimer]);

  const releaseWakeLock = useCallback(async () => {
    const sentinel = wakeLockRef.current;
    wakeLockRef.current = null;
    setWakeLockActive(false);
    if (sentinel && !sentinel.released) {
      try {
        await sentinel.release();
      } catch {
        // Ignore release errors on unmount or tab switch
      }
    }
  }, []);

  const acquireWakeLock = useCallback(async () => {
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) {
      return;
    }
    try {
      const sentinel = await navigator.wakeLock.request("screen");
      wakeLockRef.current = sentinel;
      setWakeLockActive(true);
      sentinel.addEventListener("release", () => {
        setWakeLockActive(false);
      });
    } catch {
      setWakeLockActive(false);
    }
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      if (
        document.visibilityState === "visible" &&
        (phaseRef.current === "recording" || phaseRef.current === "paused")
      ) {
        void acquireWakeLock();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [acquireWakeLock]);

  const cleanupMedia = useCallback(() => {
    stopTimer();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
    void releaseWakeLock();
  }, [releaseWakeLock, stopTimer]);

  useEffect(() => cleanupMedia, [cleanupMedia]);

  const startRecording = async () => {
    setError(null);
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setError("Browser ini belum mendukung perekaman audio langsung.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = pickMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const finalMime = recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: finalMime });
        chunksRef.current = [];
        cleanupMedia();
        setPhase("idle");

        if (blob.size > 0) {
          const ext = extensionForMime(finalMime);
          const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
          const file = new File([blob], `rekaman-kuliah-${stamp}.${ext}`, {
            type: finalMime,
          });
          onRecorded(file);
        }
      };

      recorder.start(1000);
      setElapsed(0);
      setPhase("recording");
      startTimer();
      await acquireWakeLock();
    } catch {
      cleanupMedia();
      setPhase("idle");
      setError("Izin mikrofon ditolak atau perangkat audio tidak ditemukan.");
    }
  };

  const pauseRecording = () => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== "recording") return;
    recorder.pause();
    stopTimer();
    setPhase("paused");
  };

  const resumeRecording = () => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== "paused") return;
    recorder.resume();
    startTimer();
    setPhase("recording");
  };

  const stopRecording = () => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    recorder.stop();
  };

  return (
    <div className="lecture-recorder">
      <div className="lecture-recorder-head">
        <div>
          <strong>Rekam langsung di kelas</strong>
          <p>
            Rekam audio kuliah langsung dari mikrofon perangkat.{" "}
            {wakeLockActive && (
              <span className="wake-lock-pill">
                <Smartphone size={13} /> Layar tetap aktif
              </span>
            )}
          </p>
        </div>
        {phase !== "idle" && (
          <span className="recorder-timer mono" aria-live="polite">
            {phase === "recording" && <span className="rec-dot" aria-hidden="true" />}
            {formatDuration(elapsed)}
          </span>
        )}
      </div>

      {error && (
        <div className="notice notice-warning" role="alert">
          <ShieldAlert size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className="lecture-recorder-actions">
        {phase === "idle" ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={disabled}
            onClick={() => void startRecording()}
            leftIcon={<Mic size={15} />}
          >
            Mulai rekam kuliah
          </Button>
        ) : (
          <>
            {phase === "recording" ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={pauseRecording}
                leftIcon={<Pause size={15} />}
              >
                Jeda
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={resumeRecording}
                leftIcon={<Play size={15} />}
              >
                Lanjutkan
              </Button>
            )}
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={stopRecording}
              leftIcon={<Square size={14} />}
            >
              Selesai &amp; pakai audio
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
