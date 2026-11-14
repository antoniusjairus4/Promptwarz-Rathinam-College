import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/services/api';
import type { HealthCheckResponse } from '@/types';

export function useHealthCheck(pollIntervalMs?: number) {
  const [data, setData] = useState<HealthCheckResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const inFlight = useRef(false);

  const check = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.getHealth();
      setData(response);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Health check failed');
      }
    } finally {
      inFlight.current = false;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    check();

    if (pollIntervalMs && pollIntervalMs > 0) {
      const timer = setInterval(check, pollIntervalMs);
      return () => clearInterval(timer);
    }
  }, [check, pollIntervalMs]);

  return {
    data,
    isLoading,
    error,
    isHealthy: data?.status === 'ok' || data?.status === 'healthy',
    refetch: check,
  };
}
