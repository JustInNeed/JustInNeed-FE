import type { MindmapEdge, MindmapNode } from "@/lib/types";

/** 계층형 배치 — 루트(core, 없으면 첫 노드)에서 왼쪽 → 오른쪽으로 뻗는 트리. 깊이는 열, 잎 노드 순서는 행. */
export function treeLayout<T extends MindmapNode>(nodes: T[], edges: MindmapEdge[], width: number, height: number): T[] {
  if (nodes.length === 0) return nodes;
  const root = nodes.find((n) => n.group === "core") ?? nodes[0];

  const adj = new Map<string, string[]>();
  for (const [a, b] of edges) {
    adj.set(a, [...(adj.get(a) ?? []), b]);
    adj.set(b, [...(adj.get(b) ?? []), a]);
  }

  // BFS 로 깊이 · 자식 결정
  const depth = new Map<string, number>([[root.id, 0]]);
  const children = new Map<string, string[]>();
  const addChild = (parent: string, child: string) => children.set(parent, [...(children.get(parent) ?? []), child]);
  const queue = [root.id];
  while (queue.length) {
    const id = queue.shift()!;
    for (const next of adj.get(id) ?? []) {
      if (depth.has(next)) continue;
      depth.set(next, depth.get(id)! + 1);
      addChild(id, next);
      queue.push(next);
    }
  }
  // 연결이 끊긴 노드는 루트 바로 아래에 둔다
  for (const n of nodes) {
    if (depth.has(n.id)) continue;
    depth.set(n.id, 1);
    addChild(root.id, n.id);
  }

  // 잎은 차례로 한 행씩, 부모는 자식 행의 가운데
  const row = new Map<string, number>();
  let leaves = 0;
  const place = (id: string): number => {
    const cs = children.get(id) ?? [];
    const r = cs.length ? cs.map(place).reduce((s, v) => s + v, 0) / cs.length : leaves++;
    row.set(id, r);
    return r;
  };
  place(root.id);

  const maxDepth = Math.max(...depth.values());
  const padX = 120;
  const padY = 40;
  const colW = maxDepth ? Math.min(280, (width - padX * 2) / maxDepth) : 0;
  const rowH = leaves > 1 ? Math.min(56, (height - padY * 2) / (leaves - 1)) : 0;
  const left = maxDepth ? (width - colW * maxDepth) / 2 : width / 2;
  const top = height / 2 - ((leaves - 1) * rowH) / 2;

  return nodes.map((n) => ({ ...n, x: left + depth.get(n.id)! * colW, y: top + row.get(n.id)! * rowH }));
}
