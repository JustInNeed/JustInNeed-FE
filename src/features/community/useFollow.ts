"use client";

import { useCallback } from "react";
import { ApiError, SessionExpiredError, setProfileFollow } from "@/lib/api";
import { useToast } from "@/lib/app/ToastContext";
import type { SimilarPersonRow } from "./toCommunityData";
import { useOptimisticPatches } from "./useOptimisticPatches";

type FollowState = Pick<SimilarPersonRow, "following">;

/** 비슷한 사람 팔로우 — 먼저 바꾸고 실패하면 되돌린다 */
export function useFollow() {
  const toast = useToast();
  const onError = useCallback(
    (e: unknown) => {
      if (e instanceof SessionExpiredError) return; // 이미 로그인 화면으로 이동했다
      toast.error(e instanceof ApiError ? e.message : "팔로우 변경에 실패했습니다. 다시 시도해 주세요.");
    },
    [toast],
  );
  const { patches, run } = useOptimisticPatches<FollowState>(onError);

  const withFollow = useCallback(
    (person: SimilarPersonRow): SimilarPersonRow => ({ ...person, ...patches[String(person.userId)] }),
    [patches],
  );

  const toggleFollow = (person: SimilarPersonRow) => {
    const next = !person.following;
    void run({
      id: String(person.userId),
      action: "follow",
      optimistic: { following: next },
      revert: { following: person.following },
      request: () => setProfileFollow(person.userId, next),
    });
  };

  return { withFollow, toggleFollow };
}
