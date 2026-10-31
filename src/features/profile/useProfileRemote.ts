"use client";

// 다른 사용자 프로필에서 프로필과 따로 받는 구역 — 구역마다 실패해도 나머지는 그대로 보인다.
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ApiError,
  getCommunityProfile,
  getProfileCards,
  getProfileCardSessions,
  getProfileMindmap,
  type SessionListItem,
} from "@/lib/api";
import { useApi } from "@/lib/hooks/useApi";
import type { ProfileMindmap } from "@/lib/viewTypes";
import { toFullMindmap, toProfileMindmap } from "./toProfilePage";

const CARD_PAGE_SIZE = 12;

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

/** 마인드맵 탭 카드 — 페이지를 이어 붙인다. 실패하면 그 페이지만 다시 받는다 */
export function useProfileCards(userId: number | null, enabled: boolean) {
  const [page, setPage] = useState(0);
  const [cards, setCards] = useState<ProfileMindmap[]>([]);
  const { data, error, loading, refetch } = useApi(() => getProfileCards(userId!, page, CARD_PAGE_SIZE), [userId, page], { enabled });

  useEffect(() => {
    if (!data) return;
    const next = data.mindmaps.map(toProfileMindmap);
    // 페이지 사이에 카드 순서가 바뀌면 같은 카드가 또 올 수 있다
    setCards((cur) => [...cur, ...next.filter((c) => !cur.some((x) => x.id === c.id))]);
  }, [data]);

  const hasNext = data?.hasNext ?? false;
  const onLoadMore = useCallback(() => setPage((p) => p + 1), []);
  return { cards, section: { loading, error, onRetry: refetch, hasNext, onLoadMore } };
}

/** 카드 상세의 관련 세션 — 팝업을 열 때 받고, 한 번 받은 카드는 다시 받지 않는다 (크게 보기를 닫고 돌아올 때 등) */
export function useCardSessions(mindmapId: string | null, enabled: boolean) {
  const [cache, setCache] = useState<Record<string, SessionListItem[]>>({});
  const sessions = mindmapId === null ? undefined : cache[mindmapId];
  const { error, refetch } = useApi(
    async () => {
      const { sessions: fetched } = await getProfileCardSessions(Number(mindmapId));
      setCache((c) => ({ ...c, [mindmapId!]: fetched }));
      return fetched;
    },
    [mindmapId],
    { enabled: enabled && mindmapId !== null && !sessions },
  );
  return { sessions, error: sessions ? null : error, retry: refetch };
}

/** 프로필 주인의 전체 마인드맵 — 크게 보기를 처음 누를 때 받는다 */
export function useOwnerMindmap(userId: number | undefined) {
  const [opened, setOpened] = useState(false);
  const { data, error, refetch } = useApi(() => getProfileMindmap(userId!), [userId], {
    enabled: opened && userId !== undefined,
  });
  const mindmap = useMemo(() => (data ? toFullMindmap(data) : null), [data]);
  const open = () => {
    if (error) refetch();
    setOpened(true);
  };
  return { mindmap, error, retry: refetch, open };
}
