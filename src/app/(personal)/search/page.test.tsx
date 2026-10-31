import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http } from "msw";
import { describe, expect, it } from "vitest";
import { SEARCH_PAGE_MINDMAPS, SEARCH_PAGE_PROFILES } from "@/test/fixtures/communityApi";
import { API, fail, ok, server, SERVER_ERROR } from "@/test/msw/server";
import { renderPersonal } from "@/test/render";
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
