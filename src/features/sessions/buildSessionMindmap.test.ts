import { describe, expect, it } from "vitest";
import type { SessionMindmap, SessionMindmapNode } from "@/lib/api";
import {
  EMPTY_MINDMAP,
  PARIS_MINDMAP,
  PARIS_UNIT,
  ROME_MINDMAP,
  ROME_UNIT,
} from "@/test/fixtures/sessions";
import { MAP_HEIGHT, MAP_WIDTH, buildSessionMindmap } from "./buildSessionMindmap";

const TITLE = "로마 3박 4일 동선 짜기";
const CX = MAP_WIDTH / 2;
const CY = MAP_HEIGHT / 2;
/** Mindmap 이 이 반지름 밖의 노드를 밀어 넣는다 */
const MINDMAP_LIMIT = Math.min(MAP_WIDTH, MAP_HEIGHT) / 2 - 60;

const radiusOf = (n: { x: number; y: number }) => Math.hypot(n.x - CX, n.y - CY);
const node = (id: string, type: SessionMindmapNode["type"], childCount = 0): SessionMindmapNode => ({
  id,
  type,
  keyword: id,
  score: null,
  childCount,
  citation: null,
});

describe("세션 마인드맵 만들기 — 노드", () => {
  it("응답이 비어 있으면 노드 · 연결선 모두 없다", () => {
    expect(buildSessionMindmap(EMPTY_MINDMAP, TITLE)).toEqual({ nodes: [], edges: [], treeEdges: [] });
  });

  it("keyword 가 라벨이 되고, 유닛 노드는 citation 을 그대로 가진다", () => {
    const { nodes } = buildSessionMindmap(ROME_MINDMAP, TITLE);
    expect(nodes.map((n) => n.label)).toEqual(ROME_MINDMAP.nodes.map((n) => n.keyword));
    expect(nodes.map((n) => n.citation)).toEqual(ROME_MINDMAP.nodes.map((n) => n.citation));
  });

  it("루트가 하나면 그 루트가 core 고, 주제는 logi · 유닛은 sub 다", () => {
    const { nodes } = buildSessionMindmap(ROME_MINDMAP, TITLE);
    expect(nodes.map((n) => n.group)).toEqual(["core", "logi", "logi", "logi", "sub", "sub", "sub"]);
    expect(nodes.map((n) => n.id)).toEqual(ROME_MINDMAP.nodes.map((n) => n.id));
  });

  it("루트가 여럿이면 세션 제목으로 core 를 하나 더하고 루트는 city 가 된다", () => {
    const { nodes } = buildSessionMindmap(PARIS_MINDMAP, TITLE);
    expect(nodes.filter((n) => n.group === "core")).toHaveLength(1);
    expect(nodes[0]).toMatchObject({ label: TITLE, group: "core", citation: null });
    expect(nodes.slice(1).map((n) => n.group)).toEqual(["city", "city", "logi", "logi", "sub", "sub"]);
  });

  it("루트가 없는 응답도 세션 제목 중심 노드 하나로 그린다", () => {
    const { nodes } = buildSessionMindmap({ nodes: [node("t", "topic")], edges: [] }, TITLE);
    expect(nodes.map((n) => [n.label, n.group])).toEqual([
      [TITLE, "core"],
      ["t", "logi"],
    ]);
  });

  it("주제 · 유닛 그룹은 루트 개수와 상관없이 같다", () => {
    const groupsOf = (map: SessionMindmap) =>
      new Set(buildSessionMindmap(map, TITLE).nodes.filter((n) => n.group !== "core" && n.group !== "city").map((n) => n.group));
    expect(groupsOf(ROME_MINDMAP)).toEqual(groupsOf(PARIS_MINDMAP));
  });

  it("중심 노드 id 는 응답의 어떤 id 와도 겹치지 않는다", () => {
    const map: SessionMindmap = { nodes: [node("center", "root"), node("center_", "root")], edges: [] };
    const ids = buildSessionMindmap(map, TITLE).nodes.map((n) => n.id);
    expect(new Set(ids).size).toBe(3);
    expect(ids).toEqual(expect.arrayContaining(["center", "center_"]));
  });

  it("URL 문자가 들어간 id 를 바꾸지 않는다", () => {
    const { nodes, edges, treeEdges } = buildSessionMindmap(PARIS_MINDMAP, TITLE);
    const unitIds = Object.values(PARIS_UNIT);
    expect(nodes.map((n) => n.id)).toEqual(expect.arrayContaining(unitIds));
    expect(edges.flat()).toEqual(expect.arrayContaining(unitIds));
    expect(treeEdges.flat()).toEqual(expect.arrayContaining(unitIds));
  });
});

describe("세션 마인드맵 만들기 — 크기", () => {
  const sizes = (childCounts: number[]) =>
    buildSessionMindmap(
      { nodes: [node("r", "root"), ...childCounts.map((c, i) => node(`t${i}`, "topic", c))], edges: [] },
      TITLE,
    ).nodes.slice(1);

  it("core 는 항상 가장 크게 그린다", () => {
    expect(buildSessionMindmap({ nodes: [node("r", "root", 0)], edges: [] }, TITLE).nodes[0].size).toBe(22);
    expect(buildSessionMindmap(PARIS_MINDMAP, TITLE).nodes[0].size).toBe(22);
  });

  it("자식이 많을수록 커지고 기존 범위 9 ~ 22 를 넘지 않는다", () => {
    expect(sizes([0, 1, 3, 6, 7, 100]).map((n) => n.size)).toEqual([9, 11, 15, 21, 22, 22]);
  });
});

describe("세션 마인드맵 만들기 — 연결선", () => {
  it("한 루트 응답은 부모 → 자식 연결선만 그대로 있다", () => {
    const { edges, treeEdges } = buildSessionMindmap(ROME_MINDMAP, TITLE);
    const expected = ROME_MINDMAP.edges.map((e) => [e.from, e.to]);
    expect(edges).toEqual(expected);
    expect(treeEdges).toEqual(expected);
  });

  it("루트가 여럿이면 중심에서 각 루트로 잇는다", () => {
    const { nodes, treeEdges } = buildSessionMindmap(PARIS_MINDMAP, TITLE);
    const center = nodes[0].id;
    expect(treeEdges.slice(0, 2)).toEqual([
      [center, "root:1"],
      [center, "root:2"],
    ]);
  });

  it("related · primary 아닌 연결선은 그리지만 배치 깊이에는 쓰지 않는다", () => {
    const { edges, treeEdges } = buildSessionMindmap(PARIS_MINDMAP, TITLE);
    const has = (list: [string, string][], a: string, b: string) =>
      list.some(([x, y]) => (x === a && y === b) || (x === b && y === a));

    expect(has(edges, PARIS_UNIT.mona, PARIS_UNIT.night)).toBe(true);
    expect(has(edges, "root:2", PARIS_UNIT.mona)).toBe(true);
    expect(has(treeEdges, PARIS_UNIT.mona, PARIS_UNIT.night)).toBe(false);
    expect(has(treeEdges, "root:2", PARIS_UNIT.mona)).toBe(false);
  });

  it("primary 가 true 여도 related 연결선은 배치 깊이에 쓰지 않는다", () => {
    const map: SessionMindmap = {
      nodes: [node("r", "root"), node("t", "topic"), node("u", "unit")],
      edges: [
        { from: "r", to: "t", type: "hierarchy", primary: true },
        { from: "t", to: "u", type: "hierarchy", primary: true },
        { from: "r", to: "u", type: "related", primary: true },
      ],
    };
    const { edges, treeEdges } = buildSessionMindmap(map, TITLE);
    expect(treeEdges).toEqual([
      ["r", "t"],
      ["t", "u"],
    ]);
    expect(edges).toHaveLength(3);
  });

  it("같은 두 노드를 잇는 연결선은 종류 · 방향이 달라도 하나만 그린다", () => {
    const { edges } = buildSessionMindmap(PARIS_MINDMAP, TITLE);
    const between = edges.filter(([a, b]) => [a, b].sort().join() === [PARIS_UNIT.mona, PARIS_UNIT.night].sort().join());
    expect(between).toHaveLength(1);

    const map: SessionMindmap = {
      nodes: [node("r", "root"), node("t", "topic")],
      edges: [
        { from: "r", to: "t", type: "hierarchy", primary: true },
        { from: "t", to: "r", type: "related", primary: false },
        { from: "r", to: "t", type: "hierarchy", primary: false },
      ],
    };
    expect(buildSessionMindmap(map, TITLE).edges).toEqual([["r", "t"]]);
  });

  it.each([",", "|", "-", ":", " ", "#", "/", '","', "\n"])("구분자처럼 보이는 글자 %j 가 id 에 있어도 서로 다른 연결선을 합치지 않는다", (sep) => {
    // 이어 붙이면 둘 다 a{sep}b{sep}c 가 되는 쌍
    const [x1, y1, x2, y2] = ["a", `b${sep}c`, `a${sep}b`, "c"];
    const map: SessionMindmap = {
      nodes: [node("r", "root"), ...[x1, y1, x2, y2].map((id) => node(id, "unit"))],
      edges: [
        { from: x1, to: y1, type: "related", primary: false },
        { from: x2, to: y2, type: "related", primary: false },
      ],
    };
    expect(buildSessionMindmap(map, TITLE).edges).toHaveLength(2);
  });

  it("없는 노드를 가리키는 연결선과 자기 자신으로 가는 연결선은 뺀다", () => {
    const map: SessionMindmap = {
      nodes: [node("r", "root"), node("t", "topic")],
      edges: [
        { from: "r", to: "t", type: "hierarchy", primary: true },
        { from: "t", to: "ghost", type: "hierarchy", primary: true },
        { from: "t", to: "t", type: "related", primary: false },
      ],
    };
    const { edges, treeEdges } = buildSessionMindmap(map, TITLE);
    expect(edges).toEqual([["r", "t"]]);
    expect(treeEdges).toEqual([["r", "t"]]);
  });
});

describe("세션 마인드맵 만들기 — 배치", () => {
  it("같은 응답이면 항상 같은 자리에 놓는다", () => {
    expect(buildSessionMindmap(PARIS_MINDMAP, TITLE)).toEqual(buildSessionMindmap(PARIS_MINDMAP, TITLE));
  });

  it("중심은 캔버스 가운데고, 깊이마다 바깥 원으로 간다", () => {
    const { nodes } = buildSessionMindmap(ROME_MINDMAP, TITLE);
    const byId = new Map(nodes.map((n) => [n.id, n]));
    expect(byId.get("root:1")).toMatchObject({ x: CX, y: CY });
    expect(radiusOf(byId.get("topic:0")!)).toBeCloseTo(135);
    expect(radiusOf(byId.get(ROME_UNIT.pass)!)).toBeCloseTo(270);
  });

  it("primary 계층 깊이로 놓는다 — 지름길 · related 는 깊이를 바꾸지 않는다", () => {
    const { nodes } = buildSessionMindmap(PARIS_MINDMAP, TITLE);
    const byId = new Map(nodes.map((n) => [n.id, n]));
    // 중심 → 루트 → 주제 → 유닛
    expect(radiusOf(byId.get("root:1")!)).toBeCloseTo(90);
    expect(radiusOf(byId.get("topic:0")!)).toBeCloseTo(180);
    expect(radiusOf(byId.get(PARIS_UNIT.mona)!)).toBeCloseTo(270);
    expect(radiusOf(byId.get(PARIS_UNIT.night)!)).toBeCloseTo(270);
  });

  it("어떤 크기의 응답이든 Mindmap 경계 안에 놓는다", () => {
    const topics = Array.from({ length: 12 }, (_, i) => node(`topic:${i}`, "topic", 3));
    const units = topics.flatMap((t) => [0, 1, 2].map((i) => node(`https://x/${t.id}#u${i}`, "unit")));
    const map: SessionMindmap = {
      nodes: [node("r1", "root", 6), node("r2", "root", 6), node("r3", "root", 0), ...topics, ...units],
      edges: [
        ...topics.map((t, i) => ({ from: i % 2 ? "r2" : "r1", to: t.id, type: "hierarchy" as const, primary: true })),
        ...units.map((u) => ({ from: u.id.split("/")[3].split("#")[0], to: u.id, type: "hierarchy" as const, primary: true })),
      ],
    };
    const { nodes } = buildSessionMindmap(map, TITLE);
    expect(nodes).toHaveLength(map.nodes.length + 1);
    for (const n of nodes) expect(radiusOf(n)).toBeLessThanOrEqual(MINDMAP_LIMIT);
    expect(new Set(nodes.map((n) => `${n.x},${n.y}`)).size).toBe(nodes.length);
  });
});
