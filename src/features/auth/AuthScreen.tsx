import type { ReactNode } from "react";
import styles from "./auth.module.css";

/** 인증 화면 공통 배경(그라데이션 + 중앙 정렬). 로그인/온보딩에서 사용. */
export function AuthScreen({ children }: { children: ReactNode }) {
  return <div className={styles.screen}>{children}</div>;
}
