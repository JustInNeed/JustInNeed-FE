import type { ReactNode } from "react";
import { Icon } from "./Icon";
import styles from "./Feedback.module.css";

export type BannerTone = "warning" | "error";

export interface BannerProps {
  tone: BannerTone;
  children: ReactNode;
}

/** 카드 · 섹션 상단 경고 배너 (오류 메시지 후보 C). */
export function Banner({ tone, children }: BannerProps) {
  return (
    <div className={`${styles.banner} ${styles[`banner_${tone}`]}`} role={tone === "error" ? "alert" : "status"}>
      <Icon name={tone === "error" ? "alert" : "warning"} size={16} stroke={2} />
      <span>{children}</span>
    </div>
  );
}
