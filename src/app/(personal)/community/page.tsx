import { CommunityView } from "@/features/community/CommunityView";

export default function CommunityPage() {
  // 커뮤니티 API 가 생기기 전까지는 데이터 없이 빈 상태를 보여준다
  return <CommunityView data={null} />;
}
