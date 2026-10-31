"use client";

import { useMemo } from "react";
import { HomeView } from "@/features/home/HomeView";
import { toHomeData } from "@/features/home/toHomeData";
import { getHome } from "@/lib/api";
import { useApi } from "@/lib/hooks/useApi";

export default function HomePage() {
  const { data, loading, error, refetch } = useApi(getHome);
  // 세션도 노드도 없으면 대시보드 대신 빈 상태
  const home = useMemo(
    () => (data && (data.sessions.length > 0 || data.graph.nodes.length > 0) ? toHomeData(data) : null),
    [data],
  );
  return <HomeView data={home} loading={loading} error={error} onRetry={refetch} />;
}
