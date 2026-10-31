import type { MindmapEdge, MindmapNode } from "@/lib/types";

/** 루트(core, 없으면 첫 노드)에서 본 트리 모양 — 깊이와, 잎은 차례로 한 행씩 · 부모는 자식 행의 가운데인 행 번호 */
function treeShape(nodes: MindmapNode[], edges: MindmapEdge[]) {
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

  return { depth, row, leaves, maxDepth: Math.max(...depth.values()) };
}

/** 계층형 배치 — 루트에서 왼쪽 → 오른쪽으로 뻗는 트리. 깊이는 열, 잎 노드 순서는 행. */
export function treeLayout<T extends MindmapNode>(nodes: T[], edges: MindmapEdge[], width: number, height: number): T[] {
  if (nodes.length === 0) return nodes;
  const { depth, row, leaves, maxDepth } = treeShape(nodes, edges);

  const padX = 120;
  const padY = 40;
  const colW = maxDepth ? Math.min(280, (width - padX * 2) / maxDepth) : 0;
  const rowH = leaves > 1 ? Math.min(56, (height - padY * 2) / (leaves - 1)) : 0;
  const left = maxDepth ? (width - colW * maxDepth) / 2 : width / 2;
  const top = height / 2 - ((leaves - 1) * rowH) / 2;

  return nodes.map((n) => ({ ...n, x: left + depth.get(n.id)! * colW, y: top + row.get(n.id)! * rowH }));
}

/** 방사형 처음 배치 — 루트는 가운데, 깊이마다 바깥 원. 잎을 같은 각도로 나누고 부모는 자식 각도의 가운데라 가지끼리 겹치지 않는다 */
export function radialLayout<T extends MindmapNode>(
  nodes: T[],
  edges: MindmapEdge[],
  cx: number,
  cy: number,
  maxRadius: number,
): T[] {
  if (nodes.length === 0) return nodes;
  const { depth, row, leaves, maxDepth } = treeShape(nodes, edges);

  const ringGap = maxDepth ? maxRadius / maxDepth : 0;
  return nodes.map((n) => {
    const radius = depth.get(n.id)! * ringGap;
    const angle = -Math.PI / 2 + (2 * Math.PI * row.get(n.id)!) / leaves;
    return { ...n, x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  });
}
