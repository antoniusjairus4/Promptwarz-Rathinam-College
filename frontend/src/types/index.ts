/**
 * SkillForge AI — Centralized Domain Types & API Contracts
 * Backend is the single source of truth.
 */

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface HealthCheckResponse {
  status: 'ok' | 'healthy' | 'degraded' | 'down';
  version?: string;
  uptime?: number;
  environment?: string;
  timestamp?: string;
}

export type OnboardingTrack = 'career_first' | 'skills_first';

export interface LearnerProfile {
  id: string;
  email: string;
  fullName: string;
  targetRole?: string;
  experienceLevel?: 'entry' | 'mid' | 'senior';
  verifiedSkillsCount: number;
  createdAt: string;
}

export interface SkillDnaCategory {
  category: string;
  score: number; // 0 - 100
  verified: boolean;
  benchmarkScore: number;
}

export interface SkillDnaProfile {
  learnerId: string;
  targetRole: string;
  overallReadiness: number;
  categories: SkillDnaCategory[];
  topStrengths: string[];
  priorityGaps: string[];
  lastUpdated: string;
}

export interface AssessmentChallenge {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  timeLimitMinutes: number;
  starterCode?: string;
  language?: string;
}

export interface CareerNode {
  id: string;
  title: string;
  type: 'milestone' | 'skill' | 'project' | 'certification';
  status: 'locked' | 'available' | 'in_progress' | 'completed';
  prerequisites: string[];
  estimatedHours: number;
}

export interface LiveJobListing {
  id: string;
  title: string;
  company: string;
  location: string;
  matchScore: number;
  requiredSkills: string[];
  missingSkills: string[];
  sourceUrl: string;
  postedDate: string;
}

export interface MentorMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  contextNodeId?: string;
}
