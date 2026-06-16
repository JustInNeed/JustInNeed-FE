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
  const duration = formatDuration(session.startedAt, session.endedAt);
  return (
    <div className={styles.card} onClick={onClick} role="button" tabIndex={0}>
      <div className={styles.top}>
        <h3 className={styles.title}>{session.title}</h3>
        <button
          className={styles.favBtn}
          style={{ color: session.isFavorite ? "var(--green-600)" : "var(--ink-300)" }}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite?.(session.id);
          }}
          aria-label="즐겨찾기"
        >
          <Icon name={session.isFavorite ? "starFilled" : "star"} size={16} />
        </button>
      </div>
      <div className={styles.meta}>
        <span className={styles.metaItem}>
          <Icon name="clock" size={12} /> {duration ?? STATUS_LABEL[session.status]}
        </span>
        <span className={styles.metaItem}>
          <Icon name="link" size={12} /> {session.pageCount}개 URL
        </span>
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
