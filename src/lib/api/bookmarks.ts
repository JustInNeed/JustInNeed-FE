import { api } from "./client";
import type {
  BookmarkBundlePage,
  BookmarkMindmapPage,
  BookmarkOriginalResponse,
  SaveBookmarkRequest,
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

/** 같은 선택을 다시 저장하면 있던 북마크를 돌려주고, name 을 보내면 그 이름으로 바꾼다 */
export const saveBookmark = (body: SaveBookmarkRequest) =>
  api.post<{ bookmarkId: number }>("/community/bookmarks", body);
