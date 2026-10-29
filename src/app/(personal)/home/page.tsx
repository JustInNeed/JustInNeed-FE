import { HomeView } from "@/features/home/HomeView";

export default function HomePage() {
  // 홈 집계 API 가 생기기 전까지는 데이터 없음(빈 상태)으로 보여준다
  return <HomeView data={null} />;
}
