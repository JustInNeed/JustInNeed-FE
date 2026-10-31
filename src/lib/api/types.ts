// 백엔드 REST API 스키마 (OpenAPI 기준). 화면 도메인 타입의 원본(source of truth).

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  message: string | null;
}

// ---------- 인증 / 회원 ----------
export type SocialProvider = "KAKAO" | "NAVER" | "GOOGLE";

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}

export interface MemberResponse {
  id: number;
  nickname: string | null; // 가입 직후엔 null (닉네임 입력 전)
  socialProvider: SocialProvider;
  email: string | null;
  joinedAt: string; // ISO datetime
}

export interface NicknameUpdateRequest {
  nickname: string;
}

/** 닉네임 중복 확인 — 대소문자 무시, 내 현재 닉네임은 사용 가능 */
export interface NicknameAvailabilityResponse {
  nickname: string;
  available: boolean;
}

export interface LogoutRequest {
  refreshToken?: string;
}

export interface TokenRefreshRequest {
  refreshToken: string;
}

/** 소셜 로그인 콜백의 일회용 코드 → 토큰 교환 (POST /auth/token) */
export interface LoginCodeExchangeRequest {
  code: string;
}

export interface LoginTokenResponse extends TokenResponse {
  /** 닉네임 입력 전(가입 직후)이면 true → 닉네임 온보딩으로 */
  needsNickname: boolean;
}

/** 수집 중 → 분석 대기 → 분석 중 → 분석 완료 / 분석 실패 */
export type SessionStatus = "COLLECTING" | "READY" | "ANALYZING" | "COMPLETED" | "FAILED";

/** 목록용 — 본문 없음, 가벼움. */
export interface SessionListItem {
  id: number;
  title: string;
  startedAt: string; // ISO datetime (타임존 없음)
  endedAt: string | null;
  pageCount: number;
  status: SessionStatus;
  isFavorite: boolean;
  isPublic: boolean;
  tags: string[]; // '#' 없이 raw 문자열
}

/** GET /sessions 쿼리 — 기본 page 0 · size 10 · favorite false (true 면 즐겨찾기만) */
export interface SessionListParams {
  page?: number;
  size?: number;
  favorite?: boolean;
}

/**
 * GET /sessions — 한 페이지 + 개수. 정렬은 서버 기준 (진행 중 세션 먼저, 나머지는 끝난 시각 최근 순).
 * totalCount · favoriteCount 는 favorite · 페이지와 상관없이 내 세션 전체 기준.
 */
export interface SessionPage {
  sessions: SessionListItem[];
  hasNext: boolean;
  totalCount: number;
  favoriteCount: number;
}

export interface Source {
  /** 작성자가 원문 URL만 공개했으면 다른 사용자에게 title · excerpt · visitedAt 은 null */
  title: string | null;
  url: string;
  excerpt: string | null;
  visitedAt: string | null; // ISO datetime (KST, 타임존 없음). 모르면 null
}

export interface SessionSummary {
  /** @deprecated 본문 markdown으로 통합됨 — 화면에서 사용하지 않음 (백엔드 컬럼 제거 예정). */
  heading?: string;
  markdown: string;
}

/** 상세용 — 요약/출처 포함. */
export interface SessionDetail extends SessionListItem {
  summary: SessionSummary | null;
  sources: Source[]; // 방문 시각 오름차순
  /** 내 세션이면 true, 다른 사람의 공개 세션이면 false (읽기 전용) */
  isOwner: boolean;
}

/** 노드의 근거 원문 — 유닛 노드에만 있다 */
export interface SessionMindmapCitation {
  title: string;
  url: string;
  excerpt: string;
  visitedAt: string | null;
}

export interface SessionMindmapNode {
  /** 유닛 노드는 `https://x/y#pid` 처럼 URL 문자가 그대로 들어간다 */
  id: string;
  type: "root" | "topic" | "unit";
  keyword: string;
  score: number | null;
  childCount: number;
  citation: SessionMindmapCitation | null;
}

export interface SessionMindmapEdge {
  from: string;
  to: string;
  type: "hierarchy" | "related";
  primary: boolean;
}

/** GET /sessions/{id}/mindmap — 루트는 최대 3개, 분석 결과가 없으면 빈 목록 */
export interface SessionMindmap {
  nodes: SessionMindmapNode[];
  edges: SessionMindmapEdge[];
}

/** 모든 필드 optional — 보낸 필드만 수정. */
export interface SessionUpdateRequest {
  title?: string;
  editedMarkdown?: string;
  isPublic?: boolean;
  isFavorite?: boolean;
  tags?: string[];
}

export interface TagGroup {
  id: number;
  name: string;
  hashtags: string[];
  position: number;
  sessions: SessionListItem[];
}

export interface TagGroupCreateRequest {
  name: string;
  hashtags?: string[];
  position?: number;
}

export interface TagGroupUpdateRequest {
  name?: string;
  hashtags?: string[];
}

export interface TagGroupOrderRequest {
  /** 내 그룹 전체를 원하는 순서대로 빠짐없이 한 번씩. */
  groupIds: number[];
}

// ---------- 홈 ----------
/** 좌표는 응답에 없다 — 화면에서 정한다 (features/home/toHomeData) */
export interface HomeGraphNode {
  id: string;
  label: string;
  size: number;
  group: "core" | "city" | "logi" | "sub";
}

export interface HomeNodeMeta {
  /** 마지막으로 본 시점 — 30일이 지났으면 all */
  seen: "today" | "week" | "month" | "all";
  tags: string[]; // '#' 없이 raw 문자열
  /** 노드가 나온 세션 */
  sessionId?: number | null;
}

export interface HomeTagGroup {
  id: number;
  name: string;
  tags: string[]; // '#' 없이 raw 문자열
}

export interface HomeGraphResponse {
  nodes: HomeGraphNode[];
  edges: [string, string][];
  /** 노드 id → 메타. 메타가 없는 노드도 있다 */
  nodeMeta: Record<string, HomeNodeMeta>;
  tagGroups: HomeTagGroup[];
  filterTags: string[]; // '#' 없이 raw 문자열
}

export interface HomeStatsResponse {
  totalNodes: number;
  nodeDelta: number;
  hashtagCount: number;
  weekSessions: number;
  sessionDelta: number;
  avgSessionMinutes: number;
  deepReadingPct: number;
  deepReadingDelta: number;
}

export interface HomeWeekActivity {
  range: string; // "10.25 — 10.31"
  /** 항상 7개 — 오늘로 끝나는 최근 7일, 오래된 날부터 (월요일 시작이 아님) */
  days: { day: string; minutes: number }[];
}

export interface HomeTopTag {
  tag: string; // '#' 없이 raw 문자열
  count: number;
}

export interface HomeTimelineSlot {
  startTime: string; // "09:00"
  endTime: string | null; // 진행 중이면 null
  tags: string[]; // '#' 없이 raw 문자열
  sites: string[]; // 도메인
}

export interface HomeWeekVisit {
  domain: string;
  dwellSec: number;
}

export interface HomeWeekSession {
  dayOffset: number; // 0 = 오늘, -6 = 6일 전
  startedAt: string; // "10:10"
  tags: string[]; // '#' 없이 raw 문자열
  visits: HomeWeekVisit[];
}

/** GET /home — 기록이 없는 회원은 0 · 활동 0분 7일 · 빈 목록 */
export interface HomeResponse {
  graph: HomeGraphResponse;
  stats: HomeStatsResponse;
  weekActivity: HomeWeekActivity;
  topTags: HomeTopTag[];
  todayTimeline: HomeTimelineSlot[];
  weekSessions: HomeWeekSession[];
  /** 최근 순, 최대 300개 */
  sessions: SessionListItem[];
}
