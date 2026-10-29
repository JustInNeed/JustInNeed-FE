import type { ReactNode } from "react";
import { Icon } from "./Icon";
import styles from "./Feedback.module.css";

export type FieldMessageTone = "error" | "success";

export interface FieldMessageProps {
  tone: FieldMessageTone;
  /** 입력칸의 aria-describedby 와 연결할 id */
  id?: string;
  children: ReactNode;
}

/** 입력칸 바로 아래 오류 / 성공 문구 (오류 메시지 후보 C). 오류일 때 입력칸에는 aria-invalid 를 붙인다. */
export function FieldMessage({ tone, id, children }: FieldMessageProps) {
  return (
    <p id={id} className={`${styles.fieldMsg} ${styles[`fieldMsg_${tone}`]}`} role={tone === "error" ? "alert" : "status"}>
      <Icon name={tone === "error" ? "alert" : "check"} size={13} stroke={2.2} />
      {children}
    </p>
  );
}
