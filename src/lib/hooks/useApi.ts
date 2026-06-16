"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api";

export interface UseApiResult<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  refetch: () => void;
}

/**
 * 간단한 데이터 페칭 훅 (별도 라이브러리 없이 fetch 직접 사용).
 * deps가 바뀌거나 refetch() 호출 시 재요청.
 */
export function useApi<T>(fn: () => Promise<T>, deps: unknown[] = []): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fn()
      .then((d) => {
        if (active) setData(d);
      })
      .catch((e) => {
        if (active) setError(e instanceof ApiError ? e.message : "알 수 없는 오류가 발생했습니다.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  return { data, error, loading, refetch };
}
