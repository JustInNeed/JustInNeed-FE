// GET /home 응답 → 홈 화면 데이터(HomeData). 표시용 모양만 바꾸고 순서는 응답 그대로 둔다.
// - 그래프 필터 재료(nodeMeta · tagGroups · filterTags)의 해시태그는 raw 그대로 (graphFilter 가 raw 로 비교)
// - 그 외 화면에 그대로 찍히는 해시태그에만 '#' 를 붙인다
import type { HomeGraphNode, HomeNodeMeta, HomeResponse } from "@/lib/api";
import { withHash } from "@/lib/format";
import type { MindmapNode } from "@/lib/types";
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

/** core 는 가운데, 나머지는 그룹 원 위에 응답 순서대로 같은 간격으로 놓는다 */
function placeNodes(nodes: HomeGraphNode[]): MindmapNode[] {
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

function toNodeMeta({ sessionId, ...meta }: HomeNodeMeta): GraphNodeMeta {
  return sessionId == null ? meta : { ...meta, sessionId };
}

export function toHomeData(res: HomeResponse): HomeData {
  const { graph } = res;
  return {
    graph: {
      nodes: placeNodes(graph.nodes),
      edges: graph.edges,
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
