import type { CSSProperties, ReactNode } from "react";
import styles from "./Card.module.css";

export interface CardProps {
  children?: ReactNode;
  style?: CSSProperties;
  className?: string;
}

export function Card({ children, style, className }: CardProps) {
  return (
    <div className={[styles.card, className].filter(Boolean).join(" ")} style={style}>
      {children}
    </div>
  );
}
