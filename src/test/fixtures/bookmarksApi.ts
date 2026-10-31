// 북마크 API 응답 픽스처 — 백엔드 응답 모양 그대로.
import type {
  BookmarkBundleItem,
  BookmarkBundlePage,
  BookmarkMindmapItem,
  BookmarkMindmapPage,
  BookmarkOriginalResponse,
} from "@/lib/api";

/** 픽스처 시각을 "N일 전" 으로 고정하기 위한 기준 시각 (UTC) */
export const BOOKMARK_NOW = Date.parse("2026-11-01T03:00:00Z");

export const bookmarkMindmap = (
  overrides: Partial<BookmarkMindmapItem> & Pick<BookmarkMindmapItem, "bookmarkId">,
): BookmarkMindmapItem => ({
  sessionId: 12,
  cardBookmark: true,
  saveType: "MINI_MINDMAP",
  targetType: "NODE",
  targetIds: [81, 82],
  sourceMindmapId: 101,
  owner: { userId: 101, nickname: "wanderlust" },
  title: "동유럽 3주 살이 전체 동선",
  snippet: "프라하 → 비엔나 → 부다페스트 야간열차 동선과 예산.",
  hashtags: [
    { hashtagId: 1, name: "프라하" },
    { hashtagId: 2, name: "동유럽" },
    { hashtagId: 3, name: "야간열차" },
  ],
  nodes: [
    { nodeId: 81, label: "프라하성", sourceUrl: "https://www.hrad.cz/", content: "성 입장권 정리", visibilityScope: "CONTENT" },
    { nodeId: 82, label: "카를교", sourceUrl: null, content: null, visibilityScope: "CONTENT" },
  ],
  edges: [
    { from: "tag:1", to: "node:81" },
    { from: "node:81", to: "node:82" },
  ],
  nodeCount: 14,
  likeCount: 28,
  savedAt: "2026-10-28T02:00:00.482424Z",
  ...overrides,
});

export const bookmarkBundle = (
  overrides: Partial<BookmarkBundleItem> & Pick<BookmarkBundleItem, "bookmarkId">,
): BookmarkBundleItem => ({
  saveType: "HASHTAG_BUNDLE",
  targetType: "HASHTAG",
  targetIds: [5, 6],
  sourceMindmapId: 102,
  name: "미술관 모음",
  hashtags: ["루브르", "오르세"],
  savedAt: "2026-10-30T02:00:00Z",
  ...overrides,
});

export const CARD_BOOKMARK = bookmarkMindmap({ bookmarkId: 21 });

/** 노드를 골라 저장 — 세션은 하나지만 카드 저장은 아니다 */
export const PICKED_BOOKMARK = bookmarkMindmap({
  bookmarkId: 22,
  sessionId: 13,
  cardBookmark: false,
  targetIds: [90],
  owner: { userId: 102, nickname: "foodtrip" },
  sourceMindmapId: 102,
  title: "파리 미식 지도",
  snippet: "1구부터 20구까지 비스트로 정리.",
  hashtags: [{ hashtagId: 4, name: "파리" }],
  nodeCount: 8,
  likeCount: 41,
  savedAt: "2026-10-31T02:00:00Z",
});

/** 여러 세션에서 골라 저장 — 세션 · 제목 · 요약이 없다 */
export const MIXED_BOOKMARK = bookmarkMindmap({
  bookmarkId: 23,
  sessionId: null,
  cardBookmark: false,
  targetIds: [91, 92],
  title: null,
  snippet: null,
  hashtags: [
    { hashtagId: 7, name: "화장실" },
    { hashtagId: 8, name: "놀이" },
  ],
  nodeCount: 2,
  likeCount: 3,
  savedAt: "2026-11-01T01:30:00Z",
});

export const NAMED_BUNDLE = bookmarkBundle({ bookmarkId: 31 });
export const SAME_NAME_BUNDLE = bookmarkBundle({ bookmarkId: 32, targetIds: [7], hashtags: ["프라도"] });
export const UNNAMED_BUNDLE = bookmarkBundle({ bookmarkId: 33, name: null, targetIds: [8, 9], hashtags: ["호스텔", "무료투어"] });

export const BOOKMARK_MINDMAPS_PAGE: BookmarkMindmapPage = {
  mindmaps: [CARD_BOOKMARK, PICKED_BOOKMARK, MIXED_BOOKMARK],
  hasNext: false,
};

export const BOOKMARK_BUNDLES_PAGE: BookmarkBundlePage = {
  bundles: [NAMED_BUNDLE, SAME_NAME_BUNDLE, UNNAMED_BUNDLE],
  hasNext: false,
};

export const BOOKMARK_ORIGINAL: BookmarkOriginalResponse = {
  sourceAvailable: true,
  mindmap: {
    mindmapId: 101,
    ownerId: 101,
    nickname: "wanderlust",
    title: "wanderlust님의 전체 마인드맵",
    hashtags: [{ hashtagId: 1, ownerId: 101, name: "프라하" }],
    nodes: [
      { nodeId: 81, label: "프라하성", sourceUrl: "https://www.hrad.cz/", content: "성 입장권 정리", visibilityScope: "CONTENT" },
      { nodeId: 82, label: "카를교", sourceUrl: null, content: null, visibilityScope: "CONTENT" },
      { nodeId: 83, label: "비엔나", sourceUrl: null, content: null, visibilityScope: "CONTENT" },
    ],
    edges: [
      { from: "tag:1", to: "node:81" },
      { from: "node:81", to: "node:82" },
      { from: "node:81", to: "node:83" },
    ],
    topHashtags: [{ hashtagId: 1, name: "프라하", nodeCount: 3 }],
  },
  highlightedNodeIds: [81, 82],
};

export const BOOKMARK_ORIGINAL_GONE: BookmarkOriginalResponse = {
  sourceAvailable: false,
  mindmap: null,
  highlightedNodeIds: [],
};
