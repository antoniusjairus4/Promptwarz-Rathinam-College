import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, ApiClientError } from '@/services/api';
import type {
  Learner,
  StorageStatus,
  OnboardingRequest,
  Assessment,
  AssessmentResult,
  Roadmap,
} from '@/types';

interface LearnerContextType {
  learner: Learner | null;
  sessionToken: string | null;
  storageStatus: StorageStatus | null;
  assessment: Assessment | null;
  assessmentResult: AssessmentResult | null;
  roadmap: Roadmap | null;
  isLoading: boolean;
  error: string | null;
  onboard: (data: OnboardingRequest) => Promise<void>;
  refreshLearner: () => Promise<void>;
  generateAssessment: () => Promise<Assessment>;
  loadAssessment: () => Promise<Assessment | null>;
  submitAssessment: (answers: Record<string, number>) => Promise<AssessmentResult>;
  loadAssessmentResult: () => Promise<AssessmentResult | null>;
  generateRoadmap: () => Promise<Roadmap>;
  loadRoadmap: () => Promise<Roadmap | null>;
  completeStep: (stepId: string) => Promise<void>;
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
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(null);
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(LEARNER_ID_KEY);
    setSessionToken(null);
    setLearnerId(null);
    setLearner(null);
    setAssessment(null);
    setAssessmentResult(null);
    setRoadmap(null);
    setError(null);
  }, []);

  // Fetch initial profile if session exists
  const refreshLearner = useCallback(async () => {
    if (!learnerId || !sessionToken) return;

    try {
      setIsLoading(true);
      const l = await api.getLearner(learnerId);
      setLearner(l);

      // Check for existing assessment/result/roadmap
      try {
        const res = await api.getResult(learnerId);
        if (res?.result) setAssessmentResult(res.result);
      } catch {
        // No result yet is normal
      }

      try {
        const a = await api.getAssessment(learnerId);
        if (a?.assessment) setAssessment(a.assessment);
      } catch {
        // No assessment yet is normal
      }

      try {
        const r = await api.getRoadmap(learnerId);
        if (r?.roadmap) setRoadmap(r.roadmap);
      } catch {
        // No roadmap yet is normal
      }
    } catch (err: unknown) {
      if (err instanceof ApiClientError && (err.status === 401 || err.status === 404)) {
        // In-memory backend restarted or session expired
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
        // Backend might be offline
      });
  }, []);

  const onboard = async (data: OnboardingRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.onboarding(data);
      localStorage.setItem(TOKEN_KEY, res.session_token);
      localStorage.setItem(LEARNER_ID_KEY, res.learner.id);
      setSessionToken(res.session_token);
      setLearnerId(res.learner.id);
      setLearner(res.learner);
      setStorageStatus(res.storage);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Onboarding request failed';
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

  const loadAssessment = async (): Promise<Assessment | null> => {
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
  };

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

  const loadAssessmentResult = async (): Promise<AssessmentResult | null> => {
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
  };

  const generateRoadmap = async (): Promise<Roadmap> => {
    if (!learnerId) throw new Error('No active learner session found');
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.createRoadmap(learnerId);
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

  const loadRoadmap = async (): Promise<Roadmap | null> => {
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
  };

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

  return (
    <LearnerContext.Provider
      value={{
        learner,
        sessionToken,
        storageStatus,
        assessment,
        assessmentResult,
        roadmap,
        isLoading,
        error,
        onboard,
        refreshLearner,
        generateAssessment,
        loadAssessment,
        submitAssessment,
        loadAssessmentResult,
        generateRoadmap,
        loadRoadmap,
        completeStep,
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
