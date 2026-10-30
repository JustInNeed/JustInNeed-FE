"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthScreen } from "@/features/auth/AuthScreen";
import { NicknameStep } from "@/features/auth/steps/NicknameStep";
import { CompleteStep } from "@/features/auth/steps/CompleteStep";
import { ApiError, getMe, SessionExpiredError, updateNickname, SOCIAL_PROVIDER_LABEL } from "@/lib/api";
import { getAccessToken } from "@/lib/auth/tokens";
import { consumeAuthToast } from "@/lib/auth/toast";

export default function NicknameOnboardingPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [providerLabel, setProviderLabel] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 닉네임 저장 성공 → 완료 화면
  const [completed, setCompleted] = useState<string | null>(null);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    getMe()
      .then((m) => {
        if (m.nickname) {
          // 이미 닉네임이 있으면 온보딩 불필요
          router.replace("/home");
          return;
        }
        setProviderLabel(SOCIAL_PROVIDER_LABEL[m.socialProvider]);
        setReady(true);
      })
      .catch((e) => {
        // 세션 만료는 클라이언트가 전체 이동 중 (또 이동하면 만료 안내가 사라진다)
        if (e instanceof SessionExpiredError) return;
        router.replace("/login");
      });
  }, [router]);

  const submit = async (nickname: string) => {
    setSubmitting(true);
    setError(null);
    try {
      const updated = await updateNickname(nickname);
      // 완료 화면이 환영 인사를 대신하므로 홈의 가입 환영 토스트는 띄우지 않는다
      consumeAuthToast();
      setCompleted(updated.nickname ?? nickname);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "닉네임 설정에 실패했습니다.");
      setSubmitting(false);
    }
  };

  if (!ready) return null;

  return (
    <AuthScreen>
      {completed ? (
        <CompleteStep nickname={completed} onStart={() => router.replace("/home")} />
      ) : (
        <NicknameStep onSubmit={submit} submitting={submitting} error={error} providerLabel={providerLabel} />
      )}
    </AuthScreen>
  );
}
