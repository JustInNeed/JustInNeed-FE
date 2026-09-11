import type { ReactNode } from "react";
import styles from "./Field.module.css";

export interface FieldProps {
  label: string;
  hint?: string;
  children: ReactNode;
}

/** 라벨 + 힌트 + 입력 컨트롤 묶음. 입력 자체는 `inputClass` 를 붙여 스타일 통일. */
export function Field({ label, hint, children }: FieldProps) {
  return (
    <div className={styles.field}>
      <div className={styles.head}>
        <label className={styles.label}>{label}</label>
        {hint && <span className={styles.hint}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export const inputClass = styles.input;
