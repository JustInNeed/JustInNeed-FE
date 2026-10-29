import { AnalyticsView } from "@/features/analytics/AnalyticsView";

export default function AnalyticsPage() {
  // 분석 API 가 생기기 전까지는 데이터 없음(빈 상태)으로 보여준다
  return <AnalyticsView data={null} />;
}
