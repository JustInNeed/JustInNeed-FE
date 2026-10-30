import { Icon, HashChip } from "@/components/ui";
import type { SessionListItem } from "@/lib/api";
import { formatDate, formatDuration, STATUS_LABEL, withHash } from "@/lib/format";
import styles from "./SessionCard.module.css";

export interface SessionCardProps {
  session: SessionListItem;
  onClick?: () => void;
  onToggleFavorite?: (id: number) => void;
}

export function SessionCard({ session, onClick, onToggleFavorite }: SessionCardProps) {
  // 분석 완료 전(수집 중 · 분석 대기 · 분석 중) · 분석 실패 세션은 볼 요약이 없어 상태만 보이고 상세로 열지 않는다
  const completed = session.status === "COMPLETED";
  const duration = completed ? formatDuration(session.startedAt, session.endedAt) : null;
  return (
    <div
      className={completed ? styles.card : `${styles.card} ${styles.locked}`}
      onClick={completed ? onClick : undefined}
      onKeyDown={(e) => {
        // 카드 자체에 포커스가 있을 때만 (별 버튼의 Enter 는 버튼이 처리)
        if (!completed || e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      role={completed ? "button" : undefined}
      tabIndex={completed ? 0 : undefined}
      aria-disabled={completed ? undefined : true}
    >
      <div className={styles.top}>
        <h3 className={styles.title}>{session.title}</h3>
        {onToggleFavorite && (
          <button
            className={styles.favBtn}
            style={{ color: session.isFavorite ? "var(--green-600)" : "var(--ink-300)" }}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(session.id);
            }}
            aria-label="즐겨찾기"
          >
            <Icon name={session.isFavorite ? "starFilled" : "star"} size={16} />
          </button>
        )}
      </div>
      <div className={styles.meta}>
        <span className={styles.metaItem}>
          <Icon name="clock" size={12} /> {duration ?? STATUS_LABEL[session.status]}
        </span>
        {completed && (
          <span className={styles.metaItem}>
            <Icon name="link" size={12} /> {session.pageCount}개 URL
          </span>
        )}
        <span>{formatDate(session.startedAt)}</span>
      </div>
      <div className={styles.tags}>
        {session.tags.slice(0, 4).map((h) => (
          <HashChip key={h} label={withHash(h)} size="sm" />
        ))}
      </div>
    </div>
  );
}
