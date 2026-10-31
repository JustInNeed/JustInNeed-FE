// 커뮤니티 프로필 API 응답 → 프로필 화면 데이터(ProfilePageData). 표시용 모양만 바꾸고 순서는 응답 그대로 둔다.
// - 해시태그는 raw 로 오므로 화면에 찍히는 곳에 '#' 를 붙인다 (세션 tags 는 SessionListItem 규칙대로 raw)
// - 마인드맵 카드는 따로 받아 나중에 채운다
import type {
  CommunityProfileCard,
  CommunityProfileMindmap,
  CommunityProfileResponse,
  CommunitySharedSession,
  MyProfileCard,
  MyProfileHashtag,
  MyProfileResponse,
  MySession,
  UpdateMyProfileRequest,
} from "@/lib/api";
import { formatDate, hostFromUrl, LINK_ONLY_SESSION_TITLE, withHash } from "@/lib/format";
import type { MindmapEdge, MindmapNode } from "@/lib/types";
import type { FullMindmap, ProfileDraft, ProfileMindmap, ProfilePageData } from "@/lib/viewTypes";

const DEFAULT_AVATAR = "🌱";
const FALLBACK_NAME = "이름 없는 사용자";

// 전체 마인드맵 캔버스 중심 (MindmapFullView 의 Mindmap 기본 크기 1200 × 760).
// Mindmap 이 중심에서 320 바깥의 노드를 밀어 넣으므로 그 안쪽 원에 놓는다
const CENTER_X = 600;
const CENTER_Y = 380;
const TAG_RADIUS = 150;
const NODE_RADIUS = 300;

const TAG_MIN_SIZE = 12;
const TAG_MAX_SIZE = 22;
const NODE_SIZE = 9;

const isWebUrl = (value: string) => /^https?:\/\//i.test(value);

/** URL 만 공개해 제목이 없을 때 제목 자리에 보여줄 해시태그 묶음. 해시태그도 없으면 안내 문구 */
export function titleFromTags(tags: string[]): string {
  return tags.map(withHash).join(" ") || LINK_ONLY_SESSION_TITLE;
}

/**
 * 고른 태그('#' 포함) → hashtagId. 서버 태그 행처럼 대소문자를 가리지 않는다.
 * 대소문자만 다른 두 칩은 같은 id 라 하나로 모은다 (서버는 중복 id 를 400 으로 거절). 행이 없는 태그는 missing 으로 돌려준다
 */
export function toHashtagIds(selected: string[], hashtags: CommunityProfileMindmap["hashtags"]) {
  const key = (tag: string) => withHash(tag).toLowerCase();
  const idOf = new Map(hashtags.map((t) => [key(t.name), t.hashtagId]));
  return {
    ids: [...new Set(selected.flatMap((t) => idOf.get(key(t)) ?? []))],
    missing: selected.filter((t) => !idOf.has(key(t))),
  };
}

/** 공개 세션 응답 → 세션 카드 값 */
export function toSession(session: CommunitySharedSession): MySession {
  return {
    id: session.id,
    title: session.title ?? "",
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    pageCount: session.pageCount,
    status: session.status,
    isFavorite: false,
    isPublic: true,
    tags: session.tags,
    isPinned: session.isPinned,
  };
}

/** GET /community/profiles/{userId} → 카드 · 세션을 뺀 프로필 화면 데이터. 카드 · 세션 탭 목록은 따로 받는다 */
export function toProfilePage(res: CommunityProfileResponse): ProfilePageData {
  return {
    profile: {
      name: res.nickname ?? FALLBACK_NAME,
      handle: res.nickname ? `@${res.nickname}` : "",
      avatar: DEFAULT_AVATAR,
      bio: res.bio ?? "",
      nodes: res.totalNodeCount,
      likes: res.likeCount,
      interests: res.interests.map(withHash),
      topTags: res.topHashtags.map((t) => ({ tag: withHash(t.name), count: t.nodeCount, isPublic: true })),
      visibility: res.visibility === "CONTENT" ? "full" : "url",
      pinnedSessionIds: [],
    },
    mindmaps: [],
    sessions: [],
    sharedSessionCount: res.sharedSessionCount,
    exploringCount: res.exploringCount,
    likedByMe: res.likedByMe,
    following: res.following,
  };
}

const toHashtagSetting = (t: MyProfileHashtag) => ({ id: t.hashtagId, tag: withHash(t.hashtag), count: t.nodeCount, isPublic: t.isPublic });

/** GET /community/me/profile → 카드를 뺀 프로필 화면 데이터. 세션 탭 목록은 따로 받는다 */
export function toMyProfilePage(res: MyProfileResponse): ProfilePageData {
  return {
    profile: {
      name: res.nickname ?? FALLBACK_NAME,
      handle: res.nickname ? `@${res.nickname}` : "",
      avatar: DEFAULT_AVATAR,
      bio: res.bio ?? "",
      nodes: res.totalNodeCount,
      likes: res.likeCount,
      interests: res.interests.map((i) => withHash(i.hashtag)),
      topTags: res.topHashtags.map(({ hashtag, nodeCount, isPublic }) => ({ tag: withHash(hashtag), count: nodeCount, isPublic })),
      visibility: res.visibility === "CONTENT" ? "full" : "url",
      pinnedSessionIds: res.pinnedSessions.map((s) => s.id),
    },
    mindmaps: [],
    sessions: res.pinnedSessions,
    hashtags: res.hashtags.map(toHashtagSetting),
    sharedSessionCount: res.sharedSessionCount,
  };
}

/** 프로필 수정 값 → PUT /community/me/profile 본문. 관심 해시태그는 '#' 없이, 끈 해시태그는 id 로 보낸다 */
export function toMyProfileUpdate(draft: ProfileDraft): UpdateMyProfileRequest {
  return {
    bio: draft.bio,
    visibility: draft.visibility === "full" ? "CONTENT" : "URL_ONLY",
    interests: draft.interests.map((t) => t.replace(/^#/, "")),
    hiddenHashtagIds: draft.hashtags.filter((t) => !t.isPublic).map((t) => t.id),
    pinnedSessionIds: draft.pinnedSessionIds,
  };
}

/** 제목 · 소개글은 URL 만 공개한 카드엔 없어 빈 값으로 둔다 — 제목 자리는 화면이 해시태그로 채운다 */
export function toProfileMindmap(card: CommunityProfileCard): ProfileMindmap {
  return {
    id: String(card.mindmapId),
    ownerId: card.owner.userId,
    title: card.title ?? "",
    snippet: card.snippet ?? "",
    hashtags: card.hashtags.map(withHash),
    nodes: card.nodeCount,
    likes: card.likeCount,
    likedByMe: card.likedByMe,
    bookmarks: card.bookmarkCount,
    bookmarkId: card.bookmarkId,
    exploring: card.exploringCount,
    exploringByMe: card.exploringByMe,
    when: formatDate(card.lastActivityAt),
    isPinned: card.isPinned,
  };
}

export function toMyProfileMindmap(card: MyProfileCard): ProfileMindmap {
  return { ...toProfileMindmap(card), isPublic: card.isPublic };
}

const onCircle = (radius: number, index: number, total: number) => {
  const angle = -Math.PI / 2 + (2 * Math.PI * index) / total;
  return { x: CENTER_X + radius * Math.cos(angle), y: CENTER_Y + radius * Math.sin(angle) };
};

/**
 * GET /community/profiles/{userId}/mindmap → 전체 마인드맵. 같은 응답이면 항상 같은 배치.
 * 해시태그는 안쪽 원, 노드는 바깥 원에 놓는다. 노드는 처음 이어진 해시태그 순으로 놓아 그 태그 가까이에 모인다.
 * 연결이 없는 노드 · 해시태그(세션에 태그가 없거나 관심 해시태그뿐일 때)도 같은 원에 함께 놓는다.
 */
export function toFullMindmap(res: CommunityProfileMindmap): FullMindmap {
  const tagIds = res.hashtags.map((t) => `tag:${t.hashtagId}`);
  const nodeIds = res.nodes.map((n) => `node:${n.nodeId}`);
  const known = new Set([...tagIds, ...nodeIds]);
  const edges = res.edges
    .filter((e) => known.has(e.from) && known.has(e.to))
    .map((e): MindmapEdge => [e.from, e.to]);

  const degree = new Map<string, number>();
  const firstTag = new Map<string, number>();
  const tagOrder = new Map(tagIds.map((id, i) => [id, i]));
  for (const [a, b] of edges) {
    degree.set(a, (degree.get(a) ?? 0) + 1);
    degree.set(b, (degree.get(b) ?? 0) + 1);
    const [tag, node] = tagOrder.has(a) ? [a, b] : [b, a];
    const order = tagOrder.get(tag);
    if (order !== undefined && !firstTag.has(node)) firstTag.set(node, order);
  }

  // 태그가 하나면 원 대신 가운데에 둔다
  const tagNodes: MindmapNode[] = res.hashtags.map((t, i) => ({
    id: tagIds[i],
    label: t.name,
    ...onCircle(tagIds.length > 1 ? TAG_RADIUS : 0, i, tagIds.length),
    size: Math.min(TAG_MAX_SIZE, TAG_MIN_SIZE + (degree.get(tagIds[i]) ?? 0)),
    group: "city",
  }));

  const rank = (id: string) => firstTag.get(id) ?? tagIds.length;
  const outerOrder = [...nodeIds].sort((a, b) => rank(a) - rank(b));
  const outerIndex = new Map(outerOrder.map((id, i) => [id, i]));

  const nodeUrls: Record<string, string> = {};
  const urlNodes: MindmapNode[] = res.nodes.map((n, i) => {
    const id = nodeIds[i];
    // 다른 사용자가 남긴 주소라 웹 주소만 연다 (javascript: 등 제외)
    if (n.sourceUrl && isWebUrl(n.sourceUrl)) nodeUrls[id] = n.sourceUrl;
    return {
      id,
      label: isWebUrl(n.label) ? hostFromUrl(n.label) : n.label,
      ...onCircle(NODE_RADIUS, outerIndex.get(id)!, nodeIds.length),
      size: NODE_SIZE,
      group: "sub",
    };
  });

  return { nodes: [...tagNodes, ...urlNodes], edges, nodeUrls };
}
