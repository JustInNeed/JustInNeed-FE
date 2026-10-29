import { screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import HomePage from "@/app/(personal)/home/page";
import { EMPTY_HOME_DATA, HOME_DATA } from "@/test/fixtures/home";
import { renderPersonal } from "@/test/render";
import { HomeView } from "./HomeView";

// 마인드맵 포스 시뮬레이션(rAF)은 멈춰 두고 초기 좌표 그대로 그린다
beforeEach(() => {
  vi.spyOn(window, "requestAnimationFrame").mockReturnValue(0);
});

const statCard = (label: string) => screen.getByText(label).parentElement!;
const card = (title: string) => screen.getByRole("heading", { name: title }).closest<HTMLElement>(".colCard, .card")!;
const daySlot = (label: string) => screen.getByText(label).closest<HTMLElement>(".slot")!;
const chipsIn = (el: HTMLElement) => within(el).queryAllByRole("button").map((b) => b.textContent);
const sitesIn = (el: HTMLElement) => Array.from(el.querySelectorAll(".site")).map((s) => s.lastChild?.textContent);

describe("홈 대시보드", () => {
  it("통계 카드에 누적 노드 · 이번 주 세션 · Deep Reading 값이 보인다", () => {
    renderPersonal(<HomeView data={HOME_DATA} />);
    expect(statCard("누적 노드")).toHaveTextContent("218+12해시태그 47개");
    expect(statCard("이번 주 세션")).toHaveTextContent("14+3평균 42분 / 세션");
    expect(statCard("Deep Reading")).toHaveTextContent("68%↑ 8%지난주 대비");
  });

  it("지난주보다 줄었으면 감소로, 변화가 없으면 증감 없이 보인다", () => {
    const stats = { ...HOME_DATA.stats, nodeDelta: -2, sessionDelta: 0, deepReadingDelta: -5 };
    renderPersonal(<HomeView data={{ ...HOME_DATA, stats }} />);
    expect(statCard("누적 노드")).toHaveTextContent("218-2해시태그");
    expect(statCard("이번 주 세션")).toHaveTextContent(/^이번 주 세션14평균/);
    expect(statCard("Deep Reading")).toHaveTextContent("68%↓ 5%");
  });

  it("이번 주 활동에 기간과 요일별 탐색 시간이 보이고, 가장 긴 요일 막대가 꽉 찬다", () => {
    renderPersonal(<HomeView data={HOME_DATA} />);
    const activity = card("이번 주 활동");
    expect(within(activity).getByText("4.20 — 4.26")).toBeInTheDocument();
    const values = Array.from(activity.querySelectorAll(".barValue")).map((el) => el.textContent);
    expect(values).toEqual(["38m", "1h 34m", "1h 7m", "1h 50m", "1h 17m", "2h 0m", "58m"]);
    const bar = (day: string) => within(activity).getByText(day).parentElement!.querySelector(".bar");
    expect(bar("토")).toHaveStyle({ height: "100%" });
    expect(bar("목")).toHaveStyle({ height: `${(110 / 120) * 100}%` });
  });

  it("상위 해시태그 10개가 개수와 함께 많은 순으로 보인다", () => {
    renderPersonal(<HomeView data={HOME_DATA} />);
    const rows = Array.from(card("상위 해시태그").querySelectorAll(".topTagRow")).map((r) => r.textContent);
    expect(rows).toEqual([
      "#파리28",
      "#로마24",
      "#항공권18",
      "#미술관15",
      "#예산11",
      "#일정9",
      "#식당예약8",
      "#교통권7",
      "#환전6",
      "#숨겨진명소5",
    ]);
  });

  it("오늘의 탐색 타임라인에 시간대별 해시태그와 방문 사이트가 보인다", () => {
    renderPersonal(<HomeView data={HOME_DATA} />);
    expect(screen.getByRole("heading", { name: "오늘의 탐색 타임라인" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "오늘" })).toHaveAttribute("aria-pressed", "true");
    const times = HOME_DATA.todayTimeline.map((s) => s.time);
    expect(times).toHaveLength(5);
    times.forEach((t) => expect(screen.getByText(t)).toBeInTheDocument());

    const slot = daySlot("10:30 — 12:00");
    expect(chipsIn(slot)).toEqual(["#자바", "#스프링", "#JPA"]);
    expect(sitesIn(slot)).toEqual(["docs.spring.io", "baeldung.com", "stackoverflow"]);
  });

  describe("타임라인 '이번 주'", () => {
    beforeEach(() => {
      // 오늘 = 2026-04-26 (일). 타이머는 진짜로 두고 날짜만 고정한다
      vi.useFakeTimers({ toFake: ["Date"], now: new Date(2026, 3, 26, 15, 0) });
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it("'이번 주'를 누르면 최근 7일이 날짜 (요일)로 보이고 오늘 표시가 붙는다", async () => {
      const { user } = renderPersonal(<HomeView data={HOME_DATA} />);
      await user.click(screen.getByRole("button", { name: "이번 주" }));

      expect(screen.getByRole("heading", { name: "이번 주 탐색 타임라인" })).toBeInTheDocument();
      expect(screen.getByText("요일별 대표 해시태그 · 방문 사이트")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "이번 주" })).toHaveAttribute("aria-pressed", "true");
      const labels = ["4/20 (월)", "4/21 (화)", "4/22 (수)", "4/23 (목)", "4/24 (금)", "4/25 (토)", "4/26 (일)"];
      labels.forEach((l) => expect(screen.getByText(l)).toBeInTheDocument());
      expect(within(daySlot("4/26 (일)")).getByText("오늘")).toBeInTheDocument();
      expect(within(daySlot("4/25 (토)")).queryByText("오늘")).not.toBeInTheDocument();
    });

    it("기록이 없는 날은 '기록 없음'으로 보인다", async () => {
      const { user } = renderPersonal(<HomeView data={HOME_DATA} />);
      await user.click(screen.getByRole("button", { name: "이번 주" }));
      expect(within(daySlot("4/21 (화)")).getByText("기록 없음")).toBeInTheDocument();
      expect(screen.getAllByText("기록 없음")).toHaveLength(1);
    });

    it("날마다 대표 해시태그 · 사이트를 3개까지 보여준다", async () => {
      const { user } = renderPersonal(<HomeView data={HOME_DATA} />);
      await user.click(screen.getByRole("button", { name: "이번 주" }));
      const mon = daySlot("4/20 (월)");
      expect(chipsIn(mon)).toEqual(["#파리", "#일정", "#항공권"]);
      expect(sitesIn(mon)).toEqual(["parisinfo.com", "skyscanner.net", "naver.com/blog"]);
      const fri = daySlot("4/24 (금)");
      expect(chipsIn(fri)).toEqual(["#로마", "#먹거리", "#콜로세움"]);
      expect(sitesIn(fri)).toEqual(["naver.com/blog", "tripadvisor.co.kr"]);
    });

    it("'오늘'을 다시 누르면 시간대별 타임라인으로 돌아온다", async () => {
      const { user } = renderPersonal(<HomeView data={HOME_DATA} />);
      await user.click(screen.getByRole("button", { name: "이번 주" }));
      await user.click(screen.getByRole("button", { name: "오늘" }));
      expect(screen.getByRole("heading", { name: "오늘의 탐색 타임라인" })).toBeInTheDocument();
      expect(screen.getByText("09:00 — 10:30")).toBeInTheDocument();
      expect(screen.queryByText("4/20 (월)")).not.toBeInTheDocument();
    });
  });
});

describe("홈 데이터 없음 · 불러오기 실패", () => {
  it("데이터가 없으면(null) 빈 상태 하나만 보이고 대시보드는 그리지 않는다", () => {
    renderPersonal(<HomeView data={null} />);
    const empty = screen.getByRole("status");
    expect(empty).toHaveTextContent("아직 모인 탐색 기록이 없어요.");
    expect(empty).toHaveTextContent("확장 프로그램이 탐색 세션을 모으면 마인드맵과 통계가 여기에 보여요.");
    expect(screen.queryByText("누적 노드")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "필터" })).not.toBeInTheDocument();
  });

  it("홈 페이지는 아직 홈 API 가 없어 빈 상태로 보인다", () => {
    renderPersonal(<HomePage />);
    expect(screen.getByRole("heading", { name: "홈" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("아직 모인 탐색 기록이 없어요.");
  });

  it("불러오기에 실패하면 오류 메시지와 '다시 시도'가 보이고, 누르면 onRetry 가 호출된다", async () => {
    const onRetry = vi.fn();
    const { user } = renderPersonal(<HomeView data={null} error="홈 정보를 불러오지 못했어요." onRetry={onRetry} />);
    expect(screen.getByRole("alert")).toHaveTextContent("홈 정보를 불러오지 못했어요.");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("처음 불러오는 중에는 '불러오는 중…'만 보인다", () => {
    renderPersonal(<HomeView data={null} loading />);
    expect(screen.getByText("불러오는 중…")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("다시 불러오는 중에도 이미 받은 데이터는 그대로 보인다", () => {
    renderPersonal(<HomeView data={HOME_DATA} loading />);
    expect(screen.queryByText("불러오는 중…")).not.toBeInTheDocument();
    expect(statCard("누적 노드")).toHaveTextContent("218");
  });

  describe("데이터는 왔지만 비어 있으면", () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ["Date"], now: new Date(2026, 3, 26, 15, 0) });
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it("통계는 0, 활동 막대는 0m, 그래프 · 해시태그 · 타임라인은 안내 문구로 보인다", async () => {
      const { user } = renderPersonal(<HomeView data={EMPTY_HOME_DATA} />);
      expect(statCard("누적 노드")).toHaveTextContent(/^누적 노드0해시태그 0개$/);
      expect(statCard("이번 주 세션")).toHaveTextContent(/^이번 주 세션0평균 0분 \/ 세션$/);
      expect(statCard("Deep Reading")).toHaveTextContent(/^Deep Reading0%지난주 대비$/);

      expect(screen.getByRole("status")).toHaveTextContent("아직 그래프로 그릴 노드가 없어요.");
      expect(screen.queryByRole("button", { name: "필터" })).not.toBeInTheDocument();

      const activity = card("이번 주 활동");
      expect(within(activity).getAllByText("0m")).toHaveLength(7);
      activity.querySelectorAll(".bar").forEach((bar) => expect(bar).toHaveStyle({ height: "0%" }));

      expect(screen.getByText("아직 모인 해시태그가 없어요.")).toBeInTheDocument();
      expect(screen.getByText("오늘은 아직 수집된 기록이 없어요.")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "이번 주" }));
      expect(screen.getAllByText("기록 없음")).toHaveLength(7);
    });
  });
});
