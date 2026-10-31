"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { usePersonal } from "@/lib/app/PersonalContext";
import { toProfilePage } from "./toProfilePage";
import { useCommunityProfile, useProfileCards } from "./useProfileRemote";
import { ProfileView } from "./ProfileView";

/** 주소의 id 가 양의 정수가 아니면 null */
function parseUserId(id: string): number | null {
  if (!/^[1-9]\d*$/.test(id)) return null;
  const userId = Number(id);
  return Number.isSafeInteger(userId) ? userId : null;
}

/** /profile/{id} — 다른 사용자 프로필. 잘못된 주소는 요청 없이 not-found, 내 id 면 /profile 로 보낸다 */
export function OtherProfile({ id }: { id: string }) {
  const router = useRouter();
  const { member } = usePersonal();
  const userId = parseUserId(id);
  const mine = userId === member.id;
  const enabled = userId !== null && !mine;

  useEffect(() => {
    if (mine) router.replace("/profile");
  }, [mine, router]);

  const profile = useCommunityProfile(userId, enabled);
  const { cards, section } = useProfileCards(userId, enabled);
  const data = useMemo(
    () => (profile.data ? { ...toProfilePage(profile.data), mindmaps: cards } : null),
    [profile.data, cards],
  );

  if (userId === null || profile.notFound) return <ProfileView notFound data={null} />;
  return (
    <ProfileView
      userId={userId}
      data={data}
      loading={mine || profile.loading}
      error={profile.error}
      onRetry={profile.refetch}
      mindmapsSection={section}
    />
  );
}
