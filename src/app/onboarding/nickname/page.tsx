"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthScreen } from "@/features/auth/AuthScreen";
import { NicknameStep } from "@/features/auth/steps/NicknameStep";
import { ApiError, getMe, updateNickname, SOCIAL_PROVIDER_LABEL } from "@/lib/api";
import { getAccessToken } from "@/lib/auth/tokens";

export default function NicknameOnboardingPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [providerLabel, setProviderLabel] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    getMe()
      .then((m) => {
        if (m.nickname) {
          // 이미 닉네임이 있으면 온보딩 불필요
          router.replace("/sessions");
          return;
        }
        setProviderLabel(SOCIAL_PROVIDER_LABEL[m.socialProvider]);
        setReady(true);
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  const submit = async (nickname: string) => {
    setSubmitting(true);
    setError(null);
    try {
      await updateNickname(nickname);
      router.replace("/sessions");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "닉네임 설정에 실패했습니다.");
      setSubmitting(false);
    }
  };

  if (!ready) return null;

  return (
    <AuthScreen>
      <NicknameStep onSubmit={submit} submitting={submitting} error={error} providerLabel={providerLabel} />
    </AuthScreen>
  );
}
