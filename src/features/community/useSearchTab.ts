"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  loadMore: () => void;
  loadingMore: boolean;
  /** "더 보기" 실패 — 불러온 결과는 그대로 둔다 */
  moreError: string | null;
}

interface Loaded<T> extends SearchPage<T> {
  q: string;
  attempt: number;
  page: number;
  error: string | null;
  loadingMore: boolean;
  moreError: string | null;
}

const messageOf = (e: unknown, fallback: string) => (e instanceof ApiError ? e.message : fallback);

/** 페이지 사이에 새 카드가 끼면 뒤로 밀린 항목이 다음 페이지에 또 온다 */
function uniqueBy<T>(items: T[], idOf: (item: T) => number): T[] {
  const seen = new Set<number>();
  return items.filter((item) => {
    const id = idOf(item);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

/**
 * /search 의 탭 하나 — 탭마다 따로 불러와서 한쪽이 실패해도 다른 쪽은 그대로 보인다.
 * q 는 지금 입력된 검색어, requestQ 는 입력이 멈춰 실제로 요청할 검색어. 가장 마지막 검색어의 응답만 쓴다.
 */
export function useSearchTab<T>(
  q: string,
  requestQ: string,
  fetchPage: FetchSearchPage<T>,
  idOf: (item: T) => number,
): SearchTab<T> {
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<Loaded<T> | null>(null);
  // 진행 중인 "더 보기" 요청. 검색어가 바뀌면 비워서 늦게 온 응답을 버린다
  const moreRequest = useRef<object | null>(null);

  useEffect(() => {
    if (!requestQ) return;
    let active = true;
    const first = { q: requestQ, attempt, page: 0, loadingMore: false, moreError: null };
    fetchPage(requestQ, 0).then(
      ({ items, hasNext }) => {
        if (active) setLoaded({ ...first, items, hasNext, error: null });
      },
      (e: unknown) => {
        if (active) setLoaded({ ...first, items: [], hasNext: false, error: messageOf(e, "검색 결과를 불러오지 못했어요.") });
      },
    );
    return () => {
      active = false;
      moreRequest.current = null;
    };
  }, [requestQ, attempt, fetchPage]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  const current = loaded && loaded.q === q && loaded.attempt === attempt ? loaded : null;

  const loadMore = () => {
    if (!current?.hasNext || moreRequest.current) return;
    const request = {};
    moreRequest.current = request;
    setLoaded((prev) => prev && { ...prev, loadingMore: true, moreError: null });
    fetchPage(current.q, current.page + 1).then(
      ({ items, hasNext }) => {
        if (moreRequest.current !== request) return;
        moreRequest.current = null;
        setLoaded(
          (prev) =>
            prev && { ...prev, page: prev.page + 1, items: uniqueBy([...prev.items, ...items], idOf), hasNext, loadingMore: false },
        );
      },
      (e: unknown) => {
        if (moreRequest.current !== request) return;
        moreRequest.current = null;
        setLoaded((prev) => prev && { ...prev, loadingMore: false, moreError: messageOf(e, "결과를 더 불러오지 못했어요.") });
      },
    );
  };

  return {
    status: !q ? "idle" : !current ? "loading" : current.error ? "error" : "ready",
    items: current?.items ?? [],
    hasNext: current?.hasNext ?? false,
    error: current?.error ?? null,
    retry,
    loadMore,
    loadingMore: current?.loadingMore ?? false,
    moreError: current?.moreError ?? null,
  };
}
