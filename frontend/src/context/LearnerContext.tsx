import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api, ApiClientError } from '@/services/api';
import type {
  Learner,
  StorageStatus,
  OnboardingRequest,
  Assessment,
  AssessmentResult,
  Roadmap,
  Blueprint,
  MentorMessage,
  ProfileAnalysis,
  RepositoryInspection,
  GithubAnalysisResponse,
} from '@/types';

interface LearnerContextType {
  learner: Learner | null;
  sessionToken: string | null;
  storageStatus: StorageStatus | null;
  blueprint: Blueprint | null;
  profileAnalysis: ProfileAnalysis | null;
  analyzeProfile: (signal?: AbortSignal) => Promise<void>;
  importGithub: (target: string, paths: string[], signal?: AbortSignal) => Promise<GithubAnalysisResponse>;
  githubRepositories: RepositoryInspection[];
  isRestoring: boolean;
  restorationError: string | null;
  assessment: Assessment | null;
  assessmentResult: AssessmentResult | null;
  roadmap: Roadmap | null;
  mentorMessages: MentorMessage[];
  isLoading: boolean;
  error: string | null;
  onboard: (data: OnboardingRequest) => Promise<void>;
  refreshLearner: () => Promise<void>;
  generateBlueprint: () => Promise<Blueprint>;
  generateAssessment: () => Promise<Assessment>;
  loadAssessment: () => Promise<Assessment | null>;
  submitAssessment: (answers: Record<string, number>) => Promise<AssessmentResult>;
  loadAssessmentResult: () => Promise<AssessmentResult | null>;
  generateRoadmap: () => Promise<Roadmap>;
  loadRoadmap: () => Promise<Roadmap | null>;
  completeStep: (stepId: string) => Promise<void>;
  addMentorMessage: (msg: MentorMessage) => void;
  clearSession: () => void;
  clearError: () => void;
}

const LearnerContext = createContext<LearnerContextType | undefined>(undefined);

const TOKEN_KEY = 'maximus_session_token';
const LEARNER_ID_KEY = 'maximus_learner_id';

export const LearnerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sessionToken, setSessionToken] = useState<string | null>(() => {
    return localStorage.getItem(TOKEN_KEY);
  });
  const [learnerId, setLearnerId] = useState<string | null>(() => {
    return localStorage.getItem(LEARNER_ID_KEY);
  });

  const [learner, setLearner] = useState<Learner | null>(null);
  const [storageStatus, setStorageStatus] = useState<StorageStatus | null>(null);
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [profileAnalysis, setProfileAnalysis] = useState<ProfileAnalysis | null>(null);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(null);
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [mentorMessages, setMentorMessages] = useState<MentorMessage[]>([]);

  const [githubRepositories, setGithubRepositories] = useState<RepositoryInspection[]>([]);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restorationError, setRestorationError] = useState<string | null>(null);
  const mutationEpoch = useRef(0);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const clearSession = useCallback(() => {
    mutationEpoch.current++;
    setGithubRepositories([]);
    setRestorationError(null);
    setIsRestoring(false);
    setIsLoading(false);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(LEARNER_ID_KEY);
    setSessionToken(null);
    setLearnerId(null);
    setLearner(null);
    setBlueprint(null);
    setProfileAnalysis(null);
    setAssessment(null);
    setAssessmentResult(null);
    setRoadmap(null);
    setMentorMessages([]);
    setStorageStatus(null);
    setError(null);
  }, []);

  // Fetch initial profile / session restoration after refresh
  const refreshLearner = useCallback(async () => {
    if (!learnerId || !sessionToken) return;

    const epoch = mutationEpoch.current;
    try {
      setIsRestoring(true);
      setRestorationError(null);
      const view = await api.getSession(learnerId, sessionToken);
      if (!mounted.current || epoch !== mutationEpoch.current) return;
      if (localStorage.getItem(LEARNER_ID_KEY) !== learnerId || localStorage.getItem(TOKEN_KEY) !== sessionToken) return;
      setLearner(view.learner);
      setBlueprint(view.blueprint ?? null);
      setProfileAnalysis(view.profile_analysis ?? null);
      setAssessment(view.assessment ?? null);
      setAssessmentResult(view.result ?? null);
      setRoadmap(view.roadmap ?? null);
      setMentorMessages(view.messages ?? []);
      setGithubRepositories(view.github_repositories ?? []);
      setStorageStatus(view.storage);
      setError(null);
    } catch (err: unknown) {
      if (!mounted.current || epoch !== mutationEpoch.current) return;
      if (localStorage.getItem(LEARNER_ID_KEY) !== learnerId || localStorage.getItem(TOKEN_KEY) !== sessionToken) return;
      if (err instanceof ApiClientError && (err.status === 401 || err.status === 404)) {
        // In-memory backend restarted or session token expired
        clearSession();
      } else {
        setRestorationError(err instanceof Error ? err.message : 'Session restoration failed. Retry without creating another profile.');
      }
    } finally {
      if (mounted.current && localStorage.getItem(LEARNER_ID_KEY) === learnerId && localStorage.getItem(TOKEN_KEY) === sessionToken) setIsRestoring(false);
    }
  }, [learnerId, sessionToken, clearSession]);

  useEffect(() => {
    if (!learner) void refreshLearner();
    // A newly created session already contains its complete public state.
  }, [refreshLearner]);

  // Ignore responses after this provider unmounts.
  useEffect(() => {
    let active = true;
    api.getStatus()
      .then((status) => {
        if (!active) return;
        setStorageStatus({
          mode: status.mode,
          durable: status.durable,
          reason: status.reason,
        });
      })
      .catch(() => {
        // Backend offline or unreachable; health UI reports connectivity.
      });
    return () => { active = false; };
  }, []);

  const onboard = async (data: OnboardingRequest) => {
    mutationEpoch.current++;
    setIsRestoring(false);
    setRestorationError(null);
    setIsLoading(true);
    setError(null);
    try {
      // Use session endpoint for complete journey features
      const res = await api.createSession(data);
      localStorage.setItem(TOKEN_KEY, res.session_token);
      localStorage.setItem(LEARNER_ID_KEY, res.session_id);
      setSessionToken(res.session_token);
      setLearnerId(res.session_id);
      setLearner(res.session.learner);
      setAssessment(null);
      setAssessmentResult(null);
      setRoadmap(null);
      setMentorMessages([]);
      setBlueprint(null);
      setProfileAnalysis(null);
      setStorageStatus(res.storage);

      setGithubRepositories([]);
      setRestorationError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Onboarding request failed';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const generateBlueprint = async (): Promise<Blueprint> => {
    if (!learnerId) throw new Error('No active learner session found');
    mutationEpoch.current++;
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.createBlueprint(learnerId);
      if (!isCurrentSession(learnerId, sessionToken)) return res.blueprint;
      setBlueprint(res.blueprint);
      setStorageStatus(res.storage);
      return res.blueprint;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Blueprint generation failed';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const generateAssessment = async (): Promise<Assessment> => {
    if (!learnerId) throw new Error('No active learner session found');
    mutationEpoch.current++;
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.createAssessment(learnerId);
      if (!isCurrentSession(learnerId, sessionToken)) return res.assessment;
      setAssessment(res.assessment);
      if (!res.assessment.submitted) { setAssessmentResult(null); setRoadmap(null); setProfileAnalysis(null); }
      setStorageStatus(res.storage);
      return res.assessment;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Assessment generation failed';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const loadAssessment = useCallback(async (): Promise<Assessment | null> => {
    if (!learnerId) return null;
    try {
      const res = await api.getAssessment(learnerId);
      if (localStorage.getItem(LEARNER_ID_KEY) !== learnerId || localStorage.getItem(TOKEN_KEY) !== sessionToken) return null;
      if (res?.assessment) {
        setAssessment(res.assessment);
        return res.assessment;
      }
      return null;
    } catch (err: unknown) {
      if (localStorage.getItem(LEARNER_ID_KEY) === learnerId && localStorage.getItem(TOKEN_KEY) === sessionToken
          && !(err instanceof ApiClientError && err.status === 404)) {
        setError(err instanceof Error ? err.message : "Unable to restore learner data");
      }
      return null;
    }
  }, [learnerId, sessionToken]);

  const submitAssessment = async (
    answers: Record<string, number>
  ): Promise<AssessmentResult> => {
    if (!learnerId) throw new Error('No active learner session found');
    if (!assessment) throw new Error('No active assessment to submit');

    mutationEpoch.current++;
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.submitAssessment(learnerId, assessment.id, answers);
      if (!isCurrentSession(learnerId, sessionToken)) return res.result;
      setAssessmentResult(res.result);
      setStorageStatus(res.storage);
      await refreshLearner();
      return res.result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Submission failed';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const loadAssessmentResult = useCallback(async (): Promise<AssessmentResult | null> => {
    if (!learnerId) return null;
    try {
      const res = await api.getResult(learnerId);
      if (localStorage.getItem(LEARNER_ID_KEY) !== learnerId || localStorage.getItem(TOKEN_KEY) !== sessionToken) return null;
      if (res?.result) {
        setAssessmentResult(res.result);
        return res.result;
      }
      return null;
    } catch (err: unknown) {
      if (localStorage.getItem(LEARNER_ID_KEY) === learnerId && localStorage.getItem(TOKEN_KEY) === sessionToken
          && !(err instanceof ApiClientError && err.status === 404)) {
        setError(err instanceof Error ? err.message : "Unable to restore learner data");
      }
      return null;
    }
  }, [learnerId, sessionToken]);

  const generateRoadmap = async (): Promise<Roadmap> => {
    if (!learnerId) throw new Error('No active learner session found');
    mutationEpoch.current++;
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.createRoadmap(learnerId, Boolean(roadmap));
      if (!isCurrentSession(learnerId, sessionToken)) return res.roadmap;
      setRoadmap(res.roadmap);
      setStorageStatus(res.storage);
      return res.roadmap;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Roadmap generation failed';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const loadRoadmap = useCallback(async (): Promise<Roadmap | null> => {
    if (!learnerId) return null;
    try {
      const res = await api.getRoadmap(learnerId);
      if (localStorage.getItem(LEARNER_ID_KEY) !== learnerId || localStorage.getItem(TOKEN_KEY) !== sessionToken) return null;
      if (res?.roadmap) {
        setRoadmap(res.roadmap);
        return res.roadmap;
      }
      return null;
    } catch (err: unknown) {
      if (localStorage.getItem(LEARNER_ID_KEY) === learnerId && localStorage.getItem(TOKEN_KEY) === sessionToken
          && !(err instanceof ApiClientError && err.status === 404)) {
        setError(err instanceof Error ? err.message : "Unable to restore learner data");
      }
      return null;
    }
  }, [learnerId, sessionToken]);

  const completeStep = async (stepId: string) => {
    if (!learnerId) throw new Error('No active learner session found');
    mutationEpoch.current++;
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.updateRoadmapStep(learnerId, stepId, true);
      if (!isCurrentSession(learnerId, sessionToken)) return;
      setRoadmap(res.roadmap);
      setStorageStatus(res.storage);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update step';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const isCurrentSession = (id: string, token: string | null) => mounted.current && localStorage.getItem(LEARNER_ID_KEY) === id && localStorage.getItem(TOKEN_KEY) === token;

  const analyzeProfile = async (signal?: AbortSignal) => {
    if (!learnerId || !learner) throw new Error('Restore your learner session before analyzing skills');
    mutationEpoch.current++;
    const response = await api.analyzeProfile(learnerId, signal);
    if (!signal?.aborted && isCurrentSession(learnerId, sessionToken)) {
      setProfileAnalysis(response.profile);
      setStorageStatus(response.storage);
    }
  };

  const importGithub = async (target: string, paths: string[], signal?: AbortSignal) => {
    if (!learnerId || !learner) throw new Error('Restore your learner session before importing GitHub evidence');
    mutationEpoch.current++;
    const response = await api.importGithub(learnerId, target, paths, signal);
    if (!signal?.aborted && isCurrentSession(learnerId, sessionToken)) {
      setGithubRepositories(previous => {
        const merged = new Map(previous.map(repo => [repo.repository.full_name.toLowerCase(), repo]));
        response.repositories.forEach(repo => {
          const key = repo.repository.full_name.toLowerCase();
          if (repo.inspected_paths.length || !merged.has(key)) merged.set(key, repo);
        });
        return [...merged.values()].slice(-4);
      });
      if (response.repositories.some(repo => repo.inspected_paths.length)) setProfileAnalysis(null);
      setStorageStatus(response.storage);
    }
    return response;
  };

  const addMentorMessage = (msg: MentorMessage) => {
    setMentorMessages((prev) => [...prev, msg]);
  };

  return (
    <LearnerContext.Provider
      value={{
        learner,
        sessionToken,
        storageStatus,
        blueprint,
        profileAnalysis,
        analyzeProfile,
        importGithub,
        githubRepositories,
        isRestoring,
        restorationError,
        assessment,
        assessmentResult,
        roadmap,
        mentorMessages,
        isLoading,
        error,
        onboard,
        refreshLearner,
        generateBlueprint,
        generateAssessment,
        loadAssessment,
        submitAssessment,
        loadAssessmentResult,
        generateRoadmap,
        loadRoadmap,
        completeStep,
        addMentorMessage,
        clearSession,
        clearError: () => setError(null),
      }}
    >
      {children}
    </LearnerContext.Provider>
  );
};

export const useLearner = (): LearnerContextType => {
  const context = useContext(LearnerContext);
  if (!context) {
    throw new Error('useLearner must be used within a LearnerProvider');
  }
  return context;
};
