import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  Clock3,
  CloudOff,
  Download,
  ExternalLink,
  GraduationCap,
  Info,
  RotateCcw,
  Sparkles,
  WandSparkles,
} from "lucide-react";

import { ApiError, api } from "../lib/api";
import {
  cacheModule,
  getCachedModule,
} from "../lib/db";
import {
  downloadMarkdownFile,
  moduleToMarkdown,
  slugifyFilename,
} from "../lib/exportMarkdown";
import type {
  Module,
  OfflineModule,
  StyleMode,
} from "../lib/types";
import {
  errorMessage,
  formatDate,
  isStyleMode,
  jobStageLabel,
  modeStyle,
  STYLE_META,
} from "../lib/utils";
import { Badge } from "../components/Card";
import { Button, Spinner } from "../components/Button";
import { Card } from "../components/Card";
import { CitationList, ModuleRenderer } from "../components/ModuleRenderer";
import { QuizCard } from "../components/QuizCard";
import { ErrorState } from "../components/States";
import { StyleSwitcher } from "../components/StyleSwitcher";

function ReaderSkeleton() {
  return (
    <div className="reader-skeleton">
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-hero" />
      <div className="skeleton skeleton-list" />
    </div>
  );
}

export function ReaderPage() {
  const { id, style: styleParam } = useParams<{ id: string; style: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const style: StyleMode = isStyleMode(styleParam) ? styleParam : "CASUAL_STORY";

  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [offlineModule, setOfflineModule] = useState<OfflineModule | null>(null);
  const [offlineFallback, setOfflineFallback] = useState(false);
  const [switchJobId, setSwitchJobId] = useState<string | null>(null);
  const [pendingStyle, setPendingStyle] = useState<StyleMode | null>(null);
  const [failedStyle, setFailedStyle] = useState<StyleMode | null>(null);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const lastReadRef = useRef<string | null>(null);
  const lastQuizSaveRef = useRef<string>("");
  const handledJobRef = useRef<string | null>(null);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  const sessionQuery = useQuery({
    queryKey: ["session", id],
    queryFn: () => api.getSession(id as string),
    enabled: Boolean(id),
  });

  const moduleQuery = useQuery({
    queryKey: ["module", id, style],
    queryFn: () => api.getModule(id as string, style),
    enabled: Boolean(id),
    retry: false,
  });

  const jobQuery = useQuery({
    queryKey: ["job", switchJobId],
    queryFn: () => api.getJob(switchJobId as string),
    enabled: Boolean(switchJobId),
    refetchInterval: (query) => {
      const job = query.state.data;
      return job && (job.status === "QUEUED" || job.status === "RUNNING")
        ? 1600
        : false;
    },
  });

  useEffect(() => {
    if (moduleQuery.data && sessionQuery.data) {
      void cacheModule(moduleQuery.data, sessionQuery.data.title);
      setOfflineModule(null);
      setOfflineFallback(false);
    }
  }, [moduleQuery.data, sessionQuery.data]);

  useEffect(() => {
    if (!moduleQuery.isError || !id) return;
    const error = moduleQuery.error;
    const networkFailure =
      !online || (error instanceof ApiError && error.status === 0);
    if (!networkFailure) return;
    let active = true;
    void getCachedModule(id, style).then((cached) => {
      if (active && cached) {
        setOfflineModule(cached);
        setOfflineFallback(true);
      }
    });
    return () => {
      active = false;
    };
  }, [moduleQuery.isError, moduleQuery.error, id, style, online]);

  useEffect(() => {
    setAnswers({});
    lastQuizSaveRef.current = "";
    setSwitchError(null);
  }, [style]);

  useEffect(() => {
    const job = jobQuery.data;
    if (!job) return;
    if (job.status !== "SUCCEEDED" && job.status !== "FAILED") return;
    if (handledJobRef.current === job.id) return;
    handledJobRef.current = job.id;

    if (job.status === "SUCCEEDED") {
      const target = pendingStyle ?? style;
      void queryClient.invalidateQueries({ queryKey: ["module", id, target] });
      void queryClient.invalidateQueries({ queryKey: ["session", id] });
      setSwitchJobId(null);
      setPendingStyle(null);
      setSwitchError(null);
    } else {
      setSwitchError(job.error_message ?? "Gaya baru gagal dibuat. Coba lagi.");
      setFailedStyle(pendingStyle);
      setSwitchJobId(null);
      setPendingStyle(null);
    }
  }, [jobQuery.data, pendingStyle, style, id, queryClient]);

  useEffect(() => {
    if (!jobQuery.isError || !switchJobId) return;
    setSwitchError(errorMessage(jobQuery.error));
    setFailedStyle(pendingStyle);
    setSwitchJobId(null);
    setPendingStyle(null);
  }, [jobQuery.isError, jobQuery.error, switchJobId, pendingStyle]);

  const moduleData = moduleQuery.data as Module | undefined;
  const content = moduleData?.content_json ?? offlineModule?.content ?? null;
  const session = sessionQuery.data;
  const title = content?.title ?? session?.title ?? offlineModule?.sessionTitle ?? "Modul belajar";
  const modules = session?.modules ?? [];
  const isGenerating =
    Boolean(switchJobId) &&
    (pendingStyle === style || pendingStyle === null) &&
    !moduleData;
  const jobProgress = jobQuery.data?.progress ?? 0;
  const jobStage = jobStageLabel(jobQuery.data?.stage);

  useEffect(() => {
    if (!moduleData || !online) return;
    if (lastReadRef.current === moduleData.id) return;
    lastReadRef.current = moduleData.id;
    void api.saveProgress(moduleData.id, {}).catch(() => undefined);
  }, [moduleData, online]);

  const quiz = content?.quiz ?? [];
  const answeredCount = quiz.filter((item) => answers[item.id] !== undefined).length;
  const correctCount = quiz.filter(
    (item) => answers[item.id] === item.answer_index,
  ).length;
  const quizScore =
    quiz.length > 0 ? Math.round((correctCount / quiz.length) * 100) : 0;

  useEffect(() => {
    if (!moduleData || quiz.length === 0 || answeredCount !== quiz.length || !online) {
      return;
    }
    const saveKey = `${moduleData.id}:${JSON.stringify(answers)}`;
    if (lastQuizSaveRef.current === saveKey) return;
    lastQuizSaveRef.current = saveKey;
    void api
      .saveProgress(moduleData.id, { quiz_score: quizScore, answers })
      .catch(() => undefined);
  }, [answers, moduleData, quiz.length, answeredCount, quizScore, online]);

  const generateStyle = async (target: StyleMode) => {
    if (!id) return;
    if (!online) {
      setSwitchError("Butuh koneksi internet untuk membuat gaya baru.");
      return;
    }
    setSwitchError(null);
    try {
      const response = await api.switchStyle(id, target);
      if (response.status === "READY" && response.module) {
        await queryClient.invalidateQueries({ queryKey: ["session", id] });
        await queryClient.invalidateQueries({ queryKey: ["module", id, target] });
        navigate(`/sessions/${id}/read/${target}`);
        return;
      }
      if (response.job_id) {
        setPendingStyle(target);
        setSwitchJobId(response.job_id);
        if (target !== style) {
          navigate(`/sessions/${id}/read/${target}`);
        }
      }
    } catch (err) {
      setSwitchError(errorMessage(err));
    }
  };

  const handleStyleSelect = (target: StyleMode) => {
    if (!id || target === style) return;
    if (!online) {
      setSwitchError("Kamu sedang offline. Buka salinan tersimpan atau sambungkan internet.");
      return;
    }
    if (modules.some((module) => module.style_mode === target)) {
      navigate(`/sessions/${id}/read/${target}`);
      return;
    }
    void generateStyle(target);
  };

  const modeMeta = STYLE_META[style];

  if (!id) {
    return (
      <div className="page">
        <ErrorState title="Sesi tidak ditemukan" message="Alamat halaman tidak lengkap." />
      </div>
    );
  }

  if (moduleQuery.isLoading && !content) {
    return (
      <div className="page reader-page">
        <ReaderSkeleton />
      </div>
    );
  }

  const isOffline = !online || offlineFallback;
  const moduleError = moduleQuery.error;
  const isNotFound = moduleError instanceof ApiError && moduleError.status === 404;

  return (
    <div
      className="page reader-page"
      style={modeStyle(modeMeta.color)}
    >
      <div className="reader-topbar">
        <Link to={`/sessions/${id}`} className="text-link">
          <ArrowLeft size={15} /> Kembali ke sesi
        </Link>
        <div className="reader-topbar-actions">
          {isOffline && (
            <Badge tone="warning">
              <CloudOff size={13} /> Salinan offline
            </Badge>
          )}
          {moduleData?.model_name === "mock-narralearn" && (
            <Badge tone="neutral">
              <Sparkles size={13} /> Demo AI
            </Badge>
          )}
          {content && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                const md = moduleToMarkdown(content, {
                  sessionTitle: title || content.title,
                  styleMode: style,
                });
                const filename = `${slugifyFilename(title || content.title)}-${style.toLowerCase()}.md`;
                downloadMarkdownFile(filename, md);
              }}
              leftIcon={<Download size={15} />}
            >
              Ekspor .md
            </Button>
          )}
          <Link to={`/sessions/${id}`} className="btn btn-ghost btn-sm">
            <ExternalLink size={15} /> Detail sesi
          </Link>
        </div>
      </div>

      {switchError && (
        <div className="notice notice-warning" role="alert">
          <Info size={18} />
          <div>
            <strong>Gaya belum berhasil dibuat</strong>
            <p>{switchError}</p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => void generateStyle(failedStyle ?? style)}
            leftIcon={<RotateCcw size={15} />}
          >
            Coba lagi
          </Button>
        </div>
      )}

      {isGenerating && !content && (
        <Card className="reader-generating">
          <div className="reader-generating-head">
            <span className="mode-pill" style={modeStyle(modeMeta.color)}>
              {modeMeta.label}
            </span>
            <Spinner size={22} />
          </div>
          <h1>Menyusun versi {modeMeta.label.toLowerCase()}…</h1>
          <p>
            Materi yang sama sedang diterjemahkan ke sudut pandang baru. Kamu
            bisa menunggu sebentar atau kembali ke gaya sebelumnya.
          </p>
          <div className="progress-track progress-track-lg">
            <span className="progress-fill" style={{ width: `${jobProgress}%` }} />
          </div>
          <span className="soft-label">Tahap: {jobStage} · {jobProgress}%</span>
          <div className="reader-generating-actions">
            <StyleSwitcher
              current={style}
              modules={modules}
              onSelect={handleStyleSelect}
              busy
              compact
            />
            {modules[0] && (
              <Link
                to={`/sessions/${id}/read/${modules[0].style_mode}`}
                className="text-link"
              >
                Buka gaya lain <ArrowRight size={14} />
              </Link>
            )}
          </div>
        </Card>
      )}

      {!content && !isGenerating && (
        <div className="reader-empty">
          {isNotFound ? (
            <Card className="reader-create-card">
              <WandSparkles size={28} />
              <h1>Gaya {modeMeta.label} belum dibuat</h1>
              <p>
                Gunakan materi yang sudah diproses untuk membuat versi ini tanpa
                mengunggah ulang audio atau dokumen.
              </p>
              <Button
                onClick={() => void generateStyle(style)}
                leftIcon={<Sparkles size={17} />}
              >
                Buat gaya {modeMeta.label}
              </Button>
            </Card>
          ) : (
            <ErrorState
              title="Modul tidak bisa dimuat"
              message={
                isOffline
                  ? "Kamu sedang offline dan modul ini belum tersimpan di perangkat. Buka sekali saat online untuk membaca offline."
                  : errorMessage(moduleError)
              }
              onRetry={() => void moduleQuery.refetch()}
            />
          )}
        </div>
      )}

      {content && (
        <>
          <header className="reader-hero">
            <div className="reader-hero-copy">
              <div className="reader-hero-kicker">
                <span className="mode-pill" style={modeStyle(modeMeta.color)}>
                  {modeMeta.label}
                </span>
                <span className="eyebrow">Modul belajar</span>
              </div>
              <h1>{title || content.title}</h1>
              <p className="reader-summary">{content.summary}</p>
              <div className="reader-meta">
                <span>
                  <GraduationCap size={15} /> {content.study_method.name}
                </span>
                <span>
                  <Clock3 size={15} /> {formatDate(moduleData?.created_at)}
                </span>
                <span>
                  <BookOpenCheck size={15} /> {quiz.length} kuis
                </span>
                {moduleData?.model_name && (
                  <span className="mono">v{content.schema_version}</span>
                )}
              </div>
            </div>
            <div className="reader-hero-marker" aria-hidden="true">
              <span>{modeMeta.short}</span>
              <strong>{String(content.sections.length).padStart(2, "0")}</strong>
              <small>bagian</small>
            </div>
          </header>

          <div className="reader-grid">
            <div className="reader-main">
              <Card className="reader-summary-card">
                <div className="summary-card-head">
                  <span className="summary-card-icon">
                    <Sparkles size={18} />
                  </span>
                  <h2>Inti materinya</h2>
                </div>
                <p>{content.summary}</p>
              </Card>

              <ModuleRenderer content={content} />

              <section className="quiz-section">
                <div className="section-head">
                  <div>
                    <p className="eyebrow">Uji pemahaman</p>
                    <h2>Kuis singkat</h2>
                  </div>
                  <span className="soft-label">
                    {answeredCount}/{quiz.length} dijawab
                  </span>
                </div>
                <div className="quiz-list">
                  {quiz.map((item, index) => (
                    <QuizCard
                      key={item.id}
                      item={item}
                      index={index}
                      selected={answers[item.id]}
                      citations={content.citations}
                      onSelect={(optionIndex) =>
                        setAnswers((current) => ({
                          ...current,
                          [item.id]: optionIndex,
                        }))
                      }
                    />
                  ))}
                </div>

                {answeredCount === quiz.length && quiz.length > 0 && (
                  <div className="quiz-score-card">
                    <div>
                      <span className="eyebrow">Hasil kuis</span>
                      <strong>{quizScore}%</strong>
                      <p>
                        {correctCount} dari {quiz.length} jawaban tepat. Progres
                        tersimpan otomatis di akunmu.
                      </p>
                    </div>
                    <div className="quiz-score-actions">
                      <Badge tone={quizScore >= 70 ? "success" : "warning"}>
                        <CheckCircle2 size={13} />
                        {quizScore >= 70 ? "Pemahaman kuat" : "Perlu review"}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setAnswers({});
                          lastQuizSaveRef.current = "";
                        }}
                        leftIcon={<RotateCcw size={15} />}
                      >
                        Ulangi kuis
                      </Button>
                    </div>
                  </div>
                )}
              </section>

              <section className="citation-section">
                <div className="section-head">
                  <div>
                    <p className="eyebrow">Lacak sumber</p>
                    <h2>Referensi</h2>
                  </div>
                  <span className="soft-label">{content.citations.length} sumber</span>
                </div>
                <Card>
                  <CitationList citations={content.citations} />
                </Card>
              </section>
            </div>

            <aside className="reader-aside">
              <Card className="reader-switch-card">
                <p className="eyebrow">Ganti sudut pandang</p>
                <h2>Baca versi lain</h2>
                <StyleSwitcher
                  current={style}
                  modules={modules}
                  onSelect={handleStyleSelect}
                />
                {!online && (
                  <p className="field-hint">
                    Gaya baru membutuhkan koneksi. Salinan yang sudah dibuka tetap
                    bisa dibaca offline.
                  </p>
                )}
              </Card>

              <Card className="study-method-card">
                <span className="method-icon">
                  <GraduationCap size={20} />
                </span>
                <p className="eyebrow">Cara belajar yang disarankan</p>
                <h2>{content.study_method.name}</h2>
                <p>{content.study_method.why}</p>
                <ol className="method-steps">
                  {content.study_method.steps.map((step, index) => (
                    <li key={`${step}-${index}`}>
                      <span>{index + 1}</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </Card>

              {content.glossary.length > 0 && (
                <Card className="glossary-card">
                  <p className="eyebrow">Kamus kecil</p>
                  <h2>Glosarium</h2>
                  <dl className="glossary-list">
                    {content.glossary.map((item) => (
                      <div key={item.term}>
                        <dt>{item.term}</dt>
                        <dd>{item.definition}</dd>
                      </div>
                    ))}
                  </dl>
                </Card>
              )}

              <Card className="reader-offline-card">
                <Download size={19} />
                <div>
                  <strong>
                    {isOffline ? "Tersimpan di perangkat" : "Baca offline"}
                  </strong>
                  <p>
                    Modul ini otomatis disimpan di IndexedDB setelah berhasil
                    dibuka. Buka kembali saat offline tanpa kehilangan catatan.
                  </p>
                </div>
              </Card>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
