"use client";

import { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/ui";
import { hostFromUrl } from "@/lib/format";
import type { FullMindmap } from "@/lib/viewTypes";
import { Mindmap } from "./Mindmap";
import { useOverlayClose } from "./useOverlayClose";
import styles from "./MindmapFullView.module.css";

export type { FullMindmap };

export interface MindmapFullViewProps {
  title: string;
  mindmap: FullMindmap;
  onClose: () => void;
  /** 넘기면 이 노드들만 색칠해 강조하고 나머지는 흐리게 (북마크 → 원래 마인드맵에서 보기) */
  highlightIds?: readonly string[];
}

/** 작성자의 전체 마인드맵을 화면 가득 보여주는 오버레이. URL 이 있는 노드를 누르면 원문을 새 탭으로 연다. */
export function MindmapFullView({ title, mindmap, onClose, highlightIds }: MindmapFullViewProps) {
  const { nodes, edges, nodeUrls } = mindmap;
  useOverlayClose(onClose);
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const downAt = useRef<{ x: number; y: number } | null>(null);
  const dragged = useRef(false);

  // 연결 수로 거르지 않는다 — URL 만 공개한 마인드맵의 노드는 해시태그 여럿에 이어지거나 연결이 하나도 없다
  const urls = useMemo(() => new Map(Object.entries(nodeUrls)), [nodeUrls]);

  const highlight = useMemo(() => (highlightIds?.length ? new Set(highlightIds) : undefined), [highlightIds]);
  const dimmedIds = useMemo(
    () => (highlight ? new Set(nodes.filter((n) => !highlight.has(n.id)).map((n) => n.id)) : undefined),
    [highlight, nodes],
  );

  const onSelect = (id: string) => {
    if (dragged.current) return; // 노드를 끌어 옮긴 뒤의 클릭은 무시
    const url = urls.get(id);
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    setSelected((cur) => (cur === id ? null : id));
  };

  const hoveredUrl = hovered ? urls.get(hovered) : undefined;
  const hoveredLabel = nodes.find((n) => n.id === hovered)?.label;
  const hoveredHost = hoveredUrl ? hostFromUrl(hoveredUrl) : undefined;

  return createPortal(
    <div
      className={styles.overlay}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div role="dialog" aria-modal="true" aria-label={title} className={styles.panel}>
        <div className={styles.head}>
          <span className={styles.headIcon}><Icon name="network" size={16} /></span>
          <div className={styles.headMain}>
            <div className={styles.title}>{title}</div>
            <div className={styles.sub}>
              {highlight ? (
                <>
                  <span className={styles.dot} />
                  저장한 노드 {highlight.size}개만 강조했어요
                </>
              ) : (
                `노드 ${nodes.length}개`
              )}
            </div>
          </div>
          <button onClick={onClose} aria-label="닫기" className={styles.close}>
            <Icon name="x" size={14} />
          </button>
        </div>

        <div
          className={`${styles.canvas} ${highlight ? styles.canvasDim : ""}`}
          onMouseDownCapture={(e) => {
            downAt.current = { x: e.clientX, y: e.clientY };
          }}
          onClickCapture={(e) => {
            const d = downAt.current;
            dragged.current = !!d && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 4;
          }}
        >
          <div className={styles.graph}>
            <Mindmap
              nodes={nodes}
              edges={edges}
              selectedId={selected}
              onSelect={onSelect}
              hoveredId={hovered}
              onHover={setHovered}
              dimmedIds={dimmedIds}
              matchIds={highlight}
              showHint={false}
            />
          </div>
          <div className={styles.hint}>
            {hoveredUrl ? (
              <>
                <Icon name="link" size={11} stroke={2} />
                {hoveredLabel === hoveredHost ? hoveredHost : `${hoveredLabel} · ${hoveredHost}`} 원문 열기
              </>
            ) : (
              "드래그로 이동 · 휠로 줌 · URL 이 있는 노드를 누르면 원문이 새 탭에서 열려요"
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
