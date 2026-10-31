// 화면이 props로 받는 데이터 모양 (홈 · 분석 · 커뮤니티 · 북마크 · 프로필 · 설정).
// API를 연결하면 응답을 이 모양으로 바꿔 넘기고 (홈: features/home/toHomeData), 테스트 픽스처(src/test/fixtures)도 같은 타입을 쓴다.
import type { SessionListItem } from "@/lib/api";
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
  /** 핀고정(공유)한 세션 id — 프로필 세션 탭 표시 순서 */
  pinnedSessionIds: number[];
}

/** 프로필 마인드맵 탭 카드 — 작성자는 프로필 주인이라 user 는 받지 않는다 */
export interface ProfileMindmap extends Omit<CommunityPost, "user"> {
  /** 상세 팝업의 관련 세션 (이 마인드맵의 출처가 된 세션). 다른 사용자 프로필은 팝업을 열 때 받아 비어 있다 */
  sessions: SessionListItem[];
  /** 다른 사용자 카드의 작성자 · 내 반응 */
  ownerId?: number;
  likedByMe?: boolean;
  bookmarkId?: number | null;
  exploringByMe?: boolean;
}

/** 프로필 화면 데이터 (내 프로필 · 다른 사용자 프로필 공통) */
export interface ProfilePageData {
  profile: ProfileData;
  /** 마인드맵 탭 카드 (표시 순서) */
  mindmaps: ProfileMindmap[];
  /** 프로필 주인의 전체 마인드맵 — 상세 팝업의 "마인드맵 크게 보기" */
  fullMindmap: FullMindmap;
  /** 프로필 주인의 세션. 세션 탭은 profile.pinnedSessionIds 순서로 골라 보여주고, 프로필 수정에선 핀고정 후보 목록 */
  sessions: SessionListItem[];
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

// ---------- 북마크 ----------
export interface BookmarkedMindmap {
  postId: string; // CommunityPost id
  savedAgo: string;
  /** 저장한 노드 — 원래 마인드맵에서 강조 표시 */
  savedNodeIds: string[];
}

// ---------- 커뮤니티 · 북마크 · 검색 화면 데이터 ----------
/** 작성자의 전체 마인드맵 — 노드 · 연결선과 노드의 원문 URL (전체 마인드맵 보기) */
export interface FullMindmap {
  nodes: MindmapNode[];
  edges: MindmapEdge[];
  /** 노드 id → 원문 URL. 연결 수와 상관없이 누르면 열린다 */
  nodeUrls: Record<string, string>;
}

/** post id → 마인드맵 상세 팝업에 보여줄 관련 세션 (이 마인드맵의 출처가 된 세션) */
export type RelatedSessionsByPost = Record<string, SessionListItem[]>;

/** 커뮤니티 추천 섹션 하나 — 추천 근거 해시태그 칩 + 추천 마인드맵 */
export interface CommunityRecommendation {
  basisTags: string[]; // '#' 포함
  posts: CommunityPost[];
}

/** 관심사가 비슷한 사람 */
export interface SimilarPerson {
  name: string;
  /** 표시용 한 줄 (예: "#파리 #먹거리") */
  tags: string;
  /** 이미 팔로우 중이면 true */
  following?: boolean;
}

export interface CommunityData {
  /** 관심 해시태그 기반 추천 */
  interestBased: CommunityRecommendation;
  /** 최근 저장한 해시태그 기반 추천 */
  recentBookmarkBased: CommunityRecommendation;
  /** post id → 추천 카드에 함께 보여줄 연관 URL (최대 2개 표시) */
  relatedUrls: Record<string, RelatedUrl[]>;
  /** 떠오르는 해시태그 — 오늘 / 이번 주 */
  trending: { today: TrendingHashtag[]; week: TrendingHashtag[] };
  similarPeople: SimilarPerson[];
  /** 검색바 드롭다운이 찾는 대상 — 마인드맵(프로필은 작성자에서 모음) · 연관 해시태그 */
  searchIndex: { posts: CommunityPost[]; tags: TrendingHashtag[] };
  relatedSessions: RelatedSessionsByPost;
  /** 내가 이미 좋아요 · 북마크한 post id — post 의 likes · bookmarks 수에 이미 포함돼 있다 */
  likedPostIds: string[];
  bookmarkedPostIds: string[];
}

/** 북마크 화면의 마인드맵 카드 하나 */
export interface SavedMindmap {
  post: CommunityPost;
  savedAgo: string;
  /** 저장한 노드 — 원래 마인드맵에서 강조 표시 */
  savedNodeIds: string[];
  /** 작성자의 전체 마인드맵 — 원래 마인드맵에서 보기 */
  authorMindmap: FullMindmap;
}

export interface BookmarkTagBundle {
  name: string;
  tags: string[]; // '#' 포함
}

export interface BookmarksData {
  mindmaps: SavedMindmap[];
  sessions: SessionListItem[];
  tagBundles: BookmarkTagBundle[];
  relatedSessions: RelatedSessionsByPost;
}

/** 검색 화면(보류)의 사용자 결과 */
export interface SearchProfile extends CommunityUser {
  nodes: number;
  likes: number;
}

export interface SearchData {
  mindmaps: CommunityPost[];
  profiles: SearchProfile[];
  /** 마인드맵 카드 아래 관련 세션 */
  relatedSessions: RelatedSessionsByPost;
}
