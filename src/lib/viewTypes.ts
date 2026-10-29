// API가 아직 없는 화면(홈 · 분석 · 커뮤니티 · 북마크 · 프로필 · 설정)이 props로 받는 데이터 모양.
// API를 연결하면 응답을 이 모양으로 바꿔 넘기고, 테스트 픽스처(src/test/fixtures)도 같은 타입을 쓴다.

// ---------- 홈 마인드맵 필터 · 검색 ----------
export type GraphPeriod = "today" | "week" | "month" | "all";

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

// ---------- 분석 ----------
export interface BannerTip {
  title: string;
  body: string;
}

// ---------- 설정 ----------
export interface ExcludedUrl {
  url: string;
  on: boolean;
  isDefault: boolean;
}

// ---------- 북마크 ----------
export interface BookmarkedMindmap {
  postId: string; // CommunityPost id
  savedAgo: string;
  /** 저장한 노드 — 원래 마인드맵에서 강조 표시 */
  savedNodeIds: string[];
}
