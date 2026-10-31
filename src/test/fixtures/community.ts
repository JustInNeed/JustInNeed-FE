// 북마크 · 검색 화면 픽스처 — design.ts 의 시안 데이터를 화면이 받는 모양(viewTypes)으로 묶는다.
// 화면 테스트는 이 값을 props 로 넘겨 "이 데이터면 이렇게 보인다"를 검증한다.
import type {
  BookmarksData,
  CommunityPost,
  FullMindmap,
  RelatedSessionsByPost,
  SearchData,
} from "@/lib/viewTypes";
import {
  BOOKMARKED_MINDMAPS,
  BOOKMARK_TAG_BUNDLES,
  COMMUNITY_FEED,
  MINDMAP_EDGES,
  MINDMAP_NODES,
  MINDMAP_NODE_URLS,
  MOCK_SESSIONS,
  relatedSessionsFor,
} from "./design";

/** 작성자 전체 마인드맵 (시안은 모두 같은 유럽 여행 마인드맵) */
export const AUTHOR_MINDMAP: FullMindmap = {
  nodes: MINDMAP_NODES,
  edges: MINDMAP_EDGES,
  nodeUrls: MINDMAP_NODE_URLS,
};

const relatedSessionsOf = (posts: CommunityPost[]): RelatedSessionsByPost =>
  Object.fromEntries(posts.map((p) => [p.id, relatedSessionsFor(p)]));

export const BOOKMARKS_DATA: BookmarksData = {
  mindmaps: BOOKMARKED_MINDMAPS.flatMap((b) => {
    const post = COMMUNITY_FEED.find((p) => p.id === b.postId);
    return post ? [{ post, savedAgo: b.savedAgo, savedNodeIds: b.savedNodeIds, authorMindmap: AUTHOR_MINDMAP }] : [];
  }),
  sessions: MOCK_SESSIONS,
  tagBundles: BOOKMARK_TAG_BUNDLES,
  relatedSessions: relatedSessionsOf(COMMUNITY_FEED),
};

export const SEARCH_DATA: SearchData = {
  mindmaps: COMMUNITY_FEED,
  profiles: COMMUNITY_FEED.map((p) => ({ ...p.user, nodes: p.nodes, likes: p.likes })),
  relatedSessions: relatedSessionsOf(COMMUNITY_FEED),
};
