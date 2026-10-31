import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CONTENT_CARD, NO_NICKNAME_CARD, REACTED_CARD, SEARCH_PAGE_MINDMAPS, SEARCH_PAGE_PROFILES, URL_ONLY_CARD } from "@/test/fixtures/communityApi";
import { renderPersonal } from "@/test/render";
import { SearchView, type SearchViewProps } from "./SearchView";
import { toFeedPost, toSearchedProfile, UNNAMED_USER, URL_ONLY_CARD_TITLE } from "./toCommunityData";
import type { SearchTab } from "./useSearchTab";

function tab<T>(items: T[], overrides: Partial<SearchTab<T>> = {}): SearchTab<T> {
  return {
    status: "ready",
    items,
    hasNext: false,
    error: null,
    retry: vi.fn(),
    loadMore: vi.fn(),
    loadingMore: false,
    moreError: null,
    ...overrides,
  };
}

const MINDMAPS = tab(SEARCH_PAGE_MINDMAPS.mindmaps.map(toFeedPost), { hasNext: true });
const PROFILES = tab(SEARCH_PAGE_PROFILES.profiles.map(toSearchedProfile));

function renderSearch(props: Partial<SearchViewProps> = {}) {
  return renderPersonal(
    <SearchView input="#파리" onInputChange={vi.fn()} q="파리" mindmaps={MINDMAPS} profiles={PROFILES} {...props} />,
  );
}

const tabButton = (name: string) => screen.getByRole("button", { name });
const card = (title: string) => within(screen.getByRole("link", { name: new RegExp(`^${title}`) }).closest<HTMLElement>("article")!);

describe("SearchView — 검색창 · 탭", () => {
  it("커뮤니티 검색바와 같은 안내 문구를 쓰고, 입력하면 값을 올려 보낸다", async () => {
    const onInputChange = vi.fn();
    const { user } = renderSearch({ input: "", q: "", onInputChange });
    const input = screen.getByRole("textbox", { name: "해시태그 검색" });
    expect(input).toHaveAttribute("placeholder", "해시태그로 프로필·마인드맵 찾기 (예: #파리)");
    await user.type(input, "로");
    expect(onInputChange).toHaveBeenCalledWith("로");
  });

  it("탭마다 불러온 수를 보여주고, 뒤에 더 있으면 + 를 붙인다", () => {
    renderSearch();
    expect(tabButton("마인드맵 (3+)")).toHaveClass("active");
    expect(tabButton("사용자 (2)")).not.toHaveClass("active");
  });

  it("사용자 쪽에 더 있으면 사용자 탭에만 + 를 붙인다", () => {
    renderSearch({ mindmaps: tab(MINDMAPS.items), profiles: { ...PROFILES, hasNext: true } });
    expect(tabButton("마인드맵 (3)")).toBeInTheDocument();
    expect(tabButton("사용자 (2+)")).toBeInTheDocument();
  });

  it("결과 문구에는 정리한 검색어만 쓰고 개수는 넣지 않는다", () => {
    renderSearch();
    const head = document.querySelector(".resultHead")!;
    expect(head).toHaveTextContent('"파리" 검색 결과');
    expect(head).not.toHaveTextContent(/\d/);
  });

  it("아직 수를 모르는 탭에는 숫자를 붙이지 않는다", () => {
    renderSearch({ mindmaps: tab<never>([], { status: "loading" }), profiles: tab<never>([], { status: "error", error: "실패" }) });
    expect(tabButton("마인드맵")).toBeInTheDocument();
    expect(tabButton("사용자")).toBeInTheDocument();
  });
});

describe("SearchView — 마인드맵 카드", () => {
  it("카드는 그 세션을 열고, 작성자 이름은 작성자 프로필로 간다", () => {
    renderSearch();
    const reacted = card(REACTED_CARD.title!);
    expect(reacted.getByRole("link", { name: new RegExp(`^${REACTED_CARD.title}`) })).toHaveAttribute("href", `/sessions/${REACTED_CARD.mindmapId}`);
    expect(reacted.getByRole("link", { name: "foodtrip" })).toHaveAttribute("href", `/profile/${REACTED_CARD.owner.userId}`);
    expect(reacted.getByText(`노드 ${REACTED_CARD.nodeCount}`)).toBeInTheDocument();
  });

  it("관련 세션 목록은 보여주지 않는다", () => {
    renderSearch();
    expect(screen.queryByText(/관련 세션/)).toBeNull();
  });

  it("URL 만 공개한 카드는 제목 자리에 해시태그를 보여주고 소개글은 없다", () => {
    renderSearch();
    const title = "#미술관 #로마";
    const urlOnly = card(title);
    expect(urlOnly.getByRole("link", { name: new RegExp(`^${title}`) })).toHaveAttribute("href", `/sessions/${URL_ONLY_CARD.mindmapId}`);
    expect(urlOnly.getByRole("link", { name: "artwalk" })).toHaveAttribute("href", `/profile/${URL_ONLY_CARD.owner.userId}`);
    expect(screen.queryByText(CONTENT_CARD.snippet!)).toBeNull();
  });

  it("공개 해시태그도 없는 URL 전용 카드는 안내 문구를 제목 자리에 쓴다", () => {
    renderSearch({ mindmaps: tab([toFeedPost({ ...URL_ONLY_CARD, hashtags: [] })]) });
    expect(screen.getByRole("link", { name: new RegExp(`^${URL_ONLY_CARD_TITLE}`) })).toBeInTheDocument();
  });

  it("닉네임이 없는 작성자는 기본 이름으로 보여주고 작성자 프로필로 간다", () => {
    renderSearch({ mindmaps: tab([toFeedPost(NO_NICKNAME_CARD)]) });
    expect(screen.getByRole("link", { name: UNNAMED_USER })).toHaveAttribute("href", `/profile/${NO_NICKNAME_CARD.owner.userId}`);
  });
});

describe("SearchView — 사용자 카드", () => {
  const openProfiles = async (user: ReturnType<typeof renderSearch>["user"]) => user.click(tabButton("사용자 (2)"));

  it("드롭다운과 같은 정보를 보여주고, 누르면 그 사람 프로필로 간다", async () => {
    const { user } = renderSearch();
    await openProfiles(user);
    const person = screen.getByRole("link", { name: /parisienne/ });
    expect(person).toHaveAttribute("href", "/profile/201");
    expect(within(person).getByText("마인드맵 6개")).toBeInTheDocument();
    expect(within(person).getByText("#파리 #에펠탑 #센강")).toBeInTheDocument();
  });

  it("닉네임이 없으면 기본 이름을 보여주고, 태그가 없으면 태그 줄을 그리지 않는다", async () => {
    const { user } = renderSearch();
    await openProfiles(user);
    const person = screen.getByRole("link", { name: new RegExp(UNNAMED_USER) });
    expect(person).toHaveAttribute("href", "/profile/202");
    expect(person.querySelector(".profileTags")).toBeNull();
  });

  it("없는 값(handle · 노드 · 좋아요)은 보여주지 않는다", async () => {
    const { user } = renderSearch();
    await openProfiles(user);
    expect(screen.queryByText(/@/)).toBeNull();
    expect(screen.queryByText(/좋아요/)).toBeNull();
    expect(screen.queryByText(/노드/)).toBeNull();
  });
});

describe("SearchView — 상태", () => {
  it("검색어가 없으면 안내만 보여주고 결과 문구는 없다", () => {
    renderSearch({ input: "#", q: "", mindmaps: tab<never>([], { status: "idle" }), profiles: tab<never>([], { status: "idle" }) });
    expect(screen.getByRole("status")).toHaveTextContent("검색어를 입력해 주세요");
    expect(document.querySelector(".resultHead")).toBeNull();
  });

  it("불러오는 중이면 불러오는 중 문구만 보인다", () => {
    renderSearch({ mindmaps: tab<never>([], { status: "loading" }) });
    expect(screen.getByText("불러오는 중…")).toBeInTheDocument();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("결과가 없으면 빈 상태를 보여준다", () => {
    renderSearch({ mindmaps: tab([]) });
    expect(screen.getByRole("status")).toHaveTextContent("검색 결과가 없어요");
  });

  it("실패한 탭은 오류와 다시 시도를 보여주고, 누르면 그 탭만 다시 부른다", async () => {
    const retry = vi.fn();
    const { user } = renderSearch({ profiles: tab<never>([], { status: "error", error: "서버 오류", retry }) });
    expect(screen.queryByRole("alert")).toBeNull();
    await user.click(tabButton("사용자"));
    expect(screen.getByRole("alert")).toHaveTextContent("서버 오류");
    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(retry).toHaveBeenCalledOnce();
    expect(MINDMAPS.retry).not.toHaveBeenCalled();
  });
});

describe("SearchView — 더 보기", () => {
  it("뒤에 더 있는 탭에만 더 보기가 있고, 누르면 그 탭만 더 불러온다", async () => {
    const { user } = renderSearch();
    await user.click(screen.getByRole("button", { name: "더 보기" }));
    expect(MINDMAPS.loadMore).toHaveBeenCalledOnce();
    await user.click(tabButton("사용자 (2)"));
    expect(screen.queryByRole("button", { name: "더 보기" })).toBeNull();
    expect(PROFILES.loadMore).not.toHaveBeenCalled();
  });

  it("더 불러오는 동안에는 버튼을 막는다", () => {
    renderSearch({ mindmaps: { ...MINDMAPS, loadingMore: true } });
    expect(screen.getByRole("button", { name: "불러오는 중…" })).toBeDisabled();
  });

  it("더 보기가 실패해도 카드는 그대로 두고, 다시 시도하면 다시 불러온다", async () => {
    const loadMore = vi.fn();
    const { user } = renderSearch({ mindmaps: { ...MINDMAPS, moreError: "서버 오류", loadMore } });
    expect(screen.getByRole("alert")).toHaveTextContent("서버 오류");
    expect(screen.getByRole("link", { name: /^파리 미식 지도/ })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(loadMore).toHaveBeenCalledOnce();
  });
});
