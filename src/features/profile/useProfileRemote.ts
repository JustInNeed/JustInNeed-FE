"use client";

// 프로필에서 본문과 따로 받는 구역 — 구역마다 실패해도 나머지는 그대로 보인다.
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ApiError,
  getCommunityProfile,
  getProfileCards,
  getCardSessions,
  getMyCards,
  getMyMindmap,
  getMySessions,
  getProfileMindmap,
  getSharedSessions,
  type CardSessionsResponse,
  type SessionListItem,
} from "@/lib/api";
import { useApi } from "@/lib/hooks/useApi";
import type { ProfileListSection } from "./ProfileList";
import { toFullMindmap, toMyProfileMindmap, toProfileMindmap, toSession } from "./toProfilePage";

const CARD_PAGE_SIZE = 12;
const SESSION_PAGE_SIZE = 12;

/** 프로필 본문. useApi 는 메시지만 돌려주므로 404 구분용 상태 코드는 따로 보관 */
export function useCommunityProfile(userId: number | null, enabled: boolean) {
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const fetcher = useCallback(
    () =>
      getCommunityProfile(userId!).catch((e: unknown) => {
        setErrorStatus(e instanceof ApiError ? e.status : null);
        throw e;
      }),
    [userId],
  );
  const query = useApi(fetcher, [userId], { enabled });
  return { ...query, notFound: !!query.error && errorStatus === 404 };
}

/** 페이지를 이어 붙이는 목록 (더 보기). 실패하면 그 페이지만 다시 받는다 */
function usePagedList<T extends { id: string | number }>(
  fetchPage: (page: number) => Promise<{ items: T[]; hasNext: boolean }>,
  deps: unknown[],
  enabled: boolean,
): { items: T[]; section: ProfileListSection } {
  const [page, setPage] = useState(0);
  const [items, setItems] = useState<T[]>([]);
  const { data, error, loading, refetch } = useApi(() => fetchPage(page), [...deps, page], { enabled });

  useEffect(() => {
    if (!data) return;
    // 페이지 사이에 순서가 바뀌면 같은 항목이 또 올 수 있다
    setItems((cur) => [...cur, ...data.items.filter((c) => !cur.some((x) => x.id === c.id))]);
  }, [data]);

  const hasNext = data?.hasNext ?? false;
  const onLoadMore = useCallback(() => setPage((p) => p + 1), []);
  return { items, section: { kind: "more", loading, error, onRetry: refetch, hasNext, onLoadMore } };
}

/** 페이지 번호로 한 페이지씩 보여주는 목록. 다음 페이지를 받는 동안·실패해도 보던 페이지는 그대로 둔다 */
function usePagedPages<T>(
  fetchPage: (page: number) => Promise<{ items: T[]; totalPages: number }>,
  deps: unknown[],
  enabled: boolean,
): { items: T[]; section: ProfileListSection } {
  const [page, setPage] = useState(0);
  const [shown, setShown] = useState<{ items: T[]; totalPages: number }>({ items: [], totalPages: 0 });
  const { data, error, loading, refetch } = useApi(() => fetchPage(page), [...deps, page], { enabled });

  useEffect(() => {
    if (data) setShown(data);
  }, [data]);

  const onPageChange = useCallback((next: number) => setPage(next), []);
  return {
    items: shown.items,
    section: { kind: "pages", loading, error, onRetry: refetch, page, totalPages: shown.totalPages, onPageChange },
  };
}

/** 다른 사용자의 마인드맵 탭 카드 */
export function useProfileCards(userId: number | null, enabled: boolean) {
  const { items, section } = usePagedPages(
    async (page) => {
      const { mindmaps, totalPages } = await getProfileCards(userId!, page, CARD_PAGE_SIZE);
      return { items: mindmaps.map(toProfileMindmap), totalPages };
    },
    [userId],
    enabled,
  );
  return { cards: items, section };
}

/** 다른 사용자의 세션 탭 — 공개 세션 전부, 핀고정이 먼저 */
export function useSharedSessions(userId: number | null, enabled: boolean) {
  return usePagedPages(
    async (page) => {
      const { sessions, totalPages } = await getSharedSessions(userId!, page, SESSION_PAGE_SIZE);
      return { items: sessions.map(toSession), totalPages };
    },
    [userId],
    enabled,
  );
}

/** 내 마인드맵 탭 카드 — 비공개 포함, 핀고정이 먼저 */
export function useMyCards() {
  const { items, section } = usePagedPages(
    async (page) => {
      const { mindmaps, totalPages } = await getMyCards(page, CARD_PAGE_SIZE);
      return { items: mindmaps.map(toMyProfileMindmap), totalPages };
    },
    [],
    true,
  );
  return { cards: items, section };
}

/** 내 세션 탭 — 공개 · 비공개 전부, 페이지 번호로 */
export function useMySessions() {
  return usePagedPages(
    async (page) => {
      const { sessions, totalPages } = await getMySessions(page, SESSION_PAGE_SIZE);
      return { items: sessions, totalPages };
    },
    [],
    true,
  );
}

/** 프로필 수정의 핀고정 후보 — 공개 세션만. 고정 순서를 받은 세션 안에서 찾으므로 더 보기로 이어 붙인다 */
export function useMyPinCandidates() {
  return usePagedList(
    async (page) => {
      const { sessions, hasNext } = await getMySessions(page, SESSION_PAGE_SIZE, true);
      return { items: sessions, hasNext };
    },
    [],
    true,
  );
}

/** 카드 상세의 관련 세션 — 팝업을 열 때 받고, 한 번 받은 카드는 다시 받지 않는다 (크게 보기를 닫고 돌아올 때 등) */
export function useCardSessions(mindmapId: string | null, fetchSessions: (mindmapId: number) => Promise<CardSessionsResponse> = getCardSessions) {
  const [cache, setCache] = useState<Record<string, SessionListItem[]>>({});
  const sessions = mindmapId === null ? undefined : cache[mindmapId];
  const { error, refetch } = useApi(
    async () => {
      const { sessions: fetched } = await fetchSessions(Number(mindmapId));
      setCache((c) => ({ ...c, [mindmapId!]: fetched }));
      return fetched;
    },
    [mindmapId],
    { enabled: mindmapId !== null && !sessions },
  );
  return { sessions, error: sessions ? null : error, retry: refetch };
}

/** 프로필 주인의 전체 마인드맵 — 크게 보기를 처음 누를 때 받는다. userId 가 없으면 내 마인드맵 */
export function useOwnerMindmap(userId: number | undefined) {
  const [opened, setOpened] = useState(false);
  const { data, error, refetch } = useApi(() => (userId === undefined ? getMyMindmap() : getProfileMindmap(userId)), [userId], {
    enabled: opened,
  });
  const mindmap = useMemo(() => (data ? toFullMindmap(data) : null), [data]);
  const open = () => {
    if (error) refetch();
    setOpened(true);
  };
  return { mindmap, error, retry: refetch, open };
}
