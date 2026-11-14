import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/services/api';
import type { HealthCheckResponse } from '@/types';

export function useHealthCheck(pollIntervalMs?: number) {
  const [data, setData] = useState<HealthCheckResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const inFlight = useRef(false);
  const mounted = useRef(true);

  const check = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.getHealth();
      if (mounted.current) setData(response);
    } catch (err: unknown) {
      if (!mounted.current) return;
      setData(null);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Health check failed');
      }
    } finally {
      inFlight.current = false;
      if (mounted.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void check();
    const timer = pollIntervalMs && pollIntervalMs > 0
      ? setInterval(() => { void check(); }, pollIntervalMs) : undefined;
    return () => {
      mounted.current = false;
      if (timer) clearInterval(timer);
    };
  }, [check, pollIntervalMs]);

  return {
    data,
    isLoading,
    error,
    isHealthy: !error && (data?.status === 'ok' || data?.status === 'healthy'),
    refetch: check,
  };
}
