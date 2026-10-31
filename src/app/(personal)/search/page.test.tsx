import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http } from "msw";
import { describe, expect, it } from "vitest";
import { SEARCH_PAGE_MINDMAPS, SEARCH_PAGE_PROFILES } from "@/test/fixtures/communityApi";
import { API, fail, ok, server, SERVER_ERROR } from "@/test/msw/server";
import { renderPersonal } from "@/test/render";
import { mockRouter, setMockSearchParams } from "@/test/router";
import SearchPage from "./page";

const SEARCH = `${API}/community/search`;
const EMPTY_MINDMAPS = { mindmaps: [], hasNext: false };
const EMPTY_PROFILES = { profiles: [], hasNext: false };

type Handler = (url: URL) => Response | Promise<Response>;

/** 두 검색 API 를 받아 어떤 주소로 불렸는지 기록한다 */
function mockSearch({
  mindmaps = () => ok(SEARCH_PAGE_MINDMAPS),
  profiles = () => ok(SEARCH_PAGE_PROFILES),
}: { mindmaps?: Handler; profiles?: Handler } = {}) {
  const urls: URL[] = [];
  const handle = (fn: Handler) => ({ request }: { request: Request }) => {
    const url = new URL(request.url);
    urls.push(url);
    return fn(url);
  };
  server.use(http.get(`${SEARCH}/mindmaps`, handle(mindmaps)), http.get(`${SEARCH}/profiles`, handle(profiles)));
  return urls;
}

const callsTo = (urls: URL[], path: string) => urls.filter((u) => u.pathname.endsWith(path));
const input = () => screen.getByRole("textbox", { name: "해시태그 검색" });
const typeQuery = (value: string) => fireEvent.change(input(), { target: { value } });
const settle = () => new Promise((resolve) => setTimeout(resolve, 350));

describe("/search 페이지", () => {
  it("입력하면 두 탭을 크기 10 으로 불러오고, 실제 데이터로 카드 · 탭 수를 보여준다", async () => {
    const urls = mockSearch();
    renderPersonal(<SearchPage />);
    typeQuery("파리");
    expect(await screen.findByRole("button", { name: "마인드맵 (3+)" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "사용자 (2)" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^파리 미식 지도/ })).toHaveAttribute("href", "/sessions/13");
    expect(urls.map((u) => `${u.pathname}${u.search}`).sort()).toEqual([
      `/community/search/mindmaps?q=${encodeURIComponent("파리")}&page=0&size=10`,
      `/community/search/profiles?q=${encodeURIComponent("파리")}&page=0&size=10`,
    ]);
  });

  it("앞의 # 와 공백은 떼고 보낸다", async () => {
    const urls = mockSearch();
    renderPersonal(<SearchPage />);
    typeQuery(" ##파리 ");
    await screen.findByRole("button", { name: "마인드맵 (3+)" });
    expect(new Set(urls.map((u) => u.searchParams.get("q")))).toEqual(new Set(["파리"]));
  });

  it("입력이 멈출 때까지 기다렸다가 마지막 검색어만 보낸다", async () => {
    const urls = mockSearch();
    renderPersonal(<SearchPage />);
    ["파", "파리", "파리올"].forEach(typeQuery);
    expect(urls).toHaveLength(0);
    await screen.findByRole("button", { name: "마인드맵 (3+)" });
    await waitFor(() => expect(urls).toHaveLength(2));
    expect(urls.map((u) => u.searchParams.get("q"))).toEqual(["파리올", "파리올"]);
  });

  it.each(["", "   ", "#", " ## "])("검색어가 없으면(%j) 요청 없이 안내만 보여준다", async (value) => {
    const urls = mockSearch();
    renderPersonal(<SearchPage />);
    typeQuery(value);
    await settle();
    expect(urls).toHaveLength(0);
    expect(screen.getByRole("status")).toHaveTextContent("검색어를 입력해 주세요");
    expect(screen.queryByText(/검색 결과/)).toBeNull();
  });

  it("응답을 기다리는 동안 불러오는 중을 보여준다", async () => {
    let release = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    mockSearch({
      mindmaps: async () => {
        await gate;
        return ok(SEARCH_PAGE_MINDMAPS);
      },
    });
    renderPersonal(<SearchPage />);
    typeQuery("파리");
    expect(await screen.findByText("불러오는 중…")).toBeInTheDocument();
    release();
    expect(await screen.findByRole("link", { name: /^파리 미식 지도/ })).toBeInTheDocument();
    expect(screen.queryByText("불러오는 중…")).toBeNull();
  });

  it("검색어를 바꾸면 이전 결과 대신 불러오는 중을 보여주고, 늦게 온 이전 응답은 버린다", async () => {
    let releaseOld = () => {};
    const oldGate = new Promise<void>((resolve) => (releaseOld = resolve));
    const page = (title: string) => ok({ mindmaps: [{ ...SEARCH_PAGE_MINDMAPS.mindmaps[0], title }], hasNext: false });
    const seen: (string | null)[] = [];
    mockSearch({
      mindmaps: async (url) => {
        const q = url.searchParams.get("q");
        seen.push(q);
        if (q === "파") await oldGate;
        return page(q === "파" ? "옛 결과" : "새 결과");
      },
    });
    renderPersonal(<SearchPage />);
    typeQuery("파");
    await waitFor(() => expect(seen).toEqual(["파"]));
    typeQuery("파리");
    expect(screen.getByText("불러오는 중…")).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /^새 결과/ })).toBeInTheDocument();
    releaseOld();
    await settle();
    expect(screen.getByRole("link", { name: /^새 결과/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^옛 결과/ })).toBeNull();
  });

  it("결과가 없으면 빈 상태를 보여주고 탭에는 0 을 쓴다", async () => {
    mockSearch({ mindmaps: () => ok(EMPTY_MINDMAPS), profiles: () => ok(EMPTY_PROFILES) });
    renderPersonal(<SearchPage />);
    typeQuery("남극");
    expect(await screen.findByRole("status")).toHaveTextContent("검색 결과가 없어요");
    expect(await screen.findByRole("button", { name: "마인드맵 (0)" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "사용자 (0)" })).toBeInTheDocument();
  });

  it("사용자만 실패해도 마인드맵은 보이고, 다시 시도하면 사용자만 다시 부른다", async () => {
    let profileCalls = 0;
    const urls = mockSearch({
      profiles: () => {
        profileCalls += 1;
        return profileCalls === 1 ? fail(500, SERVER_ERROR) : ok(SEARCH_PAGE_PROFILES);
      },
    });
    const { user } = renderPersonal(<SearchPage />);
    typeQuery("파리");
    expect(await screen.findByRole("link", { name: /^파리 미식 지도/ })).toBeInTheDocument();
    await waitFor(() => expect(profileCalls).toBe(1));
    await user.click(await screen.findByRole("button", { name: "사용자" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(SERVER_ERROR);
    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(await screen.findByRole("link", { name: /parisienne/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "사용자 (2)" })).toBeInTheDocument();
    expect(callsTo(urls, "/mindmaps")).toHaveLength(1);
    expect(callsTo(urls, "/profiles")).toHaveLength(2);
  });

  it("마인드맵이 실패해도 사용자 탭은 보인다", async () => {
    mockSearch({ mindmaps: () => fail(500, SERVER_ERROR) });
    const { user } = renderPersonal(<SearchPage />);
    typeQuery("파리");
    expect(await screen.findByRole("alert")).toHaveTextContent(SERVER_ERROR);
    await user.click(await screen.findByRole("button", { name: "사용자 (2)" }));
    expect(within(screen.getByRole("link", { name: /parisienne/ })).getByText("마인드맵 6개")).toBeInTheDocument();
  });
});

describe("/search 페이지 — 더 보기", () => {
  const moreCard = { ...SEARCH_PAGE_MINDMAPS.mindmaps[0], mindmapId: 30, title: "다음 페이지 카드" };
  const pageOf = (url: URL) => Number(url.searchParams.get("page"));
  const more = () => screen.getByRole("button", { name: "더 보기" });
  const landed = async () => {
    await screen.findByRole("button", { name: "더 보기" });
    await screen.findByRole("button", { name: "사용자 (2)" });
  };

  it("다음 페이지를 뒤에 붙이고, 끝나면 더 보기와 + 가 사라진다", async () => {
    const urls = mockSearch({
      mindmaps: (url) => ok(pageOf(url) === 0 ? SEARCH_PAGE_MINDMAPS : { mindmaps: [moreCard], hasNext: false }),
    });
    const { user } = renderPersonal(<SearchPage />);
    typeQuery("파리");
    await landed();
    await user.click(more());
    const links = await screen.findAllByRole("link", { name: /^(동유럽|파리 미식|#미술관|다음 페이지)/ });
    expect(links).toHaveLength(4);
    expect(links[3]).toHaveAttribute("href", "/sessions/30");
    expect(screen.getByRole("button", { name: "마인드맵 (4)" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "더 보기" })).toBeNull();
    expect(callsTo(urls, "/mindmaps").map((u) => u.search)).toEqual([
      `?q=${encodeURIComponent("파리")}&page=0&size=10`,
      `?q=${encodeURIComponent("파리")}&page=1&size=10`,
    ]);
    expect(callsTo(urls, "/profiles")).toHaveLength(1);
  });

  it("세 번째 페이지까지 이어서 부른다", async () => {
    const urls = mockSearch({
      mindmaps: (url) =>
        ok(
          pageOf(url) === 0
            ? SEARCH_PAGE_MINDMAPS
            : { mindmaps: [{ ...moreCard, mindmapId: 30 + pageOf(url) }], hasNext: pageOf(url) < 2 },
        ),
    });
    const { user } = renderPersonal(<SearchPage />);
    typeQuery("파리");
    await landed();
    await user.click(more());
    await screen.findByRole("button", { name: "마인드맵 (4+)" });
    await user.click(more());
    await screen.findByRole("button", { name: "마인드맵 (5)" });
    expect(callsTo(urls, "/mindmaps").map(pageOf)).toEqual([0, 1, 2]);
  });

  it("다음 페이지에 이미 있는 카드가 또 오면 한 번만 보여주고 수도 세지 않는다", async () => {
    mockSearch({
      mindmaps: (url) =>
        ok(pageOf(url) === 0 ? SEARCH_PAGE_MINDMAPS : { mindmaps: [SEARCH_PAGE_MINDMAPS.mindmaps[2], moreCard], hasNext: false }),
    });
    const { user } = renderPersonal(<SearchPage />);
    typeQuery("파리");
    await landed();
    await user.click(more());
    await screen.findByRole("button", { name: "마인드맵 (4)" });
    expect(screen.getAllByRole("link", { name: /^#미술관 #로마/ })).toHaveLength(1);
  });

  it("사용자도 탭 안에서 따로 더 불러오고 같은 사람은 한 번만 보여준다", async () => {
    const urls = mockSearch({
      profiles: (url) =>
        ok(
          pageOf(url) === 0
            ? { ...SEARCH_PAGE_PROFILES, hasNext: true }
            : { profiles: [SEARCH_PAGE_PROFILES.profiles[0], { userId: 203, nickname: "romantic", hashtags: ["로마"], mindmapCount: 2 }], hasNext: false },
        ),
    });
    const { user } = renderPersonal(<SearchPage />);
    typeQuery("파리");
    await user.click(await screen.findByRole("button", { name: "사용자 (2+)" }));
    await user.click(more());
    expect(await screen.findByRole("link", { name: /romantic/ })).toHaveAttribute("href", "/profile/203");
    expect(screen.getAllByRole("link", { name: /parisienne/ })).toHaveLength(1);
    expect(screen.getByRole("button", { name: "사용자 (3)" })).toBeInTheDocument();
    expect(callsTo(urls, "/mindmaps")).toHaveLength(1);
  });

  it("실패해도 불러온 카드와 탭 수는 남고, 다시 시도하면 같은 페이지를 부른다", async () => {
    let nextPageCalls = 0;
    const urls = mockSearch({
      mindmaps: (url) => {
        if (pageOf(url) === 0) return ok(SEARCH_PAGE_MINDMAPS);
        nextPageCalls += 1;
        return nextPageCalls === 1 ? fail(500, SERVER_ERROR) : ok({ mindmaps: [moreCard], hasNext: false });
      },
    });
    const { user } = renderPersonal(<SearchPage />);
    typeQuery("파리");
    await landed();
    await user.click(more());
    expect(await screen.findByRole("alert")).toHaveTextContent(SERVER_ERROR);
    expect(screen.getByRole("link", { name: /^파리 미식 지도/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "마인드맵 (3+)" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(await screen.findByRole("link", { name: /^다음 페이지/ })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByRole("link", { name: /^파리 미식 지도/ })).toBeInTheDocument();
    expect(callsTo(urls, "/mindmaps").map(pageOf)).toEqual([0, 1, 1]);
  });

  it("빠르게 두 번 눌러도 한 번만 부른다", async () => {
    let release = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    const urls = mockSearch({
      mindmaps: async (url) => {
        if (pageOf(url) === 0) return ok(SEARCH_PAGE_MINDMAPS);
        await gate;
        return ok({ mindmaps: [moreCard], hasNext: false });
      },
    });
    renderPersonal(<SearchPage />);
    typeQuery("파리");
    await landed();
    const button = more();
    fireEvent.click(button);
    fireEvent.click(button);
    await settle();
    expect(callsTo(urls, "/mindmaps").map(pageOf)).toEqual([0, 1]);
    release();
    await screen.findByRole("button", { name: "마인드맵 (4)" });
  });

  it("더 불러오는 사이 검색어가 바뀌면 늦게 온 응답을 버리고, 새 검색어는 첫 페이지부터 이어 간다", async () => {
    let release = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    const roma = { ...SEARCH_PAGE_MINDMAPS.mindmaps[1], mindmapId: 40, title: "로마 카드" };
    const urls = mockSearch({
      mindmaps: async (url) => {
        const q = url.searchParams.get("q");
        if (q === "로마") {
          return ok(pageOf(url) === 0 ? { mindmaps: [roma], hasNext: true } : { mindmaps: [{ ...roma, mindmapId: 41, title: "로마 다음" }], hasNext: false });
        }
        if (pageOf(url) === 0) return ok(SEARCH_PAGE_MINDMAPS);
        await gate;
        return ok({ mindmaps: [moreCard], hasNext: false });
      },
    });
    const { user } = renderPersonal(<SearchPage />);
    typeQuery("파리");
    await landed();
    await user.click(more());
    typeQuery("로마");
    expect(await screen.findByRole("link", { name: /^로마 카드/ })).toBeInTheDocument();
    release();
    await settle();
    expect(screen.queryByRole("link", { name: /^다음 페이지/ })).toBeNull();
    expect(screen.getByRole("button", { name: "마인드맵 (1+)" })).toBeInTheDocument();
    await user.click(more());
    expect(await screen.findByRole("link", { name: /^로마 다음/ })).toBeInTheDocument();
    expect(callsTo(urls, "/mindmaps").filter((u) => u.searchParams.get("q") === "로마").map(pageOf)).toEqual([0, 1]);
  });
});

describe("/search 페이지 — 주소의 검색어", () => {
  const qParam = (q: string) => new URLSearchParams({ q }).toString();
  const replaced = () => mockRouter.replace.mock.calls.map(([path]) => path as string);

  it("q 가 있는 주소로 들어오면 입력 없이 그 검색어로 찾고, 주소는 건드리지 않는다", async () => {
    setMockSearchParams(qParam("#파리"));
    const urls = mockSearch();
    renderPersonal(<SearchPage />);
    expect(input()).toHaveValue("#파리");
    expect(await screen.findByRole("link", { name: /^파리 미식 지도/ })).toBeInTheDocument();
    expect(new Set(urls.map((u) => u.searchParams.get("q")))).toEqual(new Set(["파리"]));
    await settle();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it("# 만 있는 주소로 들어오면 요청 없이 안내를 보여준다", async () => {
    setMockSearchParams(qParam("#"));
    const urls = mockSearch();
    renderPersonal(<SearchPage />);
    await settle();
    expect(urls).toHaveLength(0);
    expect(screen.getByRole("status")).toHaveTextContent("검색어를 입력해 주세요");
  });

  it("입력이 멈추면 정리한 검색어를 주소에 한 번만 남기고, 화면 위치는 그대로 둔다", async () => {
    mockSearch();
    renderPersonal(<SearchPage />);
    ["파", "파리", " #파리 "].forEach(typeQuery);
    expect(mockRouter.replace).not.toHaveBeenCalled();
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledOnce());
    expect(mockRouter.replace).toHaveBeenCalledWith(`/search?${qParam("파리")}`, { scroll: false });
    expect(mockRouter.push).not.toHaveBeenCalled();
    expect(input()).toHaveValue(" #파리 ");
  });

  it("검색어를 지우면 주소에서도 q 를 뺀다", async () => {
    setMockSearchParams(qParam("파리"));
    mockSearch();
    renderPersonal(<SearchPage />);
    await screen.findByRole("link", { name: /^파리 미식 지도/ });
    typeQuery("#");
    await waitFor(() => expect(replaced()).toEqual(["/search"]));
  });

  it("바깥에서 주소가 바뀌면 입력과 결과가 따라가고, 주소를 다시 쓰지 않는다", async () => {
    setMockSearchParams(qParam("파리"));
    const urls = mockSearch();
    const { rerender } = renderPersonal(<SearchPage />);
    await screen.findByRole("link", { name: /^파리 미식 지도/ });
    setMockSearchParams(qParam("로마"));
    rerender(<SearchPage />);
    await waitFor(() => expect(input()).toHaveValue("로마"));
    await waitFor(() => expect(urls.filter((u) => u.searchParams.get("q") === "로마")).toHaveLength(2));
    await settle();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it("사이드바로 q 없는 주소가 되면 입력을 비우고 안내로 돌아간다", async () => {
    setMockSearchParams(qParam("파리"));
    mockSearch();
    const { rerender } = renderPersonal(<SearchPage />);
    await screen.findByRole("link", { name: /^파리 미식 지도/ });
    setMockSearchParams("");
    rerender(<SearchPage />);
    await waitFor(() => expect(input()).toHaveValue(""));
    expect(screen.getByRole("status")).toHaveTextContent("검색어를 입력해 주세요");
    await settle();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it("내가 바꾼 주소가 늦게 도착해도 그 사이 더 친 글자를 덮어쓰지 않는다", async () => {
    mockSearch();
    const { rerender } = renderPersonal(<SearchPage />);
    typeQuery("파");
    await waitFor(() => expect(replaced()).toHaveLength(1));
    typeQuery("파리");
    await waitFor(() => expect(replaced()).toHaveLength(2));
    typeQuery("파리올");
    setMockSearchParams(qParam("파"));
    rerender(<SearchPage />);
    await settle();
    expect(input()).toHaveValue("파리올");
    setMockSearchParams(qParam("파리"));
    rerender(<SearchPage />);
    await settle();
    expect(input()).toHaveValue("파리올");
    expect(replaced().at(-1)).toBe(`/search?${qParam("파리올")}`);
  });
});
