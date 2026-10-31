import { api } from "./client";
import type {
  AnalyticsCategories,
  AnalyticsExploration,
  AnalyticsReadingBehavior,
  AnalyticsRecommendations,
  AnalyticsTimePatterns,
  AnalyticsWeekSessions,
} from "./types";

// 대상은 내 완료 세션, 기간은 오늘 포함 최근 7일. 보여줄 데이터가 없으면 응답 data 가 null 이다 (useApi 의 data 도 null)
export const getAnalyticsWeekSessions = () => api.get<AnalyticsWeekSessions>("/analytics/week-sessions");
export const getAnalyticsExploration = () => api.get<AnalyticsExploration>("/analytics/exploration");
export const getAnalyticsReadingBehavior = () => api.get<AnalyticsReadingBehavior>("/analytics/reading-behavior");
export const getAnalyticsCategories = () => api.get<AnalyticsCategories>("/analytics/categories");
export const getAnalyticsTimePatterns = () => api.get<AnalyticsTimePatterns>("/analytics/time-patterns");
export const getAnalyticsRecommendations = () => api.get<AnalyticsRecommendations>("/analytics/recommendations");
