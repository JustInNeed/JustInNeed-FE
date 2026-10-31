import { screen, waitFor, within } from "@testing-library/react";
import { http } from "msw";
import { describe, expect, it, vi } from "vitest";
import type { UseApiResult } from "@/lib/hooks/useApi";
import { API, fail, ok, server } from "@/test/msw/server";
import { renderPersonal } from "@/test/render";
import {
  CONTENT_CARD,
  EMPTY_RECOMMENDATION,
  INTERESTS,
  MY_CARD,
  RECENT_BOOKMARKS,
  REACTED_CARD,
} from "@/test/fixtures/communityApi";
import { CommunityView, profilePath, type CommunitySections } from "./CommunityView";
import { toRecommendation } from "./toCommunityData";

const ready = <T,>(data: T): UseApiResult<T> => ({ data, loading: false, error: null, refetch: vi.fn() });
const loading = <T,>(): UseApiResult<T> => ({ data: null, loading: true, error: null, refetch: vi.fn() });
const failed = <T,>(error: string, refetch = vi.fn()): UseApiResult<T> => ({ data: null, loading: false, error, refetch });

const SECTIONS: CommunitySections = {
  interests: ready(toRecommendation(INTERESTS)),
  recentBookmarks: ready(toRecommendation(RECENT_BOOKMARKS)),
};
const EMPTY: CommunitySections = {
  interests: ready(toRecommendation(EMPTY_RECOMMENDATION)),
  recentBookmarks: ready(toRecommendation(EMPTY_RECOMMENDATION)),
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
  });

  it("다른 섹션이 불러오는 중이거나 실패했으면 페이지 빈 상태를 보여주지 않는다", () => {
    const { unmount } = renderCommunity({ ...EMPTY, recentBookmarks: loading() });
    expect(screen.queryByText("아직 볼 수 있는 커뮤니티 소식이 없어요")).toBeNull();
    unmount();
    renderCommunity({ ...EMPTY, recentBookmarks: failed("실패") });
    expect(screen.queryByText("아직 볼 수 있는 커뮤니티 소식이 없어요")).toBeNull();
    expect(within(region(RECENT)).getByRole("alert")).toHaveTextContent("실패");
  });
});
