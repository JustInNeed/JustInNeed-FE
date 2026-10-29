"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { clearPendingProvider, commitPendingProvider, setTokens } from "@/lib/auth/tokens";
import { setAuthToast } from "@/lib/auth/toast";
import styles from "./callback.module.css";

export default function OauthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // useSearchParams 대신 window 직접 파싱 (Suspense 불필요 + 즉시 처리)
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get("accessToken");
    const refreshToken = params.get("refreshToken");
    const needsNickname = params.get("needsNickname"); // 문자열 "true"/"false"

    if (!accessToken || !refreshToken) {
      clearPendingProvider();
      router.replace("/login?error=oauth");
      return;
    }

    setTokens({ accessToken, refreshToken });
    commitPendingProvider();
    setAuthToast({ kind: "login", justSignedUp: needsNickname === "true" });
    // 주소창·히스토리에서 토큰 쿼리 즉시 제거
    window.history.replaceState({}, "", "/oauth/callback");

    router.replace(needsNickname === "true" ? "/onboarding/nickname" : "/home");
  }, [router]);

  return (
    <div className={styles.wrap}>
      <div className={styles.spinner} aria-hidden />
      <p className={styles.text}>로그인 처리 중…</p>
    </div>
  );
}
