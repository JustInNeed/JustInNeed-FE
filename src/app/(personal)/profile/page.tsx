import { ProfileView } from "@/features/profile/ProfileView";

export default function MyProfilePage() {
  // 프로필 API 가 생기면 여기서 불러와 넘긴다. 그전까지는 데이터 없이 (닉네임만 채운 빈 프로필)
  return <ProfileView data={null} />;
}
