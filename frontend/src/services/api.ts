import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import type {
  HealthCheckResponse,
  SystemStatusResponse,
  Learner,
  OnboardingRequest,
  OnboardingResponse,
  AssessmentResponse,
  ResultResponse,
  RoadmapResponse,
  EventsResponse,
  JobSearchResponse,
  LearningResponse,
  RepositoryResponse,
  MentorResponse,
  Assessment,
  AssessmentResult,
  Roadmap,
  BlueprintResponse,
  SessionView,
  ProfileResponse,
} from '../types';

/**
 * Maximus Centralized API Client (v1 + Session Facade)
 *
 * Rules:
 * 1. All backend calls route through this client.
 * 2. Authenticates with session_token via Authorization: Bearer <token>.
 * 3. Never call third-party LLMs directly from browser.
 * 4. Never fabricate mock data on error — backend is the single source of truth.
 * 5. Production safe: never defaults to localhost in production builds.
 * 6. Extended timeouts (up to 360s) for AI worker generation workflows.
 */

const getBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '');
  if (envUrl) return envUrl;
  if (import.meta.env.PROD && typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'http://localhost:8000';
};

const apiClient: AxiosInstance = axios.create({
  baseURL: getBaseUrl(),
  timeout: 240000, // 240s default for standard backend operations
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

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

// Request interceptor: inject demo session token from localStorage if present
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('maximus_session_token');
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: extract error detail from FastAPI errors
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ detail?: string | Array<{ msg: string }>; message?: string }>) => {
    let friendlyMessage = 'Unable to connect to the Maximus backend service.';
    const status = error.response?.status;
    const data = error.response?.data;

    if (data?.detail) {
      if (typeof data.detail === 'string') {
        friendlyMessage = data.detail;
      } else if (Array.isArray(data.detail)) {
        friendlyMessage = data.detail.map((d) => d.msg || JSON.stringify(d)).join(', ');
      }
    } else if (data?.message) {
      friendlyMessage = data.message;
    } else if (error.code === 'ECONNABORTED') {
      friendlyMessage =
        'The operation timed out. AI generation may still be finishing on the backend; session state will restore on refresh.';
    } else if (error.message) {
      friendlyMessage = error.message;
    }

    return Promise.reject(new ApiClientError(friendlyMessage, status, data));
  }
);

async function request<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await apiClient.request<T>(config);
  return response.data;
}

export const api = {
  /**
   * Health check endpoint: GET /api/health
   */
  async getHealth(): Promise<HealthCheckResponse> {
    return request<HealthCheckResponse>({
      method: 'GET',
      url: '/api/health',
    });
  },

  /**
   * Backend storage status: GET /api/v1/status
   */
  async getStatus(): Promise<SystemStatusResponse> {
    return request<SystemStatusResponse>({
      method: 'GET',
      url: '/api/v1/status',
    });
  },

  /**
   * Session Facade: Restore complete public state via GET /api/sessions/{session_id}
   */
  async getSession(sessionId: string): Promise<SessionView> {
    return request<SessionView>({
      method: 'GET',
      url: `/api/sessions/${sessionId}`,
    });
  },

  /**
   * Session Facade: Create new session via POST /api/sessions
   */
  async createSession(payload: OnboardingRequest): Promise<OnboardingResponse> {
    return request<OnboardingResponse>({
      method: 'POST',
      url: '/api/sessions',
      data: payload,
    });
  },

  /**
   * API v1 Onboarding: POST /api/v1/onboarding
   */
  async onboarding(payload: OnboardingRequest): Promise<OnboardingResponse> {
    return request<OnboardingResponse>({
      method: 'POST',
      url: '/api/v1/onboarding',
      data: payload,
    });
  },

  /**
   * Generate AI Career Blueprint: POST /api/career/blueprint
   */
  async createBlueprint(sessionId: string): Promise<BlueprintResponse> {
    return request<BlueprintResponse>({
      method: 'POST',
      url: '/api/career/blueprint',
      data: { session_id: sessionId },
      timeout: 240000,
    });
  },

  /**
   * Profile Analysis: POST /api/profile/analyze
   */
  async analyzeProfile(sessionId: string): Promise<ProfileResponse> {
    return request<ProfileResponse>({
      method: 'POST',
      url: '/api/profile/analyze',
      data: { session_id: sessionId },
      timeout: 180000,
    });
  },

  /**
   * Fetch Learner Profile: GET /api/v1/learners/{learner_id}
   */
  async getLearner(learnerId: string): Promise<Learner> {
    const res = await request<{ learner: Learner }>({
      method: 'GET',
      url: `/api/v1/learners/${learnerId}`,
    });
    return res.learner;
  },

  /**
   * Step 2: Request Assessment: POST /api/v1/learners/{learner_id}/assessments
   * Assessment generation can take up to 360s when utilizing fallback providers.
   */
  async createAssessment(learnerId: string): Promise<AssessmentResponse> {
    return request<AssessmentResponse>({
      method: 'POST',
      url: `/api/v1/learners/${learnerId}/assessments`,
      timeout: 360000,
    });
  },

  /**
   * Read current Assessment: GET /api/v1/learners/{learner_id}/assessment
   */
  async getAssessment(learnerId: string): Promise<{ assessment: Assessment }> {
    return request<{ assessment: Assessment }>({
      method: 'GET',
      url: `/api/v1/learners/${learnerId}/assessment`,
    });
  },

  /**
   * Submit Assessment: POST /api/v1/learners/{learner_id}/assessments/{assessment_id}/submit
   */
  async submitAssessment(
    learnerId: string,
    assessmentId: string,
    answers: Record<string, number>
  ): Promise<ResultResponse> {
    return request<ResultResponse>({
      method: 'POST',
      url: `/api/v1/learners/${learnerId}/assessments/${assessmentId}/submit`,
      data: { answers },
    });
  },

  /**
   * Read Assessment Result: GET /api/v1/learners/{learner_id}/result
   */
  async getResult(learnerId: string): Promise<{ result: AssessmentResult }> {
    return request<{ result: AssessmentResult }>({
      method: 'GET',
      url: `/api/v1/learners/${learnerId}/result`,
    });
  },

  /**
   * Step 3: Generate Adaptive Roadmap: POST /api/v1/learners/{learner_id}/roadmap
   */
  async createRoadmap(learnerId: string): Promise<RoadmapResponse> {
    return request<RoadmapResponse>({
      method: 'POST',
      url: `/api/v1/learners/${learnerId}/roadmap`,
      timeout: 240000,
    });
  },

  /**
   * Read current Roadmap: GET /api/v1/learners/{learner_id}/roadmap
   */
  async getRoadmap(learnerId: string): Promise<{ roadmap: Roadmap }> {
    return request<{ roadmap: Roadmap }>({
      method: 'GET',
      url: `/api/v1/learners/${learnerId}/roadmap`,
    });
  },

  /**
   * Complete Roadmap Step: PATCH /api/v1/learners/{learner_id}/roadmap/steps/{step_id}
   */
  async updateRoadmapStep(
    learnerId: string,
    stepId: string,
    completed: boolean
  ): Promise<RoadmapResponse> {
    return request<RoadmapResponse>({
      method: 'PATCH',
      url: `/api/v1/learners/${learnerId}/roadmap/steps/${stepId}`,
      data: { completed },
    });
  },

  /**
   * Read workflow agent events: GET /api/v1/learners/{learner_id}/events
   */
  async getEvents(learnerId: string): Promise<EventsResponse> {
    return request<EventsResponse>({
      method: 'GET',
      url: `/api/v1/learners/${learnerId}/events`,
    });
  },

  /**
   * Real Job Search: GET /api/v1/jobs/search?q=...&provider=...&limit=...
   */
  async searchJobs(
    query: string = '',
    provider: 'both' | 'himalayas' | 'remotive' = 'both',
    limit: number = 20,
    sessionId?: string
  ): Promise<JobSearchResponse> {
    const params: Record<string, string | number> = {
      q: query,
      provider,
      limit,
    };
    if (sessionId) params.session_id = sessionId;

    return request<JobSearchResponse>({
      method: 'GET',
      url: '/api/v1/jobs/search',
      params,
    });
  },

  /**
   * Curated Learning Resources: GET /api/v1/learning/resources?q=...&include_youtube=true
   */
  async getLearningResources(
    query: string = '',
    includeYoutube: boolean = true,
    sessionId?: string
  ): Promise<LearningResponse> {
    const params: Record<string, string | boolean> = {
      q: query,
      include_youtube: includeYoutube,
    };
    if (sessionId) params.session_id = sessionId;

    return request<LearningResponse>({
      method: 'GET',
      url: '/api/v1/learning/resources',
      params,
    });
  },

  /**
   * YouTube Only Search: GET /api/v1/learning/youtube?q=...
   */
  async getYouTubeResources(query: string): Promise<LearningResponse> {
    return request<LearningResponse>({
      method: 'GET',
      url: '/api/v1/learning/youtube',
      params: { q: query },
    });
  },

  /**
   * Public GitHub Integration: GET /api/v1/integrations/github/{owner}/{repo}
   */
  async analyzeGithub(
    owner: string,
    repo: string,
    paths: string[] = []
  ): Promise<RepositoryResponse> {
    const params = new URLSearchParams();
    paths.forEach((p) => params.append('paths', p));

    return request<RepositoryResponse>({
      method: 'GET',
      url: `/api/v1/integrations/github/${owner}/${repo}${
        paths.length > 0 ? `?${params.toString()}` : ''
      }`,
      timeout: 120000,
    });
  },

  /**
   * AI Mentor Chat: POST /api/mentor/chat
   */
  async sendMentorMessage(sessionId: string, message: string): Promise<MentorResponse> {
    return request<MentorResponse>({
      method: 'POST',
      url: '/api/mentor/chat',
      data: {
        session_id: sessionId,
        message,
      },
      timeout: 120000,
    });
  },
};

export default api;
