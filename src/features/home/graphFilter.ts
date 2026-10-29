// 홈 마인드맵 필터 · 검색 규칙 (목 데이터 기준 — 홈 집계 API 생기면 서버 결과로 교체)
import type { SessionListItem } from "@/lib/api";
import type { MindmapEdge, MindmapNode } from "@/lib/types";
import {
  GRAPH_TAG_GROUPS,
  MINDMAP_NODE_META,
  MOCK_SESSIONS,
  type GraphPeriod,
} from "@/lib/mock/designData";

export interface GraphFilter {
  period: GraphPeriod;
  groupIds: number[];
  tags: string[];
}

export const DEFAULT_GRAPH_FILTER: GraphFilter = { period: "all", groupIds: [], tags: [] };

export const PERIOD_OPTIONS: { value: GraphPeriod; label: string }[] = [
  { value: "today", label: "오늘" },
  { value: "week", label: "이번 주" },
  { value: "month", label: "이번 달" },
  { value: "all", label: "전체" },
];

const PERIOD_RANK: Record<GraphPeriod, number> = { today: 0, week: 1, month: 2, all: 3 };

/** 적용된 조건 개수 (기간 · 그룹 · 해시태그 각각 1개로 셈) */
export function countApplied(f: GraphFilter): number {
  return (f.period !== "all" ? 1 : 0) + (f.groupIds.length > 0 ? 1 : 0) + (f.tags.length > 0 ? 1 : 0);
}

function nodeMatches(node: MindmapNode, f: GraphFilter): boolean {
  if (node.group === "core") return true; // 중심 노드는 항상 남긴다
  const meta = MINDMAP_NODE_META[node.id];
  if (!meta) return true;
  if (PERIOD_RANK[meta.seen] > PERIOD_RANK[f.period]) return false;
  if (f.groupIds.length > 0) {
    const groupTags = new Set(GRAPH_TAG_GROUPS.filter((g) => f.groupIds.includes(g.id)).flatMap((g) => g.tags));
    if (!meta.tags.some((t) => groupTags.has(t))) return false;
  }
  if (f.tags.length > 0 && !meta.tags.some((t) => f.tags.includes(t))) return false;
  return true;
}

/** 필터에 맞지 않아 흐리게 표시할 노드 id */
export function dimmedNodeIds(nodes: MindmapNode[], f: GraphFilter): Set<string> {
  return new Set(nodes.filter((n) => !nodeMatches(n, f)).map((n) => n.id));
}

/** 해시태그 그룹에 속한 노드 수 */
export function groupNodeCount(nodes: MindmapNode[], groupId: number): number {
  const group = GRAPH_TAG_GROUPS.find((g) => g.id === groupId);
  if (!group) return 0;
  return nodes.filter((n) => MINDMAP_NODE_META[n.id]?.tags.some((t) => group.tags.includes(t))).length;
}

export type GraphSearchResult =
  | { kind: "node"; node: MindmapNode; links: number }
  | { kind: "session"; session: SessionListItem };

/** 검색어가 들어간 노드 · 세션 (대소문자 무시) */
export function searchGraph(query: string, nodes: MindmapNode[], edges: MindmapEdge[]): GraphSearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const nodeResults: GraphSearchResult[] = nodes
    .filter((n) => n.label.toLowerCase().includes(q))
    .map((n) => ({ kind: "node", node: n, links: edges.filter(([a, b]) => a === n.id || b === n.id).length }));
  const sessionResults: GraphSearchResult[] = MOCK_SESSIONS.filter((s) => s.title.toLowerCase().includes(q)).map(
    (s) => ({ kind: "session", session: s }),
  );
  return [...nodeResults, ...sessionResults];
}

/**
 * 노드와 가장 잘 맞는 세션 — 노드 라벨이 담긴 태그 +2, 노드 해시태그와 같은 태그 +1. 맞는 게 없으면 undefined.
 * 동점이면 목록 앞쪽(최근) 세션.
 */
export function relatedSession(node: MindmapNode): SessionListItem | undefined {
  const label = node.label.replace(/\s/g, "").toLowerCase();
  const nodeTags = new Set((MINDMAP_NODE_META[node.id]?.tags ?? []).map((t) => t.toLowerCase()));
  let best: SessionListItem | undefined;
  let bestScore = 0;
  for (const session of MOCK_SESSIONS) {
    const score = session.tags.reduce((sum, raw) => {
      const t = raw.toLowerCase();
      return sum + (label.includes(t) ? 2 : 0) + (nodeTags.has(t) ? 1 : 0);
    }, 0);
    if (score > bestScore) {
      best = session;
      bestScore = score;
    }
  }
  return best;
}
