// 커뮤니티 API 응답 픽스처 — 백엔드 응답(CommunityCard 등) 모양 그대로.
import type {
  CardSessionsResponse,
  CommunityCard,
  CommunityHashtagSearchResponse,
  CommunityMindmapPage,
  CommunityProfilePage,
  CommunityRecommendationResponse,
  SimilarPeopleResponse,
  TrendingHashtagsResponse,
} from "@/lib/api";

const card = (overrides: Partial<CommunityCard> & Pick<CommunityCard, "mindmapId">): CommunityCard => ({
  owner: { userId: 101, nickname: "wanderlust" },
  title: "동유럽 3주 살이 전체 동선",
  snippet: "프라하 → 비엔나 → 부다페스트 야간열차 동선과 예산.",
  hashtags: ["프라하", "동유럽"],
  nodeCount: 14,
  likeCount: 28,
  likedByMe: false,
  bookmarkCount: 9,
  bookmarkId: null,
  exploringCount: 12,
  exploringByMe: false,
  lastActivityAt: "2026-10-30T21:15:00",
  relatedUrls: [
    { title: "ÖBB 나이트젯 야간열차 노선", url: "https://www.nightjet.com/en" },
    { title: "체코 철도 승차권 예약", url: "https://www.cd.cz/en/" },
    { title: "부다페스트 온천 안내", url: "https://www.spasbudapest.com/" },
  ],
  ...overrides,
});

export const CONTENT_CARD = card({ mindmapId: 12 });

/** 이미 저장 · 좋아요 · 탐색중인 카드 */
export const REACTED_CARD = card({
  mindmapId: 13,
  owner: { userId: 102, nickname: "foodtrip" },
  title: "파리 미식 지도",
  snippet: "1구부터 20구까지 빵집 지도.",
  hashtags: ["파리", "먹거리"],
  likeCount: 7,
  likedByMe: true,
  bookmarkCount: 3,
  bookmarkId: 501,
  exploringCount: 5,
  exploringByMe: true,
  relatedUrls: [{ title: "파리 빵집 목록", url: "https://paris.example.com/bakery" }],
});

/** URL 만 공개한 작성자의 카드 */
export const URL_ONLY_CARD = card({
  mindmapId: 14,
  owner: { userId: 103, nickname: "artwalk" },
  title: null,
  snippet: null,
  hashtags: ["미술관", "로마"],
  nodeCount: 2,
  relatedUrls: [
    { title: null, url: "https://www.museivaticani.va/content" },
    { title: null, url: "https://uffizi.example.com/" },
  ],
});

/** 닉네임을 정하지 않은 작성자 · 연관 URL 없음 */
export const NO_NICKNAME_CARD = card({
  mindmapId: 15,
  owner: { userId: 104, nickname: null },
  title: "유럽 한 달 예산",
  snippet: "200만원으로 살기.",
  hashtags: ["예산"],
  relatedUrls: [],
});

/** 내 카드 — fixtures/member.ts 의 MEMBER.id */
export const MY_CARD = card({
  mindmapId: 16,
  owner: { userId: 6, nickname: "yesong" },
  title: "내가 공개한 로마 여행",
  snippet: "로마 3박 4일.",
  hashtags: ["로마"],
  relatedUrls: [],
});

export const INTERESTS: CommunityRecommendationResponse = {
  basisHashtags: ["파리", "로마"],
  mindmaps: [CONTENT_CARD, REACTED_CARD, URL_ONLY_CARD],
};

/** CONTENT_CARD 는 관심 추천에도 나온다 (같은 카드가 두 목록에) */
export const RECENT_BOOKMARKS: CommunityRecommendationResponse = {
  basisHashtags: ["야간열차"],
  mindmaps: [NO_NICKNAME_CARD, CONTENT_CARD],
};

export const EMPTY_RECOMMENDATION: CommunityRecommendationResponse = { basisHashtags: [], mindmaps: [] };

export const TRENDING_TODAY: TrendingHashtagsResponse = {
  period: "TODAY",
  hashtags: [
    { rank: 1, name: "쉥겐비자", count: 12, trend: 8 },
    { rank: 2, name: "오로라", count: 7, trend: 0 },
    { rank: 3, name: "아이슬란드", count: 3, trend: -4 },
  ],
};

export const TRENDING_WEEK: TrendingHashtagsResponse = {
  period: "WEEK",
  hashtags: [{ rank: 1, name: "바르셀로나", count: 39, trend: 21 }],
};

export const SIMILAR_PEOPLE: SimilarPeopleResponse = {
  people: [
    { userId: 102, nickname: "foodtrip", matchedHashtags: ["파리", "먹거리"], following: false },
    { userId: 103, nickname: "artwalk", matchedHashtags: ["미술관"], following: true },
    { userId: 104, nickname: null, matchedHashtags: ["예산"], following: false },
  ],
};

export const CARD_SESSIONS: CardSessionsResponse = {
  sessions: [
    {
      id: 12,
      title: "프라하 1박 일정 짜기",
      startedAt: "2026-10-30T20:00:00",
      endedAt: "2026-10-30T21:15:00",
      pageCount: 6,
      status: "COMPLETED",
      isFavorite: false,
      isPublic: true,
      tags: ["프라하", "동유럽"],
    },
    {
      id: 20,
      title: "",
      startedAt: "2026-10-29T10:00:00",
      endedAt: "2026-10-29T10:20:00",
      pageCount: 2,
      status: "COMPLETED",
      isFavorite: false,
      isPublic: true,
      tags: ["프라하"],
    },
  ],
};

export const SEARCH_HASHTAGS: CommunityHashtagSearchResponse = {
  hashtags: [
    { tag: "파리", count: 8 },
    { tag: "파리올림픽", count: 2 },
  ],
};

export const SEARCH_PROFILES: CommunityProfilePage = {
  profiles: [
    { userId: 102, nickname: "foodtrip", hashtags: ["파리", "먹거리", "빵", "카페"], mindmapCount: 3 },
    { userId: 104, nickname: null, hashtags: ["파리"], mindmapCount: 1 },
  ],
  hasNext: false,
};

export const SEARCH_MINDMAPS: CommunityMindmapPage = {
  mindmaps: [REACTED_CARD, URL_ONLY_CARD],
  hasNext: false,
};
