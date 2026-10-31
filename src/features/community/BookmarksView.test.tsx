import { screen, within } from "@testing-library/react";
import { http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  bookmarkBundle,
  bookmarkMindmap,
  BOOKMARK_NOW,
  BOOKMARK_ORIGINAL,
  BOOKMARK_ORIGINAL_GONE,
  CARD_BOOKMARK,
  MIXED_BOOKMARK,
  NAMED_BUNDLE,
  PICKED_BOOKMARK,
  SAME_NAME_BUNDLE,
  UNNAMED_BUNDLE,
} from "@/test/fixtures/bookmarksApi";
import { CARD_SESSIONS } from "@/test/fixtures/communityApi";
import { API, fail, ok, server, SERVER_ERROR } from "@/test/msw/server";
import { renderPersonal } from "@/test/render";
import { mockRouter } from "@/test/router";
import type { SavedBundle, SavedMindmap } from "@/lib/viewTypes";
import { BookmarksView, type BookmarksViewProps } from "./BookmarksView";
import { toOriginalView, toSavedBundle, toSavedMindmap } from "./toBookmarks";
import type { BookmarkTab } from "./useBookmarkTab";

function tabOf<T>(items: T[], overrides: Partial<BookmarkTab<T>> = {}): BookmarkTab<T> {
  return {
    status: "ready",
    items,
    hasNext: false,
    error: null,
    retry: vi.fn(),
    loadMore: vi.fn(),
    loadingMore: false,
    moreError: null,
    shiftList: vi.fn(),
    remove: vi.fn(),
    ...overrides,
  };
}

const saved = (...items: Parameters<typeof toSavedMindmap>[0][]): SavedMindmap[] => items.map((i) => toSavedMindmap(i, BOOKMARK_NOW));
const MINDMAPS = saved(CARD_BOOKMARK, PICKED_BOOKMARK, MIXED_BOOKMARK);
const BUNDLES: SavedBundle[] = [NAMED_BUNDLE, SAME_NAME_BUNDLE, UNNAMED_BUNDLE].map(toSavedBundle);

function renderBookmarks(props: Partial<BookmarksViewProps> = {}) {
  return renderPersonal(<BookmarksView mindmaps={tabOf(MINDMAPS)} bundles={tabOf(BUNDLES)} {...props} />);
}

const tab = (name: RegExp) => screen.getByRole("button", { name });
const mapCard = (title: string) => screen.getByText(title).closest<HTMLElement>(".card")!;
const mapTitles = () => Array.from(document.querySelectorAll(".bmGrid .title"), (el) => el.textContent);
const bundleTitles = () => Array.from(document.querySelectorAll(".bundleTitle"), (el) => el.textContent);

const mockSessions = (response: () => Response | Promise<Response> = () => ok(CARD_SESSIONS)) => {
  const sessionIds: string[] = [];
  server.use(
    http.get(`${API}/community/mindmaps/:id/sessions`, ({ params }) => {
      sessionIds.push(String(params.id));
      return response();
    }),
  );
  return sessionIds;
};

describe("BookmarksView — 탭 · 목록", () => {
  it("세션 탭은 없고, 탭마다 불러온 수를 보여주며 더 있으면 + 를 붙인다", () => {
    renderBookmarks({ mindmaps: tabOf(MINDMAPS, { hasNext: true }) });
    expect(tab(/^마인드맵/)).toHaveTextContent("마인드맵 (3+)");
    expect(tab(/^해시태그 묶음/)).toHaveTextContent("해시태그 묶음 (3)");
    expect(tab(/^마인드맵/)).toHaveClass("active");
    expect(screen.queryByRole("button", { name: /^세션/ })).toBeNull();
  });

  it("불러오기 전 탭에는 수를 쓰지 않는다", () => {
    renderBookmarks({ mindmaps: tabOf<SavedMindmap>([], { status: "loading" }) });
    expect(tab(/^마인드맵/)).toHaveTextContent(/^마인드맵$/);
  });

  it("마인드맵 카드는 받은 순서대로 제목 · 작성자 · 저장 시점 · 앞의 해시태그 2개 · 노드 수를 보여준다", () => {
    renderBookmarks();
    expect(mapTitles()).toEqual(["동유럽 3주 살이 전체 동선", "파리 미식 지도", "#화장실 #놀이"]);
    const card = within(mapCard("동유럽 3주 살이 전체 동선"));
    expect(card.getByText("by wanderlust · 저장 4일 전")).toBeInTheDocument();
    expect(card.getByText("#프라하")).toBeInTheDocument();
    expect(card.getByText("#동유럽")).toBeInTheDocument();
    expect(card.queryByText("#야간열차")).toBeNull();
    expect(card.getByText("노드 14")).toBeInTheDocument();
  });

  it("URL 만 공개한 저장은 해시태그가 제목 자리에 가고 태그 칩을 또 그리지 않는다", () => {
    renderBookmarks();
    const card = within(mapCard("#화장실 #놀이"));
    expect(card.getByText("by wanderlust · 저장 1시간 전")).toBeInTheDocument();
    expect(card.queryByText("#화장실")).toBeNull();
  });

  it("이름이 있는 묶음은 이름과 태그를, 이름이 없으면 태그를 제목 자리에 보여준다", async () => {
    const { user } = renderBookmarks();
    await user.click(tab(/^해시태그 묶음/));
    expect(bundleTitles()).toEqual(["미술관 모음", "미술관 모음", "#호스텔 #무료투어"]);
    const first = document.querySelector<HTMLElement>(".bundleCard")!;
    ["#루브르", "#오르세"].forEach((t) => expect(within(first).getByRole("button", { name: t })).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "#호스텔" })).toBeNull();
  });

  it("이름이 같은 묶음이어도 누른 묶음만 해제한다", async () => {
    const bundles = tabOf(BUNDLES);
    const { user } = renderBookmarks({ bundles });
    await user.click(tab(/^해시태그 묶음/));
    const second = document.querySelectorAll<HTMLElement>(".bundleCard")[1];
    await user.click(within(second).getByRole("button", { name: "북마크 해제" }));
    expect(bundles.remove).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ bookmarkId: SAME_NAME_BUNDLE.bookmarkId }));
  });

  it("카드의 북마크 해제는 팝업을 열지 않는다", async () => {
    const mindmaps = tabOf(MINDMAPS);
    const { user } = renderBookmarks({ mindmaps });
    await user.click(within(mapCard("파리 미식 지도")).getByRole("button", { name: "북마크 해제" }));
    expect(mindmaps.remove).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ bookmarkId: PICKED_BOOKMARK.bookmarkId }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("BookmarksView — 상세 팝업", () => {
  beforeEach(() => {
    vi.spyOn(window, "requestAnimationFrame").mockReturnValue(0);
  });

  it("카드를 누르면 팝업이 열리고 그 세션의 관련 세션을 sessionId 로 불러온다", async () => {
    const sessionIds = mockSessions();
    const { user } = renderBookmarks();
    await user.click(mapCard("파리 미식 지도"));
    const dialog = within(screen.getByRole("dialog", { name: "파리 미식 지도" }));
    expect(await dialog.findByText(`· ${CARD_SESSIONS.sessions.length}개`)).toBeInTheDocument();
    expect(sessionIds).toEqual([String(PICKED_BOOKMARK.sessionId)]);
    expect(dialog.getByText("1구부터 20구까지 비스트로 정리.")).toBeInTheDocument();
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it("관련 세션을 기다리는 동안 팝업 안에 불러오는 중을 보여준다", async () => {
    mockSessions(() => new Promise<never>(() => {}));
    const { user } = renderBookmarks();
    await user.click(mapCard("파리 미식 지도"));
    expect(within(screen.getByRole("dialog")).getByText("불러오는 중…")).toBeInTheDocument();
  });

  it("세션 행을 누르면 그 세션 상세로 이동한다", async () => {
    mockSessions();
    const { user } = renderBookmarks();
    await user.click(mapCard("동유럽 3주 살이 전체 동선"));
    const row = await screen.findByRole("button", { name: new RegExp(CARD_SESSIONS.sessions[0].title) });
    await user.click(row);
    expect(mockRouter.push).toHaveBeenCalledWith(`/sessions/${CARD_SESSIONS.sessions[0].id}`);
  });

  it("작성자를 누르면 handle 없이 회원 id 프로필로 이동하고 팝업이 닫힌다", async () => {
    mockSessions();
    const { user } = renderBookmarks();
    await user.click(mapCard("파리 미식 지도"));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "🌱 foodtrip" }));
    expect(mockRouter.push).toHaveBeenCalledWith("/profile/102");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("sessionId 가 없는 저장은 요청 없이 관련 세션 영역을 그리지 않는다", async () => {
    const sessionIds = mockSessions();
    const { user } = renderBookmarks();
    await user.click(mapCard("#화장실 #놀이"));
    const dialog = within(screen.getByRole("dialog", { name: "#화장실 #놀이" }));
    expect(dialog.queryByText(/관련 세션/)).toBeNull();
    expect(dialog.queryByText("불러오는 중…")).toBeNull();
    expect(sessionIds).toEqual([]);
  });

  it("관련 세션을 불러오지 못하면 팝업 안에서 다시 시도할 수 있다", async () => {
    let failing = true;
    mockSessions(() => (failing ? fail(500, SERVER_ERROR) : ok(CARD_SESSIONS)));
    const { user } = renderBookmarks();
    await user.click(mapCard("파리 미식 지도"));
    const dialog = within(screen.getByRole("dialog"));
    expect(await dialog.findByRole("alert")).toHaveTextContent(SERVER_ERROR);
    failing = false;
    await user.click(dialog.getByRole("button", { name: "다시 시도" }));
    expect(await dialog.findByText(`· ${CARD_SESSIONS.sessions.length}개`)).toBeInTheDocument();
  });
});

const mockOriginal = (response: () => Response | Promise<Response> = () => ok(BOOKMARK_ORIGINAL)) => {
  const ids: string[] = [];
  server.use(
    http.get(`${API}/community/me/bookmarks/:id/original`, ({ params }) => {
      ids.push(String(params.id));
      return response();
    }),
  );
  return ids;
};

/** 노드가 강조 상태면 바깥 링이 그려진다 */
const hasRing = (g: Element) => g.querySelector('circle[stroke="#2D6A1B"]') !== null;
const ORIGINAL_BUTTON = { name: "원래 마인드맵에서 보기" };

describe("BookmarksView — 원래 마인드맵에서 보기", () => {
  beforeEach(() => {
    // 전체 마인드맵 보기의 force simulation 은 멈춰 둔다 (노드 배치는 초기 좌표 그대로)
    vi.spyOn(window, "requestAnimationFrame").mockReturnValue(0);
    mockSessions();
  });

  it("팝업을 열어도 원본을 부르지 않고, 누르면 그 북마크의 원본을 불러 저장한 노드만 강조한다", async () => {
    const ids = mockOriginal();
    const { user } = renderBookmarks();
    await user.click(mapCard("동유럽 3주 살이 전체 동선"));
    await screen.findByText(`· ${CARD_SESSIONS.sessions.length}개`);
    expect(ids).toEqual([]);

    await user.click(screen.getByRole("button", ORIGINAL_BUTTON));
    const full = await screen.findByRole("dialog", { name: "wanderlust님의 전체 마인드맵" });
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(ids).toEqual([String(CARD_BOOKMARK.bookmarkId)]);
    expect(within(full).getByText("저장한 노드 2개만 강조했어요")).toBeInTheDocument();

    const node = (label: string) => within(full).getByText(label).closest("g")!;
    ["프라하성", "카를교"].forEach((label) => {
      expect(node(label)).toHaveStyle({ opacity: "1" });
      expect(hasRing(node(label))).toBe(true);
    });
    expect(node("비엔나")).toHaveStyle({ opacity: "0.25" });
    expect(hasRing(node("비엔나"))).toBe(false);
  });

  it("기다리는 동안 버튼이 잠기고 불러오는 중으로 바뀐다", async () => {
    mockOriginal(() => new Promise<never>(() => {}));
    const { user } = renderBookmarks();
    await user.click(mapCard("동유럽 3주 살이 전체 동선"));
    await user.click(screen.getByRole("button", ORIGINAL_BUTTON));
    const button = within(screen.getByRole("dialog")).getByRole("button", { name: "불러오는 중…" });
    expect(button).toBeDisabled();
  });

  it("실패하면 팝업 안에 안내하고 다시 시도하면 전체 보기가 열린다", async () => {
    let failing = true;
    const ids = mockOriginal(() => (failing ? fail(500, SERVER_ERROR) : ok(BOOKMARK_ORIGINAL)));
    const { user } = renderBookmarks();
    await user.click(mapCard("동유럽 3주 살이 전체 동선"));
    await user.click(screen.getByRole("button", ORIGINAL_BUTTON));
    const alert = await within(screen.getByRole("dialog")).findByRole("alert");
    expect(alert).toHaveTextContent("원래 마인드맵을 불러오지 못했어요.");
    expect(alert).toHaveTextContent(SERVER_ERROR);

    failing = false;
    await user.click(within(alert).getByRole("button", { name: "다시 시도" }));
    expect(await screen.findByRole("dialog", { name: "wanderlust님의 전체 마인드맵" })).toBeInTheDocument();
    expect(ids).toHaveLength(2);
  });

  it("원본을 볼 수 없으면 전체 보기 대신 볼 수 없다고 알려 준다", async () => {
    mockOriginal(() => ok(BOOKMARK_ORIGINAL_GONE));
    const { user } = renderBookmarks();
    await user.click(mapCard("동유럽 3주 살이 전체 동선"));
    await user.click(screen.getByRole("button", ORIGINAL_BUTTON));
    const dialog = within(screen.getByRole("dialog", { name: "동유럽 3주 살이 전체 동선" }));
    expect(await dialog.findByText("원래 마인드맵을 볼 수 없어요")).toBeInTheDocument();
    expect(dialog.queryByRole("button", ORIGINAL_BUTTON)).toBeNull();
  });

  it("전체 보기를 닫으면 상세 팝업으로 돌아오고, 다시 열어도 또 부르지 않는다", async () => {
    const ids = mockOriginal();
    const { user } = renderBookmarks();
    await user.click(mapCard("동유럽 3주 살이 전체 동선"));
    await user.click(screen.getByRole("button", ORIGINAL_BUTTON));
    const full = await screen.findByRole("dialog", { name: "wanderlust님의 전체 마인드맵" });
    await user.click(within(full).getByRole("button", { name: "닫기" }));
    expect(screen.getByRole("dialog", { name: "동유럽 3주 살이 전체 동선" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", ORIGINAL_BUTTON));
    expect(screen.getByRole("dialog", { name: "wanderlust님의 전체 마인드맵" })).toBeInTheDocument();
    expect(ids).toHaveLength(1);
  });

  it("다른 카드를 열면 앞 카드의 원본 상태가 남지 않는다", async () => {
    const ids = mockOriginal(() => ok(BOOKMARK_ORIGINAL_GONE));
    const { user } = renderBookmarks();
    await user.click(mapCard("동유럽 3주 살이 전체 동선"));
    await user.click(screen.getByRole("button", ORIGINAL_BUTTON));
    await screen.findByText("원래 마인드맵을 볼 수 없어요");
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "닫기" }));

    await user.click(mapCard("파리 미식 지도"));
    expect(screen.getByRole("button", ORIGINAL_BUTTON)).toBeEnabled();
    expect(screen.queryByText("원래 마인드맵을 볼 수 없어요")).toBeNull();
    expect(ids).toHaveLength(1);
  });
});

describe("BookmarksView — 빈 · 오류 상태", () => {
  it("빈 탭에서만 빈 안내를 보여준다", async () => {
    const { user } = renderBookmarks({ bundles: tabOf<SavedBundle>([]) });
    expect(screen.queryByText("아직 북마크한 항목이 없어요")).toBeNull();
    await user.click(tab(/^해시태그 묶음/));
    expect(tab(/^해시태그 묶음/)).toHaveTextContent("해시태그 묶음 (0)");
    expect(screen.getByRole("status")).toHaveTextContent("아직 북마크한 항목이 없어요");
  });

  it("보이는 항목을 다 해제했어도 더 있으면 빈 안내 대신 더 보기를 보여준다", () => {
    renderBookmarks({ mindmaps: tabOf<SavedMindmap>([], { hasNext: true }) });
    expect(screen.queryByText("아직 북마크한 항목이 없어요")).toBeNull();
    expect(screen.getByRole("button", { name: "더 보기" })).toBeInTheDocument();
  });

  it("불러오는 중이면 그 탭에 안내 문구를 보여준다", () => {
    renderBookmarks({ mindmaps: tabOf<SavedMindmap>([], { status: "loading" }) });
    expect(screen.getByText("불러오는 중…")).toBeInTheDocument();
  });

  it("실패한 탭은 오류 메시지와 다시 시도 버튼을 보여주고, 다른 탭은 그대로다", async () => {
    const retry = vi.fn();
    const { user } = renderBookmarks({ mindmaps: tabOf<SavedMindmap>([], { status: "error", error: SERVER_ERROR, retry }) });
    expect(screen.getByRole("alert")).toHaveTextContent(SERVER_ERROR);
    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(retry).toHaveBeenCalledOnce();
    await user.click(tab(/^해시태그 묶음/));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(bundleTitles()).toHaveLength(3);
  });

  it("더 보기가 실패해도 불러온 항목은 남고 다시 시도하면 loadMore 를 부른다", async () => {
    const loadMore = vi.fn();
    const { user } = renderBookmarks({ mindmaps: tabOf(MINDMAPS, { hasNext: true, moreError: "결과를 더 불러오지 못했어요.", loadMore }) });
    expect(mapTitles()).toHaveLength(3);
    await user.click(within(screen.getByRole("alert")).getByRole("button", { name: "다시 시도" }));
    expect(loadMore).toHaveBeenCalledOnce();
  });

  it("더 보기를 누르면 loadMore 를 부르고, 더 없으면 버튼이 없다", async () => {
    const loadMore = vi.fn();
    const { user, unmount } = renderBookmarks({ mindmaps: tabOf(MINDMAPS, { hasNext: true, loadMore }) });
    await user.click(screen.getByRole("button", { name: "더 보기" }));
    expect(loadMore).toHaveBeenCalledOnce();
    unmount();
    renderBookmarks();
    expect(screen.queryByRole("button", { name: "더 보기" })).toBeNull();
  });
});

describe("toSavedMindmap", () => {
  it("저장 시각은 UTC 시각 기준이다 — 글자 그대로의 날짜가 아니다", () => {
    const now = Date.parse("2026-11-01T00:31:00+09:00");
    const item = bookmarkMindmap({ bookmarkId: 1, savedAt: "2026-10-31T15:29:26.482424Z" });
    expect(toSavedMindmap(item, now).savedAgo).toBe("1분 전");
  });

  it("닉네임이 없으면 이름 없는 사용자, URL 만 공개에 태그도 없으면 안내 문구를 쓴다", () => {
    const item = bookmarkMindmap({ bookmarkId: 1, title: null, snippet: null, hashtags: [], owner: { userId: 7, nickname: null } });
    const { post, ownerId } = toSavedMindmap(item, BOOKMARK_NOW);
    expect(post.user.name).toBe("이름 없는 사용자");
    expect(post.title).toBe("원문 링크만 공개된 마인드맵");
    expect(post.snippet).toBe("");
    expect(ownerId).toBe(7);
  });

  it("URL 만 공개라 nodes 가 비어 있어도 노드 수는 nodeCount 를 쓴다", () => {
    const item = bookmarkMindmap({ bookmarkId: 1, title: null, snippet: null, nodes: [], edges: [], nodeCount: 5 });
    expect(toSavedMindmap(item, BOOKMARK_NOW).post.nodes).toBe(5);
  });

  it("제목이 있으면 해시태그에 # 를 붙이고 저장 대상을 그대로 들고 있는다", () => {
    const { post, target } = toSavedMindmap(CARD_BOOKMARK, BOOKMARK_NOW);
    expect(post.hashtags).toEqual(["#프라하", "#동유럽", "#야간열차"]);
    expect(target).toEqual({ saveType: "MINI_MINDMAP", targetType: "NODE", targetIds: [81, 82], sourceMindmapId: 101 });
  });
});

describe("toSavedBundle", () => {
  it("태그에 # 를 붙이고 이름이 없으면 null 그대로 둔다", () => {
    const bundle = toSavedBundle(bookmarkBundle({ bookmarkId: 1, name: null, hashtags: ["#이미", "없음"] }));
    expect(bundle).toMatchObject({ bookmarkId: 1, name: null, tags: ["#이미", "#없음"] });
  });
});

describe("toOriginalView", () => {
  it("강조 id 를 전체 마인드맵의 노드 id 모양으로 바꾼다", () => {
    const view = toOriginalView(BOOKMARK_ORIGINAL)!;
    expect(view.highlightIds).toEqual(["node:81", "node:82"]);
    view.highlightIds.forEach((id) => expect(view.mindmap.nodes.some((n) => n.id === id)).toBe(true));
  });

  it("볼 수 없으면 null 이다 — 그래프가 비어 sourceAvailable 만 false 로 올 때도 같다", () => {
    expect(toOriginalView(BOOKMARK_ORIGINAL_GONE)).toBeNull();
    expect(toOriginalView({ ...BOOKMARK_ORIGINAL, sourceAvailable: false })).toBeNull();
  });
});
