// 화면이 props로 받는 데이터 모양 (홈 · 분석 · 커뮤니티 · 북마크 · 프로필 · 설정).
// API를 연결하면 응답을 이 모양으로 바꿔 넘기고 (홈: features/home/toHomeData), 테스트 픽스처(src/test/fixtures)도 같은 타입을 쓴다.
import type { BookmarkSaveTarget, SessionListItem } from "@/lib/api";
import type { MindmapEdge, MindmapNode } from "@/lib/types";

// ---------- 홈 마인드맵 필터 · 검색 ----------
export type GraphPeriod = "today" | "week" | "month" | "all";

/** 노드를 마지막으로 본 시점과 연결된 해시태그 (# 없는 raw) */
export interface GraphNodeMeta {
  /** all: 30일이 지나 기간 "전체"에서만 보이는 노드 */
  seen: GraphPeriod;
  tags: string[];
  /** 노드가 나온 세션 — "관련 세션 보기" 대상 */
  sessionId?: number;
}

export interface GraphTagGroup {
  id: number;
  name: string;
  tags: string[]; // '#' 없는 raw
}

/** 홈 마인드맵과 필터 재료 */
export interface HomeGraph {
  nodes: MindmapNode[];
  edges: MindmapEdge[];
  /** 노드 id → 메타. 메타가 없는 노드는 필터에 걸리지 않는다 */
  nodeMeta: Record<string, GraphNodeMeta>;
  tagGroups: GraphTagGroup[];
  /** 필터 팝오버에 보여줄 해시태그 (# 없는 raw) */
  filterTags: string[];
}

// ---------- 커뮤니티 ----------
export interface CommunityUser {
  name: string;
  avatar: string;
  handle: string; // '@' 포함
}

export interface CommunityPost {
  id: string;
  user: CommunityUser;
  title: string;
  snippet: string;
  hashtags: string[]; // '#' 포함 (표시용)
  nodes: number;
  likes: number;
  bookmarks: number;
  exploring: number;
  when: string;
}

/** 추천 마인드맵과 함께 보여줄 연관 URL */
export interface RelatedUrl {
  title: string;
  url: string;
}

export interface TrendingHashtag {
  tag: string;
  count: number;
  trend: number;
}

// ---------- 프로필 ----------
/** 노드 공개 범위 — url: 원문 URL만 공개 (기본값), full: 내용까지 공개 */
export type NodeVisibility = "url" | "full";

/** 내 노드에서 모은 해시태그. 비공개면 다른 사용자 프로필 보기에서 태그와 그 노드가 빠짐 */
export interface ProfileHashtag {
  tag: string; // '#' 포함
  count: number;
  isPublic: boolean;
}

/** 프로필 수정의 공개 설정 행 — 저장할 때 id 로 보낸다 */
export interface ProfileHashtagSetting extends ProfileHashtag {
  id: number;
}

export interface ProfileData {
  name: string;
  handle: string;
  avatar: string;
  bio: string;
  nodes: number;
  likes: number;
  interests: string[];
  topTags: ProfileHashtag[];
  visibility: NodeVisibility;
  /** 핀고정한 세션 id — 공개 세션 중 맨 앞에 보이는 순서. 공개 여부는 바꾸지 않는다 */
  pinnedSessionIds: number[];
}

/** 프로필 수정에서 저장하는 값 (닉네임은 회원 정보로 따로 저장) */
export type ProfileDraft = Pick<ProfileData, "bio" | "interests" | "visibility" | "pinnedSessionIds"> & {
  hashtags: ProfileHashtagSetting[];
};

/** 프로필 마인드맵 탭 카드 — 작성자는 프로필 주인이라 user 는 받지 않는다 */
export interface ProfileMindmap extends Omit<CommunityPost, "user"> {
  /** 다른 사용자 카드의 작성자 · 내 반응 */
  ownerId?: number;
  likedByMe?: boolean;
  bookmarkId?: number | null;
  exploringByMe?: boolean;
  /** 내 프로필 카드의 공개 상태 */
  isPublic?: boolean;
  isPinned?: boolean;
}

/** 프로필 화면 데이터 (내 프로필 · 다른 사용자 프로필 공통) */
export interface ProfilePageData {
  profile: ProfileData;
  /** 마인드맵 탭 카드 (표시 순서) */
  mindmaps: ProfileMindmap[];
  /** profile.pinnedSessionIds 의 세션 — 프로필 수정의 고정 목록. 세션 탭 목록은 따로 받아 다른 사용자는 비어 있다 */
  sessions: SessionListItem[];
  /** 공개 세션 수 */
  sharedSessionCount: number;
  /** 내 프로필 — 내 해시태그 전체 (프로필 수정의 공개 설정) */
  hashtags?: ProfileHashtagSetting[];
  /** 다른 사용자 프로필의 "나도 탐색중" 수 */
  exploringCount?: number;
  /** 다른 사용자 프로필에 내가 누른 좋아요 · 팔로우 */
  likedByMe?: boolean;
  following?: boolean;
}

// ---------- 홈 대시보드 ----------
export interface TimelineSite {
  name: string;
  favicon: string;
  color: string;
}

export interface TimelineSlot {
  time: string;
  tags: string[];
  sites: TimelineSite[];
}

export interface WeekSessionVisit {
  site: TimelineSite;
  dwellSec: number;
}

export interface WeekSession {
  dayOffset: number;
  startedAt: string;
  tags: string[];
  visits: WeekSessionVisit[];
}

/** 홈 통계 카드 — 증감은 지난주 대비 */
export interface HomeStats {
  totalNodes: number;
  nodeDelta: number;
  hashtagCount: number;
  weekSessions: number;
  sessionDelta: number;
  avgSessionMinutes: number;
  /** Deep Reading 비율 (%) */
  deepReadingPct: number;
  /** Deep Reading 비율 증감 (%p) */
  deepReadingDelta: number;
}

/** 이번 주 활동 막대 — 오늘로 끝나는 최근 7일의 요일별 탐색 시간 (오래된 날부터) */
export interface DayActivity {
  day: string; // "월"
  minutes: number;
}

export interface HomeTopTag {
  tag: string; // '#' 포함
  count: number;
}

export interface HomeData {
  graph: HomeGraph;
  stats: HomeStats;
  /** range: 표시용 기간 ("4.20 — 4.26"). days 는 받은 순서대로 그린다 */
  weekActivity: { range: string; days: DayActivity[] };
  /** 상위 해시태그 (많은 순, 최대 10개) */
  topTags: HomeTopTag[];
  /** 오늘의 탐색 타임라인 (시간대별) */
  todayTimeline: TimelineSlot[];
  /** "이번 주" 타임라인 재료 — 최근 7일 세션 */
  weekSessions: WeekSession[];
  /** 그래프 검색 · "관련 세션 보기" 대상 (최근 순) */
  sessions: SessionListItem[];
}

// ---------- 설정 ----------
export interface ExcludedUrl {
  id: number;
  url: string;
  on: boolean;
  isDefault: boolean;
}

/** 외부 플랫폼 연동 (메뉴는 숨김 상태) */
export interface Integration {
  name: string;
  connected: boolean;
}

// ---------- 커뮤니티 · 북마크 · 검색 화면 데이터 ----------
/** 작성자의 전체 마인드맵 — 노드 · 연결선과 노드의 원문 URL (전체 마인드맵 보기) */
export interface FullMindmap {
  nodes: MindmapNode[];
  edges: MindmapEdge[];
  /** 노드 id → 원문 URL. 연결 수와 상관없이 누르면 열린다 */
  nodeUrls: Record<string, string>;
}

/** 마인드맵 상세 팝업이 쓰는 카드 값 — 북마크 응답에는 없는 저장 수 · 활동 값은 빠진다 */
export type MindmapDetailPost = Pick<CommunityPost, "id" | "user" | "title" | "snippet" | "hashtags" | "nodes" | "likes">;

/** 북마크 화면의 마인드맵 카드 하나 */
export interface SavedMindmap {
  bookmarkId: number;
  /** 세션 하나에서 저장한 카드면 그 세션. 여러 세션에서 골랐으면 null 이라 관련 세션이 없다 */
  sessionId: number | null;
  ownerId: number;
  post: MindmapDetailPost;
  savedAgo: string;
  /** 카드 전체를 저장했는지 — 되돌릴 때 저장 경로가 다르다 */
  cardBookmark: boolean;
  target: BookmarkSaveTarget<"MINI_MINDMAP">;
}

/** 북마크 화면의 해시태그 묶음 하나 */
export interface SavedBundle {
  bookmarkId: number;
  /** 이름 없이 저장했으면 null 이라 태그를 대신 보여준다 */
  name: string | null;
  tags: string[]; // '#' 포함
  target: BookmarkSaveTarget<"HASHTAG_BUNDLE">;
}
