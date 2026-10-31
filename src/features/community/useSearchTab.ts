"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api";

export interface SearchPage<T> {
  items: T[];
  hasNext: boolean;
}

export type FetchSearchPage<T> = (q: string, page: number) => Promise<SearchPage<T>>;

export type SearchTabStatus = "idle" | "loading" | "error" | "ready";

export interface SearchTab<T> {
  /** idle: 검색어 없음 · loading: 지금 검색어의 결과를 기다리는 중 */
  status: SearchTabStatus;
  items: T[];
  hasNext: boolean;
  error: string | null;
  retry: () => void;
}

interface Loaded<T> extends SearchPage<T> {
  q: string;
  attempt: number;
  error: string | null;
}

const messageOf = (e: unknown, fallback: string) => (e instanceof ApiError ? e.message : fallback);

/**
 * /search 의 탭 하나 — 탭마다 따로 불러와서 한쪽이 실패해도 다른 쪽은 그대로 보인다.
 * q 는 지금 입력된 검색어, requestQ 는 입력이 멈춰 실제로 요청할 검색어. 가장 마지막 검색어의 응답만 쓴다.
 */
export function useSearchTab<T>(q: string, requestQ: string, fetchPage: FetchSearchPage<T>): SearchTab<T> {
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<Loaded<T> | null>(null);

  useEffect(() => {
    if (!requestQ) return;
    let active = true;
    fetchPage(requestQ, 0).then(
      ({ items, hasNext }) => {
        if (active) setLoaded({ q: requestQ, attempt, items, hasNext, error: null });
      },
      (e: unknown) => {
        if (active) {
          setLoaded({ q: requestQ, attempt, items: [], hasNext: false, error: messageOf(e, "검색 결과를 불러오지 못했어요.") });
        }
      },
    );
    return () => {
      active = false;
    };
  }, [requestQ, attempt, fetchPage]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  const current = loaded && loaded.q === q && loaded.attempt === attempt ? loaded : null;

  return {
    status: !q ? "idle" : !current ? "loading" : current.error ? "error" : "ready",
    items: current?.items ?? [],
    hasNext: current?.hasNext ?? false,
    error: current?.error ?? null,
    retry,
  };
}
