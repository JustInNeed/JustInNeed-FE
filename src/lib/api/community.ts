import { api } from "./client";
import type {
  CardBookmarkResponse,
  CardExploringResponse,
  CardLikeResponse,
  CardSessionsResponse,
  CommunityHashtagSearchResponse,
  CommunityMindmapPage,
  CommunityProfilePage,
  CommunityRecommendationResponse,
  FollowResponse,
  SimilarPeopleResponse,
  TrendingHashtagsResponse,
  TrendingPeriod,
} from "./types";

/** 추천 섹션 하나에 보여줄 카드 수 */
const RECOMMENDATION_LIMIT = 3;
/** 검색 드롭다운 — 그룹마다 앞의 몇 개만 */
const SEARCH_TAG_LIMIT = 5;
const SEARCH_RESULT_SIZE = 4;

export const getInterestRecommendations = () =>
  api.get<CommunityRecommendationResponse>(`/community/recommendations/mindmaps/interests?limit=${RECOMMENDATION_LIMIT}`);

export const getRecentBookmarkRecommendations = () =>
  api.get<CommunityRecommendationResponse>(`/community/recommendations/mindmaps/recent-bookmarks?limit=${RECOMMENDATION_LIMIT}`);

// 검색어 q 는 비면 400 — 호출하는 쪽에서 빈 값을 보내지 않는다
export const searchCommunityHashtags = (q: string) => {
  const query = new URLSearchParams({ q, limit: String(SEARCH_TAG_LIMIT) });
  return api.get<CommunityHashtagSearchResponse>(`/community/search/hashtags?${query}`);
};

export const searchCommunityProfiles = (q: string) => {
  const query = new URLSearchParams({ q, page: "0", size: String(SEARCH_RESULT_SIZE) });
  return api.get<CommunityProfilePage>(`/community/search/profiles?${query}`);
};

export const searchCommunityMindmaps = (q: string) => {
  const query = new URLSearchParams({ q, page: "0", size: String(SEARCH_RESULT_SIZE) });
  return api.get<CommunityMindmapPage>(`/community/search/mindmaps?${query}`);
};

export const getTrendingHashtags = (period: TrendingPeriod) =>
  api.get<TrendingHashtagsResponse>(`/community/recommendations/hashtags/trending?period=${period}`);

export const setCardLike = (mindmapId: number, liked: boolean) =>
  api.patch<CardLikeResponse>(`/community/mindmaps/${mindmapId}/like`, { liked });

export const setCardExploring = (mindmapId: number, exploring: boolean) =>
  api.patch<CardExploringResponse>(`/community/mindmaps/${mindmapId}/exploring`, { exploring });

export const setCardBookmark = (mindmapId: number, bookmarked: boolean) =>
  api.patch<CardBookmarkResponse>(`/community/mindmaps/${mindmapId}/bookmark`, { bookmarked });

/** 그 세션 + 같은 작성자의 태그 겹치는 공개 세션, 최대 3개 */
export const getCardSessions = (mindmapId: number) =>
  api.get<CardSessionsResponse>(`/community/mindmaps/${mindmapId}/sessions`);

export const getSimilarPeople = () => api.get<SimilarPeopleResponse>("/community/recommendations/profiles/similar");

export const setProfileFollow = (userId: number, following: boolean) =>
  api.patch<FollowResponse>(`/community/profiles/${userId}/follow`, { following });
