// One small loader for every screen that reads from the api.
//
// It distinguishes three things screens keep needing to tell apart: the first load (show a
// spinner), a pull-to-refresh (keep the old data on screen), and a failure (say what went wrong
// without throwing away what was already there).
import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError } from "./api";

export interface AsyncState<T> {
  data: T | null;
  /** True only for the first load, when there is nothing to show yet. */
  loading: boolean;
  /** True while a refresh runs over data already on screen. */
  refreshing: boolean;
  error: string | null;
  reload: () => Promise<void>;
  refresh: () => Promise<void>;
  /** Replace the data without a round trip, after a write that already returned the new state. */
  set: (updater: (prev: T | null) => T | null) => void;
}

export function useAsync<T>(fn: (signal: AbortSignal) => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  const run = useRef(fn);
  run.current = fn;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async (isRefresh: boolean) => {
    const controller = new AbortController();
    if (isRefresh) setRefreshing(true);
    setError(null);
    try {
      const result = await run.current(controller.signal);
      if (!mounted.current) return;
      setData(result);
    } catch (e) {
      if (!mounted.current) return;
      setError(e instanceof ApiError ? e.message : "Something went wrong.");
    } finally {
      if (!mounted.current) return;
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    void load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return {
    data,
    loading,
    refreshing,
    error,
    reload: () => load(false),
    refresh: () => load(true),
    set: (updater) => setData((prev) => updater(prev)),
  };
}
