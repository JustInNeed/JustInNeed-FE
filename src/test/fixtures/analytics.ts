// 분석 화면 픽스처 — 디자인 시안 값(design.ts)을 카드별 API 응답 모양으로 묶는다.
import type {
  AnalyticsCategories,
  AnalyticsExploration,
  AnalyticsReadingBehavior,
  AnalyticsRecommendations,
  AnalyticsTimePatterns,
  AnalyticsWeekSessions,
  WeekHourGrid,
} from "@/lib/api";
import { ACTION_RECOMMENDATIONS, CATEGORY_RATIO, WEEKLY_SESSIONS } from "./design";

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

export const WEEK_SESSIONS: AnalyticsWeekSessions = { sessions: WEEKLY_SESSIONS };

export const EXPLORATION: AnalyticsExploration = {
  // 시안: 세션 평균 URL 12개 · 평균 페이지 체류 42초 · 평균 세션 길이 1시간 14분
  avgUrlsPerSession: 12,
  avgDwellSec: 42,
  avgSessionMinutes: 74,
  type: "DISTRACTED",
  note: {
    analysis: "여러 페이지를 빠르게 오가며 탐색하는 경향이 있습니다.",
    recommendation:
      "지금 가장 중요한 문서 딱 하나만 남기고 나머지 탭은 잠시 닫아두세요. 15분만 타이머를 맞추고 하나의 글에만 온전히 몰입해 보는 걸 추천합니다.",
  },
};

export const READING_BEHAVIOR: AnalyticsReadingBehavior = {
  shares: { DEEP_READING: 42, READING: 26, SCANNING: 22, IDLE: 10 },
  note: { analysis: "한 번 읽기 시작하면 깊이 있게 이해하는 편입니다. **Deep Reading 비중 42%**로 가장 높아요.", recommendation: null },
};

export const CATEGORIES: AnalyticsCategories = {
  categories: CATEGORY_RATIO.map(({ name, pct, n }) => ({ name, pct, count: n })),
  note: {
    analysis: "현재 탐색은 **블로그** 중심으로 이루어지고 있습니다. (전체 탐색의 60%)",
    recommendation:
      "공식 문서도 한 번 정독해보세요. 지금 공부하는 주제의 공식 문서나 원문을 한 번쯤 읽으며 핵심 개념을 정리해보는 건 어떨까요?",
  },
};

export const TIME_PATTERNS: AnalyticsTimePatterns = {
  surfing: SURFING,
  focus: FOCUS,
  note: {
    analysis: "웹 탐색은 주로 **오후 3시 ~ 오후 6시**에 진행됩니다. 이 시간대에 가장 많은 정보 탐색과 읽기가 이루어지고 있어요.",
    recommendation: "**오전 9시 ~ 오후 12시**에 집중도가 가장 높아요. (정독 비율 68%로 가장 높은 시간대) 중요한 학습은 이 시간대를 활용해보세요.",
  },
};

export const RECOMMENDATIONS: AnalyticsRecommendations = { recommendations: ACTION_RECOMMENDATIONS };

const blank = [0, 0, 0, 0, 0, 0, 0, 0];

/** 실제 카드별 응답 (dev 스키마 Postgres 에 AI 콜백으로 저장한 세션에서 받은 모양) */
export const REAL_ANALYTICS = {
  weekSessions: {
    sessions: [
      { id: 2, title: "스프링 JPA 정리", startedAt: "2026-10-30T09:30:00", endedAt: "2026-10-30T10:10:00", pageCount: 3, status: "COMPLETED", isFavorite: false, isPublic: false, tags: [] },
      { id: 3, title: "페치 조인 비교", startedAt: "2026-10-29T20:00:00", endedAt: "2026-10-29T20:20:00", pageCount: 12, status: "COMPLETED", isFavorite: false, isPublic: false, tags: [] },
    ],
  },
  exploration: {
    avgUrlsPerSession: 6,
    avgDwellSec: 40,
    avgSessionMinutes: 30,
    type: "DISTRACTED",
    note: {
      analysis: "여러 페이지를 빠르게 오가며 탐색하는 경향이 있습니다.",
      recommendation: "지금 가장 중요한 문서 딱 하나만 남기고 나머지 탭은 잠시 닫아두세요. 15분만 타이머를 맞추고 하나의 글에만 온전히 몰입해 보는 걸 추천합니다.",
    },
  },
  readingBehavior: {
    shares: { DEEP_READING: 27, READING: 14, SCANNING: 32, IDLE: 27 },
    note: { analysis: "전체를 빠르게 훑으며 핵심을 찾는 경향이 있습니다. **Scanning 비중 32%**로 가장 높아요.", recommendation: null },
  },
  categories: {
    categories: [
      { name: "블로그", pct: 50, count: 3 },
      { name: "공식문서", pct: 33, count: 2 },
      { name: "커뮤니티", pct: 17, count: 1 },
      { name: "뉴스", pct: 0, count: 0 },
      { name: "기타", pct: 0, count: 0 },
    ],
    note: {
      analysis: "다양한 유형의 출처를 균형 있게 활용하고 있습니다. (블로그 50% / 공식문서 33% / 커뮤니티 17%)",
      recommendation: "공식 문서도 한 번 정독해보세요. 지금 공부하는 주제의 공식 문서나 원문을 한 번쯤 읽으며 핵심 개념을 정리해보는 건 어떨까요?",
    },
  },
  timePatterns: {
    surfing: [blank, blank, blank, [0, 0, 0, 0, 0, 0, 0.3, 0], [0, 0, 0, 1, 0, 0, 0, 0], blank, blank],
    focus: [blank, blank, blank, blank, [0, 0, 0, 0.9, 0, 0, 0, 0], blank, blank],
    note: {
      analysis: "웹 탐색은 주로 **오전 9시 ~ 오후 12시**에 진행됩니다. 이 시간대에 가장 많은 정보 탐색과 읽기가 이루어지고 있어요.",
      recommendation: "**오전 9시 ~ 오후 12시**에 집중도가 가장 높아요. (정독 비율 90%로 가장 높은 시간대) 중요한 학습은 이 시간대를 활용해보세요.",
    },
  },
  recommendations: {
    recommendations: [
      { title: "공식 문서도 한 번 정독해보세요.", body: "지금 공부하는 주제의 공식 문서나 원문을 한 번쯤 읽으며 핵심 개념을 정리해보는 건 어떨까요?" },
    ],
  },
};
