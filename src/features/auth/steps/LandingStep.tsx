import { Icon } from "@/components/ui";
import type { ProviderId } from "@/lib/types";
import { PROVIDERS, type Provider } from "../providers";
import styles from "../auth.module.css";

export interface LandingStepProps {
  /** 직전에 사용한 프로바이더 — "최근 사용" 배지 표시용 (선택). */
  lastProviderId?: ProviderId | null;
  onPick: (provider: Provider) => void;
}

export function LandingStep({ lastProviderId = null, onPick }: LandingStepProps) {
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
        {PROVIDERS.filter((p) => p.enabled).map((p) => {
          const isLast = lastProviderId === p.id;
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
    </div>
  );
}
