import { useEffect, useState } from "react";
import { PROVIDER_LABEL, type Provider } from "../providers";
import styles from "../auth.module.css";

export interface OauthStepProps {
  provider: Provider;
  onDone: () => void;
  onBack: () => void;
}

export function OauthStep({ provider, onDone, onBack }: OauthStepProps) {
  const [phase, setPhase] = useState<"connecting" | "confirm">("connecting");

  useEffect(() => {
    const t = setTimeout(() => setPhase("confirm"), 900);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className={styles.card}>
      <div className={styles.browserHead}>
        <div className={styles.trafficLights}>
          <span className={styles.light} style={{ background: "#FF5F57" }} />
          <span className={styles.light} style={{ background: "#FEBC2E" }} />
          <span className={styles.light} style={{ background: "#28C840" }} />
        </div>
        <div className={styles.urlBar}>🔒 oauth.{provider.id}.com/authorize</div>
      </div>

      <div className={styles.oauthBody}>
        <div
          className={styles.oauthIcon}
          style={{ background: provider.bg, color: provider.fg, border: provider.border }}
        >
          {provider.icon}
        </div>

        {phase === "connecting" ? (
          <>
            <h2 className={styles.oauthTitle}>{PROVIDER_LABEL[provider.id]}에 연결 중…</h2>
            <p className={styles.oauthDesc}>안전한 OAuth 인증을 진행하고 있어요.</p>
            <div className={styles.loadingDots}>
              {[0, 1, 2].map((i) => (
                <span key={i} className={styles.loadingDot} style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </>
        ) : (
          <>
            <h2 className={styles.oauthTitle}>JustInNeed에 권한을 허용하시겠어요?</h2>
            <p className={styles.oauthDesc}>
              {PROVIDER_LABEL[provider.id]} 계정의 프로필(이름, 이메일)을
              <br />
              JustInNeed가 사용합니다.
            </p>
            <div className={styles.consentActions}>
              <button onClick={onBack} className={styles.denyBtn}>
                거부
              </button>
              <button onClick={onDone} className={styles.allowBtn}>
                허용하기
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
