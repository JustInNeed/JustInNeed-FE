"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Banner, Button, Card, inputClass } from "@/components/ui";
import { ApiError, withdrawAccount } from "@/lib/api";
import { clearTokens } from "@/lib/auth/tokens";
import { setAuthToast } from "@/lib/auth/toast";
import { useToast } from "@/lib/app/ToastContext";
import styles from "./SettingsView.module.css";

const CONFIRM_TEXT = "WITHDRAW";

/** 설정 > 계정 > 회원 탈퇴. 확인 문구를 정확히 입력해야 탈퇴할 수 있고, 성공하면 로그인 화면으로 보낸다. */
export function WithdrawSection({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const canSubmit = confirm === CONFIRM_TEXT && !submitting;

  const onSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await withdrawAccount(confirm);
      clearTokens();
      setAuthToast({ kind: "withdraw" });
      router.replace("/login");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "탈퇴에 실패했습니다. 다시 시도해 주세요.");
      setSubmitting(false);
    }
  };

  return (
    <div>
      <button type="button" onClick={onBack} className={styles.withdrawBack}>
        ← 계정 설정으로
      </button>
      <Card className={styles.card}>
        <h2 className={styles.withdrawHeading}>회원 탈퇴</h2>
        <h3 className={styles.withdrawSub}>마지막으로 확인해 주세요</h3>
        <Banner tone="error">탈퇴하면 되돌릴 수 없어요. 지금까지 모은 세션 기록은 모두 삭제돼요.</Banner>

        <div className={styles.withdrawField}>
          <label htmlFor="withdraw-confirm" className={styles.withdrawLabel}>
            확인을 위해 <span className={styles.withdrawCode}>{CONFIRM_TEXT}</span> 를 입력해 주세요
          </label>
          <input
            id="withdraw-confirm"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSubmit()}
            autoComplete="off"
            spellCheck={false}
            aria-describedby="withdraw-confirm-help"
            className={`${inputClass} ${styles.withdrawInput}`}
          />
          <span id="withdraw-confirm-help" className={styles.withdrawHelp}>
            정확히 입력하면 탈퇴 버튼이 활성화돼요.
          </span>
        </div>

        <div className={styles.withdrawActions}>
          <Button variant="secondary" onClick={onBack}>
            취소
          </Button>
          <Button variant="danger" onClick={onSubmit} disabled={!canSubmit}>
            {submitting ? "탈퇴 처리 중…" : "탈퇴하기"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
