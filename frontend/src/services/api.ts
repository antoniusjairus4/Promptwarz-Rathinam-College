import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import type {
  ApiResponse,
  HealthCheckResponse,
  LearnerProfile,
  SkillDnaProfile,
  AssessmentChallenge,
  CareerNode,
  LiveJobListing,
  MentorMessage,
} from '../types';

/**
 * SkillForge AI Centralized API Client
 *
 * Rules:
 * 1. All backend calls route through this client.
 * 2. Never invoke LLM endpoints directly from the browser.
 * 3. Never fabricate or return mock data here. Backend is single source of truth.
 * 4. Distinct states (loading, empty, error, success) must be handled by callers.
 */

const BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '') || 'http://localhost:8000';

const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Centralized response error normalization
export class ApiClientError extends Error {
  public status?: number;
  public details?: unknown;

  constructor(message: string, status?: number, details?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.details = details;
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string; detail?: string }>) => {
    let friendlyMessage = 'Unable to connect to the SkillForge backend service.';
    const status = error.response?.status;

    if (error.response?.data?.message) {
      friendlyMessage = error.response.data.message;
    } else if (error.response?.data?.detail) {
      friendlyMessage = error.response.data.detail;
    } else if (error.code === 'ECONNABORTED') {
      friendlyMessage = 'Backend request timed out. Please try again.';
    } else if (error.message) {
      friendlyMessage = error.message;
    }

    return Promise.reject(new ApiClientError(friendlyMessage, status, error.response?.data));
  }
);

// Typed request helper
async function request<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await apiClient.request<T>(config);
  return response.data;
}

export const api = {
  /**
   * Verified Live Health Check
   * Calls GET /api/health
   */
  async getHealth(): Promise<HealthCheckResponse> {
    return request<HealthCheckResponse>({
      method: 'GET',
      url: '/api/health',
    });
  },

  // --------------------------------------------------------------------------
  // PLACEHOLDER API CONTRACTS (Pending Backend API Implementation by Codex)
  // These explicitly throw until backend endpoints are delivered.
  // DO NOT fabricate fake or mocked responses here.
  // --------------------------------------------------------------------------

  learner: {
    async getProfile(): Promise<ApiResponse<LearnerProfile>> {
      throw new ApiClientError(
        'Backend endpoint [GET /api/learner/profile] is not yet implemented.'
      );
    },
    async updateTargetRole(_role: string): Promise<ApiResponse<LearnerProfile>> {
      throw new ApiClientError(
        'Backend endpoint [POST /api/learner/target-role] is not yet implemented.'
      );
    },
  },

  skills: {
    async getSkillDna(): Promise<ApiResponse<SkillDnaProfile>> {
      throw new ApiClientError(
        'Backend endpoint [GET /api/skills/dna] is not yet implemented.'
      );
    },
    async getAssessmentChallenges(): Promise<ApiResponse<AssessmentChallenge[]>> {
      throw new ApiClientError(
        'Backend endpoint [GET /api/skills/challenges] is not yet implemented.'
      );
    },
  },

  career: {
    async getRoadmap(_targetRole?: string): Promise<ApiResponse<CareerNode[]>> {
      throw new ApiClientError(
        'Backend endpoint [GET /api/career/roadmap] is not yet implemented.'
      );
    },
  },

  jobs: {
    async getLiveListings(): Promise<ApiResponse<LiveJobListing[]>> {
      throw new ApiClientError(
        'Backend endpoint [GET /api/jobs/live] is not yet implemented.'
      );
    },
  },

  mentor: {
    async sendMessage(_message: string): Promise<ApiResponse<MentorMessage>> {
      throw new ApiClientError(
        'Backend endpoint [POST /api/mentor/chat] is not yet implemented.'
      );
    },
  },
};

export default api;
