// 홈 "이번 주" 탐색 타임라인 — 최근 7일(오늘 포함)을 날짜별로 묶어 대표 해시태그 · 사이트를 뽑는다.
// - 대표 해시태그: 그날 세션 중 등장한 세션 수가 많은 순, 같으면 더 최근 세션의 태그 우선
// - 대표 사이트: 그날 방문 도메인 중 방문 횟수가 많은 순, 같으면 체류 시간 합이 긴 쪽 우선
import type { TimelineSite, WeekSession } from "@/lib/viewTypes";

const MAX_TAGS = 3;
const MAX_SITES = 3;
const DOW = ["일", "월", "화", "수", "목", "금", "토"];

export interface WeekTimelineDay {
  key: string;
  label: string;
  isToday: boolean;
  tags: string[];
  sites: TimelineSite[];
}

export function buildWeekTimeline(sessions: WeekSession[], today = new Date()): WeekTimelineDay[] {
  const days: WeekTimelineDay[] = [];
  for (let offset = -6; offset <= 0; offset++) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
    const daySessions = sessions.filter((s) => s.dayOffset === offset);
    days.push({
      key: String(offset),
      label: `${date.getMonth() + 1}/${date.getDate()} (${DOW[date.getDay()]})`,
      isToday: offset === 0,
      tags: pickTags(daySessions),
      sites: pickSites(daySessions),
    });
  }
  return days;
}

function pickTags(sessions: WeekSession[]): string[] {
  const stats = new Map<string, { count: number; latest: string }>();
  for (const s of sessions) {
    for (const tag of new Set(s.tags)) {
      const cur = stats.get(tag);
      if (!cur) stats.set(tag, { count: 1, latest: s.startedAt });
      else stats.set(tag, { count: cur.count + 1, latest: s.startedAt > cur.latest ? s.startedAt : cur.latest });
    }
  }
  return [...stats.entries()]
    .sort(([, a], [, b]) => b.count - a.count || b.latest.localeCompare(a.latest))
    .slice(0, MAX_TAGS)
    .map(([tag]) => tag);
}

function pickSites(sessions: WeekSession[]): TimelineSite[] {
  const stats = new Map<string, { site: TimelineSite; visits: number; dwell: number }>();
  for (const s of sessions) {
    for (const { site, dwellSec } of s.visits) {
      const cur = stats.get(site.name) ?? { site, visits: 0, dwell: 0 };
      stats.set(site.name, { site, visits: cur.visits + 1, dwell: cur.dwell + dwellSec });
    }
  }
  return [...stats.values()]
    .sort((a, b) => b.visits - a.visits || b.dwell - a.dwell)
    .slice(0, MAX_SITES)
    .map((x) => x.site);
}
