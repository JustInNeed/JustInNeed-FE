"use client";

import { useMemo, useState, type KeyboardEvent } from "react";
import { Icon } from "@/components/ui";
import type { SessionListItem } from "@/lib/api";
import type { MindmapEdge, MindmapNode } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { searchGraph, type GraphSearchResult } from "./graphFilter";
import styles from "./GraphTools.module.css";

export interface GraphSearchProps {
  nodes: MindmapNode[];
  edges: MindmapEdge[];
  /** 제목으로 함께 찾을 세션 */
  sessions: SessionListItem[];
  query: string;
  onQueryChange: (query: string) => void;
  onSelectNode: (id: string) => void;
  onSelectSession: (id: number) => void;
  onClose: () => void;
}

/** 검색 버튼이 펼쳐진 입력창 + 결과 드롭다운 (디자인 A-2). ↑↓ 이동 · Enter 선택 · Esc 닫기 */
export function GraphSearch({
  nodes,
  edges,
  sessions,
  query,
  onQueryChange,
  onSelectNode,
  onSelectSession,
  onClose,
}: GraphSearchProps) {
  const results = useMemo(() => searchGraph(query, nodes, edges, sessions), [query, nodes, edges, sessions]);
  const [active, setActive] = useState(0);
  const activeIndex = Math.min(active, Math.max(results.length - 1, 0));

  const pick = (r: GraphSearchResult) => {
    if (r.kind === "node") onSelectNode(r.node.id);
    else onSelectSession(r.session.id);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown" && results.length > 0) {
      e.preventDefault();
      setActive((activeIndex + 1) % results.length);
    } else if (e.key === "ArrowUp" && results.length > 0) {
      e.preventDefault();
      setActive((activeIndex - 1 + results.length) % results.length);
    } else if (e.key === "Enter" && results[activeIndex]) {
      e.preventDefault();
      pick(results[activeIndex]);
    }
  };

  const nodeResults = results.filter((r) => r.kind === "node");
  const renderResult = (r: GraphSearchResult, index: number) => {
    const isActive = index === activeIndex;
    return (
      <button
        key={r.kind === "node" ? `n-${r.node.id}` : `s-${r.session.id}`}
        type="button"
        role="option"
        aria-selected={isActive}
        className={`${styles.result} ${isActive ? styles.resultActive : ""}`}
        onMouseEnter={() => setActive(index)}
        onClick={() => pick(r)}
      >
        {r.kind === "node" ? <span className={styles.resultDot} /> : <Icon name="list" size={14} />}
        <span className={styles.resultName}>{r.kind === "node" ? r.node.label : r.session.title}</span>
        <span className={styles.resultMeta}>
          {r.kind === "node" ? `연결 ${r.links}개` : formatDate(r.session.startedAt)}
        </span>
      </button>
    );
  };

  return (
    <>
      <div className={styles.searchBox}>
        <Icon name="search" size={14} />
        <input
          autoFocus
          value={query}
          onChange={(e) => {
            onQueryChange(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          placeholder="노드 · 세션 검색"
          aria-label="노드 · 세션 검색"
          role="combobox"
          aria-expanded={query.trim().length > 0}
          aria-controls="graph-search-results"
          className={styles.searchInput}
        />
        <button type="button" onClick={onClose} className={styles.searchClear} aria-label="검색 닫기">
          <Icon name="x" size={12} stroke={2.2} />
        </button>
      </div>

      {query.trim().length > 0 && (
        <div className={`${styles.panel} ${styles.results}`}>
          <div id="graph-search-results" role="listbox" aria-label="검색 결과" className={`${styles.scroll} ${styles.resultList}`}>
            {results.length === 0 && <div className={styles.resultEmpty}>일치하는 결과가 없어요.</div>}
            {nodeResults.length > 0 && <span className={styles.resultGroup}>노드</span>}
            {results.map((r, i) =>
              r.kind === "session" && (i === 0 || results[i - 1].kind === "node") ? (
                [<span key="session-group" className={styles.resultGroup}>세션</span>, renderResult(r, i)]
              ) : (
                renderResult(r, i)
              ),
            )}
          </div>
          <div className={styles.resultHint}>↑↓ 이동 · Enter 선택 · Esc 닫기</div>
        </div>
      )}
    </>
  );
}
