"use client";

import { CommunityView } from "@/features/community/CommunityView";
import { toRecommendation, toSimilarPersonRow, toTrendingHashtag } from "@/features/community/toCommunityData";
import {
  getInterestRecommendations,
  getRecentBookmarkRecommendations,
  getSimilarPeople,
  getTrendingHashtags,
} from "@/lib/api";
import { useApi } from "@/lib/hooks/useApi";

export default function CommunityPage() {
  const interests = useApi(() => getInterestRecommendations().then(toRecommendation));
  const recentBookmarks = useApi(() => getRecentBookmarkRecommendations().then(toRecommendation));
  const trendingToday = useApi(() => getTrendingHashtags("today").then((r) => r.hashtags.map(toTrendingHashtag)));
  const trendingWeek = useApi(() => getTrendingHashtags("week").then((r) => r.hashtags.map(toTrendingHashtag)));
  const similarPeople = useApi(() => getSimilarPeople().then((r) => r.people.map(toSimilarPersonRow)));

  return <CommunityView sections={{ interests, recentBookmarks, trendingToday, trendingWeek, similarPeople }} />;
}
