import { describe, expect, it } from "vitest";
import type { HomeGraphNode, HomeResponse } from "@/lib/api";
import { EMPTY_HOME_RESPONSE, HOME_RESPONSE } from "@/test/fixtures/home";
import { dimmedNodeIds, DEFAULT_GRAPH_FILTER } from "./graphFilter";
import { toHomeData, toTimelineSite } from "./toHomeData";
import { buildWeekTimeline } from "./weekTimeline";

const CENTER = { x: 550, y: 350 };
const MINDMAP_MAX_RADIUS = 290; // Mindmap: min(1100, 700) / 2 - 60

const radiusOf = (n: { x: number; y: number }) => Math.hypot(n.x - CENTER.x, n.y - CENTER.y);
const nodesOf = (group: HomeGraphNode["group"], count: number): HomeGraphNode[] =>
  Array.from({ length: count }, (_, i) => ({ id: `${group}-${i}`, label: `${group} ${i}`, size: 10, group }));
const withNodes = (nodes: HomeGraphNode[]): HomeResponse => ({
  ...HOME_RESPONSE,
  graph: { ...HOME_RESPONSE.graph, nodes, edges: [], nodeMeta: {} },
});

describe("toHomeData — 노드 좌표", () => {
  it("중심 노드는 1100 × 700 캔버스 가운데에 놓는다", () => {
    const core = toHomeData(HOME_RESPONSE).graph.nodes.find((n) => n.id === "core")!;
    expect(core).toMatchObject(CENTER);
  });

  it("id · 라벨 · 크기 · 그룹은 응답 그대로 두고 응답 순서를 지킨다", () => {
    const { nodes } = toHomeData(HOME_RESPONSE).graph;
    expect(nodes.map(({ id, label, size, group }) => ({ id, label, size, group }))).toEqual(HOME_RESPONSE.graph.nodes);
  });

  it("그룹마다 같은 원 위에 놓고, city · logi · sub 순으로 멀어진다", () => {
    const { nodes } = toHomeData(withNodes([...nodesOf("sub", 9), ...nodesOf("city", 4), ...nodesOf("logi", 5)])).graph;
    const radii = (group: string) => nodes.filter((n) => n.group === group).map(radiusOf);
    const [city, logi, sub] = ["city", "logi", "sub"].map(radii);
    [city, logi, sub].forEach((rs) => rs.forEach((r) => expect(r).toBeCloseTo(rs[0])));
    expect(city[0]).toBeGreaterThan(0);
    expect(logi[0]).toBeGreaterThan(city[0]);
    expect(sub[0]).toBeGreaterThan(logi[0]);
  });

  it("Mindmap 이 밀어 넣는 경계 안쪽에 놓는다", () => {
    const { nodes } = toHomeData(withNodes([...nodesOf("core", 1), ...nodesOf("city", 3), ...nodesOf("logi", 3), ...nodesOf("sub", 30)])).graph;
    nodes.forEach((n) => expect(radiusOf(n)).toBeLessThanOrEqual(MINDMAP_MAX_RADIUS));
  });

  it("한 원 위의 노드는 같은 간격으로 흩어진다 (겹치지 않는다)", () => {
    const { nodes } = toHomeData(withNodes(nodesOf("sub", 6))).graph;
    const gaps = nodes.map((n, i) => {
      const next = nodes[(i + 1) % nodes.length];
      return Math.hypot(n.x - next.x, n.y - next.y);
    });
    gaps.forEach((gap) => expect(gap).toBeCloseTo(270)); // 정육각형 한 변 = 반지름
  });

  it("다른 그룹이 섞여 있어도 그룹 안에서 간격을 나눈다", () => {
    const [c0, c1, c2] = nodesOf("city", 3);
    const [s0, s1] = nodesOf("sub", 2);
    const only = toHomeData(withNodes([c0, c1, c2])).graph.nodes;
    const mixed = toHomeData(withNodes([c0, s0, c1, s1, c2])).graph.nodes;
    expect(mixed.filter((n) => n.group === "city")).toEqual(only);
  });

  it("같은 응답이면 항상 같은 좌표다", () => {
    expect(toHomeData(HOME_RESPONSE).graph.nodes).toEqual(toHomeData(HOME_RESPONSE).graph.nodes);
  });

  it("좌표는 모두 유한한 숫자다", () => {
    toHomeData(HOME_RESPONSE).graph.nodes.forEach((n) => {
      expect(Number.isFinite(n.x)).toBe(true);
      expect(Number.isFinite(n.y)).toBe(true);
    });
  });
});

describe("toTimelineSite", () => {
  it("이름은 도메인 그대로다", () => {
    expect(toTimelineSite("docs.spring.io").name).toBe("docs.spring.io");
  });

  it.each([
    ["velog.io", "V"],
    ["medium.com", "M"],
    ["www.naver.com", "N"],
    ["docs.spring.io", "S"],
    ["tripadvisor.co.kr", "T"],
    ["blog.naver.co.kr", "N"],
    ["localhost", "L"],
  ])("아이콘 글자는 서비스 이름의 첫 글자 대문자다: %s → %s", (domain, favicon) => {
    expect(toTimelineSite(domain).favicon).toBe(favicon);
  });

  it("같은 도메인이면 항상 같은 사이트다", () => {
    expect(toTimelineSite("velog.io")).toEqual(toTimelineSite("velog.io"));
  });

  it("도메인이 달라도 색이 한 색으로 몰리지 않는다", () => {
    const domains = ["docs.spring.io", "velog.io", "skyscanner.net", "parisinfo.com", "tripadvisor.co.kr", "www.naver.com"];
    const colors = domains.map((d) => toTimelineSite(d).color);
    colors.forEach((c) => expect(c).toMatch(/^#[0-9a-f]{6}$/));
    expect(new Set(colors).size).toBeGreaterThanOrEqual(5);
  });

  it("아이콘 글자가 같은 사이트는 색으로 구분된다", () => {
    expect(toTimelineSite("docs.spring.io").favicon).toBe(toTimelineSite("skyscanner.net").favicon);
    expect(toTimelineSite("docs.spring.io").color).not.toBe(toTimelineSite("skyscanner.net").color);
  });
});

describe("toHomeData — 타임라인 · 해시태그", () => {
  it("오늘 타임라인 시간대는 '시작 — 끝', 진행 중이면 '시작 — 진행 중'", () => {
    expect(toHomeData(HOME_RESPONSE).todayTimeline.map((s) => s.time)).toEqual(["09:00 — 10:30", "21:10 — 진행 중"]);
  });

  it("오늘 타임라인 해시태그에 # 를 붙이고 도메인은 사이트로 바꾼다", () => {
    const [slot] = toHomeData(HOME_RESPONSE).todayTimeline;
    expect(slot.tags).toEqual(["#자바", "#스프링"]);
    expect(slot.sites).toEqual([toTimelineSite("docs.spring.io"), toTimelineSite("velog.io")]);
  });

  it("한 시간대에 같은 도메인이 여러 번 오면 한 번만 보여준다 (화면 key 중복 방지)", () => {
    const slot = { startTime: "09:00", endTime: null, tags: [], sites: ["a.com", "b.com", "a.com"] };
    const [mapped] = toHomeData({ ...HOME_RESPONSE, todayTimeline: [slot] }).todayTimeline;
    expect(mapped.sites.map((s) => s.name)).toEqual(["a.com", "b.com"]);
  });

  it("이번 주 세션은 해시태그에 # 를 붙이고 방문을 사이트 · 체류 시간으로 바꾼다", () => {
    const [first] = toHomeData(HOME_RESPONSE).weekSessions;
    expect(first).toEqual({
      dayOffset: -6,
      startedAt: "10:10",
      tags: ["#파리"],
      visits: [
        { site: toTimelineSite("skyscanner.net"), dwellSec: 420 },
        { site: toTimelineSite("parisinfo.com"), dwellSec: 300 },
        { site: toTimelineSite("parisinfo.com"), dwellSec: 120 },
      ],
    });
  });

  it("같은 도메인을 또 방문하면 지우지 않는다 (대표 사이트는 방문 횟수로 고른다)", () => {
    const { weekSessions } = toHomeData(HOME_RESPONSE);
    const [mon] = buildWeekTimeline(weekSessions, new Date(2026, 9, 31));
    expect(mon.sites.map((s) => s.name)).toEqual(["parisinfo.com", "skyscanner.net"]);
  });

  it("변환한 이번 주 세션을 날짜별 타임라인으로 묶을 수 있다", () => {
    const days = buildWeekTimeline(toHomeData(HOME_RESPONSE).weekSessions, new Date(2026, 9, 31));
    expect(days[0]).toMatchObject({ label: "10/25 (일)", tags: ["#파리"], isToday: false });
    expect(days[6]).toMatchObject({ label: "10/31 (토)", tags: ["#자바", "#스프링"], isToday: true });
  });

  it("상위 해시태그에 # 를 붙이고 응답 순서를 지킨다", () => {
    expect(toHomeData(HOME_RESPONSE).topTags).toEqual([
      { tag: "#파리", count: 28 },
      { tag: "#로마", count: 24 },
    ]);
  });

  it("nodeMeta · tagGroups · filterTags 의 해시태그는 raw 그대로 둔다", () => {
    const { graph } = toHomeData(HOME_RESPONSE);
    expect(graph.nodeMeta.n1.tags).toEqual(["로마"]);
    expect(graph.tagGroups).toEqual([{ id: 1, name: "유럽 여행", tags: ["로마", "파리"] }]);
    expect(graph.filterTags).toEqual(["로마", "파리"]);
  });

  it("변환한 그래프는 raw 해시태그 필터에 그대로 걸린다", () => {
    const { graph } = toHomeData(HOME_RESPONSE);
    const dimmed = dimmedNodeIds(graph, { ...DEFAULT_GRAPH_FILTER, tags: [graph.filterTags[0]] });
    expect(dimmed.has("n1")).toBe(false); // 로마
    expect(dimmed.has("n2")).toBe(true); // 파리
  });
});

describe("toHomeData — 그 외", () => {
  it("nodeMeta 의 seen · sessionId 를 넘기고, sessionId 가 null 이면 없는 것으로 친다", () => {
    const { nodeMeta } = toHomeData(HOME_RESPONSE).graph;
    expect(nodeMeta.n1).toEqual({ seen: "today", tags: ["로마"], sessionId: 9002 });
    expect(nodeMeta.n3).toEqual({ seen: "month", tags: ["항공권"] });
    expect(nodeMeta.n4.seen).toBe("all");
  });

  it("이번 주 활동은 받은 순서 그대로 둔다 (월요일로 다시 줄 세우지 않는다)", () => {
    const { weekActivity } = toHomeData(HOME_RESPONSE);
    expect(weekActivity.range).toBe("10.25 — 10.31");
    expect(weekActivity.days.map((d) => d.day)).toEqual(["일", "월", "화", "수", "목", "금", "토"]);
    expect(weekActivity.days.map((d) => d.minutes)).toEqual([38, 94, 67, 0, 110, 77, 120]);
  });

  it("통계 · 연결선 · 세션은 응답 그대로 넘긴다", () => {
    const data = toHomeData(HOME_RESPONSE);
    expect(data.stats).toEqual(HOME_RESPONSE.stats);
    expect(data.graph.edges).toEqual(HOME_RESPONSE.graph.edges);
    expect(data.sessions).toEqual(HOME_RESPONSE.sessions);
  });

  it("기록이 없는 회원의 응답도 빈 모양으로 바꾼다", () => {
    const data = toHomeData(EMPTY_HOME_RESPONSE);
    expect(data.graph).toEqual({ nodes: [], edges: [], nodeMeta: {}, tagGroups: [], filterTags: [] });
    expect(data.todayTimeline).toEqual([]);
    expect(data.weekActivity.days).toHaveLength(7);
  });
});
