import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { CommunityData } from "@/lib/viewTypes";
import { renderPersonal } from "@/test/render";
import { mockRouter } from "@/test/router";
import { COMMUNITY_DATA } from "@/test/fixtures/community";
import { CommunityView, type CommunityViewProps } from "./CommunityView";

function renderCommunity(props: Partial<CommunityViewProps> = {}) {
  return renderPersonal(<CommunityView data={COMMUNITY_DATA} {...props} />);
}

const searchInput = () => screen.getByRole("textbox", { name: "해시태그 검색" });
const dropdown = () => document.querySelector<HTMLElement>(".dropdown");
/** 피드 카드 하나 (제목으로 찾기) */
const feedCard = (title: string) => screen.getByText(title, { selector: "h4" }).closest<HTMLElement>(".feedCard")!;
const trendCard = () => screen.getByRole("heading", { name: /떠오르는 해시태그/ }).closest<HTMLElement>(".card")!;
const peopleCard = () => screen.getByRole("heading", { name: "관심사가 비슷한 사람" }).closest<HTMLElement>(".card")!;

describe("CommunityView — 추천 피드", () => {
  it("관심 해시태그 · 최근 저장한 해시태그 기반 추천을 근거 태그와 함께 섹션별로 보여준다", () => {
    renderCommunity();
    const interestRegion = screen.getByRole("region", { name: "관심 해시태그 기반 추천" });
    const interest = within(interestRegion);
    const chips = (region: HTMLElement) => Array.from(region.querySelector(".secChips")!.children, (el) => el.textContent);
    expect(chips(interestRegion)).toEqual(["#파리", "#로마", "#유레일"]);
    expect(interest.getAllByRole("heading", { level: 4 }).map((h) => h.textContent)).toEqual([
      "동유럽 3주 살이 전체 동선",
      "파리 미식 지도 — 1구부터 20구까지",
      "유럽 한 달 200만원으로 살기",
    ]);
    const recentRegion = screen.getByRole("region", { name: "최근 저장한 해시태그 기반 추천" });
    expect(chips(recentRegion)).toEqual(["#야간열차", "#소도시", "#호스텔"]);
    const recent = within(recentRegion);
    expect(recent.getAllByRole("heading", { level: 4 }).map((h) => h.textContent)).toEqual([
      "유럽 미술관 30곳 우선순위",
      "이탈리아 시골 마을 7곳",
      "유레일 vs 저가항공 — 실비 비교",
    ]);
  });

  it("피드 카드에 작성자 · 시간 · 노드 수 · 소개글 · 해시태그 · 좋아요 · 북마크 · 함께 탐색 중인 수를 보여준다", () => {
    renderCommunity();
    const card = within(feedCard("동유럽 3주 살이 전체 동선"));
    expect(card.getByText("🌿")).toBeInTheDocument();
    expect(card.getByText("wanderlust")).toBeInTheDocument();
    expect(card.getByText("@wanderlust · 3시간 전")).toBeInTheDocument();
    expect(card.getByText("노드 142")).toBeInTheDocument();
    expect(card.getByText(/프라하 → 비엔나 → 부다페스트/)).toBeInTheDocument();
    ["#프라하", "#동유럽", "#야간열차"].forEach((tag) => expect(card.getByRole("button", { name: tag })).toBeInTheDocument());
    expect(card.getByRole("button", { name: "좋아요" })).toHaveTextContent("284");
    expect(card.getByRole("button", { name: "북마크" })).toHaveTextContent("91");
    expect(card.getByText("나도 탐색중 12")).toBeInTheDocument();
  });

  it("추천 카드는 연관 URL 을 제목과 사이트 주소로 보여주고 새 탭으로 연다", () => {
    renderCommunity();
    const card = within(feedCard("동유럽 3주 살이 전체 동선"));
    const link = card.getByRole("link", { name: /ÖBB 나이트젯 야간열차 노선/ });
    expect(link).toHaveAttribute("href", "https://www.nightjet.com/en");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(within(link).getByText("nightjet.com")).toBeInTheDocument();
    expect(card.getByRole("link", { name: /체코 철도 승차권 예약/ })).toHaveTextContent("cd.cz");
  });

  it("연관 URL 이 3개 이상이어도 카드에는 앞의 2개만 보여준다", () => {
    const data: CommunityData = {
      ...COMMUNITY_DATA,
      relatedUrls: {
        ...COMMUNITY_DATA.relatedUrls,
        c1: [...COMMUNITY_DATA.relatedUrls.c1, { title: "부다페스트 온천 안내", url: "https://www.spasbudapest.com/" }],
      },
    };
    renderCommunity({ data });
    const links = within(feedCard("동유럽 3주 살이 전체 동선")).getAllByRole("link");
    expect(links.map((a) => a.getAttribute("href"))).toEqual(["https://www.nightjet.com/en", "https://www.cd.cz/en/"]);
  });

  it("연관 URL 이 하나뿐이면 하나만, 없으면 연관 URL 영역 없이 보여준다", () => {
    const { c3: _omit, ...rest } = COMMUNITY_DATA.relatedUrls;
    renderCommunity({ data: { ...COMMUNITY_DATA, relatedUrls: rest } });
    expect(within(feedCard("이탈리아 시골 마을 7곳")).getAllByRole("link")).toHaveLength(1);
    const noUrl = within(feedCard("유럽 한 달 200만원으로 살기"));
    expect(noUrl.queryByText("연관 URL")).toBeNull();
    expect(noUrl.queryAllByRole("link")).toHaveLength(0);
  });

  it("연관 URL 을 눌러도 상세 팝업은 열리지 않는다", async () => {
    // jsdom 은 링크 이동을 지원하지 않아 기본 동작만 막는다 (전파는 그대로)
    const prevent = (e: Event) => e.preventDefault();
    window.addEventListener("click", prevent, true);
    const { user } = renderCommunity();
    await user.click(within(feedCard("동유럽 3주 살이 전체 동선")).getByRole("link", { name: /ÖBB/ }));
    expect(screen.queryByRole("dialog")).toBeNull();
    window.removeEventListener("click", prevent, true);
  });

  it("피드 카드를 누르면 마인드맵 상세 팝업이 열리고 프로필로는 이동하지 않는다", async () => {
    const { user } = renderCommunity();
    await user.click(screen.getByText("동유럽 3주 살이 전체 동선", { selector: "h4" }));
    const dialog = screen.getByRole("dialog", { name: "동유럽 3주 살이 전체 동선" });
    // 관련 세션은 받은 데이터(post id → 세션)에서 꺼낸다
    expect(within(dialog).getByText("· 1개")).toBeInTheDocument();
    expect(within(dialog).getByText("프라하 1박 일정 짜기")).toBeInTheDocument();
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it("관련 세션 데이터가 없는 마인드맵은 관련 세션 0개로 열린다", async () => {
    const { user } = renderCommunity({ data: { ...COMMUNITY_DATA, relatedSessions: {} } });
    await user.click(screen.getByText("이탈리아 시골 마을 7곳", { selector: "h4" }));
    expect(within(screen.getByRole("dialog")).getByText("· 0개")).toBeInTheDocument();
  });

  it("상세 팝업에서 작성자 이름을 누르면 그 사람 프로필로 이동하고 팝업이 닫힌다", async () => {
    const { user } = renderCommunity();
    await user.click(screen.getByText("유레일 vs 저가항공 — 실비 비교", { selector: "h4" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "🚆 rail.kr" }));
    expect(mockRouter.push).toHaveBeenCalledWith("/profile/rail.kr");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("좋아요를 누르면 수가 1 늘고, 다시 누르면 원래대로 돌아오며 팝업은 열리지 않는다", async () => {
    const { user } = renderCommunity();
    const like = within(feedCard("동유럽 3주 살이 전체 동선")).getByRole("button", { name: "좋아요" });
    expect(like).toHaveAttribute("aria-pressed", "false");
    await user.click(like);
    expect(like).toHaveTextContent("285");
    expect(like).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("dialog")).toBeNull();
    await user.click(like);
    expect(like).toHaveTextContent("284");
  });

  it("북마크를 누르면 수가 1 늘고 팝업은 열리지 않는다", async () => {
    const { user } = renderCommunity();
    const bookmark = within(feedCard("동유럽 3주 살이 전체 동선")).getByRole("button", { name: "북마크" });
    await user.click(bookmark);
    expect(bookmark).toHaveTextContent("92");
    expect(bookmark).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("이미 북마크한 마인드맵은 눌린 상태로 시작하고, 해제하면 수가 1 줄어든다", async () => {
    const { user } = renderCommunity();
    const bookmark = within(feedCard("파리 미식 지도 — 1구부터 20구까지")).getByRole("button", { name: "북마크" });
    expect(bookmark).toHaveAttribute("aria-pressed", "true");
    expect(bookmark).toHaveTextContent("188");
    await user.click(bookmark);
    expect(bookmark).toHaveAttribute("aria-pressed", "false");
    expect(bookmark).toHaveTextContent("187");
  });

  it("이미 좋아요한 마인드맵은 눌린 상태로 시작한다", () => {
    renderCommunity({ data: { ...COMMUNITY_DATA, likedPostIds: ["c3"] } });
    const like = within(feedCard("유럽 한 달 200만원으로 살기")).getByRole("button", { name: "좋아요" });
    expect(like).toHaveAttribute("aria-pressed", "true");
    expect(like).toHaveTextContent("198");
  });
});

describe("CommunityView — 검색바", () => {
  it("검색어를 입력하면 연관 해시태그 · 프로필 추천 · 마인드맵 탐색 드롭다운이 열린다", async () => {
    const { user } = renderCommunity();
    expect(dropdown()).toBeNull();
    await user.type(searchInput(), "파리");
    const panel = within(dropdown()!);
    expect(panel.getByRole("button", { name: /^#파리/ })).toHaveTextContent("#파리854");
    expect(panel.getByText("프로필 추천")).toBeInTheDocument();
    expect(panel.getByText("foodtrip")).toBeInTheDocument();
    expect(panel.getByText("artwalk")).toBeInTheDocument();
    expect(panel.getByText("마인드맵 탐색")).toBeInTheDocument();
    expect(panel.getByText("파리 미식 지도 — 1구부터 20구까지")).toBeInTheDocument();
    expect(panel.getByText("유럽 미술관 30곳 우선순위")).toBeInTheDocument();
    expect(panel.getByText("@artwalk · 노드 73 · #미술관 #파리")).toBeInTheDocument();
  });

  it("검색어 앞의 # 은 빼고 찾는다", async () => {
    const { user } = renderCommunity();
    await user.type(searchInput(), "#유레일");
    const panel = within(dropdown()!);
    expect(panel.getByRole("button", { name: /^#유레일패스/ })).toBeInTheDocument();
    expect(panel.getByText("rail.kr")).toBeInTheDocument();
    expect(panel.getByText("유레일 vs 저가항공 — 실비 비교")).toBeInTheDocument();
  });

  it("일치하는 결과가 없으면 안내 문구를 보여준다", async () => {
    const { user } = renderCommunity();
    await user.type(searchInput(), "남극");
    expect(within(dropdown()!).getByText("일치하는 결과가 없어요. 다른 해시태그로 검색해보세요.")).toBeInTheDocument();
  });

  it("× 를 누르면 검색어가 지워지고 드롭다운이 닫힌다", async () => {
    const { user } = renderCommunity();
    await user.type(searchInput(), "파리");
    await user.click(screen.getByRole("button", { name: "검색어 지우기" }));
    expect(searchInput()).toHaveValue("");
    expect(dropdown()).toBeNull();
    expect(screen.queryByRole("button", { name: "검색어 지우기" })).toBeNull();
  });

  it("검색 영역 바깥을 누르면 드롭다운이 닫히고, 검색창을 다시 누르면 같은 결과로 열린다", async () => {
    const { user } = renderCommunity();
    await user.type(searchInput(), "파리");
    await user.click(screen.getByRole("heading", { name: "관심사가 비슷한 사람" }));
    expect(dropdown()).toBeNull();
    expect(searchInput()).toHaveValue("파리");
    await user.click(searchInput());
    expect(within(dropdown()!).getByText("foodtrip")).toBeInTheDocument();
  });

  it("연관 해시태그를 누르면 그 태그(# 없이)로 검색창이 채워진다", async () => {
    const { user } = renderCommunity();
    await user.type(searchInput(), "유레");
    await user.click(within(dropdown()!).getByRole("button", { name: /^#유레일패스/ }));
    expect(searchInput()).toHaveValue("유레일패스");
    expect(dropdown()).not.toBeNull();
  });

  it("프로필 추천을 누르면 그 사람 프로필로 이동한다", async () => {
    const { user } = renderCommunity();
    await user.type(searchInput(), "파리");
    await user.click(within(dropdown()!).getByText("foodtrip"));
    expect(mockRouter.push).toHaveBeenCalledWith("/profile/foodtrip");
  });

  it("마인드맵 탐색 결과를 누르면 작성자 프로필로 이동한다", async () => {
    const { user } = renderCommunity();
    await user.type(searchInput(), "파리");
    await user.click(within(dropdown()!).getByText("유럽 미술관 30곳 우선순위"));
    expect(mockRouter.push).toHaveBeenCalledWith("/profile/artwalk");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("CommunityView — 떠오르는 해시태그 · 비슷한 사람", () => {
  it("오늘의 떠오르는 해시태그를 개수 · 증감과 함께 보여준다", () => {
    renderCommunity();
    const card = within(trendCard());
    expect(card.getByRole("heading", { name: "오늘의 떠오르는 해시태그" })).toBeInTheDocument();
    expect(card.getByRole("button", { name: "오늘" })).toHaveClass("miniTabOn");
    expect(card.getByRole("button", { name: /#쉥겐비자/ })).toHaveTextContent("#쉥겐비자1284↑18");
    expect(card.getByRole("button", { name: /#아이슬란드/ })).toHaveTextContent("#아이슬란드388↓4");
    expect(card.getAllByRole("button", { name: /^#/ })).toHaveLength(8);
  });

  it("이번 주 탭을 누르면 이번 주 목록과 제목으로 바뀌고, 오늘을 누르면 돌아온다", async () => {
    const { user } = renderCommunity();
    await user.click(within(trendCard()).getByRole("button", { name: "이번 주" }));
    const card = within(trendCard());
    expect(card.getByRole("heading", { name: "이번 주 떠오르는 해시태그" })).toBeInTheDocument();
    expect(card.getByRole("button", { name: "이번 주" })).toHaveClass("miniTabOn");
    expect(card.getByRole("button", { name: /#바르셀로나/ })).toHaveTextContent("#바르셀로나3986↑21");
    expect(card.queryByRole("button", { name: /#포르투/ })).toBeNull();
    await user.click(card.getByRole("button", { name: "오늘" }));
    expect(within(trendCard()).getByRole("button", { name: /#포르투/ })).toBeInTheDocument();
  });

  it("떠오르는 해시태그를 누르면 그 태그로 검색창이 채워지고 드롭다운이 열린다", async () => {
    const { user } = renderCommunity();
    await user.click(within(trendCard()).getByRole("button", { name: /#오로라/ }));
    expect(searchInput()).toHaveValue("오로라");
    expect(within(dropdown()!).getByText("연관 해시태그")).toBeInTheDocument();
  });

  it("관심사가 비슷한 사람의 팔로우를 누르면 팔로잉으로, 다시 누르면 팔로우로 바뀐다", async () => {
    const { user } = renderCommunity();
    const people = within(peopleCard());
    expect(people.getAllByText(/^(foodtrip|artwalk|rail\.kr)$/).map((el) => el.textContent)).toEqual(["foodtrip", "artwalk", "rail.kr"]);
    expect(people.getByText("#파리 #먹거리")).toBeInTheDocument();
    const row = within(people.getByText("artwalk").closest<HTMLElement>(".personRow")!);
    await user.click(row.getByRole("button", { name: "팔로우" }));
    expect(row.getByRole("button", { name: "팔로잉" })).toHaveAttribute("aria-pressed", "true");
    // 다른 사람은 그대로
    expect(people.getAllByRole("button", { name: "팔로우" })).toHaveLength(2);
    await user.click(row.getByRole("button", { name: "팔로잉" }));
    expect(row.getByRole("button", { name: "팔로우" })).toBeInTheDocument();
  });

  it("이미 팔로우 중인 사람은 팔로잉으로 시작한다", () => {
    const similarPeople = COMMUNITY_DATA.similarPeople.map((u) => (u.name === "rail.kr" ? { ...u, following: true } : u));
    renderCommunity({ data: { ...COMMUNITY_DATA, similarPeople } });
    const row = within(within(peopleCard()).getByText("rail.kr").closest<HTMLElement>(".personRow")!);
    expect(row.getByRole("button", { name: "팔로잉" })).toBeInTheDocument();
  });
});

describe("CommunityView — 빈 · 오류 상태", () => {
  it("데이터가 없으면 커뮤니티 빈 상태를 보여주고 검색바 · 피드는 그리지 않는다", () => {
    renderCommunity({ data: null });
    expect(screen.getByRole("heading", { name: "커뮤니티" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("아직 볼 수 있는 커뮤니티 소식이 없어요");
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(document.querySelector(".feedCard")).toBeNull();
  });

  it("불러오는 중이면 안내 문구만 보여준다", () => {
    renderCommunity({ loading: true });
    expect(screen.getByText("불러오는 중…")).toBeInTheDocument();
    expect(document.querySelector(".feedCard")).toBeNull();
  });

  it("불러오지 못하면 오류 메시지와 다시 시도 버튼을 보여주고, 누르면 onRetry 를 부른다", async () => {
    const onRetry = vi.fn();
    const { user } = renderCommunity({ data: null, error: "커뮤니티를 불러오지 못했어요.", onRetry });
    expect(screen.getByRole("alert")).toHaveTextContent("커뮤니티를 불러오지 못했어요.");
    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("추천 섹션 · 떠오르는 해시태그 · 비슷한 사람이 비어 있으면 각 자리에 빈 안내를 보여준다", () => {
    renderCommunity({
      data: {
        ...COMMUNITY_DATA,
        interestBased: { basisTags: [], posts: [] },
        trending: { today: [], week: [] },
        similarPeople: [],
      },
    });
    expect(within(screen.getByRole("region", { name: "관심 해시태그 기반 추천" })).getByRole("status")).toHaveTextContent(
      "추천할 마인드맵이 아직 없어요",
    );
    expect(within(screen.getByRole("region", { name: "최근 저장한 해시태그 기반 추천" })).getAllByRole("heading", { level: 4 })).toHaveLength(3);
    expect(within(trendCard()).getByText("아직 떠오르는 해시태그가 없어요.")).toBeInTheDocument();
    expect(within(peopleCard()).getByText("아직 비슷한 사람을 찾지 못했어요.")).toBeInTheDocument();
  });
});
