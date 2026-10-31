// 북마크 API 응답 → 화면 데이터 변환.
import type { BookmarkBundleItem, BookmarkMindmapItem, BookmarkOriginalResponse, BookmarkSaveTarget } from "@/lib/api";
import { toFullMindmap } from "@/features/profile/toProfilePage";
import { savedAgo, withHash } from "@/lib/format";
import type { FullMindmap, SavedBundle, SavedMindmap } from "@/lib/viewTypes";
import { DEFAULT_AVATAR, displayName, URL_ONLY_CARD_TITLE } from "./toCommunityData";

const toTarget = <S extends string>({ saveType, targetType, targetIds, sourceMindmapId }: BookmarkSaveTarget<S>) => ({
  saveType,
  targetType,
  targetIds,
  sourceMindmapId,
});

/** savedAt 은 UTC 시각이라 그대로 시각으로 읽는다 (formatDate 처럼 글자를 자르면 UTC 날짜가 된다) */
export function toSavedMindmap(item: BookmarkMindmapItem, now = Date.now()): SavedMindmap {
  const hashtags = item.hashtags.map((t) => withHash(t.name));
  const urlOnly = item.title === null;
  return {
    bookmarkId: item.bookmarkId,
    sessionId: item.sessionId,
    ownerId: item.owner.userId,
    post: {
      // 미리보기 모양이 되돌리기로 id 가 바뀌어도 그대로이도록 세션을 먼저 쓴다
      id: String(item.sessionId ?? item.bookmarkId),
      user: { name: displayName(item.owner.nickname), avatar: DEFAULT_AVATAR, handle: "" },
      // URL 만 공개 — /community 카드처럼 해시태그가 제목 자리로 간다
      title: item.title ?? (hashtags.join(" ") || URL_ONLY_CARD_TITLE),
      snippet: item.snippet ?? "",
      hashtags: urlOnly ? [] : hashtags,
      nodes: item.nodeCount,
      likes: item.likeCount,
    },
    savedAgo: savedAgo(new Date(item.savedAt).getTime(), now),
    cardBookmark: item.cardBookmark,
    target: toTarget(item),
  };
}

export const toSavedBundle = (item: BookmarkBundleItem): SavedBundle => ({
  bookmarkId: item.bookmarkId,
  name: item.name,
  tags: item.hashtags.map(withHash),
  target: toTarget(item),
});

export interface OriginalView {
  mindmap: FullMindmap;
  highlightIds: string[];
}

/** 원래 마인드맵 → 전체 보기 값. 볼 수 없으면 null. toFullMindmap 의 노드 id 가 node:<nodeId> 라 강조 id 도 맞춘다 */
export function toOriginalView({ sourceAvailable, mindmap, highlightedNodeIds }: BookmarkOriginalResponse): OriginalView | null {
  if (!sourceAvailable || !mindmap) return null;
  return { mindmap: toFullMindmap(mindmap), highlightIds: highlightedNodeIds.map((id) => `node:${id}`) };
}
