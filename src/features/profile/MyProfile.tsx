"use client";

import { useMemo, useState } from "react";
import { getMyProfile } from "@/lib/api";
import { useApi } from "@/lib/hooks/useApi";
import { toMyProfilePage } from "./toProfilePage";
import { useMyCards, useMySessions } from "./useProfileRemote";
import { ProfileView } from "./ProfileView";

function MyProfileContent({ onSaved }: { onSaved: () => void }) {
  const profile = useApi(getMyProfile);
  const { cards, section: mindmapsSection } = useMyCards();
  const { items: sessions, section } = useMySessions();
  const data = useMemo(
    () => (profile.data ? { ...toMyProfilePage(profile.data), mindmaps: cards } : null),
    [profile.data, cards],
  );

  return (
    <ProfileView
      data={data}
      loading={profile.loading}
      error={profile.error}
      onRetry={profile.refetch}
      mindmapsSection={mindmapsSection}
      sessionsSection={{ ...section, sessions }}
      onSaved={onSaved}
    />
  );
}

/** /profile — 내 프로필. 저장하면 통째로 다시 마운트해 프로필 · 카드 · 세션 · 마인드맵을 서버 값으로 처음부터 다시 받는다 */
export function MyProfile() {
  const [version, setVersion] = useState(0);
  return <MyProfileContent key={version} onSaved={() => setVersion((v) => v + 1)} />;
}
