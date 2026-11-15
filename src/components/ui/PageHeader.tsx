import type { ReactNode } from "react";
import { BackLink } from "./BackLink";
import styles from "./PageHeader.module.css";

export interface PageHeaderProps {
  title: string;
  right?: ReactNode;
}

/** 화면 제목 — 제목 아래 설명글은 두지 않는다 (QA-013). 다른 화면에서 들어왔으면 제목 위에 "← 이전 화면" (QA-025) */
export function PageHeader({ title, right }: PageHeaderProps) {
  return (
    <div className={styles.header}>
      <div>
        <BackLink />
        <h1 className={styles.title}>{title}</h1>
      </div>
      {right}
    </div>
  );
}
