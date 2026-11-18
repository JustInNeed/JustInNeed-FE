// 백엔드 REST API 스키마 (OpenAPI 기준). 화면 도메인 타입의 원본(source of truth).

import type { components } from "./schema.gen";

/** BE 명세(openapi.json)로 만든 스키마. 응답 타입은 여기서 가져온다 (정책 #24, npm run api:types) */
export type Schemas = components["schemas"];

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

export type MemberResponse = Schemas["MemberResponse"];

export type NicknameUpdateRequest = Schemas["NicknameUpdateRequest"];

/** 닉네임 중복 확인 — 대소문자 무시, 내 현재 닉네임은 사용 가능 */
export type NicknameAvailabilityResponse = Schemas["NicknameAvailabilityResponse"];

// ---------- 커뮤니티 프로필 (다른 사용자 프로필 화면) ----------
export type CommunityProfileVisibility = "URL_ONLY" | "CONTENT";

export type CommunityProfileHashtag = Schemas["PublicGraphServiceTopTag"];

/** 프로필의 공개 세션. URL_ONLY 에선 title 키가 없고, CONTENT 에선 title · markdown · sources 가 더 온다 */
export type CommunitySharedSession = Schemas["SharedSessionView"];

/** 핀고정이 먼저, 그다음 최신순 */
export type CommunitySharedSessionPage = Schemas["SharedSessions"];

/** GET /community/profiles/{userId} — 없거나 탈퇴한 회원이면 404 */
export type CommunityProfileResponse = Schemas["Profile"];

/** 프로필 마인드맵 카드 (카드 = 공개 세션 1개). URL_ONLY 에선 title · snippet · relatedUrls[].title 이 null */
export type CommunityProfileCard = Schemas["ProfileCard"];

export type CommunityProfileCardPage = Schemas["CardSessionsServiceMindmaps"];

/** 프로필 주인의 전체 마인드맵. 연결선 양 끝은 tag:<hashtagId> · node:<nodeId> */
export type CommunityProfileMindmap = Schemas["PublicGraphServiceGraph"];

// ---------- 내 프로필 ----------
/** 내 세션 · 노드에서 모은 해시태그 — 비공개도 함께 온다 */
export type MyProfileHashtag = Schemas["TagView"];

export type MyProfileInterest = Schemas["MyInterest"];

/** 내 세션 — 공개 · 비공개가 모두 온다 (isPublic). 핀은 공개 세션 중 맨 앞 고정이고 공개 여부와는 별개 */
export type MySession = Schemas["MySession"];

/** GET /community/me/profile */
export type MyProfileResponse = Schemas["MyProfile"];

/** 핀고정이 먼저, 그다음 최신순 */
export type MySessionPage = Schemas["MySessions"];

/** 내 프로필 마인드맵 카드 — title · snippet 이 항상 온다 */
export type MyProfileCard = Schemas["MyCard"];

/** 핀고정이 먼저, 그다음 최신순 */
export type MyProfileCardPage = Schemas["MyCards"];

/** PUT /community/me/profile — 전부 저장되거나 전부 거절된다 (400) */
export type UpdateMyProfileRequest = Schemas["ProfileRequest"];

export type ProfileLikeResponse = Schemas["InteractionServiceLikeView"];

// ---------- 분석 ----------
/** 읽기 행동 4분류 — 화면 표기는 영어 (Deep Reading / Reading / Scanning / Idle) */
export type ReadingLevel = "DEEP_READING" | "READING" | "SCANNING" | "IDLE";

export type ExplorationType = "DISTRACTED" | "FOCUSED" | "BROAD" | "QUICK_CHECK";

/** 카드 아래 분석 · 추천 문구. "**강조**" 로 감싼 부분은 강조해 보여준다 */
export type AnalysisNote = Schemas["Note"];

export type BannerTip = Schemas["Recommendation"];

export type AnalyticsWeekSessions = Schemas["WeekSessions"];

export type AnalyticsExploration = Schemas["AnalyticsResponseExploration"];

export type AnalyticsReadingBehavior = Schemas["ReadingBehavior"];

export type CategoryShare = Schemas["Category"];

export type AnalyticsCategories = Schemas["Categories"];

/** 시간대별 히트맵 — [요일 월~일][3시간 구간 00 · 03 · … · 21시], 값 0~1 */
export type WeekHourGrid = number[][];

export type AnalyticsTimePatterns = Schemas["TimePatterns"];

export type AnalyticsRecommendations = Schemas["AnalyticsResponseRecommendations"];

// ---------- 설정 ----------
export type ExcludedUrlItem = Schemas["ExcludedUrlItem"];

export type ExcludedUrlListResponse = Schemas["ExcludedUrlListResponse"];

export type ExcludedUrlCreateResponse = Schemas["ExcludedUrlCreateResponse"];

export interface ExtensionSettings {
  popupVisible: boolean;
  autoEndNotificationEnabled: boolean;
  manualScrapEnabled: boolean;
}

export type ExtensionSettingKey = keyof ExtensionSettings;

/** 저장한 적이 없으면 기본값(모두 켜짐)이고 updatedAt 이 없다 */
export type ExtensionSettingsResponse = Schemas["ExtensionSettingResponse"];

export type LogoutRequest = Schemas["LogoutRequest"];

export type TokenRefreshRequest = Schemas["TokenRefreshRequest"];

/** 소셜 로그인 콜백의 일회용 코드 → 토큰 교환 (POST /auth/token) */
export type LoginCodeExchangeRequest = Schemas["TokenExchangeRequest"];

export type LoginTokenResponse = Schemas["LoginTokenResponse"];

/** 크롬 확장에 넘길 일회용 연결 코드 (POST /auth/extension-code). 확장이 POST /auth/token 으로 자기 전용 토큰과 바꾼다 */
export type ExtensionCodeResponse = Schemas["ExtensionCodeResponse"];

/** 수집 중 → 분석 대기 → 분석 중 → 분석 완료 / 분석 실패 */
export type SessionStatus = "COLLECTING" | "READY" | "ANALYZING" | "COMPLETED" | "FAILED";

/** 목록용 — 본문 없음, 가벼움. */
export type SessionListItem = Schemas["SessionListResponse"];

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
export type SessionPage = Schemas["SessionPageResponse"];

export type Source = Schemas["Source"];

export type SessionSummary = Schemas["SummaryResponse"];

/** 상세용 — 요약/출처 포함. */
export type SessionDetail = Schemas["SessionDetailResponse"];

/** 노드의 근거 원문 — 유닛 노드에만 있다 */
export type SessionMindmapCitation = Schemas["Citation"];

export type SessionMindmapNode = Schemas["SessionMindmapResponseNode"];

export type SessionMindmapEdge = Schemas["SessionMindmapResponseEdge"];

/** GET /sessions/{id}/mindmap — 루트는 최대 3개, 분석 결과가 없으면 빈 목록 */
export type SessionMindmap = Schemas["SessionMindmapResponse"];

/** 모든 필드 optional — 보낸 필드만 수정. */
export type SessionUpdateRequest = Schemas["SessionUpdateRequest"];

/** 해시태그 그룹 — 이름 없이 해시태그로만 구분한다 (QA-011) */
export type TagGroup = Schemas["TagGroupResponse"];

export type TagGroupCreateRequest = Schemas["TagGroupCreateRequest"];

export type TagGroupUpdateRequest = Schemas["TagGroupUpdateRequest"];

export type TagGroupOrderRequest = Schemas["TagGroupOrderRequest"];

// ---------- 홈 ----------
/** 좌표는 응답에 없다 — 화면에서 정한다 (features/home/toHomeData) */
export type HomeGraphNode = Schemas["HomeResponseNode"];

export type HomeNodeMeta = Schemas["NodeMeta"];

export type HomeTagGroup = Schemas["HomeResponseTagGroup"];

export type HomeGraphResponse = Schemas["HomeResponseGraph"];

export type HomeStatsResponse = Schemas["Stats"];

export type HomeWeekActivity = Schemas["WeekActivity"];

export type HomeTopTag = Schemas["HomeResponseTopTag"];

export type HomeTimelineSlot = Schemas["TimelineSlot"];

export type HomeWeekVisit = Schemas["Visit"];

export type HomeWeekSession = Schemas["WeekSession"];

/** GET /home — 기록이 없는 회원은 0 · 활동 0분 7일 · 빈 목록 */
export type HomeResponse = Schemas["HomeResponse"];

// ---------- 커뮤니티 ----------
export type CommunityOwner = Schemas["Owner"];

export type CommunityRelatedUrl = Schemas["RelatedUrl"];

/** 공개 세션 1개 = 카드 1장 (mindmapId = 세션 id). URL 만 공개한 작성자의 카드는 title · snippet 이 null */
export type CommunityCard = Schemas["CommunityCard"];

export type CommunityRecommendationResponse = Schemas["RecommendationServiceRecommendations"];

export type CommunityMindmapPage = Schemas["CommunitySearchServiceMindmaps"];

export type CommunityProfileHit = Schemas["ProfileItem"];

export type CommunityProfilePage = Schemas["Profiles"];

export type CommunityHashtagHit = Schemas["TagCount"];

export type CommunityHashtagSearchResponse = Schemas["Hashtags"];

export type TrendingPeriod = "today" | "week";

export type TrendingHashtagItem = Schemas["Trend"];

export type TrendingHashtagsResponse = Schemas["Trends"];

export type CardLikeResponse = Schemas["CardReactionServiceLikeView"];

export type CardExploringResponse = Schemas["CardReactionServiceExploringView"];

export type CardBookmarkResponse = Schemas["BookmarkView"];

/** POST /community/bookmarks */
export type SaveBookmarkRequest = Schemas["SaveRequest"];

export type CardSessionsResponse = Schemas["Sessions"];

export type SavedTargetType = "NODE" | "HASHTAG";

/** 다시 저장에 필요한 값 — 목록 항목에 함께 온다 */
export interface BookmarkSaveTarget<S extends string> {
  saveType: S;
  targetType: SavedTargetType;
  targetIds: number[];
  sourceMindmapId: number | null; // 작성자 id. targetIds 는 지금 저장할 수 있는 대상만 와서 비어 있을 수 있다
}

/** 저장한 미니 마인드맵. 세션이 여럿이면 sessionId · title · snippet 이 null, URL 만 공개면 title · snippet 이 null */
export type BookmarkMindmapItem = Schemas["Mindmap"];

export type BookmarkMindmapPage = Schemas["BookmarkQueryServiceMindmaps"];

export type BookmarkBundleItem = Schemas["Bundle"];

export type BookmarkBundlePage = Schemas["Bundles"];

export type BookmarkOriginalResponse = Schemas["Original"];

export type SimilarPersonItem = Schemas["SimilarPeopleServicePerson"];

export type SimilarPeopleResponse = Schemas["SimilarPeople"];

export type FollowResponse = Schemas["FollowView"];
