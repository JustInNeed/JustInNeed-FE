"use client";

import { useCallback, useEffect, useState } from "react";
import { searchCommunityHashtags, searchCommunityMindmaps, searchCommunityProfiles } from "@/lib/api";
import type { TrendingHashtag } from "@/lib/viewTypes";
import { toFeedPost, toSearchedProfile, toSearchedTag, type FeedPost, type SearchedProfile } from "./toCommunityData";

export const SEARCH_DEBOUNCE_MS = 250;

export interface SearchResults {
  tags: TrendingHashtag[];
  profiles: SearchedProfile[];
  maps: FeedPost[];
  /** 실패한 그룹이 있다 — 나머지 그룹은 그대로 보여준다 */
  failed: boolean;
}

interface Settled {
  q: string;
  attempt: number;
  results: SearchResults;
}

/** 백엔드와 같은 규칙 — 앞 # · 앞뒤 공백 제거. 비면 400 이라 보내지 않는다 */
export const normalizeSearchQuery = (raw: string) => raw.trim().replace(/^#+/, "").trim();

const valueOf = <T,>(result: PromiseSettledResult<T>, fallback: T) => (result.status === "fulfilled" ? result.value : fallback);

/**
 * 검색 드롭다운 데이터 — 입력이 멈추면 요청하고, 가장 마지막 검색어의 응답만 쓴다.
 * results 가 null 이면 현재 검색어의 결과를 기다리는 중이다.
 */
export function useCommunitySearch(rawQuery: string) {
  const q = normalizeSearchQuery(rawQuery);
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<Settled | null>(null);

  useEffect(() => {
    if (!q) return;
    let active = true;
    const timer = setTimeout(() => {
      void Promise.allSettled([searchCommunityHashtags(q), searchCommunityProfiles(q), searchCommunityMindmaps(q)]).then(
        ([tags, profiles, maps]) => {
          if (!active) return;
          setSettled({
            q,
            attempt,
            results: {
              tags: valueOf(tags, { hashtags: [] }).hashtags.map(toSearchedTag),
              profiles: valueOf(profiles, { profiles: [], hasNext: false }).profiles.map(toSearchedProfile),
              maps: valueOf(maps, { mindmaps: [], hasNext: false }).mindmaps.map(toFeedPost),
              failed: [tags, profiles, maps].some((r) => r.status === "rejected"),
            },
          });
        },
      );
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [q, attempt]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  const results = settled && settled.q === q && settled.attempt === attempt ? settled.results : null;

  return { q, results, retry };
}
