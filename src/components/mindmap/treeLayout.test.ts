import { describe, expect, it } from "vitest";
import type { MindmapEdge, MindmapNode } from "@/lib/types";
import { treeLayout } from "./treeLayout";

const node = (id: string, group: MindmapNode["group"] = "sub"): MindmapNode => ({
  id,
  label: id,
  x: 0,
  y: 0,
  size: 9,
  group,
});

const pos = (nodes: MindmapNode[]) => Object.fromEntries(nodes.map((n) => [n.id, [n.x, n.y]]));

describe("마인드맵 계층형 배치", () => {
  it("노드가 없으면 그대로 돌려준다", () => {
    expect(treeLayout([], [], 1000, 680)).toEqual([]);
  });

  it("루트(core)는 왼쪽 열, 깊이마다 한 열씩 오른쪽으로 가고 부모는 자식 행의 가운데에 온다", () => {
    // core ─ a ─ c
    //      └ b
    const nodes = [node("a"), node("core", "core"), node("b"), node("c")];
    const edges: MindmapEdge[] = [
      ["core", "a"],
      ["core", "b"],
      ["a", "c"],
    ];
    // 깊이 2 → 열 간격 280, 잎 2개 → 행 간격 56, 전체를 가운데 정렬
    expect(pos(treeLayout(nodes, edges, 1000, 680))).toEqual({
      core: [220, 340],
      a: [500, 312],
      b: [500, 368],
      c: [780, 312],
    });
  });

  it("core 노드가 없으면 첫 노드를 루트로 삼는다", () => {
    const nodes = [node("x"), node("y"), node("z")];
    const edges: MindmapEdge[] = [
      ["x", "y"],
      ["x", "z"],
    ];
    const out = pos(treeLayout(nodes, edges, 1000, 680));
    expect(out.x[0]).toBeLessThan(out.y[0]);
    expect(out.y[0]).toBe(out.z[0]);
    expect(out.x[1]).toBe((out.y[1] + out.z[1]) / 2);
  });

  it("연결이 끊긴 노드는 루트 바로 아래(한 열 오른쪽)에 둔다", () => {
    const nodes = [node("core", "core"), node("a"), node("lonely")];
    const out = pos(treeLayout(nodes, [["core", "a"]], 1000, 680));
    expect(out.lonely[0]).toBe(out.a[0]);
    expect(out.lonely[1]).not.toBe(out.a[1]);
  });

  it("노드가 하나면 화면 가운데에 놓는다", () => {
    expect(pos(treeLayout([node("core", "core")], [], 1000, 680))).toEqual({ core: [500, 340] });
  });

  it("잎이 많으면 행 간격을 줄여 화면 높이 안에 넣는다", () => {
    const leaves = Array.from({ length: 20 }, (_, i) => node(`u${i}`));
    const edges = leaves.map((l): MindmapEdge => ["core", l.id]);
    const out = treeLayout([node("core", "core"), ...leaves], edges, 1000, 680);
    const ys = out.filter((n) => n.id !== "core").map((n) => n.y);
    expect(Math.min(...ys)).toBeCloseTo(40);
    expect(Math.max(...ys)).toBeCloseTo(640);
  });

  it("입력 노드는 바꾸지 않고 위치만 바꾼 새 노드를 돌려준다", () => {
    const nodes = [node("core", "core"), { ...node("a"), label: "콜로세움", vx: 3 }];
    const out = treeLayout(nodes, [["core", "a"]], 1000, 680);
    expect(nodes[1]).toMatchObject({ x: 0, y: 0 });
    expect(out[1]).toMatchObject({ id: "a", label: "콜로세움", vx: 3, size: 9, group: "sub" });
  });
});
