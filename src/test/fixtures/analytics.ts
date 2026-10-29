// 분석 화면 픽스처 — 디자인 시안 값(design.ts)을 AnalyticsData 모양으로 묶는다.
import type { AnalyticsData, WeekHourGrid } from "@/lib/viewTypes";
import { ACTION_RECOMMENDATIONS, CATEGORY_RATIO, SURFING_TIPS, WEEKLY_SESSIONS } from "./design";

/** [요일 0=월 ~ 6=일][구간 0=00시 ~ 7=21시] */
const grid = (value: (day: number, slot: number) => number): WeekHourGrid =>
  Array.from({ length: 7 }, (_, day) => Array.from({ length: 8 }, (_, slot) => value(day, slot)));

// 시안 히트맵 — 웹서핑은 평일 15~21시 · 주말 0시에 많고, 집중은 평일 9시(95%)에 가장 높다
const SURFING = grid((di, hi) => {
  if (hi >= 5 && hi <= 7 && di < 5) return 0.8;
  if (hi === 0 && di >= 5) return 0.7;
  if (hi === 4) return 0.4;
  return 0.1 + ((di * 5 + hi * 11) % 5) / 14;
});
const FOCUS = grid((di, hi) => {
  if (hi === 3 && di < 5) return 0.95;
  if (hi === 4 && di < 5) return 0.6;
  if (hi === 7 && di >= 5) return 0.55;
  if (hi === 1) return 0.05;
  return 0.1 + ((di * 3 + hi * 7) % 5) / 18;
});

export const ANALYTICS_DATA: AnalyticsData = {
  weekSessions: WEEKLY_SESSIONS,
  surfingTips: SURFING_TIPS,
  actionRecommendations: ACTION_RECOMMENDATIONS,
  // 시안: 세션 평균 URL 12개 · 평균 페이지 체류 42초 · 평균 세션 길이 1시간 14분
  exploration: { avgUrlsPerSession: 12, avgDwellSec: 42, avgSessionMinutes: 74 },
  readingBehavior: { DEEP_READING: 42, READING: 26, SCANNING: 22, IDLE: 10 },
  categoryRatio: CATEGORY_RATIO.map(({ name, pct, n }) => ({ name, pct, count: n })),
  heatmap: { surfing: SURFING, focus: FOCUS },
  notes: {
    exploration: {
      analysis: "여러 페이지를 빠르게 오가며 탐색하는 경향이 있습니다.",
      recommendation:
        "지금 가장 중요한 문서 딱 하나만 남기고 나머지 탭은 잠시 닫아두세요. 15분만 타이머를 맞추고 하나의 글에만 온전히 몰입해 보는 걸 추천합니다.",
    },
    reading: {
      analysis:
        "한 번 읽기 시작하면 끝까지 깊이 있게 이해하는 편입니다. **Deep Reading 비중 42%**로 탭을 자주 전환하지 않고 한 글에 머무는 시간이 길어요.",
    },
    category: {
      analysis: "현재 탐색은 **블로그와 커뮤니티** 중심으로 이루어지고 있습니다. (전체의 60%)",
      recommendation:
        "지금 공부하시는 주제에 대해 공식 문서나 원문을 한 번쯤 정독하며 기초를 다져보는 건 어떨까요? 핵심 개념은 공식 문서나 원문을 통해 한 번 정리해보세요.",
    },
    timePattern: {
      analysis:
        "활발한 웹서핑 시간은 **낮 1–3시**이지만, 실제 **집중도가 가장 높은 시간은 오전 9–11시**입니다. 중요한 학습은 이 시간대를 활용해보세요.",
    },
  },
};
