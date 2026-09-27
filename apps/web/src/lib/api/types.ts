/** Backend DTOs — mirrors FastAPI response models in apps/api/app/schemas. */

/* ── Identity / auth ── */
export interface User {
  id: string;
  email: string;
  display_name: string | null;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type?: string;
}

/** Profile claims verified from Google + optional first-run preferences. */
export interface GoogleProfile {
  sub: string;
  email: string;
  name: string | null;
  picture: string | null;
}

export interface UserProfile extends User {
  google: GoogleProfile;
  /** True until the first-time profile screen has been completed. */
  is_new: boolean;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  research_interest?: string;
  organization?: string;
  role?: string;
}

/* ── Projects / investigations ── */
export interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Page<T> {
  items: T[];
  page: number;
  page_size: number;
  total: number;
}

export type InvestigationStatus = 'planned' | 'running' | 'complete' | 'blocked';

export interface Investigation {
  id: string;
  project_id: string;
  title: string;
  status: InvestigationStatus;
  created_at: string;
  updated_at: string;
}

export interface InvestigationQuery {
  id: string;
  investigation_id: string;
  text: string;
  sequence: number;
  created_at: string;
  updated_at: string;
}

/* ── Orchestration / executions ── */
export type ExecutionStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'cancelled';

export interface ExecutionTrace {
  task_id: string;
  query_id: string;
  selected_task: string;
  selected_tool: string;
  model_version: string | null;
  parameters: Record<string, unknown>;
  input_ids: string[];
  status: ExecutionStatus | string;
  started_at: string | null;
  completed_at: string | null;
  output_references: string[];
  error: string | null;
  evidence_id: string | null;
  idempotent_replay: boolean;
}

/* ── Images ── */
export type ImageModality = 'optical' | 'multispectral' | 'sar';

export interface IngestedImage {
  id: string;
  original_filename: string;
  modality: ImageModality | string;
  acquisition_at: string | null;
  width: number | null;
  height: number | null;
  band_count: number | null;
  crs: string | null;
  bounds: Record<string, number> | null;
  file_format: string | null;
  mime_type: string | null;
  checksum: string | null;
  storage_location: string;
}

export interface ImageIngestionResponse {
  investigation_id: string;
  input_configuration: string;
  images: IngestedImage[];
}

/* ── Tool registry ── */
export interface RegisteredTool {
  name: string;
  version: string;
  model_name: string;
  task_type: string;
  accepted_modalities: string[];
  accepted_input_configurations: string[];
  parameter_schema: Record<string, unknown>;
  output_schema: Record<string, unknown>;
}

export interface ToolRegistryResponse {
  tools: RegisteredTool[];
}

/* ── Health ── */
export interface HealthResponse {
  status: string;
  service: string;
  version: string;
}

/* ── Reasoning (DB models exposed by extended read endpoints) ── */
export type EvidencePolarity = 'supporting' | 'contradicting' | 'neutral' | 'insufficient';

export interface EvidenceRecord {
  id: string;
  investigation_id: string;
  hypothesis_id: string | null;
  image_id: string | null;
  query_id: string | null;
  model_run_id: string | null;
  polarity: EvidencePolarity;
  summary: string;
  provenance: Record<string, unknown>;
  source_uri: string | null;
  source_reference: string | null;
  created_at: string;
}

export type AssessmentState = 'proposed' | 'under_review' | 'supported' | 'rejected' | 'inconclusive';

export interface HypothesisRecord {
  id: string;
  investigation_id: string;
  statement: string;
  assessment_state: AssessmentState;
  confidence: number | null;
  created_at: string;
  evidence: EvidenceRecord[];
}

export type ConclusionState = 'draft' | 'final' | 'inconclusive';

export interface ConclusionRecord {
  id: string;
  investigation_id: string;
  hypothesis_id: string | null;
  state: ConclusionState;
  summary: string;
  confidence: number | null;
  rationale: Record<string, unknown> | null;
  created_at: string;
}
