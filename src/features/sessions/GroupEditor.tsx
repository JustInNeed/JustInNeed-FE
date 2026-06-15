import { useState } from "react";
import { Icon, Button } from "@/components/ui";
import type { HashtagGroup } from "@/lib/types";
import styles from "./GroupEditor.module.css";

export interface GroupEditorProps {
  allTags: string[];
  group: HashtagGroup | null;
  onCancel: () => void;
  onSave: (group: Omit<HashtagGroup, "id"> & { id?: string }) => void;
}

export function GroupEditor({ allTags, group, onCancel, onSave }: GroupEditorProps) {
  const [selectedList, setSelectedList] = useState<string[]>(group?.tags ?? []);
  const [query, setQuery] = useState("");
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const selected = new Set(selectedList);
  const toggle = (tag: string) =>
    setSelectedList((list) => (list.includes(tag) ? list.filter((t) => t !== tag) : [...list, tag]));
  const clearAll = () => setSelectedList([]);

  const onChipDrop = (i: number) => {
    if (dragIdx === null || dragIdx === i) {
      setDragIdx(null);
      setDragOverIdx(null);
      return;
    }
    const next = [...selectedList];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(i, 0, moved);
    setSelectedList(next);
    setDragIdx(null);
    setDragOverIdx(null);
  };

  const visibleTags = query
    ? allTags.filter((t) => t.toLowerCase().includes(query.toLowerCase()))
    : allTags;
  const canSave = selectedList.length > 0;

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.head}>
          <div>
            <h2 className={styles.headTitle}>{group ? "그룹 수정" : "새 그룹 만들기"}</h2>
            <p className={styles.headSub}>여러 해시태그를 묶어 관련 세션들을 한 번에 관리합니다.</p>
          </div>
          <Button variant="icon" onClick={onCancel} aria-label="닫기">
            <Icon name="x" size={16} />
          </Button>
        </div>

        <div className={styles.body}>
          <div className={styles.selectedHead}>
            <label className={styles.label}>
              선택된 해시태그 <span className={styles.count}>({selectedList.length})</span>
              {selectedList.length > 1 && <span className={styles.dragHint}>드래그로 순서 변경</span>}
            </label>
            {selectedList.length > 0 && (
              <Button variant="secondary" onClick={clearAll} style={{ padding: "4px 8px", fontSize: 11 }}>
                모두 해제
              </Button>
            )}
          </div>

          <div className={styles.selectedBox}>
            {selectedList.length === 0 ? (
              <span className={styles.placeholder}>아래 목록에서 태그를 선택해 추가하세요.</span>
            ) : (
              selectedList.map((t, i) => (
                <div
                  key={t}
                  draggable
                  onDragStart={(e) => {
                    setDragIdx(i);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragIdx !== null && dragIdx !== i) setDragOverIdx(i);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    onChipDrop(i);
                  }}
                  onDragEnd={() => {
                    setDragIdx(null);
                    setDragOverIdx(null);
                  }}
                  className={styles.selectedChip}
                  style={{
                    opacity: dragIdx === i ? 0.4 : 1,
                    outline: dragOverIdx === i && dragIdx !== i ? "2px solid var(--green-700)" : "none",
                    outlineOffset: 1,
                  }}
                  title="드래그로 순서 변경"
                >
                  {t}
                  <button
                    className={styles.chipRemove}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle(t);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    draggable={false}
                    aria-label="해제"
                  >
                    <Icon name="x" size={11} />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className={styles.search}>
            <Icon name="search" size={14} className={styles.searchIcon} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="해시태그 검색"
              autoFocus
              className={styles.searchInput}
            />
          </div>

          <label className={styles.label}>전체 해시태그 ({allTags.length})</label>
          <div className={styles.tagList}>
            {visibleTags.length === 0 ? (
              <span className={styles.placeholder}>검색 결과가 없습니다.</span>
            ) : (
              visibleTags.map((t) => {
                const on = selected.has(t);
                return (
                  <button
                    key={t}
                    onClick={() => toggle(t)}
                    className={`${styles.tagBtn} ${on ? styles.tagBtnOn : ""}`}
                  >
                    {on && <Icon name="check" size={11} />} {t}
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className={styles.footer}>
          <Button variant="secondary" onClick={onCancel}>
            취소
          </Button>
          <button
            disabled={!canSave}
            onClick={() =>
              onSave({
                id: group?.id,
                name: group?.name || "",
                emoji: group?.emoji || "🏷️",
                tags: selectedList,
              })
            }
            className={`${styles.saveBtn} ${canSave ? styles.saveBtnOn : styles.saveBtnOff}`}
          >
            {group ? "수정 완료" : "그룹 만들기"}
          </button>
        </div>
      </div>
    </div>
  );
}
