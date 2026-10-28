"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { AuthToast, type AuthToastProps } from "@/components/layout/AuthToast";
import { getMe, logout, SOCIAL_PROVIDER_LABEL, type MemberResponse } from "@/lib/api";
import { clearTokens, getAccessToken, getRefreshToken } from "@/lib/auth/tokens";
import { consumeAuthToast, setAuthToast } from "@/lib/auth/toast";
import { PersonalProvider } from "@/lib/app/PersonalContext";
import styles from "./layout.module.css";

export default function PersonalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [member, setMember] = useState<MemberResponse | null>(null);
  const [toast, setToast] = useState<AuthToastProps | null>(null);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    getMe()
      .then((m) => {
        if (!m.nickname) {
          router.replace("/onboarding/nickname"); // 가입 미완료
          return;
        }
        setMember(m);
        // 로그인 직후 1회: 환영/동기화 토스트
        const flag = consumeAuthToast();
        if (flag?.kind === "login") {
          setToast({
            kind: "login",
            msg: flag.justSignedUp
              ? `${m.nickname}님 환영합니다! 확장 프로그램에도 자동 로그인되었어요.`
              : `${SOCIAL_PROVIDER_LABEL[m.socialProvider]} 계정으로 로그인되었어요. 확장 프로그램도 동기화 완료.`,
          });
        }
      })
      .catch(() => {
        // 401은 클라이언트가 refresh/redirect 처리 → 그 외 오류는 로그인으로
        clearTokens();
        router.replace("/login");
      });
  }, [router]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  const onLogout = async () => {
    if (!confirm("로그아웃하시겠어요? 확장 프로그램에서도 로그아웃됩니다.")) return;
    try {
      await logout(getRefreshToken() ?? undefined);
    } catch {
      /* 서버 실패해도 로컬 토큰은 삭제 */
    }
    clearTokens();
    setAuthToast({ kind: "logout" });
    router.replace("/login");
  };

  // member가 준비될 때까지 셸을 그리지 않음 (깜빡임 방지)
  if (!member) return null;

  return (
    <PersonalProvider member={member} logout={onLogout}>
      <div className={styles.shell}>
        <Sidebar />
        <main className={styles.main}>{children}</main>
        {toast && <AuthToast {...toast} />}
      </div>
    </PersonalProvider>
  );
}
