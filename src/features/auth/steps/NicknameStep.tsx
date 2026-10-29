import { useRef, useState } from "react";
import { Icon } from "@/components/ui";
import {
  NICKNAME_AVAILABLE_MESSAGE,
  NICKNAME_CHECK_FAILED_MESSAGE,
  NICKNAME_FORMAT_ERROR,
  NICKNAME_MAX_LENGTH,
  NICKNAME_TAKEN_MESSAGE,
  checkNicknameAvailable,
  isValidNickname,
  type CheckNickname,
} from "@/lib/nickname";
import styles from "../auth.module.css";
import { SignupSteps } from "./SignupSteps";

export interface NicknameStepProps {
  onSubmit: (nickname: string) => void;
  submitting?: boolean;
  /** 서버/제출 에러 메시지. */
  error?: string | null;
  /** "{provider} 계정 인증 완료" 표시용 (선택). */
  providerLabel?: string;
  /** 중복 확인 — 기본은 형식만 보고 통과 (lib/nickname) */
  checkNickname?: CheckNickname;
}

type CheckStatus = null | "checking" | "ok" | "taken" | "failed";

export function NicknameStep({
  onSubmit,
  submitting = false,
  error = null,
  providerLabel,
  checkNickname = checkNicknameAvailable,
}: NicknameStepProps) {
  const [nickname, setNickname] = useState("");
  const [status, setStatus] = useState<CheckStatus>(null);
  // 확인 중에 입력이 바뀌면 늦게 온 결과는 버린다
  const latest = useRef(nickname);
  // 제출 에러는 그 닉네임을 그대로 두는 동안만 보여준다
  const [submitted, setSubmitted] = useState<string | null>(null);
  const formatOk = isValidNickname(nickname);
  const canCheck = formatOk && status !== "checking" && !submitting;
  const canSubmit = formatOk && status === "ok" && !submitting;
  const serverError = error && nickname === submitted ? error : null;

  const onCheck = async () => {
    if (!canCheck) return;
    const value = nickname;
    setStatus("checking");
    let next: CheckStatus;
    try {
      next = (await checkNickname(value)) ? "ok" : "taken";
    } catch {
      next = "failed";
    }
    if (latest.current === value) setStatus(next);
  };

  const submit = () => {
    if (!canSubmit) return;
    setSubmitted(nickname);
    onSubmit(nickname);
  };

  return (
    <div className={`${styles.card} ${styles.pad}`}>
      <SignupSteps current={2} />
      <h2 className={styles.h2}>닉네임을 정해주세요</h2>
      <p className={styles.desc}>다른 사용자에게 보여질 이름이에요. 가입 후에도 언제든 변경할 수 있어요.</p>

      <label className={styles.fieldLabel}>닉네임</label>
      <div className={styles.nickRow}>
        <input
          autoFocus
          value={nickname}
          onChange={(e) => {
            latest.current = e.target.value;
            setNickname(e.target.value);
            setStatus(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          maxLength={NICKNAME_MAX_LENGTH}
          placeholder="영문 3-8자"
          className={styles.nickInput}
          style={{ minWidth: 0 }}
        />
        <button onClick={onCheck} disabled={!canCheck} className={`${styles.checkBtn} ${canCheck ? styles.checkBtnOn : ""}`}>
          {status === "checking" ? "확인 중…" : "중복 확인"}
        </button>
      </div>

      <div className={styles.statusLine}>
        {nickname.length > 0 && !formatOk ? (
          <span className={styles.statusError}>{NICKNAME_FORMAT_ERROR}</span>
        ) : serverError ? (
          <span className={styles.statusError}>{serverError}</span>
        ) : status === "ok" ? (
          <span className={styles.statusOk}>
            <Icon name="check" size={11} /> {NICKNAME_AVAILABLE_MESSAGE}
          </span>
        ) : status === "taken" ? (
          <span className={styles.statusError}>{NICKNAME_TAKEN_MESSAGE}</span>
        ) : status === "failed" ? (
          <span className={styles.statusError}>{NICKNAME_CHECK_FAILED_MESSAGE}</span>
        ) : (
          formatOk && status === null && <span className={styles.statusHint}>중복 확인 버튼을 눌러주세요.</span>
        )}
      </div>

      <button
        onClick={submit}
        disabled={!canSubmit}
        className={`${styles.nextBtn} ${canSubmit ? styles.nextBtnOn : styles.nextBtnOff}`}
      >
        {submitting ? "처리 중…" : "다음"}
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
