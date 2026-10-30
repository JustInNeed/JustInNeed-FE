"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { exchangeLoginCode, type LoginTokenResponse } from "@/lib/api";
import { clearPendingProvider, commitPendingProvider, setTokens } from "@/lib/auth/tokens";
import { setAuthToast } from "@/lib/auth/toast";
import styles from "./callback.module.css";

export default function OauthCallbackPage() {
  const router = useRouter();
  // StrictMode 에서 effect 가 두 번 돌아도 한 번만 처리한다 (일회용 코드라 두 번 교환하면 두 번째는 실패)
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;
    // useSearchParams 대신 window 직접 파싱 (Suspense 불필요 + 즉시 처리)
    const params = new URLSearchParams(window.location.search);
    // 주소창·히스토리에서 코드 쿼리 즉시 제거
    window.history.replaceState({}, "", "/oauth/callback");

    const fail = () => {
      clearPendingProvider();
      router.replace("/login?error=oauth");
    };
    const succeed = ({ accessToken, refreshToken, needsNickname }: LoginTokenResponse) => {
      setTokens({ accessToken, refreshToken });
      commitPendingProvider();
      setAuthToast({ kind: "login", justSignedUp: needsNickname });
      router.replace(needsNickname ? "/onboarding/nickname" : "/home");
    };

    const code = params.get("code");
    if (!code) {
      fail();
      return;
    }
    // cleanup 에서 취소하지 않는다 — StrictMode 의 두 번째 effect 는 위에서 바로 끝나므로 이 요청이 유일한 교환
    exchangeLoginCode(code).then((t) => (t?.accessToken && t.refreshToken ? succeed(t) : fail()), fail);
  }, [router]);

  return (
    <div className={styles.wrap}>
      <div className={styles.spinner} aria-hidden />
      <p className={styles.text}>로그인 처리 중…</p>
    </div>
  );
}
