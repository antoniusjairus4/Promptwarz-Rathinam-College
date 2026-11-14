import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
} from '@/types';

interface LearnerContextType {
  learner: Learner | null;
  sessionToken: string | null;
  storageStatus: StorageStatus | null;
  blueprint: Blueprint | null;
  profileAnalysis: ProfileAnalysis | null;
  analyzeProfile: () => Promise<void>;
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

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const clearSession = useCallback(() => {
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

    try {
      setIsLoading(true);

      const view = await api.getSession(learnerId);
      if (localStorage.getItem(LEARNER_ID_KEY) !== learnerId || localStorage.getItem(TOKEN_KEY) !== sessionToken) return;
      setLearner(view.learner);
      setBlueprint(view.blueprint ?? null);
      setProfileAnalysis(view.profile_analysis ?? null);
      setAssessment(view.assessment ?? null);
      setAssessmentResult(view.result ?? null);
      setRoadmap(view.roadmap ?? null);
      setMentorMessages(view.messages ?? []);
      setStorageStatus(view.storage);
      setError(null);
    } catch (err: unknown) {
      if (localStorage.getItem(LEARNER_ID_KEY) !== learnerId) return;
      if (err instanceof ApiClientError && (err.status === 401 || err.status === 404)) {
        // In-memory backend restarted or session token expired
        clearSession();
      } else if (err instanceof Error) {
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [learnerId, sessionToken, clearSession]);

  useEffect(() => {
    refreshLearner();
  }, [refreshLearner]);

  // Query system status
  useEffect(() => {
    api.getStatus()
      .then((status) => {
        setStorageStatus({
          mode: status.mode,
          durable: status.durable,
          reason: status.reason,
        });
      })
      .catch(() => {
        // Backend offline or unreachable
      });
  }, []);

  const onboard = async (data: OnboardingRequest) => {
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

      // Attempt to immediately trigger blueprint generation for a rich onboarding experience
      try {
        const bpRes = await api.createBlueprint(res.session_id);
        if (bpRes?.blueprint) {
          setBlueprint(bpRes.blueprint);
        }
      } catch {
        // Blueprint can be generated on demand later
      }
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
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.createBlueprint(learnerId);
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
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.createAssessment(learnerId);
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
      if (res?.assessment) {
        setAssessment(res.assessment);
        return res.assessment;
      }
      return null;
    } catch {
      return null;
    }
  }, [learnerId]);

  const submitAssessment = async (
    answers: Record<string, number>
  ): Promise<AssessmentResult> => {
    if (!learnerId) throw new Error('No active learner session found');
    if (!assessment) throw new Error('No active assessment to submit');

    setIsLoading(true);
    setError(null);
    try {
      const res = await api.submitAssessment(learnerId, assessment.id, answers);
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
      if (res?.result) {
        setAssessmentResult(res.result);
        return res.result;
      }
      return null;
    } catch {
      return null;
    }
  }, [learnerId]);

  const generateRoadmap = async (): Promise<Roadmap> => {
    if (!learnerId) throw new Error('No active learner session found');
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.createRoadmap(learnerId, Boolean(roadmap));
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
      if (res?.roadmap) {
        setRoadmap(res.roadmap);
        return res.roadmap;
      }
      return null;
    } catch {
      return null;
    }
  }, [learnerId]);

  const completeStep = async (stepId: string) => {
    if (!learnerId) throw new Error('No active learner session found');
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.updateRoadmapStep(learnerId, stepId, true);
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

  const analyzeProfile = async () => {
    if (!learnerId) throw new Error('Create a learner session before analyzing skills');
    const response = await api.analyzeProfile(learnerId);
    setProfileAnalysis(response.profile);
    setStorageStatus(response.storage);
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
