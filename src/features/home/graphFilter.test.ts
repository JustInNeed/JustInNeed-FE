import { describe, expect, it } from "vitest";
import type { SessionListItem } from "@/lib/api";
import type { MindmapNode } from "@/lib/types";
import { HOME_DATA } from "@/test/fixtures/home";
import {
  DEFAULT_GRAPH_FILTER,
  countApplied,
  dimmedNodeIds,
  groupNodeCount,
  relatedSession,
  searchGraph,
  type GraphFilter,
} from "./graphFilter";

const { graph, sessions } = HOME_DATA;
const node = (id: string) => graph.nodes.find((n) => n.id === id)!;
const filter = (f: Partial<GraphFilter>): GraphFilter => ({ ...DEFAULT_GRAPH_FILTER, ...f });
const session = (id: number, tags: string[], title = `세션 ${id}`): SessionListItem => ({
  id,
  title,
  startedAt: "2026-04-26T10:00:00",
  endedAt: "2026-04-26T11:00:00",
  pageCount: 3,
  status: "COMPLETED",
  isFavorite: false,
  isPublic: false,
  tags,
});

describe("countApplied", () => {
  it("아무것도 고르지 않으면 0개", () => {
    expect(countApplied(DEFAULT_GRAPH_FILTER)).toBe(0);
  });

  it("기간 · 그룹 · 해시태그를 각각 1개로 센다 (해시태그를 여러 개 골라도 1개)", () => {
    expect(countApplied(filter({ period: "today" }))).toBe(1);
    expect(countApplied(filter({ tags: ["로마", "파리", "예산"] }))).toBe(1);
    expect(countApplied({ period: "week", groupIds: [1, 2], tags: ["로마"] })).toBe(3);
  });
});

describe("dimmedNodeIds", () => {
  it("기본 필터면 흐려지는 노드가 없다", () => {
    expect(dimmedNodeIds(graph, DEFAULT_GRAPH_FILTER).size).toBe(0);
  });

  it("기간이 '오늘'이면 오늘 본 노드만 남고 이번 주 · 이번 달에 본 노드는 흐려진다", () => {
    const dimmed = dimmedNodeIds(graph, filter({ period: "today" }));
    expect(dimmed.has("rome")).toBe(false);
    expect(dimmed.has("flight")).toBe(false);
    expect(dimmed.has("paris")).toBe(true); // week
    expect(dimmed.has("barca")).toBe(true); // month
  });

  it("기간이 '이번 주'면 오늘 · 이번 주에 본 노드는 남는다", () => {
    const dimmed = dimmedNodeIds(graph, filter({ period: "week" }));
    expect(dimmed.has("rome")).toBe(false);
    expect(dimmed.has("paris")).toBe(false);
    expect(dimmed.has("prague")).toBe(true);
  });

  it("해시태그 그룹을 고르면 그룹 태그가 하나라도 붙은 노드만 남는다", () => {
    const dimmed = dimmedNodeIds(graph, filter({ groupIds: [1] })); // 유럽 여행 준비: 로마 · 파리 · 콜로세움 · 항공권 · 숙소
    expect(dimmed.has("colos")).toBe(false);
    expect(dimmed.has("travel-blog")).toBe(false);
    expect(dimmed.has("visa")).toBe(false); // 항공권
    expect(dimmed.has("barca")).toBe(true);
    expect(dimmed.has("budget")).toBe(true);
  });

  it("해시태그를 고르면 그 태그가 붙은 노드만 남는다", () => {
    const dimmed = dimmedNodeIds(graph, filter({ tags: ["프라하"] }));
    expect([...graph.nodes.map((n) => n.id)].filter((id) => !dimmed.has(id)).sort()).toEqual(
      ["bridge", "castle", "eu", "prague"].sort(),
    );
  });

  it("조건을 여러 개 걸면 모두 만족하는 노드만 남는다", () => {
    const dimmed = dimmedNodeIds(graph, filter({ period: "today", tags: ["로마", "항공권"] }));
    expect(dimmed.has("rome")).toBe(false);
    expect(dimmed.has("skyscan")).toBe(false);
    expect(dimmed.has("kayak")).toBe(true); // 항공권이지만 이번 주에 봄
    expect(dimmed.has("travel-blog")).toBe(true); // 로마지만 이번 주에 봄
  });

  it("중심(core) 노드는 어떤 조건에도 흐려지지 않는다", () => {
    expect(dimmedNodeIds(graph, { period: "today", groupIds: [2], tags: ["바르셀로나"] }).has("eu")).toBe(false);
  });

  it("30일이 지난 노드(seen: all)는 기간 '전체'에서만 보인다", () => {
    const nodeMeta = { ...graph.nodeMeta, rome: { seen: "all" as const, tags: ["로마"] } };
    const dimmedIn = (period: GraphFilter["period"]) => dimmedNodeIds({ ...graph, nodeMeta }, filter({ period })).has("rome");
    expect(dimmedIn("today")).toBe(true);
    expect(dimmedIn("week")).toBe(true);
    expect(dimmedIn("month")).toBe(true);
    expect(dimmedIn("all")).toBe(false);
  });

  it("메타가 없는 노드는 필터에 걸리지 않는다", () => {
    const extra: MindmapNode = { id: "new", label: "새 노드", x: 0, y: 0, size: 8, group: "sub" };
    const dimmed = dimmedNodeIds({ ...graph, nodes: [...graph.nodes, extra] }, filter({ period: "today", tags: ["로마"] }));
    expect(dimmed.has("new")).toBe(false);
  });
});

describe("groupNodeCount", () => {
  it("그룹 태그가 붙은 노드 수를 센다", () => {
    expect(groupNodeCount(graph, graph.tagGroups[0])).toBe(15);
  });

  it("그룹 태그가 붙은 노드가 없으면 0", () => {
    expect(groupNodeCount(graph, graph.tagGroups[1])).toBe(0);
  });
});

describe("searchGraph", () => {
  it("빈 검색어(공백만 포함)는 결과가 없다", () => {
    expect(searchGraph("   ", graph.nodes, graph.edges, sessions)).toEqual([]);
  });

  it("라벨이 맞는 노드를 먼저, 제목이 맞는 세션을 그다음에 돌려준다", () => {
    const results = searchGraph("로마", graph.nodes, graph.edges, sessions);
    expect(results.map((r) => (r.kind === "node" ? r.node.id : r.session.id))).toEqual(["rome", 9001, 9002]);
  });

  it("노드 결과에는 연결선 수가 담긴다", () => {
    const [first] = searchGraph("로마", graph.nodes, graph.edges, sessions);
    expect(first).toMatchObject({ kind: "node", links: 6 });
  });

  it("대소문자와 앞뒤 공백을 무시한다", () => {
    const results = searchGraph("  kAyAk ", graph.nodes, graph.edges, sessions);
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ kind: "node", node: { id: "kayak" } });
  });

  it("세션 제목만 맞으면 세션만 나온다", () => {
    const results = searchGraph("가우디", graph.nodes, graph.edges, sessions);
    expect(results).toEqual([{ kind: "session", session: sessions.find((s) => s.id === 9005) }]);
  });
});

describe("relatedSession", () => {
  it("노드 라벨 · 해시태그와 태그가 가장 많이 겹치는 세션을 고른다", () => {
    expect(relatedSession(node("rome"), graph.nodeMeta, sessions)?.id).toBe(9001);
    expect(relatedSession(node("prague"), graph.nodeMeta, sessions)?.id).toBe(9007);
  });

  it("라벨이 담긴 태그(+2)가 해시태그만 같은 태그(+1)보다 우선한다", () => {
    const tagOnly = session(1, ["로마"]); // 노드 해시태그 '로마' +1
    const labelMatch = session(2, ["트라스테베레"]); // 라벨 포함 +2
    expect(relatedSession(node("tras"), graph.nodeMeta, [tagOnly, labelMatch])?.id).toBe(2);
  });

  it("점수가 같으면 목록 앞쪽(최근) 세션을 고른다", () => {
    const a = session(1, ["파리"]);
    const b = session(2, ["파리"]);
    expect(relatedSession(node("paris"), graph.nodeMeta, [a, b])?.id).toBe(1);
  });

  describe("노드에 sessionId 가 있으면", () => {
    const withSession = (id: string, sessionId: number) => ({
      ...graph.nodeMeta,
      [id]: { ...graph.nodeMeta[id], sessionId },
    });

    it("해시태그 점수와 상관없이 그 세션을 고른다", () => {
      // 태그로만 보면 9001 이 맞는 노드
      expect(relatedSession(node("rome"), withSession("rome", 9006), sessions)?.id).toBe(9006);
    });

    it("겹치는 태그가 없는 노드도 그 세션을 고른다", () => {
      expect(relatedSession(node("packing"), withSession("packing", 9004), sessions)?.id).toBe(9004);
    });

    it("목록에 없는 세션이면 해시태그 기준으로 찾는다", () => {
      expect(relatedSession(node("rome"), withSession("rome", 1234), sessions)?.id).toBe(9001);
    });

    it("목록에 없고 겹치는 태그도 없으면 undefined", () => {
      expect(relatedSession(node("packing"), withSession("packing", 1234), sessions)).toBeUndefined();
    });
  });

  it("겹치는 태그가 없으면 undefined", () => {
    expect(relatedSession(node("packing"), graph.nodeMeta, sessions)).toBeUndefined();
    expect(relatedSession(node("rome"), graph.nodeMeta, [])).toBeUndefined();
  });
});
