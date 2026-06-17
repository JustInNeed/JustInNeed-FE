import { useState } from "react";
import { Icon } from "@/components/ui";
import styles from "../auth.module.css";

export interface NicknameStepProps {
  onSubmit: (nickname: string) => void;
  submitting?: boolean;
  /** 서버/제출 에러 메시지. */
  error?: string | null;
  /** "{provider} 계정 인증 완료" 표시용 (선택). */
  providerLabel?: string;
}

// FE 측 형식 검증 (서버 검증 없음): 영문으로 시작하는 3-8자(영문·숫자)
const FORMAT = /^[a-zA-Z][a-zA-Z0-9]{2,7}$/;

export function NicknameStep({ onSubmit, submitting = false, error = null, providerLabel }: NicknameStepProps) {
  const [nickname, setNickname] = useState("");
  const formatOk = FORMAT.test(nickname);
  const canSubmit = formatOk && !submitting;

  return (
    <div className={`${styles.card} ${styles.pad}`}>
      <h2 className={styles.h2}>닉네임을 정해주세요</h2>
      <p className={styles.desc}>다른 사용자에게 보여질 이름이에요. 가입 후에도 언제든 변경할 수 있어요.</p>

      <label className={styles.fieldLabel}>닉네임</label>
      <input
        autoFocus
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && canSubmit) onSubmit(nickname);
        }}
        maxLength={8}
        placeholder="영문 3-8자"
        className={styles.nickInput}
        style={{ width: "100%", marginTop: 6, boxSizing: "border-box" }}
      />

      <div className={styles.statusLine}>
        {nickname.length > 0 && !formatOk && (
          <span className={styles.statusError}>영문으로 시작하는 3-8자(영문·숫자)로 입력해주세요.</span>
        )}
        {formatOk && !error && <span className={styles.statusOk}><Icon name="check" size={11} /> 사용 가능한 형식이에요.</span>}
        {error && <span className={styles.statusError}>{error}</span>}
      </div>

      <button
        onClick={() => canSubmit && onSubmit(nickname)}
        disabled={!canSubmit}
        className={`${styles.nextBtn} ${canSubmit ? styles.nextBtnOn : styles.nextBtnOff}`}
      >
        {submitting ? "처리 중…" : "완료"}
      </button>

      {providerLabel && (
        <div className={styles.verifiedBox}>
          <span className={styles.verifiedText}>{providerLabel} 계정 인증 완료</span>
          <Icon name="check" size={12} style={{ color: "var(--green-600)" }} />
        </div>
      )}
    </div>
  );
}
