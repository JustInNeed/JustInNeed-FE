import { Icon } from "@/components/ui";
import styles from "../auth.module.css";

interface OnboardItemProps {
  n: string;
  title: string;
  desc: string;
}

function OnboardItem({ n, title, desc }: OnboardItemProps) {
  return (
    <div className={styles.onboardItem}>
      <span className={styles.onboardNum}>{n}</span>
      <div>
        <div className={styles.onboardTitle}>{title}</div>
        <div className={styles.onboardDesc}>{desc}</div>
      </div>
    </div>
  );
}

export interface CompleteStepProps {
  nickname: string;
  onContinue: () => void;
}

export function CompleteStep({ nickname, onContinue }: CompleteStepProps) {
  return (
    <div className={`${styles.card} ${styles.completeCard}`}>
      <div className={styles.completeIcon}>
        <Icon name="check" size={36} />
      </div>

      <h2 className={styles.completeTitle}>
        환영해요, <em>{nickname}</em>님!
      </h2>
      <p className={styles.desc}>
        JustInNeed 계정이 만들어졌어요.
        <br />
        이제 브라우저 확장 프로그램으로 활동을 모아볼까요?
      </p>

      <div className={styles.onboardBox}>
        <OnboardItem n="1" title="크롬 확장 프로그램 설치" desc="툴바에서 JustInNeed를 핀고정해두세요." />
        <OnboardItem
          n="2"
          title="자동 로그인 동기화"
          desc="웹에 로그인되어 있으면 확장 프로그램도 같은 계정으로 자동 연결돼요."
        />
        <OnboardItem n="3" title="첫 세션 만들기" desc="시작 버튼을 누르면 그때부터 활동이 수집돼요." />
      </div>

      <button onClick={onContinue} className={styles.startBtn}>
        시작하기
      </button>
    </div>
  );
}
