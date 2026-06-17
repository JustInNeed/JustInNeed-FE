"use client";

import { useEffect, useState } from "react";
import { AuthScreen } from "@/features/auth/AuthScreen";
import { LandingStep } from "@/features/auth/steps/LandingStep";
import type { Provider } from "@/features/auth/providers";
import type { ProviderId } from "@/lib/types";
import { getLastProvider, setLastProvider } from "@/lib/auth/tokens";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export default function LoginPage() {
  const [lastProvider, setLast] = useState<ProviderId | null>(null);
  useEffect(() => setLast(getLastProvider()), []);

  // 소셜 로그인 시작: SPA 라우팅이 아니라 브라우저 전체를 백엔드로 이동시켜야 함
  const onPick = (provider: Provider) => {
    setLastProvider(provider.id);
    window.location.href = `${BASE_URL}/oauth2/authorization/${provider.id}`;
  };

  return (
    <AuthScreen>
      <LandingStep lastProviderId={lastProvider} onPick={onPick} />
    </AuthScreen>
  );
}
