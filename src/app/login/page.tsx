"use client";

import { useEffect, useState } from "react";
import { AuthScreen } from "@/features/auth/AuthScreen";
import { LandingStep } from "@/features/auth/steps/LandingStep";
import type { Provider } from "@/features/auth/providers";
import type { ProviderId } from "@/lib/types";
import { getLastProvider, setLastProvider } from "@/lib/auth/tokens";
import { consumeAuthToast } from "@/lib/auth/toast";
import { AuthToast } from "@/components/layout/AuthToast";
import { useToast } from "@/lib/app/ToastContext";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export default function LoginPage() {
  const [lastProvider, setLast] = useState<ProviderId | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toast = useToast();

  // OAuth 실패 시 BE / 콜백이 /login?error=oauth 로 돌려보냄 → 로그인 화면 그대로 + 에러 토스트
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") !== "oauth") return;
    toast.error("로그인에 실패했어요. 다시 시도해 주세요.");
    window.history.replaceState(null, "", "/login");
  }, [toast]);

  useEffect(() => {
    setLast(getLastProvider());
    const kind = consumeAuthToast()?.kind;
    const msg =
      kind === "logout"
        ? "로그아웃되었습니다. 확장 프로그램도 함께 종료되었어요."
        : kind === "withdraw"
          ? "탈퇴가 완료되었어요."
          : null;
    if (msg) {
      setToastMsg(msg);
      const t = setTimeout(() => setToastMsg(null), 4500);
      return () => clearTimeout(t);
    }
  }, []);

  // 소셜 로그인 시작: SPA 라우팅이 아니라 브라우저 전체를 백엔드로 이동시켜야 함
  const onPick = (provider: Provider) => {
    setLastProvider(provider.id);
    window.location.href = `${BASE_URL}/oauth2/authorization/${provider.id}`;
  };

  return (
    <AuthScreen>
      <LandingStep lastProviderId={lastProvider} onPick={onPick} />
      {toastMsg && <AuthToast kind="logout" msg={toastMsg} />}
    </AuthScreen>
  );
}
