import type { ReactNode } from "react";
import { MindmapPreview } from "./MindmapPreview";
import styles from "./MindmapCard.module.css";

export interface MindmapCardProps {
  seed: string;
  nodes: number;
  height?: number;
  title: string;
  /** 제목 아래 한 줄 (by ~ · 노드 n 등) */
  meta?: ReactNode;
  tags?: string[];
  /** 좌상단 배지 (예: 핀) */
  topLeft?: ReactNode;
  /** 우상단 배지 (예: 노드 수) */
  topRight?: ReactNode;
  /** 태그 아래 행 (좋아요/북마크 등) */
  footer?: ReactNode;
  onClick?: () => void;
  /** hover 시 살짝 떠오르는 효과 */
  lift?: boolean;
  /** 제목 위 가리기 그라데이션 높이 비율 (기본 70%) */
  titleSize?: number;
}

/** 어두운 갤럭시 미리보기 + 하단 그라데이션 캡션 카드. 프로필/북마크/검색에서 공통 사용. */
export function MindmapCard({
  seed, nodes, height = 210, title, meta, tags, topLeft, topRight, footer, onClick, lift = true, titleSize = 13,
}: MindmapCardProps) {
  return (
    <div className={`${styles.card} ${lift ? styles.lift : ""}`} onClick={onClick} role={onClick ? "button" : undefined}>
      <MindmapPreview seed={seed} nodes={nodes} height={height}>
        {topLeft && <span className={styles.topLeft}>{topLeft}</span>}
        {topRight && <span className={styles.topRight}>{topRight}</span>}
        <div className={styles.shade} />
        <div className={styles.caption}>
          <div className={styles.title} style={{ fontSize: titleSize }}>{title}</div>
          {meta && <div className={styles.meta}>{meta}</div>}
          {tags && tags.length > 0 && (
            <div className={styles.tags}>
              {tags.map((h) => (
                <span key={h} className={styles.tag}>{h}</span>
              ))}
            </div>
          )}
          {footer && <div className={styles.footer}>{footer}</div>}
        </div>
      </MindmapPreview>
    </div>
  );
}
