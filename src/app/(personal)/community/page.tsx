"use client";

import { CommunityView } from "@/features/community/CommunityView";
import { toRecommendation } from "@/features/community/toCommunityData";
import { getInterestRecommendations, getRecentBookmarkRecommendations } from "@/lib/api";
import { useApi } from "@/lib/hooks/useApi";

export default function CommunityPage() {
  const interests = useApi(() => getInterestRecommendations().then(toRecommendation));
  const recentBookmarks = useApi(() => getRecentBookmarkRecommendations().then(toRecommendation));

  return <CommunityView sections={{ interests, recentBookmarks }} />;
}
