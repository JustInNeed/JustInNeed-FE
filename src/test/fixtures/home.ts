// 홈 화면 픽스처 — 디자인 시안 값(design.ts)을 HomeData 모양으로 묶는다.
import type { HomeResponse } from "@/lib/api";
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

/** GET /home 응답 — 2026-10-31(토) 기준 최근 7일 */
export const HOME_RESPONSE: HomeResponse = {
  graph: {
    nodes: [
      { id: "core", label: "내 탐색", size: 28, group: "core" },
      { id: "n1", label: "로마", size: 20, group: "city" },
      { id: "n2", label: "파리", size: 22, group: "city" },
      { id: "n3", label: "항공권", size: 16, group: "logi" },
      { id: "n4", label: "콜로세움", size: 9, group: "sub" },
      { id: "n5", label: "에펠탑", size: 10, group: "sub" },
      { id: "n6", label: "짐싸기", size: 9, group: "sub" },
    ],
    edges: [
      ["core", "n1"],
      ["core", "n2"],
      ["core", "n3"],
      ["n1", "n4"],
      ["n2", "n5"],
      ["n3", "n6"],
    ],
    nodeMeta: {
      n1: { seen: "today", tags: ["로마"], sessionId: 9002 }, // 해시태그로 찾으면 9001 인 노드
      n2: { seen: "week", tags: ["파리"], sessionId: 7777 }, // sessions(최대 300개)에 없는 세션
      n3: { seen: "month", tags: ["항공권"], sessionId: null },
      n4: { seen: "all", tags: ["로마", "콜로세움"], sessionId: 9001 },
    },
    tagGroups: [{ id: 1, name: "유럽 여행", tags: ["로마", "파리"] }],
    filterTags: ["로마", "파리"],
  },
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
    range: "10.25 — 10.31",
    days: [
      { day: "일", minutes: 38 },
      { day: "월", minutes: 94 },
      { day: "화", minutes: 67 },
      { day: "수", minutes: 0 },
      { day: "목", minutes: 110 },
      { day: "금", minutes: 77 },
      { day: "토", minutes: 120 },
    ],
  },
  topTags: [
    { tag: "파리", count: 28 },
    { tag: "로마", count: 24 },
  ],
  todayTimeline: [
    { startTime: "09:00", endTime: "10:30", tags: ["자바", "스프링"], sites: ["docs.spring.io", "velog.io"] },
    { startTime: "21:10", endTime: null, tags: ["파리"], sites: ["skyscanner.net"] },
  ],
  weekSessions: [
    {
      dayOffset: -6,
      startedAt: "10:10",
      tags: ["파리"],
      visits: [
        { domain: "skyscanner.net", dwellSec: 420 },
        { domain: "parisinfo.com", dwellSec: 300 },
        { domain: "parisinfo.com", dwellSec: 120 },
      ],
    },
    {
      dayOffset: 0,
      startedAt: "09:00",
      tags: ["자바", "스프링"],
      visits: [{ domain: "docs.spring.io", dwellSec: 500 }],
    },
  ],
  sessions: MOCK_SESSIONS,
};

/** 기록이 없는 회원의 GET /home 응답 */
export const EMPTY_HOME_RESPONSE: HomeResponse = {
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
  weekActivity: {
    range: "10.25 — 10.31",
    days: ["일", "월", "화", "수", "목", "금", "토"].map((day) => ({ day, minutes: 0 })),
  },
  topTags: [],
  todayTimeline: [],
  weekSessions: [],
  sessions: [],
};
