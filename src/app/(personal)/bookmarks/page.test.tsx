import { screen, waitFor, within } from "@testing-library/react";
import { http } from "msw";
import { describe, expect, it } from "vitest";
import {
  bookmarkMindmap,
  BOOKMARK_BUNDLES_PAGE,
  BOOKMARK_MINDMAPS_PAGE,
} from "@/test/fixtures/bookmarksApi";
import { API, fail, ok, server, SERVER_ERROR } from "@/test/msw/server";
import { renderPersonal } from "@/test/render";
import BookmarksPage from "./page";

const BASE = `${API}/community/me/bookmarks`;
const EMPTY_MINDMAPS = { mindmaps: [], hasNext: false };
const EMPTY_BUNDLES = { bundles: [], hasNext: false };

type Handler = (url: URL) => Response | Promise<Response>;

/** 두 목록 API 를 받아 어떤 주소로 불렸는지 기록한다 */
function mockLists({
  mindmaps = () => ok(BOOKMARK_MINDMAPS_PAGE),
  bundles = () => ok(BOOKMARK_BUNDLES_PAGE),
}: { mindmaps?: Handler; bundles?: Handler } = {}) {
  const urls: URL[] = [];
  const handle = (fn: Handler) => ({ request }: { request: Request }) => {
    const url = new URL(request.url);
    urls.push(url);
    return fn(url);
  };
  server.use(http.get(`${BASE}/mindmaps`, handle(mindmaps)), http.get(`${BASE}/hashtag-bundles`, handle(bundles)));
  return urls;
}

const tab = (name: RegExp) => screen.getByRole("button", { name });
const mapTitles = () => Array.from(document.querySelectorAll(".bmGrid .title"), (el) => el.textContent);
const pageOf = (url: URL) => Number(url.searchParams.get("page"));

/** page 번호로 전체 목록을 잘라 준다 — 서버처럼 지금 남은 항목 기준이다 */
function pagedMindmaps(rows: ReturnType<typeof bookmarkMindmap>[], size = 10): Handler {
  return (url) => {
    const start = pageOf(url) * size;
    return ok({ mindmaps: rows.slice(start, start + size), hasNext: rows.length > start + size });
  };
}

const titled = (count: number) =>
  Array.from({ length: count }, (_, i) => bookmarkMindmap({ bookmarkId: 100 + i, title: `카드 ${i}` }));

describe("/bookmarks 페이지 — 목록", () => {
  it("두 탭을 크기 10 으로 함께 불러와 실제 데이터로 보여준다", async () => {
    const urls = mockLists();
    renderPersonal(<BookmarksPage />);
    expect(screen.getByText("불러오는 중…")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "마인드맵 (3)" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "해시태그 묶음 (3)" })).toBeInTheDocument();
    expect(screen.getByText("파리 미식 지도")).toBeInTheDocument();
    expect(urls.map((u) => `${u.pathname}${u.search}`).sort()).toEqual([
      "/community/me/bookmarks/hashtag-bundles?page=0&size=10",
      "/community/me/bookmarks/mindmaps?page=0&size=10",
    ]);
  });

  it("저장한 것이 없으면 탭마다 빈 안내를 보여준다", async () => {
    mockLists({ mindmaps: () => ok(EMPTY_MINDMAPS), bundles: () => ok(EMPTY_BUNDLES) });
    const { user } = renderPersonal(<BookmarksPage />);
    expect(await screen.findByRole("status")).toHaveTextContent("아직 북마크한 항목이 없어요");
    await user.click(tab(/^해시태그 묶음/));
    expect(screen.getByRole("status")).toHaveTextContent("아직 북마크한 항목이 없어요");
  });

  it("마인드맵 탭이 실패해도 묶음 탭은 그대로 보이고, 다시 시도하면 실패한 탭만 다시 부른다", async () => {
    let failing = true;
    const urls = mockLists({ mindmaps: () => (failing ? fail(500, SERVER_ERROR) : ok(BOOKMARK_MINDMAPS_PAGE)) });
    const { user } = renderPersonal(<BookmarksPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent(SERVER_ERROR);
    expect(await screen.findByRole("button", { name: "해시태그 묶음 (3)" })).toBeInTheDocument();

    failing = false;
    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(await screen.findByRole("button", { name: "마인드맵 (3)" })).toBeInTheDocument();
    expect(urls.filter((u) => u.pathname.endsWith("hashtag-bundles"))).toHaveLength(1);
    expect(urls.filter((u) => u.pathname.endsWith("mindmaps"))).toHaveLength(2);
  });

  it("응답 모양이 어긋나면 검색 문구가 아니라 북마크 문구로 알려 준다", async () => {
    mockLists({ mindmaps: () => ok({}) });
    renderPersonal(<BookmarksPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("북마크를 불러오지 못했어요.");
  });

  it("더 보기를 누르면 다음 페이지를 뒤에 붙이고, 끝나면 버튼이 사라진다", async () => {
    const urls = mockLists({ mindmaps: pagedMindmaps(titled(12)) });
    const { user } = renderPersonal(<BookmarksPage />);
    expect(await screen.findByRole("button", { name: "마인드맵 (10+)" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "더 보기" }));
    expect(await screen.findByRole("button", { name: "마인드맵 (12)" })).toBeInTheDocument();
    expect(mapTitles()[11]).toBe("카드 11");
    expect(screen.queryByRole("button", { name: "더 보기" })).toBeNull();
    expect(urls.filter((u) => u.pathname.endsWith("/mindmaps")).map(pageOf)).toEqual([0, 1]);
  });

  it("더 보기가 실패해도 탭은 그대로고 다시 시도로 이어 받는다", async () => {
    let failing = true;
    const rows = pagedMindmaps(titled(12));
    mockLists({ mindmaps: (url) => (pageOf(url) === 1 && failing ? fail(500, SERVER_ERROR) : rows(url)) });
    const { user } = renderPersonal(<BookmarksPage />);
    await user.click(await screen.findByRole("button", { name: "더 보기" }));
    const alert = await screen.findByRole("alert");
    expect(mapTitles()).toHaveLength(10);
    failing = false;
    await user.click(within(alert).getByRole("button", { name: "다시 시도" }));
    await waitFor(() => expect(mapTitles()).toHaveLength(12));
  });
});
