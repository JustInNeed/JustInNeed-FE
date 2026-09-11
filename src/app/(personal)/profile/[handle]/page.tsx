import { ProfileView } from "@/features/profile/ProfileView";

export default async function OtherProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  return <ProfileView handle={decodeURIComponent(handle)} />;
}
