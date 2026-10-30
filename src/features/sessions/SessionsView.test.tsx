import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http } from "msw";
import { beforeEach, describe, expect, it } from "vitest";
import SessionsPage from "@/app/(personal)/sessions/page";
import type { SessionListItem, SessionUpdateRequest } from "@/lib/api";
import { MANY_TAGS_SESSION, SESSION_LIST, STATUS_SESSIONS, TAG_GROUPS, sessionById } from "@/test/fixtures/sessions";
import { API, fail, ok, server } from "@/test/msw/server";
import { renderPersonal } from "@/test/render";
import { mockRouter } from "@/test/router";
import { renderSessions, serveSessions, sessionsQuery as q } from "./sessionsViewTestUtils";
import { SessionsView } from "./SessionsView";

const ROME = sessionById(9001);
const FLIGHTS = sessionById(9002);
const FAVORITES = SESSION_LIST.filter((s) => s.isFavorite);
const titles = (list: SessionListItem[]) => list.map((s) => s.title);

/** GET /sessions 로 받은 쿼리 (차례대로) */
let requests: string[];
let groupCalls: number;

beforeEach(() => {
  groupCalls = 0;
  requests = serveSessions(SESSION_LIST);
  server.use(
    http.get(`${API}/tag-groups`, () => {
      groupCalls += 1;
      return ok(TAG_GROUPS);
    }),
  );
});

/** 보이는 카드 제목 (카드마다 h3 하나) */
const cardTitles = () => screen.queryAllByRole("heading", { level: 3 }).map((h) => h.textContent);

const card = (title: string) => screen.getByRole("heading", { level: 3, name: title }).closest<HTMLElement>(".card")!;

const starOf = (title: string) => within(card(title)).getByRole("button", { name: "즐겨찾기" });

/** 별 아이콘이 채워져 있는지 (starFilled 만 fill=currentColor) */
const isFilled = (el: HTMLElement) => el.querySelector("path")?.getAttribute("fill") === "currentColor";

/** 머리말의 '즐겨찾기' 필터 버튼 (카드의 별 버튼은 글자가 없다) */
const favFilter = () => screen.getByText("즐겨찾기", { selector: "button" });

const END = "모든 기록을 확인했습니다.";

describe("세션 목록 — 불러오기", () => {
  it("불러오는 동안 안내가 보이고, 받아 오면 카드가 보인다", async () => {
    renderSessions();
    expect(screen.getByText("불러오는 중…")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { level: 3, name: ROME.title })).toBeInTheDocument();
    expect(screen.queryByText("불러오는 중…")).not.toBeInTheDocument();
    expect(requests).toEqual([q(0)]);
    expect(groupCalls).toBe(1);
  });

  it("세션 목록 라우트도 같은 화면을 그린다", async () => {
    renderPersonal(<SessionsPage />);
    expect(await screen.findByRole("heading", { level: 1, name: "세션 목록" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { level: 3, name: ROME.title })).toBeInTheDocument();
  });

  it("머리말에 전체 세션 · 즐겨찾기 · 그룹 개수가 보인다", async () => {
    renderSessions();
    expect(await screen.findByText("전체 25개 세션 · 11개 즐겨찾기 · 3개 그룹")).toBeInTheDocument();
  });

  it("머리말의 세션 · 즐겨찾기 개수는 받은 카드 수가 아니라 서버의 totalCount · favoriteCount 다", async () => {
    server.use(
      http.get(`${API}/sessions`, () =>
        ok({ sessions: SESSION_LIST.slice(0, 10), hasNext: true, totalCount: 123, favoriteCount: 45 }),
      ),
    );
    renderSessions();
    expect(await screen.findByText("전체 123개 세션 · 45개 즐겨찾기 · 3개 그룹")).toBeInTheDocument();
    expect(cardTitles()).toHaveLength(10);
  });

  it("세션이 하나도 없으면 빈 상태 안내가 보인다", async () => {
    serveSessions([]);
    renderSessions();
    expect(await screen.findByText("아직 세션이 없습니다")).toBeInTheDocument();
    expect(screen.getByText("확장 프로그램으로 웹 탐색을 수집하면 세션이 여기에 쌓여요.")).toBeInTheDocument();
    expect(screen.queryByText(END)).not.toBeInTheDocument();
  });

  it("목록을 못 불러오면 서버 메시지와 다시 시도 버튼이 보이고, 다시 시도하면 0페이지부터 다시 받는다", async () => {
    server.use(http.get(`${API}/sessions`, () => fail(500, "일시적인 오류가 발생했습니다."), { once: true }));
    const { user } = renderSessions();
    expect(await screen.findByRole("alert")).toHaveTextContent("일시적인 오류가 발생했습니다.");

    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(await screen.findByRole("heading", { level: 3, name: ROME.title })).toBeInTheDocument();
    expect(requests).toEqual([q(0)]);
  });
});

describe("세션 목록 — 카드", () => {
  it("카드에 제목 · 걸린 시간 · URL 수 · 날짜 · 해시태그가 보인다", async () => {
    renderSessions();
    await screen.findByRole("heading", { level: 3, name: ROME.title });
    const rome = within(card(ROME.title));
    expect(rome.getByText("1시간 34분")).toBeInTheDocument();
    expect(rome.getByText("18개 URL")).toBeInTheDocument();
    expect(rome.getByText("2026-04-26")).toBeInTheDocument();
    expect(rome.getAllByRole("button", { name: /^#/ }).map((b) => b.textContent)).toEqual([
      "#로마",
      "#콜로세움",
      "#바티칸",
      "#먹거리",
    ]);
    expect(within(card(FLIGHTS.title)).getByText("1시간 19분")).toBeInTheDocument();
    expect(within(card("유레일패스 vs 개별 구매")).getByText("39분")).toBeInTheDocument();
  });

  it("해시태그가 4개를 넘으면 앞의 4개만 보인다", async () => {
    renderSessions();
    await screen.findByRole("heading", { level: 3, name: MANY_TAGS_SESSION.title });
    const chips = within(card(MANY_TAGS_SESSION.title)).getAllByRole("button", { name: /^#/ });
    expect(chips.map((b) => b.textContent)).toEqual(["#리스본", "#포르투", "#에그타르트", "#트램"]);
  });

  it("아직 분석 중인 세션은 걸린 시간 대신 '분석 중' 이 보인다", async () => {
    renderSessions();
    await screen.findByRole("heading", { level: 3, name: "빈 클래식 공연 예매" });
    expect(within(card("빈 클래식 공연 예매")).getByText("분석 중")).toBeInTheDocument();
  });

  it("즐겨찾기한 세션은 별이 채워져 있다", async () => {
    renderSessions();
    await screen.findByRole("heading", { level: 3, name: ROME.title });
    expect(isFilled(starOf(ROME.title))).toBe(true);
    expect(isFilled(starOf(FLIGHTS.title))).toBe(false);
  });

  it("카드를 누르면 그 세션 상세로 이동한다", async () => {
    const { user } = renderSessions();
    await screen.findByRole("heading", { level: 3, name: FLIGHTS.title });
    await user.click(card(FLIGHTS.title));
    expect(mockRouter.push).toHaveBeenCalledWith("/sessions/9002");
  });

  it("카드에 포커스를 두고 Enter 나 Space 를 누르면 상세로 이동한다", async () => {
    const { user } = renderSessions();
    await screen.findByRole("heading", { level: 3, name: ROME.title });
    card(ROME.title).focus();
    await user.keyboard("{Enter}");
    expect(mockRouter.push).toHaveBeenLastCalledWith("/sessions/9001");

    card(FLIGHTS.title).focus();
    await user.keyboard(" ");
    expect(mockRouter.push).toHaveBeenLastCalledWith("/sessions/9002");
    expect(mockRouter.push).toHaveBeenCalledTimes(2);
  });

  it("Tab 으로 카드에 갈 수 있다", async () => {
    const { user } = renderSessions();
    await screen.findByRole("heading", { level: 3, name: ROME.title });
    // 머리말 버튼 2개 다음이 첫 카드
    await user.tab();
    await user.tab();
    await user.tab();
    expect(card(ROME.title)).toHaveFocus();
  });
});

describe("세션 목록 — 상태별 카드", () => {
  // 수집 중(종료 전) · 분석 대기 · 분석 중 · 분석 실패 — 뒤의 셋은 종료 시각이 있어도 걸린 시간 대신 상태를 보인다
  const LOCKED = [
    { label: "수집 중", session: STATUS_SESSIONS[0], duration: null },
    { label: "분석 대기", session: STATUS_SESSIONS[1], duration: "42분" },
    { label: "분석 중", session: STATUS_SESSIONS[2], duration: "41분" },
    { label: "분석 실패", session: STATUS_SESSIONS[3], duration: "35분" },
  ];

  beforeEach(() => {
    requests = serveSessions(STATUS_SESSIONS);
  });

  it.each(LOCKED)("$label 세션 카드는 걸린 시간 자리에 상태가 보이고 URL 개수는 숨긴다", async ({ label, session, duration }) => {
    renderSessions();
    await screen.findByRole("heading", { level: 3, name: session.title });
    const c = within(card(session.title));
    expect(c.getByText(label)).toBeInTheDocument();
    if (duration) expect(c.queryByText(duration)).not.toBeInTheDocument();
    expect(c.queryByText(`${session.pageCount}개 URL`)).not.toBeInTheDocument();
    expect(c.getByText(session.startedAt.slice(0, 10))).toBeInTheDocument();
  });

  it.each(LOCKED)("$label 세션 카드는 눌러도 · Enter · Space 를 눌러도 상세로 이동하지 않는다", async ({ session }) => {
    const { user } = renderSessions();
    await screen.findByRole("heading", { level: 3, name: session.title });
    const c = card(session.title);
    expect(c).toHaveAttribute("aria-disabled", "true");
    expect(c).not.toHaveAttribute("role");
    expect(c).not.toHaveAttribute("tabindex");

    await user.click(c);
    fireEvent.keyDown(c, { key: "Enter" });
    fireEvent.keyDown(c, { key: " " });
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it("Tab 으로 갈 때 진행 중 카드는 건너뛰고 그 카드의 별 버튼으로 간다", async () => {
    const { user } = renderSessions();
    await screen.findByRole("heading", { level: 3, name: STATUS_SESSIONS[0].title });
    // 머리말 버튼 2개 다음 — 첫 카드(수집 중) 자체가 아니라 별 버튼
    await user.tab();
    await user.tab();
    await user.tab();
    expect(starOf(STATUS_SESSIONS[0].title)).toHaveFocus();
  });

  it("분석 실패 세션 카드도 별은 그대로 동작한다", async () => {
    const patches: unknown[] = [];
    server.use(
      http.patch(`${API}/sessions/:id`, async ({ request, params }) => {
        patches.push([params.id, await request.json()]);
        return ok(null);
      }),
    );
    const failed = STATUS_SESSIONS[3];
    const { user } = renderSessions();
    await screen.findByText("전체 5개 세션 · 2개 즐겨찾기 · 3개 그룹");

    await user.click(starOf(failed.title));
    expect(isFilled(starOf(failed.title))).toBe(false);
    expect(screen.getByText("전체 5개 세션 · 1개 즐겨찾기 · 3개 그룹")).toBeInTheDocument();
    await waitFor(() => expect(patches).toEqual([["9104", { isFavorite: false }]]));
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it("같은 목록의 분석 완료 세션 카드는 걸린 시간 · URL 수가 보이고 누르면 상세로 이동한다", async () => {
    const { user } = renderSessions();
    await screen.findByRole("heading", { level: 3, name: ROME.title });
    const rome = card(ROME.title);
    expect(within(rome).getByText("1시간 34분")).toBeInTheDocument();
    expect(within(rome).getByText("18개 URL")).toBeInTheDocument();
    expect(rome).toHaveAttribute("role", "button");
    expect(rome).not.toHaveAttribute("aria-disabled");

    await user.click(rome);
    expect(mockRouter.push).toHaveBeenCalledWith("/sessions/9001");
  });
});

describe("세션 목록 — 즐겨찾기 별", () => {
  function onPatch(respond: (id: number, body: SessionUpdateRequest) => Response | Promise<Response>) {
    const patches: { id: number; body: SessionUpdateRequest }[] = [];
    server.use(
      http.patch(`${API}/sessions/:id`, async ({ request, params }) => {
        const id = Number(params.id);
        const body = (await request.json()) as SessionUpdateRequest;
        patches.push({ id, body });
        return respond(id, body);
      }),
    );
    return patches;
  }

  it("별을 누르면 바로 채워지고 즐겨찾기 개수가 늘며 PATCH /sessions/{id} 에 { isFavorite: true } 를 보낸다", async () => {
    const patches = onPatch((id, body) => ok({ ...sessionById(id), ...body, summary: null, sources: [] }));
    const { user } = renderSessions();
    await screen.findByRole("heading", { level: 3, name: FLIGHTS.title });

    await user.click(starOf(FLIGHTS.title));
    expect(isFilled(starOf(FLIGHTS.title))).toBe(true);
    expect(screen.getByText("전체 25개 세션 · 12개 즐겨찾기 · 3개 그룹")).toBeInTheDocument();
    await waitFor(() => expect(patches).toEqual([{ id: 9002, body: { isFavorite: true } }]));
    // 별을 눌러도 카드가 열리지 않는다
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it("별을 끄면 즐겨찾기 개수가 준다", async () => {
    onPatch((id, body) => ok({ ...sessionById(id), ...body, summary: null, sources: [] }));
    const { user } = renderSessions();
    await screen.findByRole("heading", { level: 3, name: ROME.title });

    await user.click(starOf(ROME.title));
    expect(isFilled(starOf(ROME.title))).toBe(false);
    expect(screen.getByText("전체 25개 세션 · 10개 즐겨찾기 · 3개 그룹")).toBeInTheDocument();
  });

  it("즐겨찾기를 바꾸면 그룹 보기의 즐겨찾기 표시도 맞추려고 그룹을 다시 불러온다", async () => {
    onPatch((id, body) => ok({ ...sessionById(id), ...body, summary: null, sources: [] }));
    const { user } = renderSessions();
    await screen.findByRole("heading", { level: 3, name: ROME.title });

    await user.click(starOf(ROME.title));
    await waitFor(() => expect(groupCalls).toBe(2));
    expect(isFilled(starOf(ROME.title))).toBe(false);
  });

  it("별 버튼에서 Enter 를 누르면 카드는 열리지 않고 즐겨찾기만 바뀐다", async () => {
    const patches = onPatch((id, body) => ok({ ...sessionById(id), ...body, summary: null, sources: [] }));
    const { user } = renderSessions();
    await screen.findByRole("heading", { level: 3, name: FLIGHTS.title });

    starOf(FLIGHTS.title).focus();
    await user.keyboard("{Enter}");
    await waitFor(() => expect(patches).toEqual([{ id: 9002, body: { isFavorite: true } }]));
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it("서버가 실패하면 별과 개수를 원래대로 되돌리고 서버 메시지를 토스트로 띄운다", async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    onPatch(async () => {
      await gate;
      return fail(500, "즐겨찾기를 바꾸지 못했어요.");
    });
    const { user } = renderSessions();
    await screen.findByRole("heading", { level: 3, name: FLIGHTS.title });

    await user.click(starOf(FLIGHTS.title));
    expect(isFilled(starOf(FLIGHTS.title))).toBe(true); // 응답 전 — 낙관적 반영
    expect(screen.getByText("전체 25개 세션 · 12개 즐겨찾기 · 3개 그룹")).toBeInTheDocument();
    release();

    expect(await screen.findByText("즐겨찾기를 바꾸지 못했어요.")).toBeInTheDocument();
    expect(isFilled(starOf(FLIGHTS.title))).toBe(false);
    expect(screen.getByText("전체 25개 세션 · 11개 즐겨찾기 · 3개 그룹")).toBeInTheDocument();
    expect(groupCalls).toBe(1); // 실패하면 그룹은 다시 부르지 않는다
  });

  it("그룹 보기에서 아직 목록에 안 불러온 세션의 별을 눌러도 바로 채워지고 개수가 늘며 PATCH 를 보낸다", async () => {
    const patches = onPatch(() => ok(null));
    const { user } = renderSessions();
    await screen.findByRole("heading", { level: 3, name: ROME.title });
    await user.click(screen.getByRole("button", { name: "해시태그" }));

    // 9025 는 25번째 세션이라 목록 0페이지에는 없고 #예산 그룹에만 있다
    const exchange = sessionById(9025);
    expect(requests).toEqual([q(0)]);
    await user.click(starOf(exchange.title));
    expect(isFilled(starOf(exchange.title))).toBe(true);
    expect(screen.getByText("전체 25개 세션 · 12개 즐겨찾기 · 3개 그룹")).toBeInTheDocument();
    await waitFor(() => expect(patches).toEqual([{ id: 9025, body: { isFavorite: true } }]));
  });
});

describe("세션 목록 — 무한 스크롤", () => {
  it("처음엔 0페이지 10개만 받고, 스크롤이 80% 를 넘으면 다음 페이지를 받아 이어 붙인다", async () => {
    const { scroll } = renderSessions();
    await screen.findByRole("heading", { level: 3, name: ROME.title });
    expect(cardTitles()).toEqual(titles(SESSION_LIST.slice(0, 10)));
    expect(requests).toEqual([q(0)]);
    expect(screen.queryByText(END)).not.toBeInTheDocument();

    scroll.toBottom();
    await waitFor(() => expect(cardTitles()).toHaveLength(20));
    expect(cardTitles()).toEqual(titles(SESSION_LIST.slice(0, 20)));
    expect(requests).toEqual([q(0), q(1)]);
    expect(screen.queryByText(END)).not.toBeInTheDocument();

    scroll.toBottom();
    await waitFor(() => expect(cardTitles()).toHaveLength(25));
    expect(requests).toEqual([q(0), q(1), q(2)]);
    expect(screen.getByText(END)).toBeInTheDocument();
  });

  it("마지막 페이지를 받은 뒤에는 스크롤해도 더 요청하지 않는다", async () => {
    const { scroll } = renderSessions();
    await screen.findByRole("heading", { level: 3, name: ROME.title });
    scroll.toBottom();
    await waitFor(() => expect(cardTitles()).toHaveLength(20));
    scroll.toBottom();
    await screen.findByText(END);

    scroll.toTop();
    scroll.toBottom();
    expect(requests).toEqual([q(0), q(1), q(2)]);
  });

  it("끝 안내는 카드 수가 아니라 hasNext 로 정한다", async () => {
    server.use(
      http.get(`${API}/sessions`, () =>
        ok({ sessions: SESSION_LIST.slice(0, 10), hasNext: false, totalCount: 10, favoriteCount: 5 }),
      ),
    );
    const { scroll } = renderSessions();
    await screen.findByRole("heading", { level: 3, name: ROME.title });
    expect(screen.getByText(END)).toBeInTheDocument();

    scroll.toBottom();
    expect(cardTitles()).toHaveLength(10);
    expect(requests).toEqual([]); // 덮어쓴 응답만 썼고 다음 페이지는 요청하지 않았다
  });

  it("스크롤이 80% 지점에 못 미치면 다음 페이지를 요청하지 않는다", async () => {
    const { scroll } = renderSessions();
    await screen.findByRole("heading", { level: 3, name: ROME.title });
    scroll.body.scrollTop = 200; // 200 + 500 < 1000 * 0.8
    fireEvent.scroll(scroll.body);
    expect(cardTitles()).toHaveLength(10);
    expect(requests).toEqual([q(0)]);
  });

  it("다음 페이지를 받는 동안엔 계속 스크롤해도 한 번만 요청하고, 아래에 불러오는 중 안내가 보인다", async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    let page1 = 0;
    // 1페이지만 잡아 뒀다가 serveSessions 로 넘긴다
    server.use(
      http.get(`${API}/sessions`, async ({ request }) => {
        if (new URL(request.url).searchParams.get("page") !== "1") return;
        page1 += 1;
        await gate;
      }),
    );
    const { scroll } = renderSessions();
    await screen.findByRole("heading", { level: 3, name: ROME.title });

    scroll.toBottom();
    scroll.toTop();
    scroll.toBottom();
    scroll.toBottom();
    expect(await screen.findByText("불러오는 중…")).toBeInTheDocument();
    expect(page1).toBe(1);

    release();
    await waitFor(() => expect(cardTitles()).toHaveLength(20));
    expect(screen.queryByText("불러오는 중…")).not.toBeInTheDocument();
    expect(page1).toBe(1);
    expect(requests).toEqual([q(0), q(1)]);
  });

  it("다음 페이지를 못 불러오면 토스트를 띄우고, 다시 스크롤하면 다시 요청한다", async () => {
    let failed = 0;
    server.use(
      http.get(`${API}/sessions`, ({ request }) => {
        if (failed > 0 || new URL(request.url).searchParams.get("page") !== "1") return;
        failed += 1;
        return fail(500, "세션을 불러오지 못했어요.");
      }),
    );
    const { scroll } = renderSessions();
    await screen.findByRole("heading", { level: 3, name: ROME.title });

    scroll.toBottom();
    expect(await screen.findByText("세션을 불러오지 못했어요.")).toBeInTheDocument();
    expect(cardTitles()).toHaveLength(10);
    expect(screen.queryByText(END)).not.toBeInTheDocument();
    expect(screen.queryByText("불러오는 중…")).not.toBeInTheDocument();

    scroll.toTop();
    scroll.toBottom();
    await waitFor(() => expect(cardTitles()).toHaveLength(20));
    expect(failed).toBe(1);
    expect(requests).toEqual([q(0), q(1)]);
  });

  it("세션이 10개 이하면 처음부터 끝 안내가 보이고 더 요청하지 않는다", async () => {
    requests = serveSessions(SESSION_LIST.slice(0, 7));
    renderSessions();
    await screen.findByRole("heading", { level: 3, name: ROME.title });
    expect(cardTitles()).toHaveLength(7);
    expect(screen.getByText(END)).toBeInTheDocument();
    expect(requests).toEqual([q(0)]);
  });

  it("첫 10개가 화면을 다 못 채우면 스크롤이 생길 때까지 다음 페이지를 이어서 받는다", async () => {
    const view = renderPersonal(<SessionsView />);
    const body = view.container.querySelector<HTMLElement>(".body")!;
    // 보이는 높이가 카드 15장(1500px) 정도로 크면 → 20장까지 받아야 스크롤이 생긴다
    Object.defineProperties(body, {
      clientHeight: { configurable: true, get: () => 1500 },
      scrollHeight: { configurable: true, get: () => body.querySelectorAll(".grid > .card").length * 100 },
      scrollTop: { configurable: true, get: () => 0 },
    });
    await waitFor(() => expect(cardTitles()).toHaveLength(20));
    expect(requests).toEqual([q(0), q(1)]);
  });
});

describe("세션 목록 — 즐겨찾기 보기", () => {
  it("즐겨찾기를 켜면 favorite=true 로 0페이지부터 다시 받고, 버튼이 눌린 상태가 된다", async () => {
    const { user, scroll } = renderSessions();
    await screen.findByRole("heading", { level: 3, name: ROME.title });

    await user.click(favFilter());
    expect(favFilter()).toHaveClass("active");
    await waitFor(() => expect(cardTitles()).toEqual(titles(FAVORITES.slice(0, 10))));
    expect(requests).toEqual([q(0), q(0, true)]);
    // 개수는 보기와 상관없이 그대로
    expect(screen.getByText("전체 25개 세션 · 11개 즐겨찾기 · 3개 그룹")).toBeInTheDocument();

    scroll.toBottom();
    await waitFor(() => expect(cardTitles()).toEqual(titles(FAVORITES)));
    expect(requests).toEqual([q(0), q(0, true), q(1, true)]);
    expect(screen.getByText(END)).toBeInTheDocument();
  });

  it("스크롤로 20개까지 본 뒤 즐겨찾기를 켜면 다시 0페이지 10개부터 보인다", async () => {
    const { user, scroll } = renderSessions();
    await screen.findByRole("heading", { level: 3, name: ROME.title });
    scroll.toBottom();
    await waitFor(() => expect(cardTitles()).toHaveLength(20));
    scroll.toTop();

    await user.click(favFilter());
    await waitFor(() => expect(cardTitles()).toEqual(titles(FAVORITES.slice(0, 10))));
    expect(requests).toEqual([q(0), q(1), q(0, true)]);
  });

  it("즐겨찾기를 다시 끄면 전체 목록을 0페이지부터 다시 받는다", async () => {
    const { user } = renderSessions();
    await screen.findByRole("heading", { level: 3, name: ROME.title });
    await user.click(favFilter());
    await waitFor(() => expect(cardTitles()).toEqual(titles(FAVORITES.slice(0, 10))));

    await user.click(favFilter());
    expect(favFilter()).not.toHaveClass("active");
    await waitFor(() => expect(cardTitles()).toEqual(titles(SESSION_LIST.slice(0, 10))));
    expect(requests).toEqual([q(0), q(0, true), q(0)]);
  });

  it("즐겨찾기한 세션이 없으면 별을 눌러 보라고 안내한다", async () => {
    const none: SessionListItem[] = SESSION_LIST.map((s) => ({ ...s, isFavorite: false }));
    serveSessions(none);
    const { user } = renderSessions();
    await screen.findByRole("heading", { level: 3, name: ROME.title });

    await user.click(favFilter());
    expect(await screen.findByText("즐겨찾기한 세션이 없습니다")).toBeInTheDocument();
    expect(screen.getByText("세션 카드의 별을 눌러 즐겨찾기에 추가해보세요.")).toBeInTheDocument();
  });

  it("즐겨찾기 보기에서 별을 끄면 카드가 빠지고 개수가 줄며, 다음 페이지로 당겨진 세션도 빠짐없이 받는다", async () => {
    // 서버 상태 — PATCH 를 반영한다
    let db = SESSION_LIST;
    requests = serveSessions(() => db);
    const patched: number[] = [];
    server.use(
      http.patch(`${API}/sessions/:id`, async ({ request, params }) => {
        const id = Number(params.id);
        const body = (await request.json()) as SessionUpdateRequest;
        db = db.map((s) => (s.id === id ? { ...s, ...body } : s));
        patched.push(id);
        return ok(null);
      }),
    );
    const { user, scroll } = renderSessions();
    await screen.findByRole("heading", { level: 3, name: ROME.title });
    await user.click(favFilter());
    await waitFor(() => expect(cardTitles()).toEqual(titles(FAVORITES.slice(0, 10))));

    await user.click(starOf(ROME.title));
    expect(screen.queryByRole("heading", { level: 3, name: ROME.title })).not.toBeInTheDocument();
    expect(screen.getByText("전체 25개 세션 · 10개 즐겨찾기 · 3개 그룹")).toBeInTheDocument();
    await waitFor(() => expect(patched).toEqual([ROME.id]));

    // 서버 즐겨찾기가 한 칸 당겨져 11번째가 0페이지 끝으로 왔다 → 0페이지를 다시 받아 겹치는 건 거른다
    scroll.toBottom();
    await waitFor(() => expect(cardTitles()).toEqual(titles(FAVORITES.slice(1))));
    expect(requests).toEqual([q(0), q(0, true), q(0, true)]);
    expect(screen.getByText(END)).toBeInTheDocument();
  });
});

describe("세션 목록 — 해시태그(그룹) 보기 전환", () => {
  const sectionHeads = () =>
    Array.from(document.querySelectorAll<HTMLElement>(".groupTags")).map((el) =>
      within(el)
        .getAllByRole("button")
        .map((b) => b.textContent),
    );

  it("해시태그를 누르면 그룹 보기로 바뀌고, 다시 누르면 목록으로 돌아온다", async () => {
    const { user } = renderSessions();
    await screen.findByRole("heading", { level: 3, name: ROME.title });
    const toggle = screen.getByRole("button", { name: "해시태그" });

    await user.click(toggle);
    expect(toggle).toHaveClass("active");
    expect(sectionHeads()).toEqual([["#로마", "#콜로세움"], ["#항공권", "#예산"], ["#React", "#TypeScript"]]);
    expect(screen.queryByText(END)).not.toBeInTheDocument();

    await user.click(toggle);
    expect(toggle).not.toHaveClass("active");
    expect(sectionHeads()).toEqual([]);
    expect(cardTitles()).toHaveLength(10);
    // 보기만 바꿨으니 목록을 다시 받지 않는다
    expect(requests).toEqual([q(0)]);
  });

  it("즐겨찾기를 켠 채 그룹 보기로 가면 그룹마다 즐겨찾기한 세션만 남는다", async () => {
    const { user } = renderSessions();
    await screen.findByRole("heading", { level: 3, name: ROME.title });
    await user.click(favFilter());
    await waitFor(() => expect(cardTitles()).toEqual(titles(FAVORITES.slice(0, 10))));
    await user.click(screen.getByRole("button", { name: "해시태그" }));

    // 그룹 보기에서는 즐겨찾기 버튼이 눌린 표시가 꺼진다
    expect(favFilter()).not.toHaveClass("active");
    const counts = Array.from(document.querySelectorAll(".groupCount")).map((el) => el.textContent);
    expect(counts).toEqual(["1개 세션", "1개 세션", "0개 세션"]);
  });

  it("그룹 보기에서 즐겨찾기를 누르면 목록 보기로 돌아와 즐겨찾기를 받는다", async () => {
    const { user } = renderSessions();
    await screen.findByRole("heading", { level: 3, name: ROME.title });
    await user.click(screen.getByRole("button", { name: "해시태그" }));

    await user.click(favFilter());
    expect(favFilter()).toHaveClass("active");
    expect(screen.getByRole("button", { name: "해시태그" })).not.toHaveClass("active");
    await waitFor(() => expect(cardTitles()).toEqual(titles(FAVORITES.slice(0, 10))));
    expect(requests).toEqual([q(0), q(0, true)]);
  });
});

// BE 배포 전환용 — BE 페이징 PR 머지 후 이 묶음과 lib/api/sessions.ts 의 배열 대응을 함께 삭제
describe("세션 목록 — GET /sessions 가 예전처럼 전체 배열을 줄 때", () => {
  let legacy: string[];
  beforeEach(() => {
    legacy = [];
    server.use(
      http.get(`${API}/sessions`, ({ request }) => {
        legacy.push(new URL(request.url).searchParams.toString());
        return ok(SESSION_LIST);
      }),
    );
  });

  it("화면에서 10개씩 나눠 이어 붙이고, 끝에서 끝 안내가 보인다", async () => {
    const { scroll } = renderSessions();
    await screen.findByRole("heading", { level: 3, name: ROME.title });
    expect(cardTitles()).toEqual(titles(SESSION_LIST.slice(0, 10)));
    expect(await screen.findByText("전체 25개 세션 · 11개 즐겨찾기 · 3개 그룹")).toBeInTheDocument();

    scroll.toBottom();
    await waitFor(() => expect(cardTitles()).toEqual(titles(SESSION_LIST.slice(0, 20))));
    expect(screen.queryByText(END)).not.toBeInTheDocument();
    scroll.toBottom();
    await waitFor(() => expect(cardTitles()).toEqual(titles(SESSION_LIST)));
    expect(screen.getByText(END)).toBeInTheDocument();
    expect(legacy).toEqual([q(0), q(1), q(2)]);
  });

  it("즐겨찾기 보기는 화면에서 즐겨찾기만 걸러 10개씩 보여 준다", async () => {
    const { user, scroll } = renderSessions();
    await screen.findByRole("heading", { level: 3, name: ROME.title });
    await user.click(favFilter());
    await waitFor(() => expect(cardTitles()).toEqual(titles(FAVORITES.slice(0, 10))));
    expect(screen.getByText("전체 25개 세션 · 11개 즐겨찾기 · 3개 그룹")).toBeInTheDocument();

    scroll.toBottom();
    await waitFor(() => expect(cardTitles()).toEqual(titles(FAVORITES)));
    expect(screen.getByText(END)).toBeInTheDocument();
  });

  it("세션이 없으면 빈 상태 안내가 보인다", async () => {
    server.use(http.get(`${API}/sessions`, () => ok([])));
    renderSessions();
    expect(await screen.findByText("아직 세션이 없습니다")).toBeInTheDocument();
    expect(await screen.findByText("전체 0개 세션 · 0개 즐겨찾기 · 3개 그룹")).toBeInTheDocument();
  });
});

