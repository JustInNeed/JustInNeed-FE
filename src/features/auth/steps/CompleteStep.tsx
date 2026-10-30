import { Icon } from "@/components/ui";
import styles from "../auth.module.css";
import { SignupSteps } from "./SignupSteps";

// 확장 프로그램 설치 링크는 스토어 등록 전이라 보류 — 안내 문구만 둔다
// 웹 ↔ 확장 프로그램 로그인 연동(MEM-2-3, MEM-3)은 구현 전이라 "자동 로그인 동기화" 안내는 뺐다 — 연동 후 다시 넣는다
const ONBOARD_ITEMS = [
  { title: "크롬 확장 프로그램 설치", desc: "툴바에서 JustInNeed를 핀고정해두세요." },
  { title: "첫 세션 만들기", desc: "시작 버튼을 누르면 그때부터 활동이 수집돼요." },
];

export interface CompleteStepProps {
  nickname: string;
  onStart: () => void;
}

/** 가입 완료 + 온보딩 안내 */
export function CompleteStep({ nickname, onStart }: CompleteStepProps) {
  return (
    <div className={`${styles.card} ${styles.completeCard}`}>
      <SignupSteps current={3} />
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

      <ol className={styles.onboardBox}>
        {ONBOARD_ITEMS.map((it, i) => (
          <li key={it.title} className={styles.onboardItem}>
            <span className={styles.onboardNum}>{i + 1}</span>
            <div>
              <div className={styles.onboardTitle}>{it.title}</div>
              <div className={styles.onboardDesc}>{it.desc}</div>
            </div>
          </li>
        ))}
      </ol>

      <button onClick={onStart} className={styles.startBtn} autoFocus>
        시작하기
      </button>
    </div>
  );
}
