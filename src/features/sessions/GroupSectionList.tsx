import { Icon, HashChip, Button } from "@/components/ui";
import type { HashtagGroup, Session } from "@/lib/types";
import { SessionCard } from "./SessionCard";
import styles from "./GroupSectionList.module.css";

export interface GroupSectionListProps {
  groups: HashtagGroup[];
  sessionsForGroup: (group: HashtagGroup) => Session[];
  onOpen: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onEdit: (group: HashtagGroup) => void;
  onDelete: (id: string) => void;
  onReorder: (next: HashtagGroup[]) => void;
  onCreate: () => void;
}

export function GroupSectionList({
  groups,
  sessionsForGroup,
  onOpen,
  onToggleFavorite,
  onEdit,
  onDelete,
  onReorder,
  onCreate,
}: GroupSectionListProps) {
  const moveUp = (idx: number) => {
    if (idx <= 0) return;
    const next = [...groups];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    onReorder(next);
  };

  if (groups.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyEmoji}>🏷️</div>
        <h3 className={styles.emptyTitle}>아직 만든 그룹이 없습니다</h3>
        <p className={styles.emptyDesc}>여러 해시태그를 묶어 관련 세션들을 한 번에 관리해보세요.</p>
        <button className={styles.createPill} onClick={onCreate}>
          <Icon name="plus" size={14} /> 새 그룹 만들기
        </button>
      </div>
    );
  }

  return (
    <div>
      {groups.map((g, idx) => {
        const list = sessionsForGroup(g);
        return (
          <div key={g.id} className={styles.group}>
            <div className={styles.groupHead}>
              <div className={styles.groupTags}>
                {g.tags.map((t) => (
                  <HashChip key={t} label={t} size="lg" />
                ))}
                <span className={styles.groupCount}>{list.length}개 세션</span>
              </div>
              <div className={styles.groupActions}>
                <Button variant="iconSm" onClick={() => onEdit(g)} aria-label="수정">
                  <Icon name="edit" size={12} />
                </Button>
                <Button
                  variant="iconSm"
                  onClick={() => {
                    if (confirm("이 그룹을 삭제할까요?")) onDelete(g.id);
                  }}
                  aria-label="삭제"
                >
                  <Icon name="trash" size={12} />
                </Button>
                <Button
                  variant="iconSm"
                  disabled={idx === 0}
                  onClick={() => moveUp(idx)}
                  aria-label="위로 이동"
                  title="위로 이동"
                  style={{ opacity: idx === 0 ? 0.35 : 1 }}
                >
                  <Icon name="chevronUp" size={12} />
                </Button>
              </div>
            </div>
            {list.length === 0 ? (
              <div className={styles.groupEmpty}>이 그룹의 해시태그를 가진 세션이 없습니다.</div>
            ) : (
              <div className={styles.grid}>
                {list.map((s) => (
                  <SessionCard
                    key={s.id}
                    session={s}
                    onClick={() => onOpen(s.id)}
                    onToggleFavorite={onToggleFavorite}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}

      <div className={styles.createWrap}>
        <button className={styles.createPill} onClick={onCreate}>
          <Icon name="plus" size={14} /> 새 그룹 만들기
        </button>
      </div>
    </div>
  );
}
