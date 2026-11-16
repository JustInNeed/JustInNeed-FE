import type { HTMLAttributes } from "react";
import styles from "./Card.module.css";

/** div 속성(이벤트 등)을 그대로 넘길 수 있다 — 분석 배너가 마우스 · 포커스로 자동 넘김을 멈출 때 쓴다 (QA-037) */
export type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({ children, className, ...rest }: CardProps) {
  return (
    <div {...rest} className={[styles.card, className].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}
