export type StyleMode = "GAMING" | "SOSMED" | "NOVEL" | "CASUAL_STORY";

export type SessionStatus =
  | "QUEUED"
  | "PROCESSING"
  | "READY"
  | "FAILED"
  | "CANCELED";

export type JobStatus =
  | "QUEUED"
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELED";

export type JobType = "PROCESS_SESSION" | "SWITCH_STYLE";

export type SourceType = "AUDIO" | "DOCUMENT" | "HYBRID";

export interface User {
  id: string;
  full_name: string;
  email: string;
  is_active: boolean;
  consent_version: string | null;
  consent_accepted_at: string | null;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface Job {
  id: string;
  session_id: string;
  job_type: JobType;
  status: JobStatus;
  stage: string | null;
  progress: number;
  attempts: number;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export interface SessionDocument {
  id: string;
  file_name: string;
  page_count: number | null;
  file_size_bytes: number | null;
  mime_type: string | null;
  uploaded_at: string;
}

export interface ModuleSummary {
  id: string;
  style_mode: StyleMode;
  recommended_method: string | null;
  schema_version: string;
  status: string;
  created_at: string;
}

export interface StudySession {
  id: string;
  title: string;
  speaker_label: string | null;
  source_type: SourceType;
  status: SessionStatus;
  error_code: string | null;
  error_message: string | null;
  audio_duration_seconds: number | null;
  language: string;
  raw_transcript: string | null;
  created_at: string;
  updated_at: string;
  documents: SessionDocument[];
  modules: ModuleSummary[];
  latest_job: Job | null;
}

export interface SessionListItem {
  id: string;
  title: string;
  speaker_label: string | null;
  source_type: SourceType;
  status: SessionStatus;
  error_code: string | null;
  audio_duration_seconds: number | null;
  created_at: string;
  updated_at: string;
  module_count: number;
  latest_job: Job | null;
}

export interface SessionListResponse {
  items: SessionListItem[];
  next_cursor: string | null;
}

export interface SessionCreateResponse {
  session_id: string;
  job_id: string;
}

export interface SourceCitation {
  id: string;
  label: string;
  kind: "document" | "audio";
}

export type BlockType =
  | "paragraph"
  | "callout"
  | "formula"
  | "example"
  | "quote";

export interface ContentBlock {
  type: BlockType;
  text?: string | null;
  title?: string | null;
  latex?: string | null;
  explanation?: string | null;
  source_refs: string[];
}

export interface ContentSection {
  heading: string;
  blocks: ContentBlock[];
}

export interface GlossaryItem {
  term: string;
  definition: string;
  source_refs: string[];
}

export interface StudyMethod {
  name: string;
  why: string;
  steps: string[];
  source_refs: string[];
}

export interface QuizItem {
  id: string;
  type: "multiple_choice";
  question: string;
  options: string[];
  answer_index: number;
  explanation: string;
  source_refs: string[];
}

export interface ModuleContent {
  schema_version: string;
  title: string;
  summary: string;
  sections: ContentSection[];
  glossary: GlossaryItem[];
  study_method: StudyMethod;
  quiz: QuizItem[];
  citations: SourceCitation[];
}

export interface Module {
  id: string;
  session_id: string;
  style_mode: StyleMode;
  content_json: ModuleContent;
  quiz_json: QuizItem[];
  recommended_method: string | null;
  method_action_items: string[] | null;
  schema_version: string;
  model_name: string | null;
  prompt_version: string | null;
  status: string;
  created_at: string;
}

export interface ModuleSwitchResponse {
  status: "READY" | "QUEUED";
  job_id: string | null;
  module: Module | null;
}

export interface VoiceAnalysis {
  score: number;
  speech_seconds: number;
  snr_db: number;
  stability: number;
  embedding: string;
  dimension: number;
  provider: string;
  ready: boolean;
  status: string;
  warnings: string[];
}

export interface VoiceTicket {
  ticket: string;
  expires_in: number;
}

export interface ApiProblem {
  type?: string;
  title?: string;
  status?: number;
  code?: string;
  detail?: string;
  request_id?: string;
  errors?: Array<{ loc: Array<string | number>; msg: string; type: string }>;
}

export interface SpeakerProfile {
  id?: number;
  label: string;
  embedding: string;
  dimension: number;
  provider: string;
  score: number;
  createdAt: string;
}

export interface OfflineModule {
  id: string;
  sessionId: string;
  sessionTitle: string;
  styleMode: StyleMode;
  content: ModuleContent;
  savedAt: string;
}
