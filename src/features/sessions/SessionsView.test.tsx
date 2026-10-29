import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http } from "msw";
import { beforeEach, describe, expect, it } from "vitest";
import SessionsPage from "@/app/(personal)/sessions/page";
import type { SessionListItem, SessionUpdateRequest } from "@/lib/api";
import { MANY_TAGS_SESSION, SESSION_LIST, TAG_GROUPS, sessionById } from "@/test/fixtures/sessions";
import { API, fail, ok, server } from "@/test/msw/server";
import { renderPersonal } from "@/test/render";
import { mockRouter } from "@/test/router";
import { SessionsView } from "./SessionsView";

const ROME = sessionById(9001);
const FLIGHTS = sessionById(9002);
const FAVORITES = SESSION_LIST.filter((s) => s.isFavorite);

let calls: { sessions: number; groups: number };

beforeEach(() => {
  calls = { sessions: 0, groups: 0 };
  server.use(
    http.get(`${API}/sessions`, () => {
      calls.sessions += 1;
      return ok(SESSION_LIST);
    }),
    http.get(`${API}/tag-groups`, () => {
      calls.groups += 1;
      return ok(TAG_GROUPS);
    }),
  );
});

/** 보이는 카드 제목 (카드마다 h3 하나) */
const cardTitles = () => screen.queryAllByRole("heading", { level: 3 }).map((h) => h.textContent);

const card = (title: string) => screen.getByRole("heading", { level: 3, name: title }).closest<HTMLElement>('[role="button"]')!;

const starOf = (title: string) => within(card(title)).getByRole("button", { name: "즐겨찾기" });

/** 별 아이콘이 채워져 있는지 (starFilled 만 fill=currentColor) */
const isFilled = (el: HTMLElement) => el.querySelector("path")?.getAttribute("fill") === "currentColor";

/** 머리말의 '즐겨찾기' 필터 버튼 (카드의 별 버튼은 글자가 없다) */
const favFilter = () => screen.getByText("즐겨찾기", { selector: "button" });

/**
 * jsdom 은 레이아웃이 없어 스크롤 영역 크기를 직접 정한다.
 * 카드 한 장 100px, 보이는 높이 500px, scrollTop 은 브라우저처럼 끝을 넘지 않는다.
 * 데이터가 오기 전에 붙여야 "처음 10개가 화면을 못 채우면 더 그림" 로직이 jsdom 의 0 크기에 속지 않는다.
 */
function fakeScrollBox(container: HTMLElement) {
  const body = container.querySelector<HTMLElement>(".body")!;
  const height = () => body.querySelectorAll('[role="button"]').length * 100;
  let top = 0;
  Object.defineProperties(body, {
    clientHeight: { configurable: true, get: () => 500 },
    scrollHeight: { configurable: true, get: height },
    scrollTop: {
      configurable: true,
      get: () => Math.min(top, Math.max(0, height() - 500)),
      set: (v: number) => {
        top = v;
      },
    },
  });
  const scrollTo = (v: number) => {
    body.scrollTop = v;
    fireEvent.scroll(body);
  };
  return {
    toBottom: () => scrollTo(height()),
    toTop: () => scrollTo(0),
  };
}

function renderList() {
  const view = renderPersonal(<SessionsView />);
  const scroll = fakeScrollBox(view.container);
  return { ...view, scroll };
}

describe("세션 목록 — 불러오기", () => {
  it("불러오는 동안 안내가 보이고, 받아 오면 카드가 보인다", async () => {
    renderList();
    expect(screen.getByText("불러오는 중…")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { level: 3, name: ROME.title })).toBeInTheDocument();
    expect(screen.queryByText("불러오는 중…")).not.toBeInTheDocument();
    expect(calls).toEqual({ sessions: 1, groups: 1 });
  });

  it("세션 목록 라우트도 같은 화면을 그린다", async () => {
    renderPersonal(<SessionsPage />);
    expect(await screen.findByRole("heading", { level: 1, name: "세션 목록" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { level: 3, name: ROME.title })).toBeInTheDocument();
  });

  it("머리말에 전체 세션 · 즐겨찾기 · 그룹 개수가 보인다", async () => {
    renderList();
    expect(await screen.findByText("전체 25개 세션 · 11개 즐겨찾기 · 3개 그룹")).toBeInTheDocument();
  });

  it("세션이 하나도 없으면 빈 상태 안내가 보인다", async () => {
    server.use(http.get(`${API}/sessions`, () => ok([])));
    renderList();
    expect(await screen.findByText("아직 세션이 없습니다")).toBeInTheDocument();
    expect(screen.getByText("확장 프로그램으로 웹 탐색을 수집하면 세션이 여기에 쌓여요.")).toBeInTheDocument();
    expect(screen.queryByText("모든 기록을 확인했습니다.")).not.toBeInTheDocument();
  });

  it("목록을 못 불러오면 서버 메시지와 다시 시도 버튼이 보이고, 다시 시도하면 카드가 보인다", async () => {
    let attempt = 0;
    server.use(
      http.get(`${API}/sessions`, () => {
        attempt += 1;
        return attempt === 1 ? fail(500, "일시적인 오류가 발생했습니다.") : ok(SESSION_LIST);
      }),
    );
    const { user } = renderList();
    expect(await screen.findByRole("alert")).toHaveTextContent("일시적인 오류가 발생했습니다.");

    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(await screen.findByRole("heading", { level: 3, name: ROME.title })).toBeInTheDocument();
    expect(attempt).toBe(2);
  });
});

describe("세션 목록 — 카드", () => {
  it("카드에 제목 · 걸린 시간 · URL 수 · 날짜 · 해시태그가 보인다", async () => {
    renderList();
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
    renderList();
    await screen.findByRole("heading", { level: 3, name: MANY_TAGS_SESSION.title });
    const chips = within(card(MANY_TAGS_SESSION.title)).getAllByRole("button", { name: /^#/ });
    expect(chips.map((b) => b.textContent)).toEqual(["#리스본", "#포르투", "#에그타르트", "#트램"]);
  });

  it("아직 분석 중인 세션은 걸린 시간 대신 '분석 중' 이 보인다", async () => {
    renderList();
    await screen.findByRole("heading", { level: 3, name: "빈 클래식 공연 예매" });
    expect(within(card("빈 클래식 공연 예매")).getByText("분석 중")).toBeInTheDocument();
  });

  it("즐겨찾기한 세션은 별이 채워져 있다", async () => {
    renderList();
    await screen.findByRole("heading", { level: 3, name: ROME.title });
    expect(isFilled(starOf(ROME.title))).toBe(true);
    expect(isFilled(starOf(FLIGHTS.title))).toBe(false);
  });

  it("카드를 누르면 그 세션 상세로 이동한다", async () => {
    const { user } = renderList();
    await screen.findByRole("heading", { level: 3, name: FLIGHTS.title });
    await user.click(card(FLIGHTS.title));
    expect(mockRouter.push).toHaveBeenCalledWith("/sessions/9002");
  });

  it("카드에 포커스를 두고 Enter 나 Space 를 누르면 상세로 이동한다", async () => {
    const { user } = renderList();
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
    const { user } = renderList();
    await screen.findByRole("heading", { level: 3, name: ROME.title });
    // 머리말 버튼 2개 다음이 첫 카드
    await user.tab();
    await user.tab();
    await user.tab();
    expect(card(ROME.title)).toHaveFocus();
  });
});

describe("세션 목록 — 즐겨찾기 별", () => {
  function onPatch(respond: (id: number, body: SessionUpdateRequest) => Response | Promise<Response>) {
    const requests: { id: number; body: SessionUpdateRequest }[] = [];
    server.use(
      http.patch(`${API}/sessions/:id`, async ({ request, params }) => {
        const id = Number(params.id);
        const body = (await request.json()) as SessionUpdateRequest;
        requests.push({ id, body });
        return respond(id, body);
      }),
    );
    return requests;
  }

  it("별을 누르면 바로 채워지고 PATCH /sessions/{id} 에 { isFavorite: true } 를 보낸다", async () => {
    const requests = onPatch((id, body) => ok({ ...sessionById(id), ...body, summary: null, sources: [] }));
    const { user } = renderList();
    await screen.findByRole("heading", { level: 3, name: FLIGHTS.title });

    await user.click(starOf(FLIGHTS.title));
    expect(isFilled(starOf(FLIGHTS.title))).toBe(true);
    expect(screen.getByText("전체 25개 세션 · 12개 즐겨찾기 · 3개 그룹")).toBeInTheDocument();
    await waitFor(() => expect(requests).toEqual([{ id: 9002, body: { isFavorite: true } }]));
    // 별을 눌러도 카드가 열리지 않는다
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it("즐겨찾기를 바꾸면 그룹 보기의 즐겨찾기 표시도 맞추려고 그룹을 다시 불러온다", async () => {
    onPatch((id, body) => ok({ ...sessionById(id), ...body, summary: null, sources: [] }));
    const { user } = renderList();
    await screen.findByRole("heading", { level: 3, name: ROME.title });

    await user.click(starOf(ROME.title));
    await waitFor(() => expect(calls.groups).toBe(2));
    expect(isFilled(starOf(ROME.title))).toBe(false);
  });

  it("별 버튼에서 Enter 를 누르면 카드는 열리지 않고 즐겨찾기만 바뀐다", async () => {
    const requests = onPatch((id, body) => ok({ ...sessionById(id), ...body, summary: null, sources: [] }));
    const { user } = renderList();
    await screen.findByRole("heading", { level: 3, name: FLIGHTS.title });

    starOf(FLIGHTS.title).focus();
    await user.keyboard("{Enter}");
    await waitFor(() => expect(requests).toEqual([{ id: 9002, body: { isFavorite: true } }]));
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it("서버가 실패하면 별을 원래대로 되돌리고 서버 메시지를 토스트로 띄운다", async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    onPatch(async () => {
      await gate;
      return fail(500, "즐겨찾기를 바꾸지 못했어요.");
    });
    const { user } = renderList();
    await screen.findByRole("heading", { level: 3, name: FLIGHTS.title });

    await user.click(starOf(FLIGHTS.title));
    expect(isFilled(starOf(FLIGHTS.title))).toBe(true); // 응답 전 — 낙관적 반영
    release();

    expect(await screen.findByText("즐겨찾기를 바꾸지 못했어요.")).toBeInTheDocument();
    expect(isFilled(starOf(FLIGHTS.title))).toBe(false);
    expect(screen.getByText("전체 25개 세션 · 11개 즐겨찾기 · 3개 그룹")).toBeInTheDocument();
    expect(calls.groups).toBe(1); // 실패하면 그룹은 다시 부르지 않는다
  });
});

describe("세션 목록 — 무한 스크롤", () => {
  it("세션이 25개면 처음엔 10개만 보이고 스크롤하면 10개씩 더 보인다", async () => {
    const { scroll } = renderList();
    await screen.findByRole("heading", { level: 3, name: ROME.title });
    expect(cardTitles()).toEqual(SESSION_LIST.slice(0, 10).map((s) => s.title));
    expect(screen.queryByText("모든 기록을 확인했습니다.")).not.toBeInTheDocument();

    scroll.toBottom();
    await waitFor(() => expect(cardTitles()).toHaveLength(20));
    expect(cardTitles()).toEqual(SESSION_LIST.slice(0, 20).map((s) => s.title));
    expect(screen.queryByText("모든 기록을 확인했습니다.")).not.toBeInTheDocument();

    scroll.toBottom();
    await waitFor(() => expect(cardTitles()).toHaveLength(25));
    expect(screen.getByText("모든 기록을 확인했습니다.")).toBeInTheDocument();
  });

  it("스크롤이 80% 지점에 못 미치면 더 그리지 않는다", async () => {
    const { container } = renderList();
    await screen.findByRole("heading", { level: 3, name: ROME.title });
    const body = container.querySelector<HTMLElement>(".body")!;
    body.scrollTop = 200; // 200 + 500 < 1000 * 0.8
    fireEvent.scroll(body);
    expect(cardTitles()).toHaveLength(10);
  });

  it("세션이 10개 이하면 처음부터 끝 안내가 보인다", async () => {
    server.use(http.get(`${API}/sessions`, () => ok(SESSION_LIST.slice(0, 7))));
    renderList();
    await screen.findByRole("heading", { level: 3, name: ROME.title });
    expect(cardTitles()).toHaveLength(7);
    expect(screen.getByText("모든 기록을 확인했습니다.")).toBeInTheDocument();
  });

  it("첫 10개가 화면을 다 못 채우면 스크롤이 생길 때까지 이어서 그린다", async () => {
    const view = renderPersonal(<SessionsView />);
    const body = view.container.querySelector<HTMLElement>(".body")!;
    // 보이는 높이가 카드 15장(1500px) 정도로 크면 → 20장까지 그려야 스크롤이 생긴다
    Object.defineProperties(body, {
      clientHeight: { configurable: true, get: () => 1500 },
      scrollHeight: { configurable: true, get: () => body.querySelectorAll('[role="button"]').length * 100 },
      scrollTop: { configurable: true, get: () => 0 },
    });
    await waitFor(() => expect(cardTitles()).toHaveLength(20));
  });
});

describe("세션 목록 — 즐겨찾기 필터", () => {
  it("즐겨찾기를 켜면 즐겨찾기한 세션만 보이고 버튼이 눌린 상태가 된다", async () => {
    const { user, scroll } = renderList();
    await screen.findByRole("heading", { level: 3, name: ROME.title });

    await user.click(favFilter());
    expect(favFilter()).toHaveClass("active");
    expect(cardTitles()).toEqual(FAVORITES.slice(0, 10).map((s) => s.title));
    scroll.toBottom();
    await waitFor(() => expect(cardTitles()).toEqual(FAVORITES.map((s) => s.title)));
    expect(screen.getByText("모든 기록을 확인했습니다.")).toBeInTheDocument();
  });

  it("스크롤로 20개까지 본 뒤 즐겨찾기를 켜면 다시 10개부터 보인다", async () => {
    const { user, scroll } = renderList();
    await screen.findByRole("heading", { level: 3, name: ROME.title });
    scroll.toBottom();
    await waitFor(() => expect(cardTitles()).toHaveLength(20));
    scroll.toTop();

    await user.click(favFilter());
    expect(cardTitles()).toHaveLength(10);
    expect(cardTitles().every((t) => FAVORITES.some((f) => f.title === t))).toBe(true);
  });

  it("즐겨찾기를 다시 끄면 전체 목록이 10개부터 보인다", async () => {
    const { user } = renderList();
    await screen.findByRole("heading", { level: 3, name: ROME.title });
    await user.click(favFilter());
    await user.click(favFilter());
    expect(favFilter()).not.toHaveClass("active");
    expect(cardTitles()).toEqual(SESSION_LIST.slice(0, 10).map((s) => s.title));
  });

  it("즐겨찾기한 세션이 없으면 별을 눌러 보라고 안내한다", async () => {
    const none: SessionListItem[] = SESSION_LIST.map((s) => ({ ...s, isFavorite: false }));
    server.use(http.get(`${API}/sessions`, () => ok(none)));
    const { user } = renderList();
    await screen.findByRole("heading", { level: 3, name: ROME.title });

    await user.click(favFilter());
    expect(screen.getByText("즐겨찾기한 세션이 없습니다")).toBeInTheDocument();
    expect(screen.getByText("세션 카드의 별을 눌러 즐겨찾기에 추가해보세요.")).toBeInTheDocument();
  });

  it("즐겨찾기 필터에서 별을 끄면 그 카드가 목록에서 빠진다", async () => {
    server.use(http.patch(`${API}/sessions/:id`, () => ok(null)));
    const { user } = renderList();
    await screen.findByRole("heading", { level: 3, name: ROME.title });
    await user.click(favFilter());

    await user.click(starOf(ROME.title));
    expect(screen.queryByRole("heading", { level: 3, name: ROME.title })).not.toBeInTheDocument();
    expect(screen.getByText("전체 25개 세션 · 10개 즐겨찾기 · 3개 그룹")).toBeInTheDocument();
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
    const { user } = renderList();
    await screen.findByRole("heading", { level: 3, name: ROME.title });
    const toggle = screen.getByRole("button", { name: "해시태그" });

    await user.click(toggle);
    expect(toggle).toHaveClass("active");
    expect(sectionHeads()).toEqual([["#로마", "#콜로세움"], ["#항공권", "#예산"], ["#React", "#TypeScript"]]);
    expect(screen.queryByText("모든 기록을 확인했습니다.")).not.toBeInTheDocument();

    await user.click(toggle);
    expect(toggle).not.toHaveClass("active");
    expect(sectionHeads()).toEqual([]);
    expect(cardTitles()).toHaveLength(10);
  });

  it("즐겨찾기를 켠 채 그룹 보기로 가면 그룹마다 즐겨찾기한 세션만 남는다", async () => {
    const { user } = renderList();
    await screen.findByRole("heading", { level: 3, name: ROME.title });
    await user.click(favFilter());
    await user.click(screen.getByRole("button", { name: "해시태그" }));

    // 그룹 보기에서는 즐겨찾기 버튼이 눌린 표시가 꺼진다
    expect(favFilter()).not.toHaveClass("active");
    const counts = Array.from(document.querySelectorAll(".groupCount")).map((el) => el.textContent);
    expect(counts).toEqual(["1개 세션", "1개 세션", "0개 세션"]);
  });

  it("그룹 보기에서 즐겨찾기를 누르면 목록 보기로 돌아온다", async () => {
    const { user } = renderList();
    await screen.findByRole("heading", { level: 3, name: ROME.title });
    await user.click(screen.getByRole("button", { name: "해시태그" }));

    await user.click(favFilter());
    expect(favFilter()).toHaveClass("active");
    expect(screen.getByRole("button", { name: "해시태그" })).not.toHaveClass("active");
    expect(cardTitles()).toEqual(FAVORITES.slice(0, 10).map((s) => s.title));
  });
});
