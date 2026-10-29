import { ProfileView } from "@/features/profile/ProfileView";

export default async function OtherProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const decoded = decodeURIComponent(handle);
  // 다른 프로필로 이동하면 좋아요 · 선택 상태가 새로 시작되도록 key 지정
  // 프로필 API 가 생기면 여기서 불러와 넘긴다. 그전까지는 빈 상태
  return <ProfileView key={decoded} handle={decoded} data={null} />;
}
