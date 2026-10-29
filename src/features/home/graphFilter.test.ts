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

  it("겹치는 태그가 없으면 undefined", () => {
    expect(relatedSession(node("packing"), graph.nodeMeta, sessions)).toBeUndefined();
    expect(relatedSession(node("rome"), graph.nodeMeta, [])).toBeUndefined();
  });
});
