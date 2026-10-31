import { radialLayout } from "@/components/mindmap/treeLayout";
import type { SessionMindmap, SessionMindmapCitation, SessionMindmapNode } from "@/lib/api";
import type { MindmapEdge, MindmapGroup, MindmapNode } from "@/lib/types";

// 세션 상세 마인드맵 캔버스
export const MAP_WIDTH = 1000;
export const MAP_HEIGHT = 680;

// Mindmap 이 중심에서 min(가로, 세로) / 2 - 60 = 280 바깥의 노드를 밀어 넣으므로 그 안쪽 원까지만 쓴다
const MAX_RADIUS = 270;

const MIN_SIZE = 9;
const MAX_SIZE = 22;
const SIZE_PER_CHILD = 2;

/** 중심(core)은 한 개뿐이라, 루트가 여럿이면 중심 노드를 따로 두고 루트는 그 바로 아래 그룹이 된다 */
const GROUP: Record<SessionMindmapNode["type"], MindmapGroup> = { root: "city", topic: "logi", unit: "sub" };

export interface SessionMapNode extends MindmapNode {
  citation: SessionMindmapCitation | null;
}

export interface SessionMapGraph {
  nodes: SessionMapNode[];
  /** 그릴 연결선 — 부모 → 자식에 related · primary 아닌 연결까지, 방향과 상관없이 쌍마다 하나 */
  edges: MindmapEdge[];
  /** 배치 깊이를 정하는 부모 → 자식 연결선 (primary 계층만) */
  treeEdges: MindmapEdge[];
}

const sizeOf = (childCount: number) => Math.min(MAX_SIZE, MIN_SIZE + childCount * SIZE_PER_CHILD);

/** API 노드 id 는 임의의 URL 이라, 이어 붙인 문자열 대신 JSON 으로 쌍을 구분한다 */
const pairKey = ([a, b]: MindmapEdge) => JSON.stringify(a < b ? [a, b] : [b, a]);

/** GET /sessions/{id}/mindmap 응답 → Mindmap 이 그릴 노드 · 연결선. 같은 응답이면 항상 같은 배치 */
export function buildSessionMindmap(map: SessionMindmap, title: string): SessionMapGraph {
  if (map.nodes.length === 0) return { nodes: [], edges: [], treeEdges: [] };

  const roots = map.nodes.filter((n) => n.type === "root");
  const core = roots.length === 1 ? roots[0] : null;
  const ids = new Set(map.nodes.map((n) => n.id));

  const nodes: SessionMapNode[] = map.nodes.map((n) => ({
    id: n.id,
    label: n.keyword,
    x: 0,
    y: 0,
    size: n === core ? MAX_SIZE : sizeOf(n.childCount),
    group: n === core ? "core" : GROUP[n.type],
    citation: n.citation,
  }));

  const centerEdges: MindmapEdge[] = [];
  if (!core) {
    let centerId = "center";
    while (ids.has(centerId)) centerId += "_";
    nodes.unshift({ id: centerId, label: title, x: 0, y: 0, size: MAX_SIZE, group: "core", citation: null });
    for (const root of roots) centerEdges.push([centerId, root.id]);
  }

  const known = map.edges.filter((e) => e.from !== e.to && ids.has(e.from) && ids.has(e.to));
  const treeEdges: MindmapEdge[] = [
    ...centerEdges,
    ...known.filter((e) => e.type === "hierarchy" && e.primary).map((e): MindmapEdge => [e.from, e.to]),
  ];

  const seen = new Set<string>();
  const edges = [...treeEdges, ...known.map((e): MindmapEdge => [e.from, e.to])].filter((edge) => {
    const key = pairKey(edge);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { nodes: radialLayout(nodes, treeEdges, MAP_WIDTH / 2, MAP_HEIGHT / 2, MAX_RADIUS), edges, treeEdges };
}
