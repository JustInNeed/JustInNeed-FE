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
  /** 세션 결과에 마우스를 올리거나 ↑↓로 고르면 그 세션 화면을 미리 받아 둔다 */
  onPrefetchSession?: (id: number) => void;
  /** 이동 중인 세션 — 그 행에 "여는 중…"을 띄우고 다른 선택을 막는다 */
  openingSessionId?: number | null;
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
  onPrefetchSession,
  openingSessionId = null,
  onClose,
}: GraphSearchProps) {
  const results = useMemo(() => searchGraph(query, nodes, edges, sessions), [query, nodes, edges, sessions]);
  // 강조한 결과는 순서가 아니라 항목으로 기억한다. 한글 입력이 끝나며 입력값이 다시 들어와도
  // 그 항목이 결과에 남아 있으면 강조가 첫 줄로 튀지 않는다 (QA-021). 없어지면 첫 줄
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const found = results.findIndex((r) => resultKey(r) === activeKey);
  const activeIndex = found === -1 ? 0 : found;
  const setActive = (index: number) => setActiveKey(results[index] ? resultKey(results[index]) : null);

  const opening = openingSessionId != null;

  const pick = (r: GraphSearchResult) => {
    if (opening) return; // 이동 중에는 다시 눌러도 무시
    if (r.kind === "node") onSelectNode(r.node.id);
    else onSelectSession(r.session.id);
  };

  const prefetch = (r: GraphSearchResult | undefined) => {
    if (r?.kind === "session") onPrefetchSession?.(r.session.id);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown" && results.length > 0) {
      e.preventDefault();
      const next = (activeIndex + 1) % results.length;
      setActive(next);
      prefetch(results[next]);
    } else if (e.key === "ArrowUp" && results.length > 0) {
      e.preventDefault();
      const prev = (activeIndex - 1 + results.length) % results.length;
      setActive(prev);
      prefetch(results[prev]);
    } else if (e.key === "Enter" && results[activeIndex]) {
      e.preventDefault();
      pick(results[activeIndex]);
    }
  };

  const nodeResults = results.filter((r) => r.kind === "node");
  const renderResult = (r: GraphSearchResult, index: number) => {
    const isActive = index === activeIndex;
    const isOpening = r.kind === "session" && r.session.id === openingSessionId;
    return (
      <button
        key={resultKey(r)}
        type="button"
        role="option"
        aria-selected={isActive}
        className={`${styles.result} ${isActive ? styles.resultActive : ""}`}
        aria-busy={isOpening || undefined}
        onMouseEnter={() => {
          setActive(index);
          prefetch(r);
        }}
        // 누르는 순간(mousedown) 고른다. 한글 입력 중에 누르면 macOS 는 첫 클릭을 입력 확정에 써서
        // click 이 오지 않는다. 기본 동작을 막아 입력창 포커스도 그대로 둔다 (QA-021)
        onMouseDown={(e) => {
          if (e.button !== 0) return;
          e.preventDefault();
          pick(r);
        }}
        // 키보드로 버튼을 누른 경우만 (마우스는 위에서 이미 골랐다)
        onClick={(e) => {
          if (e.detail === 0) pick(r);
        }}
      >
        {r.kind === "node" ? <span className={styles.resultDot} /> : <Icon name="list" size={14} />}
        <span className={styles.resultName}>{r.kind === "node" ? r.node.label : r.session.title}</span>
        <span className={styles.resultMeta}>
          {r.kind === "node" ? `연결 ${r.links}개` : isOpening ? "여는 중…" : formatDate(r.session.startedAt)}
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
          onChange={(e) => onQueryChange(e.target.value)}
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

const resultKey = (r: GraphSearchResult) => (r.kind === "node" ? `n-${r.node.id}` : `s-${r.session.id}`);
