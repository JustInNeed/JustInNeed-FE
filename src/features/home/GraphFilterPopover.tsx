"use client";

import { useState } from "react";
import { withHash } from "@/lib/format";
import type { HomeGraph } from "@/lib/viewTypes";
import { DEFAULT_GRAPH_FILTER, PERIOD_OPTIONS, countApplied, groupNodeCount, type GraphFilter } from "./graphFilter";
import styles from "./GraphTools.module.css";

export interface GraphFilterPopoverProps {
  applied: GraphFilter;
  /** 노드 · 해시태그 그룹 · 필터용 해시태그 */
  graph: HomeGraph;
  onApply: (filter: GraphFilter) => void;
}

/** 필터 버튼 아래 팝오버 — 기간 · 해시태그 그룹 · 해시태그 (디자인 A-1). [적용] 전까지는 그래프에 반영하지 않는다. */
export function GraphFilterPopover({ applied, graph, onApply }: GraphFilterPopoverProps) {
  const [draft, setDraft] = useState<GraphFilter>(applied);
  const count = countApplied(draft);

  const toggleGroup = (id: number) =>
    setDraft((d) => ({ ...d, groupIds: d.groupIds.includes(id) ? d.groupIds.filter((g) => g !== id) : [...d.groupIds, id] }));
  const toggleTag = (tag: string) =>
    setDraft((d) => ({ ...d, tags: d.tags.includes(tag) ? d.tags.filter((t) => t !== tag) : [...d.tags, tag] }));

  return (
    <div className={`${styles.panel} ${styles.filter}`} role="dialog" aria-label="그래프 필터">
      <div className={styles.filterHead}>
        <span className={styles.filterTitle}>필터</span>
        {count > 0 && <span className={styles.badge}>{count}개 적용</span>}
      </div>

      <div className={`${styles.scroll} ${styles.filterBody}`}>
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>기간</legend>
          {PERIOD_OPTIONS.map((o) => (
            <label key={o.value} className={`${styles.option} ${draft.period === o.value ? styles.optionOn : ""}`}>
              <input
                type="radio"
                name="graph-period"
                checked={draft.period === o.value}
                onChange={() => setDraft((d) => ({ ...d, period: o.value }))}
              />
              {o.label}
            </label>
          ))}
        </fieldset>

        {graph.tagGroups.length > 0 && (
          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>해시태그 그룹</legend>
            {graph.tagGroups.map((g) => {
              const on = draft.groupIds.includes(g.id);
              return (
                <label key={g.id} className={`${styles.option} ${on ? styles.optionOn : ""}`}>
                  <input type="checkbox" checked={on} onChange={() => toggleGroup(g.id)} />
                  <span className={styles.optionLabel}>{g.name}</span>
                  <span className={styles.optionCount}>노드 {groupNodeCount(graph, g)}</span>
                </label>
              );
            })}
          </fieldset>
        )}

        {graph.filterTags.length > 0 && (
          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>해시태그</legend>
            <div className={styles.chips}>
              {graph.filterTags.map((t) => {
                const on = draft.tags.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleTag(t)}
                    className={`${styles.chip} ${on ? styles.chipOn : ""}`}
                  >
                    {withHash(t)}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}
      </div>

      <div className={styles.divider} />
      <div className={styles.filterFoot}>
        <button
          type="button"
          className={styles.footBtn}
          onClick={() => {
            setDraft(DEFAULT_GRAPH_FILTER);
            onApply(DEFAULT_GRAPH_FILTER);
          }}
        >
          초기화
        </button>
        <button type="button" className={`${styles.footBtn} ${styles.footBtnPrimary}`} onClick={() => onApply(draft)}>
          적용
        </button>
      </div>
    </div>
  );
}
