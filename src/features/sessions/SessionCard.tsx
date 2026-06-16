import { Icon, HashChip } from "@/components/ui";
import type { Session } from "@/lib/types";
import styles from "./SessionCard.module.css";

export interface SessionCardProps {
  session: Session;
  onClick?: () => void;
  onToggleFavorite?: (id: string) => void;
}

export function SessionCard({ session, onClick, onToggleFavorite }: SessionCardProps) {
  return (
    <div className={styles.card} onClick={onClick} role="button" tabIndex={0}>
      <div className={styles.top}>
        <h3 className={styles.title}>{session.title}</h3>
        <button
          className={styles.favBtn}
          style={{ color: session.favorite ? "var(--green-600)" : "var(--ink-300)" }}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite?.(session.id);
          }}
          aria-label="즐겨찾기"
        >
          <Icon name={session.favorite ? "starFilled" : "star"} size={16} />
        </button>
      </div>
      <div className={styles.meta}>
        <span className={styles.metaItem}>
          <Icon name="clock" size={12} /> {session.duration}
        </span>
        <span className={styles.metaItem}>
          <Icon name="link" size={12} /> {session.urls}개 URL
        </span>
        <span>{session.start.split(" ")[0]}</span>
      </div>
      <div className={styles.tags}>
        {session.hashtags.slice(0, 4).map((h) => (
          <HashChip key={h} label={h} size="sm" />
        ))}
      </div>
    </div>
  );
}
