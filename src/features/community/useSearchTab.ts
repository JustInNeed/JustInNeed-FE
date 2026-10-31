"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, SEARCH_PAGE_SIZE } from "@/lib/api";

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
  /** 서버 목록에서 항목이 빠지면(-) · 맨 앞에 들어가면(+) 다음 "더 보기" 위치를 그만큼 옮긴다 */
  shiftList: (delta: number) => void;
}

interface Loaded<T> extends SearchPage<T> {
  q: string;
  attempt: number;
  page: number;
  /** 마지막으로 불러온 페이지 뒤로 목록이 밀린 칸 수 */
  shift: number;
  error: string | null;
  loadingMore: boolean;
  moreError: string | null;
}

export interface SearchTabOptions {
  /** 탭이 한 번에 불러오는 수 */
  pageSize?: number;
  /** 첫 페이지 실패 문구 (서버 문구가 없을 때) */
  failedMessage?: string;
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
  { pageSize = SEARCH_PAGE_SIZE, failedMessage = "검색 결과를 불러오지 못했어요." }: SearchTabOptions = {},
): SearchTab<T> {
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<Loaded<T> | null>(null);
  // 진행 중인 "더 보기" 요청. 검색어가 바뀌면 비워서 늦게 온 응답을 버린다
  const moreRequest = useRef<object | null>(null);

  useEffect(() => {
    if (!requestQ) return;
    let active = true;
    const first = { q: requestQ, attempt, page: 0, shift: 0, loadingMore: false, moreError: null };
    fetchPage(requestQ, 0).then(
      ({ items, hasNext }) => {
        if (active) setLoaded({ ...first, items, hasNext, error: null });
      },
      (e: unknown) => {
        if (active) setLoaded({ ...first, items: [], hasNext: false, error: messageOf(e, failedMessage) });
      },
    );
    return () => {
      active = false;
      moreRequest.current = null;
    };
  }, [requestQ, attempt, fetchPage, failedMessage]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  const shiftList = useCallback((delta: number) => setLoaded((prev) => prev && { ...prev, shift: prev.shift + delta }), []);
  const current = loaded && loaded.q === q && loaded.attempt === attempt ? loaded : null;

  const loadMore = () => {
    if (!current?.hasNext || moreRequest.current) return;
    const request = {};
    moreRequest.current = request;
    setLoaded((prev) => prev && { ...prev, loadingMore: true, moreError: null });
    // 앞에서 항목이 빠지면 뒤 항목이 앞 페이지로 당겨져서, 그 페이지부터 다시 받아야 건너뛰지 않는다. 겹친 항목은 uniqueBy 가 거른다
    const { shift } = current;
    const nextPage = Math.floor(((current.page + 1) * pageSize + shift) / pageSize);
    fetchPage(current.q, nextPage).then(
      ({ items, hasNext }) => {
        if (moreRequest.current !== request) return;
        moreRequest.current = null;
        setLoaded(
          (prev) =>
            prev && {
              ...prev,
              page: nextPage,
              // 응답을 기다리는 사이에 밀린 칸은 다음 "더 보기" 로 넘긴다
              shift: prev.shift - shift,
              items: uniqueBy([...prev.items, ...items], idOf),
              hasNext,
              loadingMore: false,
            },
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
    shiftList,
  };
}
