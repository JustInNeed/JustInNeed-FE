import { describe, expect, it } from "vitest";
import {
  CARD_SESSIONS,
  CONTENT_CARD,
  INTERESTS,
  NO_NICKNAME_CARD,
  REACTED_CARD,
  SEARCH_HASHTAGS,
  SEARCH_PROFILES,
  SIMILAR_PEOPLE,
  TRENDING_TODAY,
  URL_ONLY_CARD,
} from "@/test/fixtures/communityApi";
import {
  toDetailSession,
  toFeedPost,
  toRecommendation,
  toSearchedProfile,
  toSearchedTag,
  toSimilarPersonRow,
  toTrendingHashtag,
} from "./toCommunityData";

describe("toFeedPost", () => {
  it("카드 응답을 화면 값으로 바꾼다 — 해시태그에 # 를 붙이고 날짜는 lastActivityAt 기준", () => {
    expect(toFeedPost(CONTENT_CARD)).toEqual({
      id: "12",
      mindmapId: 12,
      ownerId: 101,
      user: { name: "wanderlust", avatar: "🌱", handle: "" },
      urlOnly: false,
      title: "동유럽 3주 살이 전체 동선",
      snippet: "프라하 → 비엔나 → 부다페스트 야간열차 동선과 예산.",
      hashtags: ["#프라하", "#동유럽"],
      nodes: 14,
      likes: 28,
      likedByMe: false,
      bookmarks: 9,
      bookmarked: false,
      exploring: 12,
      exploringByMe: false,
      when: "2026-10-30",
      relatedUrls: CONTENT_CARD.relatedUrls,
    });
  });

  it("bookmarkId 가 있으면 저장한 카드다", () => {
    const post = toFeedPost(REACTED_CARD);
    expect(post.bookmarked).toBe(true);
    expect(post.likedByMe).toBe(true);
    expect(post.exploringByMe).toBe(true);
  });

  it("URL 만 공개한 카드는 제목 자리에 해시태그, 소개글은 비우고 URL 제목은 사이트 주소로 채운다", () => {
    const post = toFeedPost(URL_ONLY_CARD);
    expect(post.urlOnly).toBe(true);
    expect(post.title).toBe("#미술관 #로마");
    expect(post.snippet).toBe("");
    expect(post.relatedUrls).toEqual([
      { title: "museivaticani.va", url: "https://www.museivaticani.va/content" },
      { title: "uffizi.example.com", url: "https://uffizi.example.com/" },
    ]);
  });

  it("URL 만 공개한 카드에 공개 해시태그도 없으면 안내 문구를 제목으로 쓴다", () => {
    expect(toFeedPost({ ...URL_ONLY_CARD, hashtags: [] }).title).toBe("원문 링크만 공개된 마인드맵");
  });

  it("닉네임이 없으면 대체 이름을 쓴다", () => {
    expect(toFeedPost(NO_NICKNAME_CARD).user.name).toBe("이름 없는 사용자");
  });
});

describe("그 밖의 응답 변환", () => {
  it("추천 응답 — 근거 태그에 # 를 붙이고 카드를 바꾼다", () => {
    const rec = toRecommendation(INTERESTS);
    expect(rec.basisTags).toEqual(["#파리", "#로마"]);
    expect(rec.posts.map((p) => p.id)).toEqual(["12", "13", "14"]);
  });

  it("떠오르는 해시태그 · 검색 해시태그에 # 를 붙인다", () => {
    expect(toTrendingHashtag(TRENDING_TODAY.hashtags[0])).toEqual({ tag: "#쉥겐비자", count: 12, trend: 8 });
    expect(toSearchedTag(SEARCH_HASHTAGS.hashtags[0])).toEqual({ tag: "#파리", count: 8, trend: 0 });
  });

  it("검색 프로필 — 닉네임이 없으면 대체 이름", () => {
    expect(toSearchedProfile(SEARCH_PROFILES.profiles[1])).toEqual({
      userId: 104,
      name: "이름 없는 사용자",
      avatar: "🌱",
      tags: ["#파리"],
      mapCount: 1,
    });
  });

  it("비슷한 사람 — 겹치는 태그를 한 줄로 합친다", () => {
    expect(toSimilarPersonRow(SIMILAR_PEOPLE.people[0])).toEqual({
      userId: 102,
      name: "foodtrip",
      tags: "#파리 #먹거리",
      following: false,
    });
    expect(toSimilarPersonRow(SIMILAR_PEOPLE.people[2]).name).toBe("이름 없는 사용자");
  });

  it("상세 팝업 세션 — 제목이 비었으면 안내 문구, 있으면 그대로", () => {
    const [content, urlOnly] = CARD_SESSIONS.sessions;
    expect(toDetailSession(content).title).toBe("프라하 1박 일정 짜기");
    expect(toDetailSession(urlOnly).title).toBe("원문 링크만 공개된 세션");
  });
});
