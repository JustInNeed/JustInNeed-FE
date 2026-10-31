"use client";

import { AnalyticsView } from "@/features/analytics/AnalyticsView";
import {
  getAnalyticsCategories,
  getAnalyticsExploration,
  getAnalyticsReadingBehavior,
  getAnalyticsRecommendations,
  getAnalyticsTimePatterns,
  getAnalyticsWeekSessions,
} from "@/lib/api";
import { useApi } from "@/lib/hooks/useApi";

export default function AnalyticsPage() {
  const weekSessions = useApi(getAnalyticsWeekSessions);
  const exploration = useApi(getAnalyticsExploration);
  const readingBehavior = useApi(getAnalyticsReadingBehavior);
  const categories = useApi(getAnalyticsCategories);
  const timePatterns = useApi(getAnalyticsTimePatterns);
  const recommendations = useApi(getAnalyticsRecommendations);

  return (
    <AnalyticsView cards={{ weekSessions, exploration, readingBehavior, categories, timePatterns, recommendations }} />
  );
}
