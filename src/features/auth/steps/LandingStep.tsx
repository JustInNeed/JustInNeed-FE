import { Icon } from "@/components/ui";
import type { Auth } from "@/lib/types";
import { PROVIDERS, type Provider } from "../providers";
import styles from "../auth.module.css";

export interface LandingStepProps {
  existing: Auth | null;
  onPick: (provider: Provider) => void;
  onCancel?: () => void;
}

export function LandingStep({ existing, onPick, onCancel }: LandingStepProps) {
  return (
    <div className={`${styles.panel} ${styles.landing}`}>
      <div className={styles.logoWrap}>
        <div className={styles.logo}>
          <Icon name="sprout" size={32} />
        </div>
        <div>
          <h1 className={styles.appTitle}>JustInNeed</h1>
          <p className={styles.appSub}>
            오늘 어디까지 정리됐을까요?
            <br />
            브라우저 활동을 한 줄로 모아드릴게요.
          </p>
        </div>
      </div>

      <div className={styles.providerList}>
        {PROVIDERS.map((p) => {
          const isLast = existing?.provider === p.id;
          return (
            <button
              key={p.id}
              onClick={() => onPick(p)}
              className={styles.providerBtn}
              style={{ background: p.bg, color: p.fg, border: p.border }}
            >
              {p.icon}
              <span>{p.label}</span>
              {isLast && (
                <span className={styles.recentBadge} style={{ color: p.fg }}>
                  최근 사용
                </span>
              )}
            </button>
          );
        })}
      </div>

      <p className={styles.terms}>
        가입 시 <a href="#">이용약관</a>과 <a href="#">개인정보처리방침</a>에 동의합니다.
      </p>

      {onCancel && (
        <button onClick={onCancel} className={styles.laterBtn}>
          나중에 하기
        </button>
      )}
    </div>
  );
}
