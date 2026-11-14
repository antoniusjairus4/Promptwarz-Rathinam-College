/**
 * Maximus — Centralized Domain Types & API Contracts (v1)
 * Backend is the single source of truth. All contract response fields are snake_case.
 */

export interface StorageStatus {
  mode: 'memory' | 'sqlite' | 'postgres' | string;
  durable: boolean;
  reason?: string | null;
}

export interface SkillEvidence {
  skill: string;
  provenance: 'self_reported' | 'assessment_observed';
  verified: boolean;
  score?: number | null;
  assessment_id?: string | null;
  note: string;
}

export interface Learner {
  id: string;
  full_name: string;
  track: 'career_first' | 'skills_first' | string;
  target_role?: string | null;
  experience_level: 'entry' | 'mid' | 'senior' | string;
  weekly_hours: number;
  skills: SkillEvidence[];
  interests?: string[];
  created_at: string;
}

export interface OnboardingRequest {
  full_name: string;
  track: 'career_first' | 'skills_first';
  target_role?: string | null;
  skills?: string[];
  interests?: string[];
  experience_level?: 'entry' | 'mid' | 'senior';
  weekly_hours?: number;
}

export interface OnboardingResponse {
  learner: Learner;
  session_token: string;
  storage: StorageStatus;
}

export interface SessionCreated {
  session_id: string;
  session_token: string;
  session: SessionView;
  storage: StorageStatus;
}

export interface BlueprintSkill {
  name: string;
  priority: 'core' | 'supporting' | string;
  rationale: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | string;
}

export interface Blueprint {
  target_role: string;
  rationale: string;
  skills: BlueprintSkill[];
  provider: string;
  model: string;
  generated_at: string;
  source?: string;
}

export interface BlueprintResponse {
  blueprint: Blueprint;
  storage: StorageStatus;
}

export interface ProfileAnalysis {
  summary: string;
  inferred_skills: string[];
  suggested_roles: string[];
  gaps_to_assess: string[];
  provider: string;
  model: string;
  generated_at: string;
  evidence_note?: string;
}

export interface ProfileResponse {
  profile: ProfileAnalysis;
  storage: StorageStatus;
}

export interface SessionView {
  session_id: string;
  learner: Learner;
  blueprint: Blueprint | null;
  profile_analysis: ProfileAnalysis | null;
  github_repositories?: unknown[];
  assessment: Assessment | null;
  result: AssessmentResult | null;
  roadmap: Roadmap | null;
  messages: MentorMessage[];
  events: AgentEvent[];
  storage: StorageStatus;
}

export interface PublicQuestion {
  id: string;
  skill: string;
  prompt: string;
  options: string[];
  difficulty: string;
}

export interface Assessment {
  id: string;
  learner_id: string;
  target_role: string;
  target_role_source: string;
  questions: PublicQuestion[];
  source?: string;
  provider: string;
  model: string;
  created_at: string;
  submitted?: boolean;
}

export interface AssessmentResponse {
  assessment: Assessment;
  storage: StorageStatus;
}

export interface QuestionFeedback {
  question_id: string;
  selected_index: number;
  is_correct: boolean;
  explanation: string;
}

export interface QuizVerification {
  skill: string;
  score: number;
  passed: boolean;
  evidence_scope: string;
}

export interface AssessmentResult {
  assessment_id: string;
  score: number;
  correct: number;
  total: number;
  skill_scores: Record<string, number>;
  evidence_note?: string;
  submitted_at: string;
  explanations?: QuestionFeedback[];
  demonstrated_strengths?: string[];
  gaps?: string[];
  quiz_verification?: QuizVerification[];
}

export interface ResultResponse {
  result: AssessmentResult;
  storage: StorageStatus;
}

export interface RoadmapStep {
  id: string;
  title: string;
  skill: string;
  objective: string;
  estimated_hours: number;
  difficulty?: string;
  practice_task: string;
  gap_priority?: string;
  status: 'locked' | 'available' | 'completed' | string;
  prerequisites: string[];
}

export interface Roadmap {
  id: string;
  learner_id: string;
  assessment_id: string;
  target_role: string;
  summary: string;
  steps: RoadmapStep[];
  source?: string;
  provider: string;
  model: string;
  created_at: string;
  revision?: number;
  progress_source?: string;
}

export interface RoadmapResponse {
  roadmap: Roadmap;
  storage: StorageStatus;
}

export interface AgentEvent {
  id: string;
  agent: string;
  status: string;
  timestamp: string;
  operation_id: string;
}

export interface EventsResponse {
  events: AgentEvent[];
  storage: StorageStatus;
}

export interface Attribution {
  source: string;
  source_url: string;
  application_url: string;
}

export interface JobListing {
  id: string;
  title: string;
  company: string;
  location?: string | null;
  employment_type?: string | null;
  summary: string;
  tags: string[];
  published_at?: string | null;
  expires_at?: string | null;
  application_url: string;
  sources: Attribution[];
}

export interface ProviderStatus {
  provider: string;
  status: 'ok' | 'error' | 'disabled' | 'not_configured' | 'rate_limited' | string;
  cached: boolean;
  fetched_at?: string | null;
  detail?: string | null;
  retry_after_seconds?: number | null;
}

export interface MatchedJob {
  job_id: string;
  matched_terms: string[];
  assessment_supported_terms: string[];
  note: string;
}

export interface JobSearchResponse {
  jobs: JobListing[];
  providers: ProviderStatus[];
  returned_count: number;
  note?: string;
  matches?: MatchedJob[];
  session_id?: string | null;
}

export interface LearningResource {
  id: string;
  title: string;
  provider: string;
  url: string;
  kind: 'course' | 'documentation' | 'video' | string;
  topics: string[];
  provenance: 'curated_official' | 'youtube_api' | string;
  reviewed_on?: string | null;
  channel?: string | null;
}

export interface LearningResponse {
  resources: LearningResource[];
  providers: ProviderStatus[];
}

export interface RepositoryMetadata {
  full_name: string;
  url: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  default_branch: string;
  pushed_at: string | null;
  license: string | null;
  evidence_note?: string;
}

export interface SourceFile {
  path: string;
  url?: string | null;
  sha?: string | null;
  content?: string | null;
  status: 'ok' | 'error' | 'too_large' | 'unsupported' | string;
  detail?: string | null;
}

export interface RepositoryResponse {
  repository: RepositoryMetadata | null;
  files: SourceFile[];
  providers: ProviderStatus[];
}

export interface MentorMessage {
  id: string;
  user_message: string;
  reply: string;
  next_actions: string[];
  provider: string;
  model: string;
  created_at: string;
}

export interface MentorResponse {
  message: MentorMessage;
  storage: StorageStatus;
}

export interface HealthCheckResponse {
  status: 'ok' | 'healthy' | 'degraded' | 'down' | string;
  version?: string;
  timestamp?: string;
}

export interface SystemStatusResponse {
  mode: string;
  durable: boolean;
  reason?: string | null;
}
