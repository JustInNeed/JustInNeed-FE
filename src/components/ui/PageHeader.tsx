import type { ReactNode } from "react";
import styles from "./PageHeader.module.css";

export interface PageHeaderProps {
  title: string;
  right?: ReactNode;
}

/** 화면 제목 — 제목 아래 설명글은 두지 않는다 (QA-013) */
export function PageHeader({ title, right }: PageHeaderProps) {
  return (
    <div className={styles.header}>
      <h1 className={styles.title}>{title}</h1>
      {right}
    </div>
  );
}
