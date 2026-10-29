import { describe, expect, it } from "vitest";
import type { TimelineSite, WeekSession } from "@/lib/viewTypes";
import { HOME_DATA } from "@/test/fixtures/home";
import { buildWeekTimeline } from "./weekTimeline";

// 2026-04-26 (일)
const TODAY = new Date(2026, 3, 26, 15, 0);
const site = (name: string): TimelineSite => ({ name, favicon: name[0], color: "#000" });
const week = (sessions: WeekSession[]) => buildWeekTimeline(sessions, TODAY);
const names = (sites: TimelineSite[]) => sites.map((s) => s.name);

describe("buildWeekTimeline", () => {
  it("6일 전부터 오늘까지 7일을 날짜 (요일) 라벨로 만들고, 마지막 날만 오늘이다", () => {
    const days = week([]);
    expect(days.map((d) => d.label)).toEqual([
      "4/20 (월)",
      "4/21 (화)",
      "4/22 (수)",
      "4/23 (목)",
      "4/24 (금)",
      "4/25 (토)",
      "4/26 (일)",
    ]);
    expect(days.map((d) => d.isToday)).toEqual([false, false, false, false, false, false, true]);
  });

  it("월이 바뀌는 주도 날짜를 이어서 센다", () => {
    const days = buildWeekTimeline([], new Date(2026, 4, 2));
    expect(days[0].label).toBe("4/26 (일)");
    expect(days[6].label).toBe("5/2 (토)");
  });

  it("세션이 없는 날은 해시태그 · 사이트가 비어 있다", () => {
    const tue = week(HOME_DATA.weekSessions)[1];
    expect(tue).toMatchObject({ label: "4/21 (화)", tags: [], sites: [] });
  });

  it("7일 범위 밖(dayOffset -7) 세션은 무시한다", () => {
    const days = week([{ dayOffset: -7, startedAt: "10:00", tags: ["#옛날"], visits: [{ site: site("old.com"), dwellSec: 10 }] }]);
    expect(days.every((d) => d.tags.length === 0 && d.sites.length === 0)).toBe(true);
  });

  describe("대표 해시태그", () => {
    it("등장한 세션 수가 많은 순, 같으면 더 최근 세션의 태그가 앞선다", () => {
      // 6일 전: 10:10 [#파리 #항공권] · 21:40 [#파리 #일정] → 파리(2) · 일정(21:40) · 항공권(10:10)
      expect(week(HOME_DATA.weekSessions)[0].tags).toEqual(["#파리", "#일정", "#항공권"]);
    });

    it("최대 3개까지만 뽑는다", () => {
      // 오늘: 09:00 [#아침루틴 #커피] · 10:30 [#자바 #스프링 #JPA] → 모두 1번, 최근 세션 태그 3개
      expect(week(HOME_DATA.weekSessions)[6].tags).toEqual(["#자바", "#스프링", "#JPA"]);
    });

    it("한 세션에 같은 태그가 여러 번 있어도 1번으로 센다", () => {
      const days = week([
        { dayOffset: 0, startedAt: "09:00", tags: ["#A", "#A", "#A"], visits: [] },
        { dayOffset: 0, startedAt: "08:00", tags: ["#B"], visits: [] },
        { dayOffset: 0, startedAt: "07:00", tags: ["#B"], visits: [] },
      ]);
      expect(days[6].tags).toEqual(["#B", "#A"]);
    });
  });

  describe("대표 사이트", () => {
    it("방문 횟수가 많은 순으로 최대 3개", () => {
      // 4일 전: stackoverflow 3번 · baeldung 2번 · docs.spring.io 1번
      expect(names(week(HOME_DATA.weekSessions)[2].sites)).toEqual(["stackoverflow", "baeldung.com", "docs.spring.io"]);
    });

    it("방문 횟수가 같으면 체류 시간 합이 긴 사이트가 앞선다", () => {
      // 6일 전: parisinfo 2번(820초) · skyscanner 2번(600초) · naver 1번
      expect(names(week(HOME_DATA.weekSessions)[0].sites)).toEqual(["parisinfo.com", "skyscanner.net", "naver.com/blog"]);
    });

    it("4곳 이상 방문해도 3곳만 보여준다", () => {
      const visits = ["a.com", "b.com", "c.com", "d.com"].map((name, i) => ({ site: site(name), dwellSec: 100 - i }));
      const days = week([{ dayOffset: -1, startedAt: "12:00", tags: [], visits }]);
      expect(names(days[5].sites)).toEqual(["a.com", "b.com", "c.com"]);
    });
  });
});
