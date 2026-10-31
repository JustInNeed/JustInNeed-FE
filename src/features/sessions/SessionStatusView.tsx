"use client";

import { useRouter } from "next/navigation";
import { Icon, Button, InlineState } from "@/components/ui";
import type { SessionStatus } from "@/lib/api";
import { STATUS_LABEL } from "@/lib/format";
import styles from "./SessionDetail.module.css";

type PendingStatus = Exclude<SessionStatus, "COMPLETED">;

const STATUS_COPY: Record<PendingStatus, string> = {
  COLLECTING: "아직 수집 중이에요. 수집이 끝나면 분석을 시작해요.",
  READY: "분석을 기다리고 있어요. 잠시 후 다시 확인해주세요.",
  ANALYZING: "아직 분석 중이에요. 잠시 후 다시 확인해주세요.",
  FAILED: "분석에 실패했어요.",
};

export interface SessionStatusViewProps {
  title: string;
  status: PendingStatus;
  isOwner: boolean;
  onDelete: () => void;
}

/** 분석 완료 전 · 실패 세션 — 아직 볼 본문이 없어 제목 · 상태 · 안내만 보여 준다 */
export function SessionStatusView({ title, status, isOwner, onDelete }: SessionStatusViewProps) {
  const router = useRouter();
  const failed = status === "FAILED";

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button onClick={() => router.push("/sessions")} className={styles.back}>
          ← 세션 목록
        </button>
        <div className={styles.headerRow}>
          <div className={styles.headerMain}>
            <div className={styles.titleRow}>
              <h1 className={styles.title}>{title}</h1>
            </div>
            <div className={styles.meta}>
              <span className={styles.metaDone} style={failed ? { color: "#c44" } : undefined}>
                <Icon name="dot" size={10} /> {STATUS_LABEL[status]}
              </span>
            </div>
          </div>
          {isOwner && (
            <div className={styles.actions}>
              <Button variant="secondary" onClick={onDelete} aria-label="삭제">
                <Icon name="trash" size={14} />
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className={styles.statusBody}>
        <div className={styles.stateBox}>
          <InlineState kind={failed ? "error" : "empty"} title={STATUS_COPY[status]} />
        </div>
      </div>
    </div>
  );
}
