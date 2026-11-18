// GET /home 응답 → 홈 화면 데이터(HomeData). 표시용 모양만 바꾸고 순서는 응답 그대로 둔다.
// - 그래프 필터 재료(nodeMeta · tagGroups · filterTags)의 해시태그는 raw 그대로 (graphFilter 가 raw 로 비교)
// - 그 외 화면에 그대로 찍히는 해시태그에만 '#' 를 붙인다
import type { HomeGraphNode, HomeNodeMeta, HomeResponse } from "@/lib/api";
import { withHash } from "@/lib/format";
import type { MindmapGroup, MindmapNode } from "@/lib/types";
import type { GraphNodeMeta, HomeData, TimelineSite } from "@/lib/viewTypes";

// 홈 마인드맵 캔버스 중심 (HomeView 의 Mindmap 1100 × 700)
const CENTER_X = 550;
const CENTER_Y = 350;

// 그룹별 원 — Mindmap 이 중심에서 290 바깥의 노드를 밀어 넣으므로 그 안쪽에 놓는다.
// 원마다 시작 각도를 달리해 노드가 중심에서 한 줄로 늘어서지 않게 한다.
const RINGS: Record<HomeGraphNode["group"], { radius: number; startAngle: number }> = {
  core: { radius: 0, startAngle: 0 },
  city: { radius: 130, startAngle: -Math.PI / 2 },
  logi: { radius: 200, startAngle: -Math.PI / 3 },
  sub: { radius: 270, startAngle: -Math.PI / 4 },
};

// 사이트 아이콘 색 — 디자인 시안 색 중 흰 글자가 읽히는 것만 (HomeView .siteIcon).
// 개수는 소수로 둔다: 2의 거듭제곱이면 해시의 아래 비트만 쓰여 도메인이 달라도 색이 몰린다.
const SITE_COLORS = ["#20c997", "#6db33f", "#5d2f86", "#f48024", "#0770e3", "#d6336c", "#163300"];

// 세션 방향 배치 — core 에서 연결을 따라 내려간 깊이마다 반지름 (마지막 값 이후는 그대로)
const DEPTH_RADIUS = [0, 125, 190, 235, 262, 278, 286, 290];

// 깊이별 노드 모양 — 깊이 1(세션)부터 10까지. 10보다 깊으면 10과 같게.
export const MAX_DEPTH = 10;
// 색은 그래프의 가장 깊은 단계에 맞춰 청록(깊이 1) → 연노랑(가장 깊은 단계)을 나눠 쓴다.
// 깊이 4까지 있으면 4단계, 10까지 있으면 10단계. 가운데는 이 색들 사이를 이어서 고른다
export const DEPTH_GRADIENT = ["#0F7A6C", "#3FA66A", "#7CC45A", "#B3D35A", "#D9DF6A"];
// 크기는 그래프 깊이와 상관없이 고정이라, 얕은 그래프라고 노드가 커지지 않는다.
// 깊이별 기본 반지름 — 여러 세션에 나온 노드는 여기에 조금 더한다 (SESSION_BONUS)
export const DEPTH_SIZES = [18, 13, 9.5, 8, 7, 6.5, 6, 5.5, 5, 4.5];
// BE 가 그룹별 최솟값에 세션 1개마다 +2 한 크기를 보낸다 (HomeGraphBuilder). 그 늘어난 만큼의 비율만 더한다
const BE_MIN_SIZE: Partial<Record<MindmapGroup, number>> = { city: 16, logi: 12, sub: 7 };
const SESSION_BONUS = 0.4;
// 세션에서 닿지 않는 노드는 그룹으로 깊이를 정한다
const GROUP_DEPTH: Partial<Record<MindmapGroup, number>> = { city: 1, logi: 2, sub: 3 };
// 세션 한 칸 각도 중 자손이 퍼지는 비율 (나머지는 이웃 세션과의 틈)
const SECTOR_SPREAD = 0.8;

/** core 에 바로 이어진 노드(세션) id — 응답 순서 */
export function sessionNodeIds(nodes: { id: string; group: string }[], edges: [string, string][]): string[] {
  const core = nodes.find((n) => n.group === "core");
  if (!core) return [];
  const linked = new Set(edges.flatMap(([a, b]) => (a === core.id ? [b] : b === core.id ? [a] : [])));
  return nodes.filter((n) => n.id !== core.id && linked.has(n.id)).map((n) => n.id);
}

/**
 * 처음 위치. 세션(core 의 자식)은 가운데 둘레에 같은 각도로 나눠 놓고, 그 아래 노드는 연결을 따라
 * 자기 세션 방향 안에 깊이별 원으로 놓는다 (형제는 이웃하게, 부모는 자식 가운데).
 * 여러 세션에 걸친 노드는 응답 순서상 먼저 닿은 세션 쪽에 둔다. 세션에서 닿지 않는 노드는 그룹 원 배치를 따른다.
 */
function placeNodes(nodes: HomeGraphNode[], edges: [string, string][]): MindmapNode[] {
  const placed = placeOnGroupRings(nodes);
  const tree = graphTree(nodes, edges);
  if (!tree) {
    const maxDepth = Math.max(1, ...nodes.map((n) => GROUP_DEPTH[n.group] ?? 1));
    return placed.map((n) => styled(n, undefined, maxDepth));
  }
  const { sessions, depth, children } = tree;
  const depthOf = (n: HomeGraphNode) => depth.get(n.id) ?? GROUP_DEPTH[n.group] ?? 1;
  const maxDepth = Math.max(1, ...nodes.filter((n) => n.group !== "core").map(depthOf));

  const angleOf = new Map<string, number>();
  const width = (2 * Math.PI) / sessions.length;
  sessions.forEach((s, i) => {
    const center = -Math.PI / 2 + width * i;
    // 잎은 차례로 한 칸씩, 부모는 자식 칸의 가운데
    const slot = new Map<string, number>();
    let leaves = 0;
    const visit = (id: string): number => {
      const cs = children.get(id) ?? [];
      const p = cs.length ? cs.map(visit).reduce((a, b) => a + b, 0) / cs.length : leaves++ + 0.5;
      slot.set(id, p);
      return p;
    };
    const own = visit(s);
    for (const [id, p] of slot) {
      angleOf.set(id, center + (leaves > 1 ? ((p - own) / leaves) * width * SECTOR_SPREAD : 0));
    }
  });

  return placed.map((n) => {
    const angle = angleOf.get(n.id);
    if (angle === undefined) return styled(n, depth.get(n.id), maxDepth);
    const radius = DEPTH_RADIUS[Math.min(depth.get(n.id)!, DEPTH_RADIUS.length - 1)];
    return styled({ ...n, x: CENTER_X + radius * Math.cos(angle), y: CENTER_Y + radius * Math.sin(angle) }, depth.get(n.id), maxDepth);
  });
}

/** core 에서 연결을 따라 내려간 깊이와 트리 자식. 세션들에서 동시에 BFS 해서 먼저 닿은 세션의 자식이 된다 */
function graphTree(nodes: HomeGraphNode[], edges: [string, string][]) {
  const sessions = sessionNodeIds(nodes, edges);
  const core = nodes.find((n) => n.group === "core");
  if (!core || sessions.length === 0) return null;

  const order = new Map(nodes.map((n, i) => [n.id, i]));
  const adj = new Map<string, string[]>();
  for (const [a, b] of edges) {
    if (!order.has(a) || !order.has(b) || a === b) continue;
    adj.set(a, [...(adj.get(a) ?? []), b]);
    adj.set(b, [...(adj.get(b) ?? []), a]);
  }
  for (const list of adj.values()) list.sort((x, y) => order.get(x)! - order.get(y)!);

  const depth = new Map<string, number>([[core.id, 0]]);
  const children = new Map<string, string[]>();
  for (const s of sessions) depth.set(s, 1);
  let frontier = sessions;
  while (frontier.length) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const nb of adj.get(id) ?? []) {
        if (depth.has(nb)) continue;
        depth.set(nb, depth.get(id)! + 1);
        children.set(id, [...(children.get(id) ?? []), nb]);
        next.push(nb);
      }
    }
    frontier = next;
  }
  return { sessions, depth, children };
}

const hexToRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const rgbToHex = (rgb: number[]) => `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`.toUpperCase();

/** 깊이 depth 의 색 — 1 은 청록, maxDepth 는 연노랑, 그 사이는 DEPTH_GRADIENT 를 이어서 고른다 */
export function depthColor(depth: number, maxDepth: number): string {
  const last = Math.min(MAX_DEPTH, Math.max(1, maxDepth));
  const d = Math.min(last, Math.max(1, depth));
  if (last === 1) return DEPTH_GRADIENT[0];
  const t = ((d - 1) / (last - 1)) * (DEPTH_GRADIENT.length - 1);
  const i = Math.min(Math.floor(t), DEPTH_GRADIENT.length - 2);
  const [a, b] = [hexToRgb(DEPTH_GRADIENT[i]), hexToRgb(DEPTH_GRADIENT[i + 1])];
  return rgbToHex(a.map((v, k) => v + (b[k] - v) * (t - i)));
}

/** 깊이별 색 · 크기. core 는 응답 그대로. 깊이를 모르면 그룹으로 정한다 */
function styled(n: MindmapNode, depth: number | undefined, maxDepth: number): MindmapNode {
  if (n.group === "core") return n;
  const d = Math.min(MAX_DEPTH, Math.max(1, depth ?? GROUP_DEPTH[n.group] ?? 3));
  const min = BE_MIN_SIZE[n.group];
  const bonus = min === undefined ? 0 : Math.max(0, n.size - min) * SESSION_BONUS;
  return { ...n, size: DEPTH_SIZES[d - 1] + bonus, fill: depthColor(d, maxDepth) };
}

/** core 는 가운데, 나머지는 그룹 원 위에 응답 순서대로 같은 간격으로 놓는다 */
function placeOnGroupRings(nodes: HomeGraphNode[]): MindmapNode[] {
  const totals = new Map<string, number>();
  for (const n of nodes) totals.set(n.group, (totals.get(n.group) ?? 0) + 1);

  const placed = new Map<string, number>();
  return nodes.map((n) => {
    const index = placed.get(n.group) ?? 0;
    placed.set(n.group, index + 1);
    const { radius, startAngle } = RINGS[n.group];
    const angle = startAngle + (2 * Math.PI * index) / totals.get(n.group)!;
    return {
      ...n,
      x: CENTER_X + radius * Math.cos(angle),
      y: CENTER_Y + radius * Math.sin(angle),
    };
  });
}

/** 도메인의 서비스 이름 — 앞쪽 서브도메인과 뒤쪽 접미사를 뺀다 (docs.spring.io → spring, tripadvisor.co.kr → tripadvisor) */
function serviceName(domain: string): string {
  const labels = domain.split(".");
  const suffixLength = labels.length > 2 && labels[labels.length - 2].length <= 2 ? 2 : 1;
  return labels[labels.length - 1 - suffixLength] ?? labels[0];
}

function hashOf(text: string): number {
  let hash = 0;
  for (const ch of text) hash = (hash * 131 + ch.charCodeAt(0)) >>> 0;
  return hash;
}

/** 도메인 → 타임라인 사이트. 아이콘은 서비스 이름 첫 글자, 색은 같은 도메인이면 항상 같다 */
export function toTimelineSite(domain: string): TimelineSite {
  return {
    name: domain,
    favicon: serviceName(domain).charAt(0).toUpperCase(),
    color: SITE_COLORS[hashOf(domain) % SITE_COLORS.length],
  };
}

function toNodeMeta(meta: HomeNodeMeta): GraphNodeMeta {
  return { seen: meta.seen, tags: meta.tags, sessionId: meta.sessionId };
}

export function toHomeData(res: HomeResponse): HomeData {
  const { graph } = res;
  // 명세는 string[][] 이지만 BE 는 항상 [출발, 도착] 두 개를 보낸다
  const edges = graph.edges.map(([from, to]): [string, string] => [from, to]);
  return {
    graph: {
      nodes: placeNodes(graph.nodes, edges),
      edges,
      nodeMeta: Object.fromEntries(Object.entries(graph.nodeMeta).map(([id, meta]) => [id, toNodeMeta(meta)])),
      tagGroups: graph.tagGroups,
      filterTags: graph.filterTags,
    },
    stats: res.stats,
    weekActivity: res.weekActivity,
    topTags: res.topTags.map(({ tag, count }) => ({ tag: withHash(tag), count })),
    todayTimeline: res.todayTimeline.map(({ startTime, endTime, tags, sites }) => ({
      time: `${startTime} — ${endTime ?? "진행 중"}`,
      tags: tags.map(withHash),
      sites: [...new Set(sites)].map(toTimelineSite),
    })),
    weekSessions: res.weekSessions.map(({ dayOffset, startedAt, tags, visits }) => ({
      dayOffset,
      startedAt,
      tags: tags.map(withHash),
      visits: visits.map(({ domain, dwellSec }) => ({ site: toTimelineSite(domain), dwellSec })),
    })),
    sessions: res.sessions,
  };
}
