import type { StorageStatus } from './index';
export type InterviewType = 'technical' | 'behavioral' | 'mixed';
export type InterviewDifficulty = 'beginner' | 'intermediate' | 'advanced';
export interface InterviewQuestion {
  id: string; number: number; question: string; focus: string; provider: string; model: string;
}
export interface InterviewFeedback {
  question_id: string; transcript: string; technical_accuracy: number; clarity: number;
  completeness: number; relevance: number; feedback: string; improvements: string[];
  stronger_answer: string; provider: string; model: string;
}
export interface InterviewSummary {
  summary: string; strengths: string[]; improvement_areas: string[]; next_steps: string[];
  provider: string; model: string;
}
export interface Interview {
  id: string; interview_type: InterviewType; difficulty: InterviewDifficulty; created_at: string;
  questions: InterviewQuestion[]; answers: InterviewFeedback[]; summary: InterviewSummary | null;
  evidence_note: string;
}
export interface InterviewResponse { interview: Interview | null; storage: StorageStatus; }
