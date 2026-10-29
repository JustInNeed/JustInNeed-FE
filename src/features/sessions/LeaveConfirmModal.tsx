"use client";

import { Button } from "@/components/ui";
import styles from "./LeaveConfirmModal.module.css";

export interface LeaveConfirmModalProps {
  saving?: boolean;
  onDiscard: () => void;
  onStay: () => void;
  onSaveAndLeave: () => void;
}

/** 편집 중 저장되지 않은 변경이 있을 때 나가기 전에 띄우는 확인 모달 (제목 + 버튼 3개). */
export function LeaveConfirmModal({ saving = false, onDiscard, onStay, onSaveAndLeave }: LeaveConfirmModalProps) {
  return (
    <div
      className={styles.overlay}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onStay();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onStay();
      }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="leave-confirm-title" className={styles.modal}>
        <h2 id="leave-confirm-title" className={styles.title}>
          저장하지 않은 변경 사항이 있어요
        </h2>
        <div className={styles.actions}>
          <Button variant="ghost" onClick={onDiscard} disabled={saving} className={styles.discard}>
            저장 안 하고 나가기
          </Button>
          <Button variant="secondary" onClick={onStay} disabled={saving} autoFocus>
            계속 편집
          </Button>
          <Button variant="primary" onClick={onSaveAndLeave} disabled={saving}>
            {saving ? "저장 중…" : "저장하고 나가기"}
          </Button>
        </div>
      </div>
    </div>
  );
}
