import { useState } from "react";
import { Icon } from "@/components/ui";
import { PROVIDER_LABEL, type Provider } from "../providers";
import styles from "../auth.module.css";

function Step({ n, active }: { n: number; active?: boolean }) {
  return <div className={`${styles.step} ${active ? styles.stepActive : ""}`}>{n}</div>;
}

export interface NicknameStepProps {
  provider: Provider;
  onSubmit: (nickname: string) => void;
}

const TAKEN = ["admin", "test", "sprout"];
const FORMAT = /^[a-zA-Z][a-zA-Z0-9]{2,7}$/;

export function NicknameStep({ provider, onSubmit }: NicknameStepProps) {
  const [nickname, setNickname] = useState("");
  const [status, setStatus] = useState<null | "ok" | "taken">(null);

  const formatOk = FORMAT.test(nickname);
  const canCheck = formatOk;
  const canSubmit = formatOk && status === "ok";

  const onCheck = () => {
    if (!canCheck) return;
    setStatus(TAKEN.includes(nickname.toLowerCase()) ? "taken" : "ok");
  };

  const onChange = (v: string) => {
    setNickname(v);
    setStatus(null);
  };

  return (
    <div className={`${styles.card} ${styles.pad}`}>
      <div className={styles.steps}>
        <Step n={1} active />
        <div className={styles.stepLine} />
        <Step n={2} active />
        <div className={styles.stepLine} />
        <Step n={3} />
      </div>

      <h2 className={styles.h2}>닉네임을 정해주세요</h2>
      <p className={styles.desc}>다른 사용자에게 보여질 이름이에요. 가입 후에도 언제든 변경할 수 있어요.</p>

      <label className={styles.fieldLabel}>닉네임</label>
      <div className={styles.nickRow}>
        <input
          autoFocus
          value={nickname}
          onChange={(e) => onChange(e.target.value)}
          maxLength={8}
          placeholder="영문 3-8자"
          className={styles.nickInput}
        />
        <button
          onClick={onCheck}
          disabled={!canCheck}
          className={`${styles.checkBtn} ${canCheck ? styles.checkBtnOn : ""}`}
        >
          중복 확인
        </button>
      </div>

      <div className={styles.statusLine}>
        {nickname.length > 0 && !formatOk && (
          <span className={styles.statusError}>영문으로 시작하는 3-8자(영문·숫자)로 입력해주세요.</span>
        )}
        {formatOk && status === "ok" && (
          <span className={styles.statusOk}>
            <Icon name="check" size={11} /> 사용 가능한 닉네임입니다.
          </span>
        )}
        {formatOk && status === "taken" && (
          <span className={styles.statusError}>이미 사용 중인 닉네임입니다.</span>
        )}
        {formatOk && status === null && <span className={styles.statusHint}>중복 확인 버튼을 눌러주세요.</span>}
      </div>

      <button
        onClick={() => canSubmit && onSubmit(nickname)}
        disabled={!canSubmit}
        className={`${styles.nextBtn} ${canSubmit ? styles.nextBtnOn : styles.nextBtnOff}`}
      >
        다음
      </button>

      <div className={styles.verifiedBox}>
        <span className={styles.verifiedText}>{PROVIDER_LABEL[provider.id]} 계정 인증 완료</span>
        <Icon name="check" size={12} style={{ color: "var(--green-600)" }} />
      </div>
    </div>
  );
}
