"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ApiError,
  BOOKMARK_PAGE_SIZE,
  deleteBookmark,
  saveBookmark,
  SessionExpiredError,
  setCardBookmark,
  type BookmarkSaveTarget,
} from "@/lib/api";
import { useToast } from "@/lib/app/ToastContext";
import type { SavedBundle, SavedMindmap } from "@/lib/viewTypes";
import { useSearchTab, type FetchSearchPage, type SearchTab } from "./useSearchTab";

/** useSearchTab 은 검색어가 있어야 불러온다 — 북마크 목록은 검색어가 없어 고정값을 넘긴다 */
const ALL_BOOKMARKS = "all";
const TAB_OPTIONS = { pageSize: BOOKMARK_PAGE_SIZE, failedMessage: "북마크를 불러오지 못했어요." };

const REMOVE_FAILED_MESSAGE = "북마크를 해제하지 못했어요. 다시 시도해 주세요.";
const UNDO_FAILED_MESSAGE = "되돌리지 못했어요. 다시 시도해 주세요.";

interface Bookmarked {
  bookmarkId: number;
}

const bookmarkIdOf = (item: Bookmarked) => item.bookmarkId;

const without = (set: ReadonlySet<number>, id: number) => {
  const next = new Set(set);
  next.delete(id);
  return next;
};

export interface BookmarkTab<T> extends SearchTab<T> {
  /** 바로 목록에서 빼고 지운다. 실패하면 제자리로 돌아온다 */
  remove: (item: T) => void;
}

/** 다시 저장 — 새 bookmarkId 로 항목을 돌려준다 */
export type ResaveBookmark<T> = (item: T) => Promise<T>;

/** 목록이 준 저장 대상을 그대로 다시 저장한다. 지금 저장할 수 있는 대상이 없으면 서버의 입력 오류 대신 되돌리기 실패로 알린다 */
async function saveAgain(
  { sourceMindmapId, ...target }: BookmarkSaveTarget<"MINI_MINDMAP" | "HASHTAG_BUNDLE">,
  name?: string,
): Promise<number> {
  if (target.targetIds.length === 0) throw new Error("다시 저장할 대상이 없습니다.");
  const { bookmarkId } = await saveBookmark({ ...target, sourceMindmapId: sourceMindmapId ?? undefined, name });
  return bookmarkId;
}

/** 카드 저장은 카드 API 로 되살린다 — 일반 저장으로 남기면 카드의 북마크 표시와 끊어진다 */
async function restoreMindmapId({ cardBookmark, sessionId, target }: SavedMindmap): Promise<number> {
  if (!cardBookmark || sessionId === null) return saveAgain(target);
  const { bookmarkId } = await setCardBookmark(sessionId, true);
  if (bookmarkId === null) throw new Error("카드 저장 응답에 bookmarkId 가 없습니다.");
  return bookmarkId;
}

export const resaveMindmap: ResaveBookmark<SavedMindmap> = async (item) => ({
  ...item,
  bookmarkId: await restoreMindmapId(item),
  savedAgo: "방금 전",
});

export const resaveBundle: ResaveBookmark<SavedBundle> = async (item) => ({
  ...item,
  bookmarkId: await saveAgain(item.target, item.name ?? undefined),
});

/** /bookmarks 의 탭 하나 — 탭마다 따로 불러와서 한쪽이 실패해도 다른 쪽은 그대로 보인다 */
export function useBookmarkTab<T extends Bookmarked>(fetchPage: FetchSearchPage<T>, resave: ResaveBookmark<T>): BookmarkTab<T> {
  const toast = useToast();
  const { shiftList, ...tab } = useSearchTab(ALL_BOOKMARKS, ALL_BOOKMARKS, fetchPage, bookmarkIdOf, TAB_OPTIONS);

  // 받은 목록은 두고 해제한 id 만 거른다 — 실패하면 받은 자리로 그대로 돌아온다
  const [removed, setRemoved] = useState<ReadonlySet<number>>(new Set());
  // 되돌린 항목은 새로 저장된 것이라 서버 목록처럼 맨 위로 간다
  const [restored, setRestored] = useState<T[]>([]);

  const onError = useCallback(
    (e: unknown, fallback: string) => {
      if (e instanceof SessionExpiredError) return; // 이미 로그인 화면으로 이동했다
      toast.error(e instanceof ApiError ? e.message : fallback);
    },
    [toast],
  );

  const undo = async (item: T) => {
    try {
      const saved = await resave(item);
      setRestored((cur) => [saved, ...cur]);
      shiftList(1);
    } catch (e) {
      onError(e, UNDO_FAILED_MESSAGE);
    }
  };

  const remove = async (item: T) => {
    const id = item.bookmarkId;
    setRemoved((cur) => new Set(cur).add(id));
    shiftList(-1);
    try {
      await deleteBookmark(id);
    } catch (e) {
      setRemoved((cur) => without(cur, id));
      shiftList(1);
      onError(e, REMOVE_FAILED_MESSAGE);
      return;
    }
    // 지운 뒤에 안내한다 — 지우는 중에 되돌리면 새 저장 뒤에 지우기가 끝나 사라질 수 있다
    toast.success("북마크를 해제했어요.", { action: { label: "되돌리기", onClick: () => void undo(item) } });
  };

  const items = useMemo(() => {
    const restoredIds = new Set(restored.map(bookmarkIdOf));
    return [...restored, ...tab.items.filter((item) => !restoredIds.has(item.bookmarkId))].filter(
      (item) => !removed.has(item.bookmarkId),
    );
  }, [restored, tab.items, removed]);

  return { ...tab, shiftList, items, remove: (item) => void remove(item) };
}
