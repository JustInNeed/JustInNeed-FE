"use client";

import { Icon } from "@/components/ui";
import type { AuthToastKind } from "@/lib/auth/toast";
import styles from "./AuthToast.module.css";

export interface AuthToastProps {
  kind: AuthToastKind;
  msg: string;
}

/** 화면 상단 중앙에 4.5초간 떠 있는 로그인/로그아웃 토스트. */
export function AuthToast({ kind, msg }: AuthToastProps) {
  return (
    <div className={`${styles.toast} ${kind === "login" ? styles.login : styles.logout}`} role="status">
      <Icon name={kind === "login" ? "check" : "lock"} size={14} />
      {msg}
    </div>
  );
}
