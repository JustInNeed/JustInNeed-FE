import { screen, waitFor, within } from "@testing-library/react";
import { http } from "msw";
import { describe, expect, it, vi } from "vitest";
import {
  bookmarkMindmap,
  BOOKMARK_BUNDLES_PAGE,
  BOOKMARK_MINDMAPS_PAGE,
  BOOKMARK_NOW,
  BOOKMARK_ORIGINAL,
  CARD_BOOKMARK,
  MIXED_BOOKMARK,
  PICKED_BOOKMARK,
  SAME_NAME_BUNDLE,
  UNNAMED_BUNDLE,
} from "@/test/fixtures/bookmarksApi";
import { CARD_SESSIONS } from "@/test/fixtures/communityApi";
import { API, fail, ok, server, SERVER_ERROR } from "@/test/msw/server";
import { renderPersonal } from "@/test/render";
import { mockRouter } from "@/test/router";
import BookmarksPage from "./page";

const BASE = `${API}/community/me/bookmarks`;
/** 카드 20장이 넘으면 역할로 찾는 데 오래 걸려 전체 실행 때 기본 5초를 넘긴다 */
const SLOW_TEST_MS = 20_000;
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

  it("저장 시점은 지금 시각과 savedAt 으로 계산해 보여준다", async () => {
    vi.spyOn(Date, "now").mockReturnValue(BOOKMARK_NOW);
    mockLists();
    renderPersonal(<BookmarksPage />);
    expect(await screen.findByText("by wanderlust · 저장 4일 전")).toBeInTheDocument();
    expect(screen.getByText("by foodtrip · 저장 1일 전")).toBeInTheDocument();
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

const COMMUNITY = `${API}/community`;

/** 북마크 저장 · 해제 API 를 받아 호출을 기록한다 */
function mockWrites({
  remove = () => ok(null),
  post = () => ok({ code: 201, bookmarkId: 500, targetIds: [], saveType: "MINI_MINDMAP", name: null }, { status: 201 }),
  patch = () => ok({ bookmarkCount: 3, bookmarkId: 600 }),
}: { remove?: () => Response | Promise<Response>; post?: () => Response | Promise<Response>; patch?: () => Response | Promise<Response> } = {}) {
  const calls = {
    deleted: [] as string[],
    posted: [] as unknown[],
    patched: [] as { sessionId: string; body: unknown }[],
  };
  server.use(
    http.delete(`${COMMUNITY}/bookmarks/:id`, ({ params }) => {
      calls.deleted.push(String(params.id));
      return remove();
    }),
    http.post(`${COMMUNITY}/bookmarks`, async ({ request }) => {
      calls.posted.push(await request.json());
      return post();
    }),
    http.patch(`${COMMUNITY}/mindmaps/:id/bookmark`, async ({ params, request }) => {
      calls.patched.push({ sessionId: String(params.id), body: await request.json() });
      return patch();
    }),
  );
  return calls;
}

const mapCard = (title: string) => screen.getByText(title).closest<HTMLElement>(".card")!;
const removeCard = async (user: ReturnType<typeof renderPersonal>["user"], title: string) =>
  user.click(within(mapCard(title)).getByRole("button", { name: "북마크 해제" }));
const bundleTitles = () => Array.from(document.querySelectorAll(".bundleTitle"), (el) => el.textContent);
const undoButton = () => screen.findByRole("button", { name: "되돌리기" });

async function renderLoaded() {
  const rendered = renderPersonal(<BookmarksPage />);
  await screen.findByRole("button", { name: "마인드맵 (3)" });
  await screen.findByRole("button", { name: "해시태그 묶음 (3)" });
  return rendered;
}

describe("/bookmarks 페이지 — 북마크 해제", () => {
  it("해제하면 응답을 기다리지 않고 바로 빠지고, 지운 뒤 되돌리기가 있는 안내가 뜬다", async () => {
    let finish = () => {};
    const gate = new Promise<void>((resolve) => (finish = resolve));
    mockLists();
    const calls = mockWrites({ remove: () => gate.then(() => ok(null)) });
    const { user } = await renderLoaded();

    await removeCard(user, "파리 미식 지도");
    expect(screen.queryByText("파리 미식 지도")).toBeNull();
    expect(tab(/^마인드맵/)).toHaveTextContent("마인드맵 (2)");
    expect(screen.queryByRole("dialog")).toBeNull();
    await waitFor(() => expect(calls.deleted).toEqual([String(PICKED_BOOKMARK.bookmarkId)]));
    // 지우는 중에는 되돌릴 수 없다 — 다시 저장이 먼저 끝나면 지우기가 그 행을 없앤다
    expect(screen.queryByRole("button", { name: "되돌리기" })).toBeNull();

    finish();
    expect(await undoButton()).toBeInTheDocument();
    expect(screen.getByText("북마크를 해제했어요.")).toBeInTheDocument();
  });

  it("해제에 실패하면 받은 자리로 돌아오고 서버 문구를 알려 주며 되돌리기는 없다", async () => {
    mockLists();
    mockWrites({ remove: () => fail(500, SERVER_ERROR) });
    const { user } = await renderLoaded();
    await removeCard(user, "파리 미식 지도");
    expect(await screen.findByRole("alert")).toHaveTextContent(SERVER_ERROR);
    expect(mapTitles()).toEqual(["동유럽 3주 살이 전체 동선", "파리 미식 지도", "#화장실 #놀이"]);
    expect(tab(/^마인드맵/)).toHaveTextContent("마인드맵 (3)");
    expect(screen.queryByRole("button", { name: "되돌리기" })).toBeNull();
  });

  it("마지막 항목까지 해제하면 빈 안내가 보인다", async () => {
    mockLists({ mindmaps: () => ok({ mindmaps: [CARD_BOOKMARK], hasNext: false }) });
    mockWrites();
    const { user } = renderPersonal(<BookmarksPage />);
    await screen.findByText("동유럽 3주 살이 전체 동선");
    await removeCard(user, "동유럽 3주 살이 전체 동선");
    expect(await screen.findByText("아직 북마크한 항목이 없어요")).toBeInTheDocument();
    expect(tab(/^마인드맵/)).toHaveTextContent("마인드맵 (0)");
  });

  it("이름이 같은 묶음은 누른 것만 bookmarkId 로 지운다", async () => {
    mockLists();
    const calls = mockWrites();
    const { user } = await renderLoaded();
    await user.click(tab(/^해시태그 묶음/));
    const second = document.querySelectorAll<HTMLElement>(".bundleCard")[1];
    await user.click(within(second).getByRole("button", { name: "북마크 해제" }));
    expect(bundleTitles()).toEqual(["미술관 모음", "#호스텔 #무료투어"]);
    await waitFor(() => expect(calls.deleted).toEqual([String(SAME_NAME_BUNDLE.bookmarkId)]));
  });

  it("앞에서 해제한 뒤 더 보기를 눌러도 당겨진 항목을 건너뛰지 않는다", async () => {
    const rows = titled(23);
    mockLists({ mindmaps: (url) => pagedMindmaps(rows)(url) });
    const calls = mockWrites({
      remove: () => {
        rows.splice(rows.findIndex((r) => r.title === "카드 0"), 1);
        return ok(null);
      },
    });
    const { user } = renderPersonal(<BookmarksPage />);
    await screen.findByRole("button", { name: "마인드맵 (10+)" });
    await removeCard(user, "카드 0");
    await undoButton();
    expect(calls.deleted).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "더 보기" }));
    await screen.findByRole("button", { name: "마인드맵 (20+)" });
    expect(mapTitles()).toEqual(Array.from({ length: 20 }, (_, i) => `카드 ${i + 1}`));

    await user.click(screen.getByRole("button", { name: "더 보기" }));
    await screen.findByRole("button", { name: "마인드맵 (22)" });
    expect(mapTitles()).toEqual(Array.from({ length: 22 }, (_, i) => `카드 ${i + 1}`));
  }, SLOW_TEST_MS);

  it("더 보기를 기다리는 사이에 해제해도 다음 더 보기에서 건너뛰지 않는다", async () => {
    const rows = titled(22);
    let release = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    let held = false;
    const paged = (url: URL) => pagedMindmaps(rows)(url);
    mockLists({
      mindmaps: async (url) => {
        const response = paged(url);
        if (pageOf(url) === 1 && !held) {
          held = true;
          await gate;
        }
        return response;
      },
    });
    server.use(
      http.delete(`${COMMUNITY}/bookmarks/:id`, ({ params }) => {
        rows.splice(rows.findIndex((r) => String(r.bookmarkId) === params.id), 1);
        return ok(null);
      }),
    );
    const { user } = renderPersonal(<BookmarksPage />);
    await screen.findByRole("button", { name: "마인드맵 (10+)" });
    await user.click(screen.getByRole("button", { name: "더 보기" }));
    await removeCard(user, "카드 0");
    await undoButton();

    release();
    await screen.findByRole("button", { name: "마인드맵 (19+)" });
    await user.click(screen.getByRole("button", { name: "더 보기" }));
    await screen.findByRole("button", { name: "마인드맵 (21)" });
    expect(mapTitles()).toEqual(Array.from({ length: 21 }, (_, i) => `카드 ${i + 1}`));
  }, SLOW_TEST_MS);

  it("불러온 항목을 다 해제해도 더 보기로 남은 항목을 받는다", async () => {
    const rows = titled(11);
    mockLists({ mindmaps: (url) => pagedMindmaps(rows)(url) });
    server.use(
      http.delete(`${COMMUNITY}/bookmarks/:id`, ({ params }) => {
        rows.splice(rows.findIndex((r) => String(r.bookmarkId) === params.id), 1);
        return ok(null);
      }),
    );
    const { user } = renderPersonal(<BookmarksPage />);
    await screen.findByRole("button", { name: "마인드맵 (10+)" });
    for (let i = 0; i < 10; i++) await removeCard(user, `카드 ${i}`);
    await waitFor(() => expect(rows).toHaveLength(1));
    await user.click(screen.getByRole("button", { name: "더 보기" }));
    await waitFor(() => expect(mapTitles()).toEqual(["카드 10"]));
  });
});

describe("/bookmarks 페이지 — 되돌리기", () => {
  it("카드 저장은 카드 API 로 sessionId 에 다시 저장하고 맨 위에 새 id 로 돌아온다", async () => {
    mockLists();
    const calls = mockWrites();
    const { user } = await renderLoaded();

    await removeCard(user, "동유럽 3주 살이 전체 동선");
    await user.click(await undoButton());

    await waitFor(() => expect(calls.patched).toEqual([{ sessionId: String(CARD_BOOKMARK.sessionId), body: { bookmarked: true } }]));
    expect(calls.posted).toEqual([]);
    await waitFor(() => expect(mapTitles()[0]).toBe("동유럽 3주 살이 전체 동선"));
    expect(tab(/^마인드맵/)).toHaveTextContent("마인드맵 (3)");
    expect(within(mapCard("동유럽 3주 살이 전체 동선")).getByText("by wanderlust · 저장 방금 전")).toBeInTheDocument();
    expect(screen.queryByText("북마크를 해제했어요.")).toBeNull();

    // 돌아온 항목을 다시 해제하면 새 id 로 지운다
    await removeCard(user, "동유럽 3주 살이 전체 동선");
    await waitFor(() => expect(calls.deleted).toEqual([String(CARD_BOOKMARK.bookmarkId), "600"]));
  });

  it("해제한 자리가 아니라 목록 맨 위로 돌아온다", async () => {
    mockLists();
    mockWrites();
    const { user } = await renderLoaded();
    await removeCard(user, "#화장실 #놀이");
    await user.click(await undoButton());
    await waitFor(() => expect(mapTitles()).toEqual(["#화장실 #놀이", "동유럽 3주 살이 전체 동선", "파리 미식 지도"]));
  });

  it("세션이 하나여도 노드를 골라 저장했으면 카드 API 가 아니라 저장 API 로 되돌린다", async () => {
    mockLists();
    const calls = mockWrites();
    const { user } = await renderLoaded();
    await removeCard(user, "파리 미식 지도");
    await user.click(await undoButton());
    await waitFor(() =>
      expect(calls.posted).toEqual([
        { saveType: "MINI_MINDMAP", targetType: "NODE", targetIds: [90], sourceMindmapId: 102, name: null },
      ]),
    );
    expect(calls.patched).toEqual([]);
    await waitFor(() => expect(mapTitles()[0]).toBe("파리 미식 지도"));
  });

  it("여러 세션에서 고른 저장은 저장 API 로 되돌린다", async () => {
    mockLists();
    const calls = mockWrites();
    const { user } = await renderLoaded();
    await removeCard(user, "#화장실 #놀이");
    await user.click(await undoButton());
    await waitFor(() => expect(calls.posted).toHaveLength(1));
    expect(calls.posted[0]).toMatchObject({ targetIds: MIXED_BOOKMARK.targetIds, name: null });
    expect(calls.patched).toEqual([]);
  });

  it("묶음은 이름과 함께 다시 저장하고 맨 위로 돌아온다", async () => {
    mockLists();
    const calls = mockWrites({ post: () => ok({ code: 201, bookmarkId: 700 }, { status: 201 }) });
    const { user } = await renderLoaded();
    await user.click(tab(/^해시태그 묶음/));
    const last = document.querySelectorAll<HTMLElement>(".bundleCard")[1];
    await user.click(within(last).getByRole("button", { name: "북마크 해제" }));
    await user.click(await undoButton());
    await waitFor(() =>
      expect(calls.posted).toEqual([
        {
          saveType: "HASHTAG_BUNDLE",
          targetType: "HASHTAG",
          targetIds: SAME_NAME_BUNDLE.targetIds,
          sourceMindmapId: SAME_NAME_BUNDLE.sourceMindmapId,
          name: SAME_NAME_BUNDLE.name,
        },
      ]),
    );
    await waitFor(() => expect(document.querySelectorAll(".bundleCard")).toHaveLength(3));
    const first = document.querySelector<HTMLElement>(".bundleCard")!;
    expect(within(first).getByRole("button", { name: "#프라도" })).toBeInTheDocument();
    await user.click(within(first).getByRole("button", { name: "북마크 해제" }));
    await waitFor(() => expect(calls.deleted).toEqual([String(SAME_NAME_BUNDLE.bookmarkId), "700"]));
  });

  it("이름 없는 묶음은 name 을 null 로 다시 저장한다", async () => {
    mockLists();
    const calls = mockWrites();
    const { user } = await renderLoaded();
    await user.click(tab(/^해시태그 묶음/));
    const third = document.querySelectorAll<HTMLElement>(".bundleCard")[2];
    await user.click(within(third).getByRole("button", { name: "북마크 해제" }));
    await user.click(await undoButton());
    await waitFor(() => expect(calls.posted).toHaveLength(1));
    expect(calls.posted[0]).toMatchObject({ targetIds: UNNAMED_BUNDLE.targetIds, name: null });
  });

  it("되돌리기에 실패하면 서버 문구를 알려 주고 항목은 돌아오지 않는다", async () => {
    mockLists();
    mockWrites({ patch: () => fail(404, "찾을 수 없습니다.") });
    const { user } = await renderLoaded();
    await removeCard(user, "동유럽 3주 살이 전체 동선");
    await user.click(await undoButton());
    expect(await screen.findByRole("alert")).toHaveTextContent("찾을 수 없습니다.");
    expect(mapTitles()).toEqual(["파리 미식 지도", "#화장실 #놀이"]);
    expect(tab(/^마인드맵/)).toHaveTextContent("마인드맵 (2)");
  });

  it("카드 저장 응답에 id 가 없으면 실패로 알려 준다", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockLists();
    mockWrites({ patch: () => ok({ bookmarkCount: 0, bookmarkId: null }) });
    const { user } = await renderLoaded();
    await removeCard(user, "동유럽 3주 살이 전체 동선");
    await user.click(await undoButton());
    expect(await screen.findByRole("alert")).toHaveTextContent("되돌리지 못했어요.");
  });

  it("되돌린 뒤 더 보기를 눌러도 중복 없이 이어 받는다", async () => {
    const rows = titled(13);
    const urls = mockLists({ mindmaps: (url) => pagedMindmaps(rows)(url) });
    server.use(
      http.delete(`${COMMUNITY}/bookmarks/:id`, ({ params }) => {
        rows.splice(rows.findIndex((r) => String(r.bookmarkId) === params.id), 1);
        return ok(null);
      }),
      http.patch(`${COMMUNITY}/mindmaps/:id/bookmark`, () => {
        rows.unshift(bookmarkMindmap({ bookmarkId: 900, title: "카드 5" }));
        return ok({ bookmarkCount: 1, bookmarkId: 900 });
      }),
    );
    const { user } = renderPersonal(<BookmarksPage />);
    await screen.findByRole("button", { name: "마인드맵 (10+)" });
    await removeCard(user, "카드 5");
    await user.click(await undoButton());
    await waitFor(() => expect(mapTitles()[0]).toBe("카드 5"));

    await user.click(screen.getByRole("button", { name: "더 보기" }));
    await screen.findByRole("button", { name: "마인드맵 (13)" });
    expect(mapTitles()).toEqual(["카드 5", "카드 0", "카드 1", "카드 2", "카드 3", "카드 4", "카드 6", "카드 7", "카드 8", "카드 9", "카드 10", "카드 11", "카드 12"]);
    // 해제 · 되돌리기로 칸이 그대로라 앞 페이지를 다시 받지 않는다
    expect(urls.filter((u) => u.pathname.endsWith("/mindmaps")).map(pageOf)).toEqual([0, 1]);
  });

  it("되돌린 항목이 앞 페이지를 다시 받을 때 또 와도 한 번만 보인다", async () => {
    const rows = titled(13);
    mockLists({ mindmaps: (url) => pagedMindmaps(rows)(url) });
    server.use(
      http.delete(`${COMMUNITY}/bookmarks/:id`, ({ params }) => {
        rows.splice(rows.findIndex((r) => String(r.bookmarkId) === params.id), 1);
        return ok(null);
      }),
      http.patch(`${COMMUNITY}/mindmaps/:id/bookmark`, () => {
        rows.unshift(bookmarkMindmap({ bookmarkId: 900, title: "카드 1" }));
        return ok({ bookmarkCount: 1, bookmarkId: 900 });
      }),
    );
    const { user } = renderPersonal(<BookmarksPage />);
    await screen.findByRole("button", { name: "마인드맵 (10+)" });
    await removeCard(user, "카드 0");
    await undoButton();
    await removeCard(user, "카드 1");
    await user.click(await undoButton());
    await waitFor(() => expect(mapTitles()[0]).toBe("카드 1"));

    // 한 칸 빠진 채라 앞 페이지부터 다시 받는다 — 되돌린 900 이 그 안에 있다
    await user.click(screen.getByRole("button", { name: "더 보기" }));
    await screen.findByRole("button", { name: "마인드맵 (12)" });
    expect(mapTitles()).toEqual(["카드 1", ...Array.from({ length: 11 }, (_, i) => `카드 ${i + 2}`)]);
  });
});

describe("/bookmarks 페이지 — 상세 팝업 · 원래 마인드맵", () => {
  it("카드를 눌러 관련 세션을 보고, 원래 마인드맵을 눌러야 원본을 불러온다", async () => {
    const original: string[] = [];
    mockLists();
    server.use(
      http.get(`${COMMUNITY}/mindmaps/:id/sessions`, () => ok(CARD_SESSIONS)),
      http.get(`${BASE}/:id/original`, ({ params }) => {
        original.push(String(params.id));
        return ok(BOOKMARK_ORIGINAL);
      }),
    );
    const { user } = await renderLoaded();
    vi.spyOn(window, "requestAnimationFrame").mockReturnValue(0);

    await user.click(mapCard("동유럽 3주 살이 전체 동선"));
    const dialog = within(screen.getByRole("dialog", { name: "동유럽 3주 살이 전체 동선" }));
    await user.click(await dialog.findByRole("button", { name: new RegExp(CARD_SESSIONS.sessions[0].title) }));
    expect(mockRouter.push).toHaveBeenCalledWith(`/sessions/${CARD_SESSIONS.sessions[0].id}`);
    expect(original).toEqual([]);

    await user.click(dialog.getByRole("button", { name: "원래 마인드맵에서 보기" }));
    const full = await screen.findByRole("dialog", { name: "wanderlust님의 전체 마인드맵" });
    expect(within(full).getByText("저장한 노드 2개만 강조했어요")).toBeInTheDocument();
    expect(original).toEqual([String(CARD_BOOKMARK.bookmarkId)]);
  });
});
