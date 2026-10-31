// 커뮤니티 API 응답 → 화면 데이터 변환.
import type {
  CommunityCard,
  CommunityHashtagHit,
  CommunityProfileHit,
  CommunityRecommendationResponse,
  SessionListItem,
  SimilarPersonItem,
  TrendingHashtagItem,
} from "@/lib/api";
import { formatDate, hostFromUrl, withHash } from "@/lib/format";
import type { CommunityPost, RelatedUrl, TrendingHashtag } from "@/lib/viewTypes";

/** API 에 프로필 사진이 없어 모두 기본 아바타로 보여준다 */
export const DEFAULT_AVATAR = "🌱";
/** 닉네임을 정하지 않은 회원 */
export const UNNAMED_USER = "이름 없는 사용자";
/** URL 만 공개한 카드에 공개 해시태그도 없을 때 제목 자리 문구 */
export const URL_ONLY_CARD_TITLE = "원문 링크만 공개된 마인드맵";
export const URL_ONLY_SESSION_TITLE = "원문 링크만 공개된 세션";

/** 내 반응에 따라 바뀌는 카드 값 — 같은 카드가 여러 목록에 있어도 mindmapId 로 함께 바뀐다 */
export interface CardReaction {
  likes: number;
  likedByMe: boolean;
  bookmarks: number;
  bookmarked: boolean;
  exploring: number;
  exploringByMe: boolean;
}

export interface FeedPost extends CommunityPost, CardReaction {
  mindmapId: number;
  ownerId: number;
  /** 작성자가 URL 만 공개 — 제목 자리에 해시태그, 소개글 없음 */
  urlOnly: boolean;
  relatedUrls: RelatedUrl[];
}

export interface FeedRecommendation {
  basisTags: string[]; // '#' 포함
  posts: FeedPost[];
}

export interface SearchedProfile {
  userId: number;
  name: string;
  avatar: string;
  tags: string[]; // '#' 포함
  mapCount: number;
}

export interface SimilarPersonRow {
  userId: number;
  name: string;
  /** 표시용 한 줄 (예: "#파리 #먹거리") */
  tags: string;
  following: boolean;
}

export const displayName = (nickname: string | null) => nickname || UNNAMED_USER;

export function toFeedPost(card: CommunityCard): FeedPost {
  const hashtags = card.hashtags.map(withHash);
  const urlOnly = card.title === null;
  return {
    id: String(card.mindmapId),
    mindmapId: card.mindmapId,
    ownerId: card.owner.userId,
    user: { name: displayName(card.owner.nickname), avatar: DEFAULT_AVATAR, handle: "" },
    urlOnly,
    title: card.title ?? (hashtags.join(" ") || URL_ONLY_CARD_TITLE),
    snippet: card.snippet ?? "",
    hashtags,
    nodes: card.nodeCount,
    likes: card.likeCount,
    likedByMe: card.likedByMe,
    bookmarks: card.bookmarkCount,
    bookmarked: card.bookmarkId !== null,
    exploring: card.exploringCount,
    exploringByMe: card.exploringByMe,
    when: formatDate(card.lastActivityAt),
    relatedUrls: card.relatedUrls.map((u) => ({ title: u.title ?? hostFromUrl(u.url), url: u.url })),
  };
}

export const toRecommendation = (res: CommunityRecommendationResponse): FeedRecommendation => ({
  basisTags: res.basisHashtags.map(withHash),
  posts: res.mindmaps.map(toFeedPost),
});

export const toTrendingHashtag = (item: TrendingHashtagItem): TrendingHashtag => ({
  tag: withHash(item.name),
  count: item.count,
  trend: item.trend,
});

export const toSearchedTag = (hit: CommunityHashtagHit): TrendingHashtag => ({
  tag: withHash(hit.tag),
  count: hit.count,
  trend: 0,
});

export const toSearchedProfile = (hit: CommunityProfileHit): SearchedProfile => ({
  userId: hit.userId,
  name: displayName(hit.nickname),
  avatar: DEFAULT_AVATAR,
  tags: hit.hashtags.map(withHash),
  mapCount: hit.mindmapCount,
});

export const toSimilarPersonRow = (person: SimilarPersonItem): SimilarPersonRow => ({
  userId: person.userId,
  name: displayName(person.nickname),
  tags: person.matchedHashtags.map(withHash).join(" "),
  following: person.following,
});

/** 상세 팝업의 관련 세션 — URL 만 공개한 작성자의 세션은 제목이 "" 로 온다 */
export const toDetailSession = (session: SessionListItem): SessionListItem => ({
  ...session,
  title: session.title || URL_ONLY_SESSION_TITLE,
});
