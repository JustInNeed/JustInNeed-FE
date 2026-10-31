import { screen, within } from "@testing-library/react";
import { http } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { HomeResponse } from "@/lib/api";
import { EMPTY_HOME_RESPONSE, HOME_RESPONSE } from "@/test/fixtures/home";
import { API, fail, ok, server } from "@/test/msw/server";
import { renderPersonal } from "@/test/render";
import { mockRouter } from "@/test/router";
import HomePage from "./page";

// 마인드맵 포스 시뮬레이션(rAF)은 멈춰 두고 초기 좌표 그대로 그린다
beforeEach(() => {
  vi.spyOn(window, "requestAnimationFrame").mockReturnValue(0);
});

const mockHome = (body: HomeResponse = HOME_RESPONSE) => server.use(http.get(`${API}/home`, () => ok(body)));
const dashboard = async () => screen.findByText("누적 노드");
const statCard = (label: string) => screen.getByText(label).parentElement!;
const node = (label: string) => screen.getByText(label, { selector: "text" }).parentElement!;
const popover = () => screen.getByText("선택됨").parentElement!;
const relatedButton = () => within(popover()).getByRole("button", { name: "관련 세션 보기" });
const slot = (label: string) => screen.getByText(label).closest<HTMLElement>(".slot")!;
const chipsIn = (el: HTMLElement) => within(el).queryAllByRole("button").map((b) => b.textContent);
const sitesIn = (el: HTMLElement) => Array.from(el.querySelectorAll(".site")).map((s) => s.lastChild?.textContent);

describe("홈 페이지 — 불러오기", () => {
  it("불러오는 동안 '불러오는 중…'이 보이고, 받으면 대시보드로 바뀐다", async () => {
    let release = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    server.use(
      http.get(`${API}/home`, async () => {
        await gate;
        return ok(HOME_RESPONSE);
      }),
    );
    renderPersonal(<HomePage />);

    expect(screen.getByRole("heading", { name: "홈" })).toBeInTheDocument();
    expect(screen.getByText("불러오는 중…")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    release();
    await dashboard();
    expect(screen.queryByText("불러오는 중…")).not.toBeInTheDocument();
  });

  it("로그인 토큰을 붙여 요청한다", async () => {
    const authorization = vi.fn();
    server.use(
      http.get(`${API}/home`, ({ request }) => {
        authorization(request.headers.get("Authorization"));
        return ok(HOME_RESPONSE);
      }),
    );
    renderPersonal(<HomePage />);
    await dashboard();
    expect(authorization).toHaveBeenCalledExactlyOnceWith("Bearer test-access-token");
  });

  it("실패하면 서버 메시지와 '다시 시도'가 보이고, 누르면 다시 불러와 대시보드를 그린다", async () => {
    let calls = 0;
    server.use(
      http.get(`${API}/home`, () => (++calls === 1 ? fail(500, "홈 정보를 불러오지 못했어요.") : ok(HOME_RESPONSE))),
    );
    const { user } = renderPersonal(<HomePage />);

    expect(await screen.findByRole("alert")).toHaveTextContent("홈 정보를 불러오지 못했어요.");
    expect(screen.queryByText("누적 노드")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    await dashboard();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("홈 페이지 — 빈 응답", () => {
  it("세션도 노드도 없으면 빈 상태 하나만 보이고 대시보드는 그리지 않는다", async () => {
    mockHome(EMPTY_HOME_RESPONSE);
    renderPersonal(<HomePage />);
    expect(await screen.findByRole("status")).toHaveTextContent("아직 모인 탐색 기록이 없어요.");
    expect(screen.queryByText("누적 노드")).not.toBeInTheDocument();
    expect(screen.queryByText("불러오는 중…")).not.toBeInTheDocument();
  });

  it("노드가 없어도 세션이 있으면 대시보드를 그리고 그래프 자리에 안내가 보인다", async () => {
    mockHome({ ...EMPTY_HOME_RESPONSE, sessions: HOME_RESPONSE.sessions });
    renderPersonal(<HomePage />);
    await dashboard();
    expect(screen.getByRole("status")).toHaveTextContent("아직 그래프로 그릴 노드가 없어요.");
  });

  it("세션이 없어도 노드가 있으면 대시보드를 그린다", async () => {
    mockHome({ ...EMPTY_HOME_RESPONSE, graph: HOME_RESPONSE.graph });
    renderPersonal(<HomePage />);
    await dashboard();
    expect(node("로마")).toBeInTheDocument();
  });
});

describe("홈 페이지 — 응답 표시", () => {
  beforeEach(() => mockHome());

  it("통계 카드 · 이번 주 활동 · 상위 해시태그가 보인다", async () => {
    const { container } = renderPersonal(<HomePage />);
    await dashboard();

    expect(statCard("누적 노드")).toHaveTextContent("218+12해시태그 47개");
    expect(statCard("이번 주 세션")).toHaveTextContent("14+3평균 42분 / 세션");
    expect(statCard("Deep Reading")).toHaveTextContent("68%↑ 8%지난주 대비");

    expect(screen.getByText("10.25 — 10.31")).toBeInTheDocument();
    // 오늘(토)로 끝나는 최근 7일 — 받은 순서 그대로
    expect(Array.from(container.querySelectorAll(".barDay")).map((el) => el.textContent)).toEqual([
      "일",
      "월",
      "화",
      "수",
      "목",
      "금",
      "토",
    ]);
    expect(Array.from(container.querySelectorAll(".topTagRow")).map((r) => r.textContent)).toEqual(["#파리28", "#로마24"]);
  });

  it("오늘 타임라인에 시간대 · 해시태그 · 사이트가 보이고, 진행 중 슬롯은 '진행 중'으로 보인다", async () => {
    renderPersonal(<HomePage />);
    await dashboard();

    const done = slot("09:00 — 10:30");
    expect(chipsIn(done)).toEqual(["#자바", "#스프링"]);
    expect(sitesIn(done)).toEqual(["docs.spring.io", "velog.io"]);
    expect(Array.from(done.querySelectorAll(".siteIcon")).map((el) => el.textContent)).toEqual(["S", "V"]);

    expect(chipsIn(slot("21:10 — 진행 중"))).toEqual(["#파리"]);
  });

  it("마인드맵에 노드가 그려지고, 노드를 누르면 연결 수와 출처 수가 보인다", async () => {
    const { user } = renderPersonal(<HomePage />);
    await dashboard();

    expect(node("내 탐색").getAttribute("transform")).toBe("translate(550,350)");
    await user.click(node("로마"));
    // 로마 연결 2개, sessionId 9002 세션 페이지 11개
    expect(within(popover()).getByText("연결된 노드 2개 · 출처 11개")).toBeInTheDocument();
  });

  it("30일 지난 노드(seen: all)는 기간 '이번 달'에선 흐려지고 '전체'에선 그대로 보인다", async () => {
    const { user } = renderPersonal(<HomePage />);
    await dashboard();
    const applyPeriod = async (name: string) => {
      await user.click(screen.getByRole("button", { name: "필터" }));
      const dialog = screen.getByRole("dialog", { name: "그래프 필터" });
      await user.click(within(dialog).getByRole("radio", { name }));
      await user.click(within(dialog).getByRole("button", { name: "적용" }));
    };

    await applyPeriod("이번 달");
    expect(node("콜로세움")).toHaveStyle({ opacity: "0.25" });
    expect(node("항공권")).toHaveStyle({ opacity: "1" }); // seen: month

    await applyPeriod("전체");
    expect(node("콜로세움")).toHaveStyle({ opacity: "1" });
  });

  it("해시태그 칩으로 거르면 raw 태그가 맞는 노드만 남는다", async () => {
    const { user } = renderPersonal(<HomePage />);
    await dashboard();
    await user.click(screen.getByRole("button", { name: "필터" }));
    const dialog = screen.getByRole("dialog", { name: "그래프 필터" });
    expect(within(dialog).getByRole("checkbox", { name: "유럽 여행 노드 3" })).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "#파리" }));
    await user.click(within(dialog).getByRole("button", { name: "적용" }));

    expect(node("파리")).toHaveStyle({ opacity: "1" });
    expect(node("로마")).toHaveStyle({ opacity: "0.25" });
  });

  describe("이번 주 타임라인", () => {
    beforeEach(() => {
      // 오늘 = 2026-10-31 (토). 타이머는 진짜로 두고 날짜만 고정한다
      vi.useFakeTimers({ toFake: ["Date"], now: new Date(2026, 9, 31, 15, 0) });
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it("'이번 주'를 누르면 날짜별 대표 해시태그 · 사이트가 보인다", async () => {
      const { user } = renderPersonal(<HomePage />);
      await dashboard();
      await user.click(screen.getByRole("button", { name: "이번 주" }));

      const sun = slot("10/25 (일)");
      expect(chipsIn(sun)).toEqual(["#파리"]);
      expect(sitesIn(sun)).toEqual(["parisinfo.com", "skyscanner.net"]);
      expect(chipsIn(slot("10/31 (토)"))).toEqual(["#자바", "#스프링"]);
      expect(sitesIn(slot("10/31 (토)"))).toEqual(["docs.spring.io"]);
      expect(screen.getAllByText("기록 없음")).toHaveLength(5);
    });
  });

  describe("관련 세션 보기", () => {
    const openRelated = async (label: string) => {
      const { user } = renderPersonal(<HomePage />);
      await dashboard();
      await user.click(node(label));
      await user.click(relatedButton());
    };

    it("노드의 sessionId 세션 상세로 이동한다 (해시태그로 찾으면 다른 세션인 노드)", async () => {
      await openRelated("로마");
      expect(mockRouter.push).toHaveBeenCalledWith("/sessions/9002");
    });

    it("sessionId 세션이 응답 목록에 없으면 해시태그로 찾은 세션으로 이동한다", async () => {
      await openRelated("파리");
      expect(mockRouter.push).toHaveBeenCalledWith("/sessions/9003");
    });

    it("sessionId 가 null 이어도 해시태그로 찾은 세션으로 이동한다", async () => {
      await openRelated("항공권");
      expect(mockRouter.push).toHaveBeenCalledWith("/sessions/9002");
    });

    it("메타도 맞는 해시태그도 없는 노드는 세션 목록으로 이동한다", async () => {
      await openRelated("에펠탑");
      expect(mockRouter.push).toHaveBeenCalledWith("/sessions");
    });
  });
});
