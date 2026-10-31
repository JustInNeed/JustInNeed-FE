import { api } from "./client";
import type {
  BookmarkBundlePage,
  BookmarkMindmapPage,
  BookmarkOriginalResponse,
  RestoreBookmarkRequest,
  RestoreBookmarkResponse,
} from "./types";

/** /bookmarks 화면 — 탭마다 한 번에 불러오는 수 */
export const BOOKMARK_PAGE_SIZE = 10;

export const getBookmarkMindmaps = (page: number, size = BOOKMARK_PAGE_SIZE) =>
  api.get<BookmarkMindmapPage>(`/community/me/bookmarks/mindmaps?page=${page}&size=${size}`);

export const getBookmarkBundles = (page: number, size = BOOKMARK_PAGE_SIZE) =>
  api.get<BookmarkBundlePage>(`/community/me/bookmarks/hashtag-bundles?page=${page}&size=${size}`);

/** 남의 북마크이거나 이미 지웠으면 404 */
export const deleteBookmark = (bookmarkId: number) => api.del<void>(`/community/bookmarks/${bookmarkId}`);

/** 원본을 볼 수 없으면 sourceAvailable 이 false · mindmap 이 null 이다 */
export const getBookmarkOriginal = (bookmarkId: number) =>
  api.get<BookmarkOriginalResponse>(`/community/me/bookmarks/${bookmarkId}/original`);

/** 되돌리기 — 목록 항목이 받은 저장 대상을 그대로 다시 저장한다. 새 bookmarkId 가 온다 */
export const restoreBookmark = (body: RestoreBookmarkRequest) =>
  api.post<RestoreBookmarkResponse>("/community/bookmarks", body);
