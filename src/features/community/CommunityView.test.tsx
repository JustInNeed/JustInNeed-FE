import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http } from "msw";
import { describe, expect, it, vi } from "vitest";
import type { UseApiResult } from "@/lib/hooks/useApi";
import { mockRouter } from "@/test/router";
import { API, fail, ok, server } from "@/test/msw/server";
import { renderPersonal } from "@/test/render";
import {
  CARD_SESSIONS,
  CONTENT_CARD,
  EMPTY_RECOMMENDATION,
  INTERESTS,
  MY_CARD,
  RECENT_BOOKMARKS,
  REACTED_CARD,
  SEARCH_HASHTAGS,
  SEARCH_MINDMAPS,
  SEARCH_PROFILES,
  SIMILAR_PEOPLE,
  TRENDING_TODAY,
  TRENDING_WEEK,
} from "@/test/fixtures/communityApi";
import { CommunityView, profilePath, type CommunitySections } from "./CommunityView";
import { toRecommendation, toSimilarPersonRow, toTrendingHashtag } from "./toCommunityData";

const ready = <T,>(data: T): UseApiResult<T> => ({ data, loading: false, error: null, refetch: vi.fn() });
const loading = <T,>(): UseApiResult<T> => ({ data: null, loading: true, error: null, refetch: vi.fn() });
const failed = <T,>(error: string, refetch = vi.fn()): UseApiResult<T> => ({ data: null, loading: false, error, refetch });

const SECTIONS: CommunitySections = {
  interests: ready(toRecommendation(INTERESTS)),
  recentBookmarks: ready(toRecommendation(RECENT_BOOKMARKS)),
  trendingToday: ready(TRENDING_TODAY.hashtags.map(toTrendingHashtag)),
  trendingWeek: ready(TRENDING_WEEK.hashtags.map(toTrendingHashtag)),
  similarPeople: ready(SIMILAR_PEOPLE.people.map(toSimilarPersonRow)),
};
const EMPTY: CommunitySections = {
  interests: ready(toRecommendation(EMPTY_RECOMMENDATION)),
  recentBookmarks: ready(toRecommendation(EMPTY_RECOMMENDATION)),
  trendingToday: ready([]),
  trendingWeek: ready([]),
  similarPeople: ready([]),
};

function renderCommunity(sections: Partial<CommunitySections> = {}) {
  return renderPersonal(<CommunityView sections={{ ...SECTIONS, ...sections }} />);
}

const region = (name: string) => screen.getByRole("region", { name });
const INTEREST = "관심 해시태그 기반 추천";
const RECENT = "최근 저장한 해시태그 기반 추천";
/** 피드 카드 하나 (제목으로 찾기) — 같은 카드가 두 목록에 있으면 root 로 좁힌다 */
const feedCard = (title: string, root: HTMLElement = document.body) =>
  within(root).getByText(title, { selector: "h4" }).closest<HTMLElement>(".feedCard")!;
const button = (card: HTMLElement, name: string) => within(card).getByRole("button", { name });
const CONTENT_TITLE = CONTENT_CARD.title!;

/** PATCH 를 받아 본문을 기록하고 정해 둔 응답을 돌려준다 */
function onPatch(path: string, resolve: () => Response) {
  const bodies: unknown[] = [];
  server.use(
    http.patch(`${API}${path}`, async ({ request }) => {
      bodies.push(await request.json());
      return resolve();
    }),
  );
  return bodies;
}

describe("profilePath", () => {
  it("프로필 주소는 회원 id 로 만든다", () => {
    expect(profilePath(103)).toBe("/profile/103");
  });
});

describe("CommunityView — 추천 피드", () => {
  it("두 추천을 근거 태그와 함께 섹션별로 보여준다", () => {
    renderCommunity();
    const chips = (el: HTMLElement) => Array.from(el.querySelector(".secChips")!.children, (c) => c.textContent);
    expect(chips(region(INTEREST))).toEqual(["#파리", "#로마"]);
    expect(within(region(INTEREST)).getAllByRole("heading", { level: 4 }).map((h) => h.textContent)).toEqual([
      CONTENT_TITLE,
      "파리 미식 지도",
      "#미술관 #로마",
    ]);
    expect(chips(region(RECENT))).toEqual(["#야간열차"]);
    expect(within(region(RECENT)).getAllByRole("heading", { level: 4 }).map((h) => h.textContent)).toEqual([
      "유럽 한 달 예산",
      CONTENT_TITLE,
    ]);
  });

  it("카드에 작성자 · 날짜 · 노드 수 · 소개글 · 해시태그 · 반응 수를 보여주고 아바타는 기본값이다", () => {
    renderCommunity();
    const card = feedCard(CONTENT_TITLE, region(INTEREST));
    const c = within(card);
    expect(c.getByText("🌱")).toBeInTheDocument();
    expect(c.getByText("wanderlust")).toBeInTheDocument();
    expect(c.getByText("2026-10-30")).toBeInTheDocument();
    expect(c.getByText("노드 14")).toBeInTheDocument();
    expect(c.getByText(/프라하 → 비엔나/)).toBeInTheDocument();
    ["#프라하", "#동유럽"].forEach((tag) => expect(c.getByRole("button", { name: tag })).toBeInTheDocument());
    expect(button(card, "좋아요")).toHaveTextContent("28");
    expect(button(card, "북마크")).toHaveTextContent("9");
    expect(button(card, "나도 탐색중")).toHaveTextContent("나도 탐색중 12");
  });

  it("URL 만 공개한 카드는 제목 자리에 해시태그, 소개글 없음, URL 은 사이트 주소만 보여준다", () => {
    renderCommunity();
    const card = feedCard("#미술관 #로마");
    expect(card.querySelector(".feedSnippet")).toBeNull();
    expect(card.querySelector(".feedTags")).toBeNull();
    const link = within(card).getByRole("link", { name: "museivaticani.va" });
    expect(link).toHaveAttribute("href", "https://www.museivaticani.va/content");
    expect(within(link).getAllByText("museivaticani.va")).toHaveLength(1);
  });

  it("닉네임이 없는 작성자는 대체 이름으로 보여준다", () => {
    renderCommunity();
    expect(within(feedCard("유럽 한 달 예산")).getByText("이름 없는 사용자")).toBeInTheDocument();
  });

  it("연관 URL 은 제목과 사이트 주소로 보여주고 새 탭으로 연다", () => {
    renderCommunity();
    const card = within(feedCard(CONTENT_TITLE, region(INTEREST)));
    const link = card.getByRole("link", { name: /ÖBB 나이트젯 야간열차 노선/ });
    expect(link).toHaveAttribute("href", "https://www.nightjet.com/en");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(within(link).getByText("nightjet.com")).toBeInTheDocument();
  });

  it("연관 URL 이 3개 이상이어도 앞의 2개만, 없으면 영역 없이 보여준다", () => {
    renderCommunity();
    const links = within(feedCard(CONTENT_TITLE, region(INTEREST))).getAllByRole("link");
    expect(links.map((a) => a.getAttribute("href"))).toEqual(["https://www.nightjet.com/en", "https://www.cd.cz/en/"]);
    expect(within(feedCard("유럽 한 달 예산")).queryByText("연관 URL")).toBeNull();
  });
});

describe("CommunityView — 카드 반응", () => {
  it("이미 반응한 카드는 눌린 상태로 시작한다", () => {
    renderCommunity();
    const card = feedCard(REACTED_CARD.title!);
    expect(button(card, "좋아요")).toHaveAttribute("aria-pressed", "true");
    expect(button(card, "북마크")).toHaveAttribute("aria-pressed", "true");
    expect(button(card, "나도 탐색중")).toHaveAttribute("aria-pressed", "true");
  });

  it("좋아요는 먼저 바뀌고 서버 값으로 맞춘다", async () => {
    let release = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    const bodies: unknown[] = [];
    server.use(
      http.patch(`${API}/community/mindmaps/12/like`, async ({ request }) => {
        bodies.push(await request.json());
        await gate;
        return ok({ likeCount: 40, likedByMe: true });
      }),
    );
    const { user } = renderCommunity();
    const like = button(feedCard(CONTENT_TITLE, region(INTEREST)), "좋아요");
    await user.click(like);
    expect(like).toHaveTextContent("29");
    expect(like).toHaveAttribute("aria-pressed", "true");
    release();
    await waitFor(() => expect(like).toHaveTextContent("40"));
    expect(bodies).toEqual([{ liked: true }]);
  });

  it("좋아요를 끄면 liked: false 를 보낸다", async () => {
    const bodies = onPatch("/community/mindmaps/13/like", () => ok({ likeCount: 6, likedByMe: false }));
    const { user } = renderCommunity();
    const like = button(feedCard(REACTED_CARD.title!), "좋아요");
    await user.click(like);
    await waitFor(() => expect(like).toHaveAttribute("aria-pressed", "false"));
    expect(like).toHaveTextContent("6");
    expect(bodies).toEqual([{ liked: false }]);
  });

  it("북마크 응답의 bookmarkId 로 눌림 상태를 정한다", async () => {
    const bodies = onPatch("/community/mindmaps/13/bookmark", () => ok({ bookmarkCount: 2, bookmarkId: null }));
    const { user } = renderCommunity();
    const bookmark = button(feedCard(REACTED_CARD.title!), "북마크");
    await user.click(bookmark);
    await waitFor(() => expect(bookmark).toHaveTextContent("2"));
    expect(bookmark).toHaveAttribute("aria-pressed", "false");
    expect(bodies).toEqual([{ bookmarked: false }]);
  });

  it("나도 탐색중은 카드 버튼으로 켜고 끌 수 있고 팝업은 열리지 않는다", async () => {
    const bodies = onPatch("/community/mindmaps/12/exploring", () => ok({ exploringCount: 14, exploringByMe: true }));
    const { user } = renderCommunity();
    const exploring = button(feedCard(CONTENT_TITLE, region(INTEREST)), "나도 탐색중");
    expect(exploring).toHaveAttribute("aria-pressed", "false");
    await user.click(exploring);
    await waitFor(() => expect(exploring).toHaveTextContent("나도 탐색중 14"));
    expect(exploring).toHaveAttribute("aria-pressed", "true");
    expect(bodies).toEqual([{ exploring: true }]);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("나도 탐색중을 끄면 exploring: false 를 보낸다", async () => {
    const bodies = onPatch("/community/mindmaps/13/exploring", () => ok({ exploringCount: 4, exploringByMe: false }));
    const { user } = renderCommunity();
    const exploring = button(feedCard(REACTED_CARD.title!), "나도 탐색중");
    await user.click(exploring);
    await waitFor(() => expect(exploring).toHaveTextContent("나도 탐색중 4"));
    expect(exploring).toHaveAttribute("aria-pressed", "false");
    expect(bodies).toEqual([{ exploring: false }]);
  });

  it.each([
    ["좋아요", "like", "28"],
    ["북마크", "bookmark", "9"],
    ["나도 탐색중", "exploring", "나도 탐색중 12"],
  ])("%s 이 실패하면 되돌리고 서버 문구를 토스트로 보여준다", async (name, path, original) => {
    onPatch(`/community/mindmaps/12/${path}`, () => fail(400, "저장할 수 없는 카드입니다."));
    const { user } = renderCommunity();
    const action = button(feedCard(CONTENT_TITLE, region(INTEREST)), name);
    await user.click(action);
    expect(await screen.findByText("저장할 수 없는 카드입니다.")).toBeInTheDocument();
    expect(action).toHaveTextContent(original);
    expect(action).toHaveAttribute("aria-pressed", "false");
  });

  it("카드가 공개에서 빠졌으면(404) 안내 토스트를 보여주고 되돌린다", async () => {
    onPatch("/community/mindmaps/12/bookmark", () => fail(404, "세션을 찾을 수 없습니다."));
    const { user } = renderCommunity();
    const bookmark = button(feedCard(CONTENT_TITLE, region(INTEREST)), "북마크");
    await user.click(bookmark);
    expect(await screen.findByText("더 이상 공개되지 않는 마인드맵이에요.")).toBeInTheDocument();
    expect(bookmark).toHaveTextContent("9");
  });

  it("실패해도 같은 카드의 다른 반응은 되돌리지 않는다", async () => {
    let release = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    server.use(
      http.patch(`${API}/community/mindmaps/12/like`, async () => {
        await gate;
        return fail(500, "서버 오류");
      }),
    );
    onPatch("/community/mindmaps/12/bookmark", () => ok({ bookmarkCount: 10, bookmarkId: 7 }));
    const { user } = renderCommunity();
    const card = feedCard(CONTENT_TITLE, region(INTEREST));
    await user.click(button(card, "좋아요"));
    await user.click(button(card, "북마크"));
    await waitFor(() => expect(button(card, "북마크")).toHaveTextContent("10"));
    release();
    await waitFor(() => expect(button(card, "좋아요")).toHaveTextContent("28"));
    expect(button(card, "북마크")).toHaveAttribute("aria-pressed", "true");
  });

  it("응답을 받기 전에 다시 누르면 요청을 또 보내지 않는다", async () => {
    let release = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    const bodies: unknown[] = [];
    server.use(
      http.patch(`${API}/community/mindmaps/12/like`, async ({ request }) => {
        bodies.push(await request.json());
        await gate;
        return ok({ likeCount: 40, likedByMe: true });
      }),
    );
    const { user } = renderCommunity();
    const like = button(feedCard(CONTENT_TITLE, region(INTEREST)), "좋아요");
    await user.click(like);
    await user.click(like);
    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(like).toHaveAttribute("aria-pressed", "true");
    release();
    await waitFor(() => expect(like).toHaveTextContent("40"));
    expect(bodies).toEqual([{ liked: true }]);
    // 응답을 받은 뒤에는 다시 보낼 수 있다
    await user.click(like);
    await waitFor(() => expect(bodies).toEqual([{ liked: true }, { liked: false }]));
  });

  it("같은 카드가 두 목록에 있으면 반응이 함께 바뀌고 실패하면 함께 되돌아간다", async () => {
    let release = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    server.use(
      http.patch(`${API}/community/mindmaps/12/exploring`, async () => {
        await gate;
        return fail(404, "세션을 찾을 수 없습니다.");
      }),
    );
    const { user } = renderCommunity();
    const inInterest = button(feedCard(CONTENT_TITLE, region(INTEREST)), "나도 탐색중");
    const inRecent = button(feedCard(CONTENT_TITLE, region(RECENT)), "나도 탐색중");
    await user.click(inInterest);
    expect(inRecent).toHaveTextContent("나도 탐색중 13");
    expect(inRecent).toHaveAttribute("aria-pressed", "true");
    release();
    await waitFor(() => expect(inRecent).toHaveTextContent("나도 탐색중 12"));
    expect(inInterest).toHaveAttribute("aria-pressed", "false");
  });

  it("내 카드에는 좋아요 버튼이 없고 다른 반응은 그대로 있다", () => {
    renderCommunity({ interests: ready(toRecommendation({ basisHashtags: [], mindmaps: [MY_CARD, CONTENT_CARD] })) });
    const mine = feedCard(MY_CARD.title!);
    expect(within(mine).queryByRole("button", { name: "좋아요" })).toBeNull();
    expect(button(mine, "북마크")).toBeInTheDocument();
    expect(button(mine, "나도 탐색중")).toBeInTheDocument();
    expect(button(feedCard(CONTENT_TITLE, region(INTEREST)), "좋아요")).toBeInTheDocument();
  });
});

const SEARCH = `${API}/community/search`;
const searchInput = () => screen.getByRole("textbox", { name: "해시태그 검색" });
const dropdown = () => document.querySelector<HTMLElement>(".dropdown");
const panel = async () => within(await waitFor(() => dropdown()!));

/** 세 검색 API 를 받아 어떤 검색어로 불렸는지 기록한다 */
function mockSearch({
  hashtags = () => ok(SEARCH_HASHTAGS),
  profiles = () => ok(SEARCH_PROFILES),
  mindmaps = () => ok(SEARCH_MINDMAPS),
}: {
  hashtags?: (q: string) => Response | Promise<Response>;
  profiles?: (q: string) => Response | Promise<Response>;
  mindmaps?: (q: string) => Response | Promise<Response>;
} = {}) {
  const urls: URL[] = [];
  const handle = (fn: (q: string) => Response | Promise<Response>) => ({ request }: { request: Request }) => {
    const url = new URL(request.url);
    urls.push(url);
    return fn(url.searchParams.get("q")!);
  };
  server.use(
    http.get(`${SEARCH}/hashtags`, handle(hashtags)),
    http.get(`${SEARCH}/profiles`, handle(profiles)),
    http.get(`${SEARCH}/mindmaps`, handle(mindmaps)),
  );
  return urls;
}
const settle = () => new Promise((resolve) => setTimeout(resolve, 350));

describe("CommunityView — 검색바", () => {
  it("검색어를 입력하면 연관 해시태그 · 프로필 추천 · 마인드맵 탐색 드롭다운이 열린다", async () => {
    const urls = mockSearch();
    const { user } = renderCommunity();
    expect(dropdown()).toBeNull();
    await user.type(searchInput(), "파리");
    const p = await panel();
    expect(await p.findByRole("button", { name: /^#파리\s*8$/ })).toBeInTheDocument();
    expect(p.getByText("프로필 추천")).toBeInTheDocument();
    expect(p.getByText("foodtrip")).toBeInTheDocument();
    expect(p.getByText("마인드맵 3개 · #파리 #먹거리 #빵")).toBeInTheDocument();
    expect(p.getByText("이름 없는 사용자")).toBeInTheDocument();
    expect(p.getByText("마인드맵 탐색")).toBeInTheDocument();
    expect(p.getByText("파리 미식 지도")).toBeInTheDocument();
    expect(p.getByText("foodtrip · 노드 14 · #파리 #먹거리")).toBeInTheDocument();
    // URL 만 공개한 카드는 제목 자리의 해시태그를 다시 쓰지 않는다
    expect(p.getByText("#미술관 #로마")).toBeInTheDocument();
    expect(p.getByText("artwalk · 노드 2")).toBeInTheDocument();
    expect(urls.map((u) => `${u.pathname}${u.search}`).sort()).toEqual(
      [
        `/community/search/hashtags?q=${encodeURIComponent("파리")}&limit=5`,
        `/community/search/mindmaps?q=${encodeURIComponent("파리")}&page=0&size=4`,
        `/community/search/profiles?q=${encodeURIComponent("파리")}&page=0&size=4`,
      ].sort(),
    );
  });

  it("입력이 멈출 때까지 기다렸다가 마지막 검색어로 한 번만 찾는다", async () => {
    const urls = mockSearch();
    renderCommunity();
    // 사용자 타이핑 속도에 기대지 않도록 같은 순간에 연달아 바꾼다
    ["파", "파리", "파리올"].forEach((value) => fireEvent.change(searchInput(), { target: { value } }));
    expect(urls).toHaveLength(0);
    await (await panel()).findByText("프로필 추천");
    expect(urls.map((u) => u.searchParams.get("q"))).toEqual(["파리올", "파리올", "파리올"]);
  });

  it("입력 직후에는 요청을 보내지 않는다", async () => {
    const urls = mockSearch();
    renderCommunity();
    fireEvent.change(searchInput(), { target: { value: "파리" } });
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(urls).toHaveLength(0);
    await (await panel()).findByText("프로필 추천");
  });

  it("검색어 앞의 # 과 공백은 빼고 찾는다", async () => {
    const urls = mockSearch();
    const { user } = renderCommunity();
    await user.type(searchInput(), " ##파리 ");
    await (await panel()).findByText("프로필 추천");
    expect(new Set(urls.map((u) => u.searchParams.get("q")))).toEqual(new Set(["파리"]));
  });

  it("공백이나 # 만 입력하면 요청을 보내지 않고 드롭다운도 열지 않는다", async () => {
    const urls = mockSearch();
    const { user } = renderCommunity();
    await user.type(searchInput(), " # ");
    await settle();
    expect(urls).toHaveLength(0);
    expect(dropdown()).toBeNull();
  });

  it("나중에 도착한 옛 검색어 응답은 무시한다", async () => {
    let releaseOld = () => {};
    const oldGate = new Promise<void>((resolve) => (releaseOld = resolve));
    const hit = (tag: string) => ok({ hashtags: [{ tag, count: 1 }] });
    const seen: string[] = [];
    mockSearch({
      hashtags: async (q) => {
        seen.push(q);
        if (q === "파") await oldGate;
        return hit(q === "파" ? "옛결과" : "새결과");
      },
      profiles: () => ok({ profiles: [], hasNext: false }),
      mindmaps: () => ok({ mindmaps: [], hasNext: false }),
    });
    const { user } = renderCommunity();
    await user.type(searchInput(), "파");
    await waitFor(() => expect(seen).toEqual(["파"]));
    await user.type(searchInput(), "리");
    const p = await panel();
    expect(await p.findByRole("button", { name: /^#새결과/ })).toBeInTheDocument();
    releaseOld();
    await settle();
    expect(p.getByRole("button", { name: /^#새결과/ })).toBeInTheDocument();
    expect(p.queryByRole("button", { name: /^#옛결과/ })).toBeNull();
  });

  it("검색어를 바꾸면 이전 결과 대신 찾는 중을 보여준다", async () => {
    let release = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    mockSearch({
      hashtags: async (q) => {
        if (q !== "파리") await gate;
        return ok(SEARCH_HASHTAGS);
      },
    });
    const { user } = renderCommunity();
    await user.type(searchInput(), "파리");
    const p = await panel();
    await p.findByText("프로필 추천");
    await user.type(searchInput(), "올");
    expect(p.getByText("찾는 중…")).toBeInTheDocument();
    expect(p.queryByText("프로필 추천")).toBeNull();
    release();
    expect(await p.findByText("프로필 추천")).toBeInTheDocument();
  });

  it("일치하는 결과가 없으면 안내 문구를 보여준다", async () => {
    mockSearch({
      hashtags: () => ok({ hashtags: [] }),
      profiles: () => ok({ profiles: [], hasNext: false }),
      mindmaps: () => ok({ mindmaps: [], hasNext: false }),
    });
    const { user } = renderCommunity();
    await user.type(searchInput(), "남극");
    expect(await (await panel()).findByText("일치하는 결과가 없어요. 다른 해시태그로 검색해보세요.")).toBeInTheDocument();
  });

  it("한 그룹만 실패하면 나머지는 보여주고 다시 시도할 수 있다", async () => {
    let calls = 0;
    mockSearch({
      profiles: () => {
        calls += 1;
        return calls === 1 ? fail(500, "서버 오류") : ok(SEARCH_PROFILES);
      },
    });
    const { user } = renderCommunity();
    await user.type(searchInput(), "파리");
    const p = await panel();
    expect(await p.findByRole("alert")).toHaveTextContent("일부 결과를 불러오지 못했어요.");
    expect(p.getByText("연관 해시태그")).toBeInTheDocument();
    expect(p.getByText("마인드맵 탐색")).toBeInTheDocument();
    expect(p.queryByText("프로필 추천")).toBeNull();
    await user.click(p.getByRole("button", { name: "다시 시도" }));
    expect(await p.findByText("프로필 추천")).toBeInTheDocument();
    expect(p.queryByRole("alert")).toBeNull();
  });

  it("모두 실패하면 오류를 보여주고 결과 없음 문구는 보여주지 않는다", async () => {
    const failing = () => fail(500, "서버 오류");
    mockSearch({ hashtags: failing, profiles: failing, mindmaps: failing });
    const { user } = renderCommunity();
    await user.type(searchInput(), "파리");
    const p = await panel();
    expect(await p.findByRole("alert")).toHaveTextContent("검색 결과를 불러오지 못했어요.");
    expect(p.queryByText(/일치하는 결과가 없어요/)).toBeNull();
    // 피드는 그대로
    expect(within(region(INTEREST)).getAllByRole("heading", { level: 4 })).toHaveLength(3);
  });

  it("× 를 누르면 검색어가 지워지고 드롭다운이 닫힌다", async () => {
    mockSearch();
    const { user } = renderCommunity();
    await user.type(searchInput(), "파리");
    await (await panel()).findByText("프로필 추천");
    await user.click(screen.getByRole("button", { name: "검색어 지우기" }));
    expect(searchInput()).toHaveValue("");
    expect(dropdown()).toBeNull();
    expect(screen.queryByRole("button", { name: "검색어 지우기" })).toBeNull();
  });

  it("글자를 모두 지우면 드롭다운이 닫히고 요청을 보내지 않는다", async () => {
    const urls = mockSearch();
    renderCommunity();
    fireEvent.change(searchInput(), { target: { value: "파" } });
    fireEvent.change(searchInput(), { target: { value: "" } });
    await settle();
    expect(dropdown()).toBeNull();
    expect(urls).toHaveLength(0);
  });

  it("검색 영역 바깥을 누르면 드롭다운이 닫히고, 검색창을 다시 누르면 같은 결과로 열린다", async () => {
    mockSearch();
    const { user } = renderCommunity();
    await user.type(searchInput(), "파리");
    await (await panel()).findByText("프로필 추천");
    await user.click(screen.getByRole("heading", { name: INTEREST }));
    expect(dropdown()).toBeNull();
    expect(searchInput()).toHaveValue("파리");
    await user.click(searchInput());
    expect(within(dropdown()!).getByText("foodtrip")).toBeInTheDocument();
  });

  it("연관 해시태그를 누르면 그 태그(# 없이)로 검색창이 채워진다", async () => {
    mockSearch();
    const { user } = renderCommunity();
    await user.type(searchInput(), "파");
    await user.click(await (await panel()).findByRole("button", { name: /^#파리올림픽/ }));
    expect(searchInput()).toHaveValue("파리올림픽");
    expect(dropdown()).not.toBeNull();
  });

  it("프로필 추천을 누르면 회원 id 로 그 사람 프로필에 이동한다", async () => {
    mockSearch();
    const { user } = renderCommunity();
    await user.type(searchInput(), "파리");
    await user.click(await (await panel()).findByText("foodtrip"));
    expect(mockRouter.push).toHaveBeenCalledWith("/profile/102");
  });

  it("마인드맵 탐색 결과를 누르면 작성자 프로필로 이동한다", async () => {
    mockSearch();
    const { user } = renderCommunity();
    await user.type(searchInput(), "파리");
    await user.click(await (await panel()).findByText("#미술관 #로마"));
    expect(mockRouter.push).toHaveBeenCalledWith("/profile/103");
  });
});

describe("CommunityView — 상세 팝업", () => {
  const SESSIONS_URL = `${API}/community/mindmaps/12/sessions`;
  const open = async (user: ReturnType<typeof renderCommunity>["user"]) => {
    await user.click(within(region(INTEREST)).getByText(CONTENT_TITLE, { selector: "h4" }));
    return screen.getByRole("dialog", { name: CONTENT_TITLE });
  };

  it("카드를 누르면 팝업이 열리고 그때 관련 세션을 불러온다", async () => {
    let calls = 0;
    let release = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    server.use(
      http.get(SESSIONS_URL, async () => {
        calls += 1;
        await gate;
        return ok(CARD_SESSIONS);
      }),
    );
    const { user } = renderCommunity();
    expect(calls).toBe(0);
    const dialog = within(await open(user));
    expect(dialog.getByText("불러오는 중…")).toBeInTheDocument();
    expect(dialog.queryByText("· 0개")).toBeNull();
    release();
    expect(await dialog.findByText("프라하 1박 일정 짜기")).toBeInTheDocument();
    expect(dialog.getByText("· 2개")).toBeInTheDocument();
    expect(calls).toBe(1);
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it("URL 만 공개한 세션은 제목 대신 안내 문구를 보여준다", async () => {
    server.use(http.get(SESSIONS_URL, () => ok(CARD_SESSIONS)));
    const { user } = renderCommunity();
    expect(await within(await open(user)).findByText("원문 링크만 공개된 세션")).toBeInTheDocument();
  });

  it("관련 세션을 누르면 그 세션 화면으로 이동한다", async () => {
    server.use(http.get(SESSIONS_URL, () => ok(CARD_SESSIONS)));
    const { user } = renderCommunity();
    await user.click(await within(await open(user)).findByText("프라하 1박 일정 짜기"));
    expect(mockRouter.push).toHaveBeenCalledWith("/sessions/12");
  });

  it("작성자 이름을 누르면 회원 id 로 프로필에 이동하고 팝업이 닫힌다", async () => {
    server.use(http.get(SESSIONS_URL, () => ok(CARD_SESSIONS)));
    const { user } = renderCommunity();
    const dialog = within(await open(user));
    await dialog.findByText("프라하 1박 일정 짜기");
    await user.click(dialog.getByRole("button", { name: "🌱 wanderlust" }));
    expect(mockRouter.push).toHaveBeenCalledWith("/profile/101");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("세션을 불러오지 못하면 팝업 안에서 다시 시도할 수 있다", async () => {
    let calls = 0;
    server.use(
      http.get(SESSIONS_URL, () => {
        calls += 1;
        return calls === 1 ? fail(404, "세션을 찾을 수 없습니다.") : ok(CARD_SESSIONS);
      }),
    );
    const { user } = renderCommunity();
    const dialog = within(await open(user));
    expect(await dialog.findByRole("alert")).toHaveTextContent("세션을 찾을 수 없습니다.");
    await user.click(dialog.getByRole("button", { name: "다시 시도" }));
    expect(await dialog.findByText("프라하 1박 일정 짜기")).toBeInTheDocument();
  });

  it("팝업의 좋아요 수는 내가 누른 값을 따른다", async () => {
    server.use(http.get(SESSIONS_URL, () => ok(CARD_SESSIONS)));
    onPatch("/community/mindmaps/12/like", () => ok({ likeCount: 29, likedByMe: true }));
    const { user } = renderCommunity();
    const like = button(feedCard(CONTENT_TITLE, region(INTEREST)), "좋아요");
    await user.click(like);
    await waitFor(() => expect(like).toHaveTextContent("29"));
    expect(within(await open(user)).getByText("좋아요 29")).toBeInTheDocument();
    await screen.findByText("프라하 1박 일정 짜기");
  });

  it("연관 URL · 반응 버튼을 눌러도 팝업은 열리지 않는다", async () => {
    // jsdom 은 링크 이동을 지원하지 않아 기본 동작만 막는다 (전파는 그대로)
    const prevent = (e: Event) => e.preventDefault();
    window.addEventListener("click", prevent, true);
    onPatch("/community/mindmaps/12/bookmark", () => ok({ bookmarkCount: 10, bookmarkId: 7 }));
    const { user } = renderCommunity();
    const card = feedCard(CONTENT_TITLE, region(INTEREST));
    await user.click(within(card).getByRole("link", { name: /ÖBB/ }));
    await user.click(button(card, "북마크"));
    await waitFor(() => expect(button(card, "북마크")).toHaveTextContent("10"));
    expect(screen.queryByRole("dialog")).toBeNull();
    window.removeEventListener("click", prevent, true);
  });
});

const trendCard = () => screen.getByRole("heading", { name: /떠오르는 해시태그/ }).closest<HTMLElement>(".card")!;
const peopleCard = () => screen.getByRole("heading", { name: "관심사가 비슷한 사람" }).closest<HTMLElement>(".card")!;
const personRow = (name: string) => within(peopleCard()).getByText(name).closest<HTMLElement>(".personRow")!;

describe("CommunityView — 떠오르는 해시태그", () => {
  it("오늘의 해시태그를 개수 · 증감과 함께 보여주고, 증감이 0 이면 화살표를 그리지 않는다", () => {
    renderCommunity();
    const card = within(trendCard());
    expect(card.getByRole("heading", { name: "오늘의 떠오르는 해시태그" })).toBeInTheDocument();
    expect(card.getByRole("button", { name: "오늘" })).toHaveClass("miniTabOn");
    expect(card.getByRole("button", { name: /#쉥겐비자/ })).toHaveTextContent("#쉥겐비자12↑8");
    expect(card.getByRole("button", { name: /#아이슬란드/ })).toHaveTextContent("#아이슬란드3↓4");
    expect(card.getByRole("button", { name: /#오로라/ }).textContent).toBe("#오로라7");
  });

  it("이번 주 탭을 누르면 이번 주 목록과 제목으로 바뀌고, 오늘을 누르면 돌아온다", async () => {
    const { user } = renderCommunity();
    await user.click(within(trendCard()).getByRole("button", { name: "이번 주" }));
    const card = within(trendCard());
    expect(card.getByRole("heading", { name: "이번 주 떠오르는 해시태그" })).toBeInTheDocument();
    expect(card.getByRole("button", { name: /#바르셀로나/ })).toHaveTextContent("#바르셀로나39↑21");
    expect(card.queryByRole("button", { name: /#쉥겐비자/ })).toBeNull();
    await user.click(card.getByRole("button", { name: "오늘" }));
    expect(within(trendCard()).getByRole("button", { name: /#쉥겐비자/ })).toBeInTheDocument();
  });

  it("해시태그를 누르면 그 태그로 검색창이 채워지고 드롭다운이 열린다", async () => {
    mockSearch();
    const { user } = renderCommunity();
    await user.click(within(trendCard()).getByRole("button", { name: /#오로라/ }));
    expect(searchInput()).toHaveValue("오로라");
    expect(await (await panel()).findByText("연관 해시태그")).toBeInTheDocument();
  });

  it("이번 주만 실패하면 그 탭에서만 오류를 보여주고 오늘 탭은 그대로다", async () => {
    const refetch = vi.fn();
    const { user } = renderCommunity({ trendingWeek: failed("이번 주를 불러오지 못했어요.", refetch) });
    expect(within(trendCard()).queryByRole("alert")).toBeNull();
    await user.click(within(trendCard()).getByRole("button", { name: "이번 주" }));
    expect(within(trendCard()).getByRole("alert")).toHaveTextContent("이번 주를 불러오지 못했어요.");
    await user.click(within(trendCard()).getByRole("button", { name: "다시 시도" }));
    expect(refetch).toHaveBeenCalledOnce();
  });

  it("불러오는 중 · 비어 있음을 그 카드 안에 보여준다", () => {
    const { unmount } = renderCommunity({ trendingToday: loading() });
    expect(within(trendCard()).getByText("불러오는 중…")).toBeInTheDocument();
    unmount();
    renderCommunity({ trendingToday: ready([]) });
    expect(within(trendCard()).getByText("아직 떠오르는 해시태그가 없어요.")).toBeInTheDocument();
  });
});

describe("CommunityView — 비슷한 사람", () => {
  it("이름 · 겹치는 태그 · 팔로우 상태를 보여주고 닉네임이 없으면 대체 이름을 쓴다", () => {
    renderCommunity();
    expect(within(personRow("foodtrip")).getByText("#파리 #먹거리")).toBeInTheDocument();
    expect(within(personRow("foodtrip")).getByRole("button", { name: "팔로우" })).toHaveAttribute("aria-pressed", "false");
    expect(within(personRow("artwalk")).getByRole("button", { name: "팔로잉" })).toHaveAttribute("aria-pressed", "true");
    expect(within(personRow("이름 없는 사용자")).getByText("#예산")).toBeInTheDocument();
  });

  it("팔로우를 누르면 먼저 바뀌고 서버에 저장한다", async () => {
    const bodies = onPatch("/community/profiles/102/follow", () => ok({ following: true }));
    const { user } = renderCommunity();
    const row = within(personRow("foodtrip"));
    await user.click(row.getByRole("button", { name: "팔로우" }));
    expect(row.getByRole("button", { name: "팔로잉" })).toBeInTheDocument();
    await waitFor(() => expect(bodies).toEqual([{ following: true }]));
    // 다른 사람은 그대로
    expect(within(personRow("이름 없는 사용자")).getByRole("button", { name: "팔로우" })).toBeInTheDocument();
  });

  it("언팔로우에 실패하면 되돌리고 서버 문구를 토스트로 보여준다", async () => {
    const bodies = onPatch("/community/profiles/103/follow", () => fail(404, "회원을 찾을 수 없습니다."));
    const { user } = renderCommunity();
    await user.click(within(personRow("artwalk")).getByRole("button", { name: "팔로잉" }));
    expect(await screen.findByText("회원을 찾을 수 없습니다.")).toBeInTheDocument();
    expect(within(personRow("artwalk")).getByRole("button", { name: "팔로잉" })).toBeInTheDocument();
    expect(bodies).toEqual([{ following: false }]);
  });

  it("실패 · 불러오는 중 · 빈 상태를 그 카드 안에 보여주고 피드는 그대로다", () => {
    const { unmount } = renderCommunity({ similarPeople: failed("사람을 불러오지 못했어요.") });
    expect(within(peopleCard()).getByRole("alert")).toHaveTextContent("사람을 불러오지 못했어요.");
    expect(within(region(INTEREST)).getAllByRole("heading", { level: 4 })).toHaveLength(3);
    unmount();
    const second = renderCommunity({ similarPeople: loading() });
    expect(within(peopleCard()).getByText("불러오는 중…")).toBeInTheDocument();
    second.unmount();
    renderCommunity({ similarPeople: ready([]) });
    expect(within(peopleCard()).getByText("아직 비슷한 사람을 찾지 못했어요.")).toBeInTheDocument();
  });
});

describe("CommunityView — 섹션 상태", () => {
  it("불러오는 중이면 그 섹션에만 안내가 보이고 나머지는 그대로다", () => {
    renderCommunity({ interests: loading() });
    expect(within(region(INTEREST)).getByText("불러오는 중…")).toBeInTheDocument();
    expect(within(region(RECENT)).getByText("유럽 한 달 예산")).toBeInTheDocument();
  });

  it("한 섹션이 실패해도 다른 섹션은 보이고, 다시 시도는 그 섹션만 부른다", async () => {
    const refetch = vi.fn();
    const { user } = renderCommunity({ interests: failed("추천을 불러오지 못했어요.", refetch) });
    const interest = within(region(INTEREST));
    expect(interest.getByRole("alert")).toHaveTextContent("추천을 불러오지 못했어요.");
    expect(within(region(RECENT)).getAllByRole("heading", { level: 4 })).toHaveLength(2);
    await user.click(interest.getByRole("button", { name: "다시 시도" }));
    expect(refetch).toHaveBeenCalledOnce();
  });

  it("한 섹션만 비면 그 자리에 빈 안내를 보여준다", () => {
    renderCommunity({ interests: EMPTY.interests });
    expect(within(region(INTEREST)).getByRole("status")).toHaveTextContent("추천할 마인드맵이 아직 없어요");
    expect(within(region(RECENT)).getAllByRole("heading", { level: 4 })).toHaveLength(2);
    expect(screen.queryByText("아직 볼 수 있는 커뮤니티 소식이 없어요")).toBeNull();
  });

  it("모든 섹션이 비었을 때만 페이지 빈 상태를 보여준다", () => {
    renderCommunity(EMPTY);
    expect(screen.getByRole("status")).toHaveTextContent("아직 볼 수 있는 커뮤니티 소식이 없어요");
    expect(screen.queryByRole("region", { name: INTEREST })).toBeNull();
    // 추천이 없어도 공개 카드는 검색으로 찾을 수 있다
    expect(searchInput()).toBeInTheDocument();
  });

  it.each(["trendingToday", "trendingWeek", "similarPeople"] as const)(
    "추천이 비어도 %s 에 내용이 있으면 페이지 빈 상태를 보여주지 않는다",
    (key) => {
      renderCommunity({ ...EMPTY, [key]: SECTIONS[key] });
      expect(screen.queryByText("아직 볼 수 있는 커뮤니티 소식이 없어요")).toBeNull();
    },
  );

  it("다른 섹션이 불러오는 중이거나 실패했으면 페이지 빈 상태를 보여주지 않는다", () => {
    const { unmount } = renderCommunity({ ...EMPTY, recentBookmarks: loading() });
    expect(screen.queryByText("아직 볼 수 있는 커뮤니티 소식이 없어요")).toBeNull();
    unmount();
    renderCommunity({ ...EMPTY, recentBookmarks: failed("실패") });
    expect(screen.queryByText("아직 볼 수 있는 커뮤니티 소식이 없어요")).toBeNull();
    expect(within(region(RECENT)).getByRole("alert")).toHaveTextContent("실패");
  });
});
