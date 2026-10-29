import { Fragment } from "react";
import styles from "../auth.module.css";

const STEPS = ["로그인", "닉네임", "완료"];

/** 가입 단계 표시 (1 로그인 → 2 닉네임 → 3 완료). 현재 단계까지 채워서 보여준다. */
export function SignupSteps({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className={styles.steps} aria-label="가입 단계">
      {STEPS.map((label, i) => {
        const n = i + 1;
        return (
          <Fragment key={label}>
            {i > 0 && <li className={styles.stepLine} aria-hidden />}
            <li
              className={`${styles.step} ${n <= current ? styles.stepActive : ""}`}
              aria-label={`${n}단계 ${label}`}
              aria-current={n === current ? "step" : undefined}
            >
              {n}
            </li>
          </Fragment>
        );
      })}
    </ol>
  );
}
