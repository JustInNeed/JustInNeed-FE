import { screen, within } from "@testing-library/react";
import { http } from "msw";
import { beforeEach, describe, expect, it } from "vitest";
import { renderPersonal } from "@/test/render";
import { API, SERVER_ERROR, fail, ok, server } from "@/test/msw/server";
import { REAL_ANALYTICS } from "@/test/fixtures/analytics";
import AnalyticsPage from "./page";

const ANALYTICS = `${API}/analytics`;
const cardOf = (title: string) => screen.getByRole("heading", { name: title }).closest<HTMLElement>(".card")!;

function respondWith(cards: Record<keyof typeof REAL_ANALYTICS, unknown>) {
  server.use(
    http.get(`${ANALYTICS}/week-sessions`, () => ok(cards.weekSessions)),
    http.get(`${ANALYTICS}/exploration`, () => ok(cards.exploration)),
    http.get(`${ANALYTICS}/reading-behavior`, () => ok(cards.readingBehavior)),
    http.get(`${ANALYTICS}/categories`, () => ok(cards.categories)),
    http.get(`${ANALYTICS}/time-patterns`, () => ok(cards.timePatterns)),
    http.get(`${ANALYTICS}/recommendations`, () => ok(cards.recommendations)),
  );
}

describe("분석 페이지", () => {
  beforeEach(() => respondWith(REAL_ANALYTICS));

  it("카드별 API 를 불러와 실제 응답을 화면에 그린다", async () => {
    renderPersonal(<AnalyticsPage />);

    const reading = await screen.findByText("Scanning 비중 32%");
    const legend = Array.from(reading.closest(".card")!.querySelectorAll(".legendRow")).map((r) => r.textContent);
    expect(legend).toEqual(["Deep Reading27%", "Reading14%", "Scanning32%", "Idle27%"]);

    expect(await screen.findByText("세션 평균 URL")).toBeInTheDocument();
    const stats = Array.from(cardOf("탐색 성향").querySelectorAll(".statRow")).map((r) => r.textContent);
    expect(stats).toEqual(["세션 평균 URL6개", "평균 페이지 체류40초", "평균 세션 길이30분"]);

    const categories = Array.from((await screen.findByText("블로그")).closest(".card")!.querySelectorAll(".catHead"));
    expect(categories.map((r) => r.textContent)).toEqual([
      "블로그50% · 3회",
      "공식문서33% · 2회",
      "커뮤니티17% · 1회",
      "뉴스0% · 0회",
      "기타0% · 0회",
    ]);

    expect(await screen.findByTitle("금 09시 — 90%")).toBeInTheDocument();
    expect(within(cardOf("시간대별 탐색 패턴")).getAllByText("오전 9시 ~ 오후 12시")).toHaveLength(2);
    expect(await screen.findByRole("button", { name: "슬라이드 3" })).toBeInTheDocument();
  });

  it("모든 카드에 데이터가 없으면 빈 상태 하나만 보인다", async () => {
    respondWith({
      weekSessions: { sessions: [] },
      exploration: null,
      readingBehavior: null,
      categories: null,
      timePatterns: null,
      recommendations: { recommendations: [] },
    });
    renderPersonal(<AnalyticsPage />);

    expect(await screen.findByRole("status")).toHaveTextContent("아직 분석할 탐색 기록이 없어요.");
    expect(screen.queryByRole("heading", { name: "탐색 성향" })).not.toBeInTheDocument();
  });

  it("카드 하나가 실패하면 그 카드에 오류가 보이고, 다시 시도하면 불러온다", async () => {
    server.use(http.get(`${ANALYTICS}/categories`, () => fail(500, SERVER_ERROR), { once: true }));
    const { user } = renderPersonal(<AnalyticsPage />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(SERVER_ERROR);
    await screen.findByText("Scanning 비중 32%");

    await user.click(within(cardOf("카테고리별 방문 비율")).getByRole("button", { name: "다시 시도" }));

    expect(await within(cardOf("카테고리별 방문 비율")).findByText("3회", { exact: false })).toBeInTheDocument();
    expect(within(cardOf("카테고리별 방문 비율")).queryByRole("alert")).not.toBeInTheDocument();
  });
});
