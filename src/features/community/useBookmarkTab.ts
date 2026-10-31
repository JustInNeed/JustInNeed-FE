"use client";

import { useMemo, useState } from "react";
import { BOOKMARK_PAGE_SIZE } from "@/lib/api";
import { useToast } from "@/lib/app/ToastContext";
import { useSearchTab, type FetchSearchPage, type SearchTab } from "./useSearchTab";

/** useSearchTab 은 검색어가 있어야 불러온다 — 북마크 목록은 검색어가 없어 고정값을 넘긴다 */
const ALL_BOOKMARKS = "all";
const TAB_OPTIONS = { pageSize: BOOKMARK_PAGE_SIZE, failedMessage: "북마크를 불러오지 못했어요." };

interface Bookmarked {
  bookmarkId: number;
}

const bookmarkIdOf = (item: Bookmarked) => item.bookmarkId;

export interface BookmarkTab<T> extends SearchTab<T> {
  remove: (item: T) => void;
}

/** /bookmarks 의 탭 하나 — 탭마다 따로 불러와서 한쪽이 실패해도 다른 쪽은 그대로 보인다 */
export function useBookmarkTab<T extends Bookmarked>(fetchPage: FetchSearchPage<T>): BookmarkTab<T> {
  const toast = useToast();
  const tab = useSearchTab(ALL_BOOKMARKS, ALL_BOOKMARKS, fetchPage, bookmarkIdOf, TAB_OPTIONS);

  const [removed, setRemoved] = useState<ReadonlySet<number>>(new Set());
  const remove = (item: T) => {
    setRemoved((cur) => new Set(cur).add(item.bookmarkId));
    toast.success("북마크를 해제했어요.");
  };

  const items = useMemo(() => tab.items.filter((item) => !removed.has(item.bookmarkId)), [tab.items, removed]);

  return { ...tab, items, remove };
}
