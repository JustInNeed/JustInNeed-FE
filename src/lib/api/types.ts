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

// ---------- 커뮤니티 프로필 (다른 사용자 프로필 화면) ----------
export type CommunityProfileVisibility = "URL_ONLY" | "CONTENT";

export interface CommunityProfileHashtag {
  hashtagId: number;
  name: string; // '#' 없는 원문
  nodeCount: number;
}

/** 프로필에 공유한 세션. URL_ONLY 에선 title 키가 없고, CONTENT 에선 title · markdown · sources 가 더 온다 */
export interface CommunitySharedSession {
  id: number;
  title?: string;
  tags: string[];
  urls: string[];
  startedAt: string;
  endedAt: string | null;
  pageCount: number;
  status: SessionStatus;
}

/** GET /community/profiles/{userId} — 없거나 탈퇴한 회원이면 404 */
export interface CommunityProfileResponse {
  userId: number;
  nickname: string | null;
  bio: string | null;
  visibility: CommunityProfileVisibility;
  totalNodeCount: number;
  topHashtags: CommunityProfileHashtag[];
  interests: string[];
  likeCount: number;
  likedByMe: boolean;
  following: boolean;
  exploringCount: number;
  pinnedSessions: CommunitySharedSession[];
}

/** 프로필 마인드맵 카드 (카드 = 공개 세션 1개). URL_ONLY 에선 title · snippet · relatedUrls[].title 이 null */
export interface CommunityProfileCard {
  mindmapId: number;
  owner: { userId: number; nickname: string | null };
  title: string | null;
  snippet: string | null;
  hashtags: string[]; // '#' 없는 원문, 비공개 태그 제외
  nodeCount: number;
  likeCount: number;
  likedByMe: boolean;
  bookmarkCount: number;
  bookmarkId: number | null;
  exploringCount: number;
  exploringByMe: boolean;
  lastActivityAt: string;
  relatedUrls: { title: string | null; url: string }[];
}

export interface CommunityProfileCardPage {
  mindmaps: CommunityProfileCard[];
  hasNext: boolean;
}

/** 프로필 주인의 전체 마인드맵. 연결선 양 끝은 tag:<hashtagId> · node:<nodeId> */
export interface CommunityProfileMindmap {
  mindmapId: number; // 작성자 id
  ownerId: number;
  nickname: string | null;
  title: string | null;
  hashtags: { hashtagId: number; ownerId: number; name: string }[];
  nodes: {
    nodeId: number;
    label: string; // URL_ONLY 에선 원문 URL 그대로
    sourceUrl: string | null;
    content: string | null;
    visibilityScope: CommunityProfileVisibility;
  }[];
  edges: { from: string; to: string }[];
  topHashtags: CommunityProfileHashtag[];
}

// ---------- 내 프로필 ----------
/** 내 세션 · 노드에서 모은 해시태그 — 비공개도 함께 온다 */
export interface MyProfileHashtag {
  hashtagId: number;
  hashtag: string; // '#' 없는 원문
  nodeCount: number;
  isPublic: boolean;
}

export interface MyProfileInterest {
  interestId: number;
  hashtag: string; // '#' 없는 원문
}

/** 내 세션 — 공개 · 비공개가 모두 온다 (isPublic). 핀은 공개 세션 중 맨 앞 고정이고 공개 여부와는 별개 */
export interface MySession extends SessionListItem {
  isPinned: boolean;
}

/** GET /community/me/profile */
export interface MyProfileResponse {
  userId: number;
  nickname: string | null;
  bio: string | null;
  visibility: CommunityProfileVisibility;
  totalNodeCount: number; // 비공개 세션 포함
  sharedSessionCount: number; // 공개 세션 수
  likeCount: number;
  topHashtags: MyProfileHashtag[]; // 상위 5개, 비공개 포함
  hashtags: MyProfileHashtag[]; // 전체 — 프로필 수정의 공개 설정
  interests: MyProfileInterest[];
  pinnedSessions: MySession[];
}

/** 핀고정이 먼저, 그다음 최신순 */
export interface MySessionPage {
  sessions: MySession[];
  hasNext: boolean;
}

/** 내 프로필 마인드맵 카드 — title · snippet 이 항상 온다 */
export interface MyProfileCard extends CommunityProfileCard {
  isPublic: boolean;
  isPinned: boolean;
}

/** 핀고정이 먼저, 그다음 최신순 */
export interface MyProfileCardPage {
  mindmaps: MyProfileCard[];
  hasNext: boolean;
}

/** PUT /community/me/profile — 전부 저장되거나 전부 거절된다 (400) */
export interface UpdateMyProfileRequest {
  bio: string;
  visibility: CommunityProfileVisibility;
  interests: string[]; // '#' 없는 원문
  hiddenHashtagIds: number[];
  pinnedSessionIds: number[]; // 표시 순서
}

export interface ProfileLikeResponse {
  userId: number;
  liked: boolean;
  likeCount: number;
}

// ---------- 분석 ----------
/** 읽기 행동 4분류 — 화면 표기는 영어 (Deep Reading / Reading / Scanning / Idle) */
export type ReadingLevel = "DEEP_READING" | "READING" | "SCANNING" | "IDLE";

export type ExplorationType = "DISTRACTED" | "FOCUSED" | "BROAD" | "QUICK_CHECK";

/** 카드 아래 분석 · 추천 문구. "**강조**" 로 감싼 부분은 강조해 보여준다 */
export interface AnalysisNote {
  analysis: string;
  recommendation?: string | null;
}

export interface BannerTip {
  title: string;
  body: string;
}

export interface AnalyticsWeekSessions {
  sessions: SessionListItem[];
}

export interface AnalyticsExploration {
  avgUrlsPerSession: number;
  avgDwellSec: number;
  avgSessionMinutes: number;
  type: ExplorationType | null; // 판정할 수 있는 세션이 없으면 null
  note: AnalysisNote;
}

export interface AnalyticsReadingBehavior {
  shares: Record<ReadingLevel, number>; // % (합 100)
  note: AnalysisNote;
}

export interface CategoryShare {
  name: string;
  pct: number;
  count: number; // 재방문 포함
}

export interface AnalyticsCategories {
  categories: CategoryShare[];
  note: AnalysisNote;
}

/** 시간대별 히트맵 — [요일 월~일][3시간 구간 00 · 03 · … · 21시], 값 0~1 */
export type WeekHourGrid = number[][];

export interface AnalyticsTimePatterns {
  surfing: WeekHourGrid;
  focus: WeekHourGrid;
  note: AnalysisNote;
}

export interface AnalyticsRecommendations {
  recommendations: BannerTip[];
}

// ---------- 설정 ----------
export interface ExcludedUrlItem {
  excludedUrlId: number;
  url: string; // 프로토콜 · www. 를 뗀 표시형 (instagram.com, tistory.com/feed)
  domain: string;
  isDefault: boolean;
  isExcluded: boolean;
}

export interface ExcludedUrlListResponse {
  code: number;
  excludedUrls: ExcludedUrlItem[];
}

export interface ExcludedUrlCreateResponse extends ExcludedUrlItem {
  code: number;
  createdAt: string;
}

export interface ExtensionSettings {
  popupVisible: boolean;
  autoEndNotificationEnabled: boolean;
  manualScrapEnabled: boolean;
}

export type ExtensionSettingKey = keyof ExtensionSettings;

/** 저장한 적이 없으면 기본값(모두 켜짐)이고 updatedAt 이 없다 */
export interface ExtensionSettingsResponse extends ExtensionSettings {
  code: number;
  userId: number;
  updatedAt?: string;
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

// ---------- 커뮤니티 ----------
export interface CommunityOwner {
  userId: number;
  nickname: string | null; // 닉네임을 정하기 전이면 null
}

export interface CommunityRelatedUrl {
  title: string | null; // URL 만 공개한 작성자의 카드는 null
  url: string;
}

/** 공개 세션 1개 = 카드 1장 (mindmapId = 세션 id). URL 만 공개한 작성자의 카드는 title · snippet 이 null */
export interface CommunityCard {
  mindmapId: number;
  owner: CommunityOwner;
  title: string | null;
  snippet: string | null;
  hashtags: string[]; // '#' 없이 raw 문자열, 비공개 태그 제외
  nodeCount: number;
  likeCount: number;
  likedByMe: boolean;
  bookmarkCount: number;
  bookmarkId: number | null; // 내가 저장했으면 id
  exploringCount: number;
  exploringByMe: boolean;
  lastActivityAt: string; // ISO datetime (타임존 없음)
  relatedUrls: CommunityRelatedUrl[]; // 최대 10개
}

export interface CommunityRecommendationResponse {
  basisHashtags: string[]; // '#' 없이 raw 문자열
  mindmaps: CommunityCard[];
}

export interface CommunityMindmapPage {
  mindmaps: CommunityCard[];
  hasNext: boolean;
}

export interface CommunityProfileHit {
  userId: number;
  nickname: string | null;
  hashtags: string[]; // 공개 태그 많은 순 5개
  mindmapCount: number;
}

export interface CommunityProfilePage {
  profiles: CommunityProfileHit[];
  hasNext: boolean;
}

export interface CommunityHashtagHit {
  tag: string; // '#' 없이 raw 문자열
  count: number;
}

export interface CommunityHashtagSearchResponse {
  hashtags: CommunityHashtagHit[];
}

export type TrendingPeriod = "today" | "week";

export interface TrendingHashtagItem {
  rank: number;
  name: string; // '#' 없이 raw 문자열
  count: number; // 기간 안의 나도 탐색중 + 북마크
  trend: number; // count - 직전 같은 길이 기간의 값
}

export interface TrendingHashtagsResponse {
  period: "TODAY" | "WEEK";
  hashtags: TrendingHashtagItem[];
}

export interface CardLikeResponse {
  likeCount: number;
  likedByMe: boolean;
}

export interface CardExploringResponse {
  exploringCount: number;
  exploringByMe: boolean;
}

export interface CardBookmarkResponse {
  bookmarkCount: number;
  bookmarkId: number | null; // 해제하면 null
}

/** POST /community/bookmarks */
export interface SaveBookmarkRequest {
  targetType: "NODE" | "HASHTAG";
  targetIds: number[];
  saveType: "HASHTAG_BUNDLE" | "MINI_MINDMAP";
  sourceMindmapId?: number; // 원본 작성자 id
  name?: string; // 해시태그 묶음만. 미니 마인드맵에 보내면 400
}

export interface CardSessionsResponse {
  sessions: SessionListItem[]; // URL 만 공개한 작성자의 세션은 title 이 ""
}

export type SavedTargetType = "NODE" | "HASHTAG";

/** 다시 저장에 필요한 값 — 목록 항목에 함께 온다 */
export interface BookmarkSaveTarget<S extends string> {
  saveType: S;
  targetType: SavedTargetType;
  targetIds: number[];
  sourceMindmapId: number | null; // 작성자 id. targetIds 는 지금 저장할 수 있는 대상만 와서 비어 있을 수 있다
}

/** 저장한 미니 마인드맵. 세션이 여럿이면 sessionId · title · snippet 이 null, URL 만 공개면 title · snippet 이 null */
export interface BookmarkMindmapItem extends BookmarkSaveTarget<"MINI_MINDMAP"> {
  bookmarkId: number;
  sessionId: number | null;
  /** 카드 전체를 저장 — 노드를 골라 저장했으면 세션이 하나여도 false */
  cardBookmark: boolean;
  owner: CommunityOwner;
  title: string | null;
  snippet: string | null;
  hashtags: { hashtagId: number; name: string }[]; // '#' 없이 raw 문자열
  nodes: CommunityProfileMindmap["nodes"];
  edges: CommunityProfileMindmap["edges"];
  nodeCount: number;
  likeCount: number;
  savedAt: string; // UTC 시각 (끝에 Z)
}

export interface BookmarkMindmapPage {
  mindmaps: BookmarkMindmapItem[];
  hasNext: boolean;
}

export interface BookmarkBundleItem extends BookmarkSaveTarget<"HASHTAG_BUNDLE"> {
  bookmarkId: number;
  name: string | null;
  hashtags: string[]; // '#' 없이 raw 문자열
  savedAt: string; // UTC 시각 (끝에 Z)
}

export interface BookmarkBundlePage {
  code: number;
  bundles: BookmarkBundleItem[];
  hasNext: boolean;
}

export interface BookmarkOriginalResponse {
  sourceAvailable: boolean;
  mindmap: CommunityProfileMindmap | null;
  highlightedNodeIds: number[]; // 전체 마인드맵의 nodeId
}

export interface SimilarPersonItem {
  userId: number;
  nickname: string | null;
  matchedHashtags: string[]; // '#' 없이 raw 문자열
  following: boolean;
}

export interface SimilarPeopleResponse {
  people: SimilarPersonItem[];
}

export interface FollowResponse {
  following: boolean;
}
