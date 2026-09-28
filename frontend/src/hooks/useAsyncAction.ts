import { useState, useCallback } from 'react';

interface AsyncActionState<T> {
  result: T | null;
  error: string | null;
  loading: boolean;
}

interface UseAsyncActionReturn<T> extends AsyncActionState<T> {
  execute: () => Promise<void>;
  reset: () => void;
}

/**
 * Custom hook to eliminate duplicated loading/error/result patterns.
 * Follows DRY — both AgentPanel and CustomerPanel share this logic.
 */
export function useAsyncAction<T>(
  action: () => Promise<T>,
  onSuccess?: () => void,
): UseAsyncActionReturn<T> {
  const [state, setState] = useState<AsyncActionState<T>>({
    result: null,
    error: null,
    loading: false,
  });

  const execute = useCallback(async () => {
    try {
      setState({ result: null, error: null, loading: true });
      const result = await action();
      setState({ result, error: null, loading: false });
      onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setState({ result: null, error: message, loading: false });
    }
  }, [action, onSuccess]);

  const reset = useCallback(() => {
    setState({ result: null, error: null, loading: false });
  }, []);

  return { ...state, execute, reset };
}
