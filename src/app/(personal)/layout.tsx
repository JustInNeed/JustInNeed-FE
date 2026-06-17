"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { getMe, logout, type MemberResponse } from "@/lib/api";
import { clearTokens, getAccessToken, getRefreshToken } from "@/lib/auth/tokens";
import styles from "./layout.module.css";

export default function PersonalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [member, setMember] = useState<MemberResponse | null>(null);

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
      })
      .catch(() => {
        // 401은 클라이언트가 refresh/redirect 처리 → 그 외 오류는 로그인으로
        clearTokens();
        router.replace("/login");
      });
  }, [router]);

  const onLogout = async () => {
    if (!confirm("로그아웃하시겠어요?")) return;
    try {
      await logout(getRefreshToken() ?? undefined);
    } catch {
      /* 서버 실패해도 로컬 토큰은 삭제 */
    }
    clearTokens();
    router.replace("/login");
  };

  // member가 준비될 때까지 셸을 그리지 않음 (깜빡임 방지)
  if (!member) return null;

  return (
    <div className={styles.shell}>
      <Sidebar member={member} onLogout={onLogout} />
      <main className={styles.main}>{children}</main>
    </div>
  );
}
