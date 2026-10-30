"use client";

import { useEffect, useState } from "react";
import { AuthScreen } from "@/features/auth/AuthScreen";
import { LandingStep } from "@/features/auth/steps/LandingStep";
import type { Provider } from "@/features/auth/providers";
import type { ProviderId } from "@/lib/types";
import { clearPendingProvider, getLastProvider, setPendingProvider } from "@/lib/auth/tokens";
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
    clearPendingProvider();
    toast.error("로그인에 실패했어요. 다시 시도해 주세요.");
    window.history.replaceState(null, "", "/login");
  }, [toast]);

  useEffect(() => {
    setLast(getLastProvider());
    const kind = consumeAuthToast()?.kind;
    const msg =
      kind === "logout"
        ? "로그아웃되었습니다."
        : kind === "withdraw"
          ? "탈퇴가 완료되었어요."
          : kind === "expired"
            ? "로그인이 만료되었습니다. 다시 로그인해 주세요."
            : null;
    if (msg) {
      setToastMsg(msg);
      const t = setTimeout(() => setToastMsg(null), 4500);
      return () => clearTimeout(t);
    }
  }, []);

  // 소셜 로그인 시작: SPA 라우팅이 아니라 브라우저 전체를 백엔드로 이동시켜야 함
  // "최근 사용"은 로그인 성공(콜백) 후에 확정
  const onPick = (provider: Provider) => {
    setPendingProvider(provider.id);
    window.location.href = `${BASE_URL}/oauth2/authorization/${provider.id}`;
  };

  return (
    <AuthScreen>
      <LandingStep lastProviderId={lastProvider} onPick={onPick} />
      {toastMsg && <AuthToast kind="logout" msg={toastMsg} />}
    </AuthScreen>
  );
}
