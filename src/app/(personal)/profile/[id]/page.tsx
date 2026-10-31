import { OtherProfile } from "@/features/profile/OtherProfile";

export default async function OtherProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // 다른 프로필로 이동하면 좋아요 · 선택 상태가 새로 시작되도록 key 지정
  return <OtherProfile key={id} id={id} />;
}
