import { act, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { UseApiResult } from "@/lib/hooks/useApi";
import {
  CATEGORIES,
  EXPLORATION,
  READING_BEHAVIOR,
  RECOMMENDATIONS,
  TIME_PATTERNS,
  WEEK_SESSIONS,
} from "@/test/fixtures/analytics";
import { renderPersonal } from "@/test/render";
import { AnalyticsView, type AnalyticsCards } from "./AnalyticsView";
import { SURFING_TIPS } from "./surfingTips";

/** 정해 둔 값을 차례로 돌려주는 난수 — 배너는 세션 · 팁 · 추천 순서로 하나씩 뽑는다 */
const sequence = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};
const ready = <T,>(data: T): UseApiResult<T> => ({ data, loading: false, error: null, refetch: vi.fn() });
const noData = <T,>(): UseApiResult<T> => ({ data: null, loading: false, error: null, refetch: vi.fn() });
const loading = <T,>(): UseApiResult<T> => ({ data: null, loading: true, error: null, refetch: vi.fn() });
const failed = <T,>(error: string, refetch = vi.fn()): UseApiResult<T> => ({ data: null, loading: false, error, refetch });

const CARDS: AnalyticsCards = {
  weekSessions: ready(WEEK_SESSIONS),
  exploration: ready(EXPLORATION),
  readingBehavior: ready(READING_BEHAVIOR),
  categories: ready(CATEGORIES),
  timePatterns: ready(TIME_PATTERNS),
  recommendations: ready(RECOMMENDATIONS),
};
const NO_DATA: AnalyticsCards = {
  weekSessions: ready({ sessions: [] }),
  exploration: noData(),
  readingBehavior: noData(),
  categories: noData(),
  timePatterns: noData(),
  recommendations: ready({ recommendations: [] }),
};
const ALL_LOADING: AnalyticsCards = {
  weekSessions: loading(),
  exploration: loading(),
  readingBehavior: loading(),
  categories: loading(),
  timePatterns: loading(),
  recommendations: loading(),
};

// 기본: 세션 7개 중 3번(9004) · 팁 3개 중 0번 · 추천 3개 중 2번
const setup = (cards: Partial<AnalyticsCards> = {}, random = sequence(0.5, 0, 0.99)) =>
  renderPersonal(<AnalyticsView cards={{ ...CARDS, ...cards }} random={random} />);
const dot = (n: number) => screen.getByRole("button", { name: `슬라이드 ${n}` });
const cardOf = (title: string) => screen.getByRole("heading", { name: title }).closest<HTMLElement>(".card")!;
const heatBlock = (label: string) => screen.getByText(label).closest(".heatHead")!.parentElement!;

describe("롤링 배너", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("'이번 주 인사이트'는 난수로 고른 이번 주 세션의 제목 · 날짜 · 길이 · 해시태그를 보여준다", () => {
    setup();
    expect(screen.getByText("이번 주 인사이트")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "유레일패스 vs 개별 구매" })).toBeInTheDocument();
    expect(screen.getByText("2026-04-23 · 39분 · #유레일 #예산 #기차")).toBeInTheDocument();
    expect(dot(1)).toHaveAttribute("aria-current", "true");
  });

  it("인사이트 해시태그는 앞의 3개까지만 보여준다", () => {
    setup({}, sequence(0));
    expect(screen.getByRole("heading", { name: "로마 3박 4일 동선 짜기" })).toBeInTheDocument();
    expect(screen.getByText("2026-04-26 · 1시간 34분 · #로마 #콜로세움 #바티칸")).toBeInTheDocument();
  });

  it("웹 서핑 팁과 추천 행동도 각 목록에서 난수로 하나씩 고른다", async () => {
    const { user } = setup();
    await user.click(dot(2));
    expect(screen.getByText("오늘의 웹 서핑 팁")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: SURFING_TIPS[0].title })).toBeInTheDocument();
    expect(screen.getByText(SURFING_TIPS[0].body)).toBeInTheDocument();

    await user.click(dot(3));
    expect(screen.getByText("오늘의 추천 행동")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "특정 사이트에 정보 탐색이 몰려 있어요." })).toBeInTheDocument();
    expect(dot(3)).toHaveAttribute("aria-current", "true");
    expect(dot(1)).toHaveAttribute("aria-current", "false");
  });

  it("난수가 1이어도 목록 마지막 항목을 고른다", () => {
    setup({}, () => 1);
    expect(screen.getByRole("heading", { name: "프라하 1박 일정 짜기" })).toBeInTheDocument();
  });

  it("5초마다 다음 슬라이드로 넘어가고, 마지막 다음엔 처음으로 돌아온다", () => {
    vi.useFakeTimers();
    setup();
    expect(screen.getByText("이번 주 인사이트")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(4999));
    expect(screen.getByText("이번 주 인사이트")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByText("오늘의 웹 서핑 팁")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText("오늘의 추천 행동")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText("이번 주 인사이트")).toBeInTheDocument();
    expect(dot(1)).toHaveAttribute("aria-current", "true");
  });

  it("이번 주 세션이 없으면 인사이트 없이 팁 · 추천 두 장만 보여준다", () => {
    setup({ weekSessions: ready({ sessions: [] }) });
    expect(screen.queryByText("이번 주 인사이트")).not.toBeInTheDocument();
    expect(screen.getByText("오늘의 웹 서핑 팁")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^슬라이드/ })).toHaveLength(2);
  });

  it("보여줄 후보가 하나도 없으면 배너를 그리지 않는다", () => {
    renderPersonal(
      <AnalyticsView
        cards={{ ...CARDS, weekSessions: ready({ sessions: [] }), recommendations: ready({ recommendations: [] }) }}
        tips={[]}
      />,
    );
    expect(screen.queryByRole("button", { name: /^슬라이드/ })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "탐색 성향" })).toBeInTheDocument();
  });
});

describe("분석 카드", () => {
  it("탐색 성향 통계와 분석 · 추천 문구가 보인다", () => {
    setup();
    const card = cardOf("탐색 성향");
    const rows = Array.from(card.querySelectorAll(".statRow")).map((r) => r.textContent);
    expect(rows).toEqual(["세션 평균 URL12개", "평균 페이지 체류42초", "평균 세션 길이1시간 14분"]);
    expect(within(card).getByText(EXPLORATION.note.analysis)).toBeInTheDocument();
    expect(within(card).getByText(EXPLORATION.note.recommendation!)).toBeInTheDocument();
  });

  it("체류 시간은 1분이 넘으면 분 · 초로, 세션 길이는 1시간이 안 되면 분으로 보인다", () => {
    setup({ exploration: ready({ ...EXPLORATION, avgUrlsPerSession: 3, avgDwellSec: 90, avgSessionMinutes: 39 }) });
    const rows = Array.from(cardOf("탐색 성향").querySelectorAll(".statRow")).map((r) => r.textContent);
    expect(rows).toEqual(["세션 평균 URL3개", "평균 페이지 체류1분 30초", "평균 세션 길이39분"]);
  });

  it("읽기 행동 분포는 Deep Reading · Reading · Scanning · Idle 순서로 비율과 함께 보인다", () => {
    setup();
    const card = cardOf("읽기 행동 분포");
    const legend = Array.from(card.querySelectorAll(".legendRow")).map((r) => r.textContent);
    expect(legend).toEqual(["Deep Reading42%", "Reading26%", "Scanning22%", "Idle10%"]);
    expect(within(card).getByTitle("Deep Reading 42%")).toHaveStyle({ width: "42%" });
    expect(within(card).getByTitle("Idle 10%")).toHaveStyle({ width: "10%" });
  });

  it("분석 문구의 **강조** 부분은 강조 글씨로, 표시 기호 없이 보인다", () => {
    setup();
    const strong = within(cardOf("읽기 행동 분포")).getByText("Deep Reading 비중 42%");
    expect(strong.tagName).toBe("STRONG");
    expect(strong.parentElement).toHaveTextContent("한 번 읽기 시작하면 깊이 있게 이해하는 편입니다. Deep Reading 비중 42%로 가장 높아요.");
    expect(screen.queryByText(/\*\*/)).not.toBeInTheDocument();
  });

  it("카테고리별 방문 비율이 비율 · 횟수와 막대 길이로 보인다", () => {
    setup();
    const card = cardOf("카테고리별 방문 비율");
    const rows = Array.from(card.querySelectorAll(".catHead")).map((r) => r.textContent);
    expect(rows).toEqual(["블로그42% · 89회", "공식문서28% · 60회", "커뮤니티18% · 38회", "뉴스8% · 17회", "기타4% · 9회"]);
    expect(card.querySelector(".catBar")).toHaveStyle({ width: "42%" });
    expect(within(card).getByText("블로그", { selector: "strong" })).toBeInTheDocument();
  });

  it("히트맵 칸에 마우스를 올리면 요일 · 시간 · 비율 툴팁이 보인다", () => {
    setup();
    const surfing = heatBlock("웹서핑 다빈도");
    const focus = heatBlock("집중 시간 (Deep + Reading)");
    expect(surfing.querySelectorAll(".heatCell")).toHaveLength(56);
    expect(focus.querySelectorAll(".heatCell")).toHaveLength(56);
    expect(within(focus).getByTitle("월 09시 — 95%")).toBeInTheDocument();
    expect(within(surfing).getByTitle("월 15시 — 80%")).toBeInTheDocument();
    expect(within(surfing).getByTitle("일 00시 — 70%")).toBeInTheDocument();
  });

  it("추천 문구가 null 이면 추천 칸을 그리지 않는다", () => {
    setup();
    expect(within(cardOf("읽기 행동 분포")).getByText("분석")).toBeInTheDocument();
    expect(within(cardOf("읽기 행동 분포")).queryByText("추천")).not.toBeInTheDocument();
  });

  it("히트맵 값이 없는 칸은 0%로 보인다", () => {
    setup({ timePatterns: ready({ ...TIME_PATTERNS, surfing: [], focus: [[0.5]] }) });
    const focus = heatBlock("집중 시간 (Deep + Reading)");
    expect(within(focus).getByTitle("월 00시 — 50%")).toBeInTheDocument();
    expect(within(focus).getByTitle("월 03시 — 0%")).toBeInTheDocument();
    expect(within(heatBlock("웹서핑 다빈도")).getAllByTitle(/— 0%$/)).toHaveLength(56);
  });
});

describe("카드별 불러오기", () => {
  it("모든 카드에 데이터가 없으면 빈 상태 하나만 보이고 카드 · 배너는 그리지 않는다", () => {
    setup(NO_DATA);
    const empty = screen.getByRole("status");
    expect(empty).toHaveTextContent("아직 분석할 탐색 기록이 없어요.");
    expect(empty).toHaveTextContent("확장 프로그램이 탐색 세션을 모으면 탐색 패턴 분석과 추천이 여기에 보여요.");
    expect(screen.queryByRole("heading", { name: "탐색 성향" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^슬라이드/ })).not.toBeInTheDocument();
  });

  it("처음 불러오는 중에는 '불러오는 중…' 하나만 보인다", () => {
    setup(ALL_LOADING);
    expect(screen.getByText("불러오는 중…")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "탐색 성향" })).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("먼저 온 카드는 바로 보이고, 나머지 카드는 '불러오는 중…' 이다", () => {
    setup({ ...ALL_LOADING, exploration: ready(EXPLORATION) });
    expect(within(cardOf("탐색 성향")).getByText("세션 평균 URL")).toBeInTheDocument();
    expect(within(cardOf("읽기 행동 분포")).getByText("불러오는 중…")).toBeInTheDocument();
  });

  it("한 카드가 실패해도 나머지 카드는 보이고, 그 카드만 다시 시도한다", async () => {
    const refetch = vi.fn();
    const { user } = setup({ categories: failed("서버 오류가 발생했습니다.", refetch) });

    const card = cardOf("카테고리별 방문 비율");
    expect(within(card).getByRole("alert")).toHaveTextContent("서버 오류가 발생했습니다.");
    expect(card.querySelector(".catRow")).not.toBeInTheDocument();
    expect(within(cardOf("읽기 행동 분포")).getByText("Deep Reading 비중 42%")).toBeInTheDocument();

    await user.click(within(card).getByRole("button", { name: "다시 시도" }));
    expect(refetch).toHaveBeenCalledOnce();
  });

  it("모든 카드가 실패해도 카드마다 오류가 보인다 (빈 상태로 보이지 않는다)", () => {
    setup({
      weekSessions: failed("실패"),
      exploration: failed("실패"),
      readingBehavior: failed("실패"),
      categories: failed("실패"),
      timePatterns: failed("실패"),
      recommendations: failed("실패"),
    });
    expect(screen.getAllByRole("alert")).toHaveLength(4);
    expect(screen.queryByText("아직 분석할 탐색 기록이 없어요.")).not.toBeInTheDocument();
  });

  it("그 카드에 데이터가 없으면 안내 문구가 보인다", () => {
    setup({ timePatterns: noData() });
    expect(within(cardOf("시간대별 탐색 패턴")).getByText("아직 보여줄 데이터가 없어요.")).toBeInTheDocument();
  });

  it("세션 · 추천이 실패해도 팁 슬라이드는 보인다", () => {
    setup({ weekSessions: failed("실패"), recommendations: failed("실패") });
    expect(screen.getByText("오늘의 웹 서핑 팁")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^슬라이드/ })).toBeInTheDocument();
  });
});
