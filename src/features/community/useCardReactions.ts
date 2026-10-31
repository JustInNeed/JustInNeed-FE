"use client";

import { useCallback } from "react";
import { ApiError, SessionExpiredError, setCardBookmark, setCardExploring, setCardLike } from "@/lib/api";
import { useToast } from "@/lib/app/ToastContext";
import type { CardReaction, FeedPost } from "./toCommunityData";
import { useOptimisticPatches } from "./useOptimisticPatches";

const CARD_GONE_MESSAGE = "더 이상 공개되지 않는 마인드맵이에요.";
const SAVE_FAILED_MESSAGE = "저장에 실패했습니다. 다시 시도해 주세요.";

/** 좋아요 · 북마크 · 나도 탐색중 — mindmapId 기준이라 같은 카드가 여러 목록에 있어도 함께 바뀐다 */
export function useCardReactions() {
  const toast = useToast();
  const onError = useCallback(
    (e: unknown) => {
      if (e instanceof SessionExpiredError) return; // 이미 로그인 화면으로 이동했다
      if (e instanceof ApiError) toast.error(e.status === 404 ? CARD_GONE_MESSAGE : e.message);
      else toast.error(SAVE_FAILED_MESSAGE);
    },
    [toast],
  );
  const { patches, run } = useOptimisticPatches<CardReaction>(onError);

  /** 받은 카드에 내가 바꾼 값을 덮어쓴다 — 아래 토글에는 이 결과를 넘긴다 */
  const withReaction = useCallback((post: FeedPost): FeedPost => ({ ...post, ...patches[post.id] }), [patches]);

  const toggleLike = (post: FeedPost) => {
    const next = !post.likedByMe;
    void run({
      id: post.id,
      action: "like",
      optimistic: { likedByMe: next, likes: post.likes + (next ? 1 : -1) },
      revert: { likedByMe: post.likedByMe, likes: post.likes },
      request: () => setCardLike(post.mindmapId, next).then((r) => ({ likedByMe: r.likedByMe, likes: r.likeCount })),
    });
  };

  const toggleBookmark = (post: FeedPost) => {
    const next = !post.bookmarked;
    void run({
      id: post.id,
      action: "bookmark",
      optimistic: { bookmarked: next, bookmarks: post.bookmarks + (next ? 1 : -1) },
      revert: { bookmarked: post.bookmarked, bookmarks: post.bookmarks },
      request: () =>
        setCardBookmark(post.mindmapId, next).then((r) => ({ bookmarked: r.bookmarkId !== null, bookmarks: r.bookmarkCount })),
    });
  };

  const toggleExploring = (post: FeedPost) => {
    const next = !post.exploringByMe;
    void run({
      id: post.id,
      action: "exploring",
      optimistic: { exploringByMe: next, exploring: post.exploring + (next ? 1 : -1) },
      revert: { exploringByMe: post.exploringByMe, exploring: post.exploring },
      request: () =>
        setCardExploring(post.mindmapId, next).then((r) => ({ exploringByMe: r.exploringByMe, exploring: r.exploringCount })),
    });
  };

  return { withReaction, toggleLike, toggleBookmark, toggleExploring };
}
