import type { ReactNode } from "react";
import { Icon } from "./Icon";
import styles from "./Feedback.module.css";

export type InlineStateKind = "error" | "empty";

export interface InlineStateProps {
  kind: InlineStateKind;
  title: string;
  description?: ReactNode;
  /** 있으면 "다시 시도" 버튼 표시 */
  onRetry?: () => void;
  retryLabel?: string;
}

/** 카드 · 영역 안에 보여주는 불러오기 실패 / 빈 상태 (오류 메시지 후보 C). */
export function InlineState({ kind, title, description, onRetry, retryLabel = "다시 시도" }: InlineStateProps) {
  return (
    <div className={`${styles.state} ${styles[`state_${kind}`]}`} role={kind === "error" ? "alert" : "status"}>
      <span className={styles.stateIcon}>
        <Icon name={kind === "error" ? "refresh" : "sprout"} size={18} stroke={kind === "error" ? 2 : 1.8} />
      </span>
      <p className={styles.stateTitle}>{title}</p>
      {description && <p className={styles.stateDesc}>{description}</p>}
      {onRetry && (
        <button type="button" onClick={onRetry} className={styles.stateRetry}>
          {retryLabel}
        </button>
      )}
    </div>
  );
}
