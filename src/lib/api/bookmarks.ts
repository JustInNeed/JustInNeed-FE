import { api } from "./client";
import type { SaveBookmarkRequest } from "./types";

/** 같은 선택을 다시 저장하면 있던 북마크를 돌려주고, name 을 보내면 그 이름으로 바꾼다 */
export const saveBookmark = (body: SaveBookmarkRequest) =>
  api.post<{ bookmarkId: number }>("/community/bookmarks", body);
