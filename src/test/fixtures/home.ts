// 홈 화면 픽스처 — 디자인 시안 값(design.ts)을 HomeData 모양으로 묶는다.
import type { HomeData } from "@/lib/viewTypes";
import {
  GRAPH_FILTER_TAGS,
  GRAPH_TAG_GROUPS,
  HOME_TIMELINE,
  HOME_TOP_TAGS,
  HOME_WEEK_ACTIVITY,
  HOME_WEEK_SESSIONS,
  MINDMAP_EDGES,
  MINDMAP_NODE_META,
  MINDMAP_NODES,
  MOCK_SESSIONS,
} from "./design";

export const HOME_DATA: HomeData = {
  graph: {
    nodes: MINDMAP_NODES,
    edges: MINDMAP_EDGES,
    nodeMeta: MINDMAP_NODE_META,
    tagGroups: GRAPH_TAG_GROUPS,
    filterTags: GRAPH_FILTER_TAGS,
  },
  // 시안 통계 카드: 누적 노드 218 (+12, 해시태그 47개) · 이번 주 세션 14 (+3, 평균 42분) · Deep Reading 68% (↑ 8%)
  stats: {
    totalNodes: 218,
    nodeDelta: 12,
    hashtagCount: 47,
    weekSessions: 14,
    sessionDelta: 3,
    avgSessionMinutes: 42,
    deepReadingPct: 68,
    deepReadingDelta: 8,
  },
  weekActivity: {
    range: "4.20 — 4.26",
    days: HOME_WEEK_ACTIVITY.map(({ d, mins }) => ({ day: d, minutes: mins })),
  },
  topTags: HOME_TOP_TAGS.map(({ tag, n }) => ({ tag, count: n })),
  todayTimeline: HOME_TIMELINE,
  weekSessions: HOME_WEEK_SESSIONS,
  sessions: MOCK_SESSIONS,
};

/** 데이터는 왔지만 아직 비어 있는 홈 (가입 직후 등) */
export const EMPTY_HOME_DATA: HomeData = {
  graph: { nodes: [], edges: [], nodeMeta: {}, tagGroups: [], filterTags: [] },
  stats: {
    totalNodes: 0,
    nodeDelta: 0,
    hashtagCount: 0,
    weekSessions: 0,
    sessionDelta: 0,
    avgSessionMinutes: 0,
    deepReadingPct: 0,
    deepReadingDelta: 0,
  },
  weekActivity: { range: "4.20 — 4.26", days: HOME_WEEK_ACTIVITY.map(({ d }) => ({ day: d, minutes: 0 })) },
  topTags: [],
  todayTimeline: [],
  weekSessions: [],
  sessions: [],
};
