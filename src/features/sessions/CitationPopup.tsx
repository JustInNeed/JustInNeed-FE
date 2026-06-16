import type { ReactNode } from "react";
import { Icon, Button } from "@/components/ui";
import type { SessionDetail } from "@/lib/api";
import { hostFromUrl } from "@/lib/format";
import type { MindmapNode } from "@/lib/types";
import styles from "./CitationPopup.module.css";

export interface CitationPopupProps {
  node: MindmapNode | undefined;
  session: SessionDetail;
  onClose: () => void;
}

export function CitationPopup({ node, session, onClose }: CitationPopupProps) {
  if (!node) return null;

  const insights = session.summary?.insights ?? [];
  const sources = session.sources ?? [];

  let kind: "core" | "insight" | "source" = "core";
  let insightIdx = -1;
  let sourceIdx = -1;
  if (node.id.startsWith("i")) {
    kind = "insight";
    insightIdx = parseInt(node.id.slice(1), 10);
  } else if (node.id.startsWith("u")) {
    kind = "source";
    sourceIdx = parseInt(node.id.slice(1), 10);
  }

  if (kind === "insight" && sources.length) {
    sourceIdx = insightIdx % sources.length;
  }
  const src = sourceIdx >= 0 ? sources[sourceIdx] : null;

  const insight = kind === "insight" ? insights[insightIdx] : null;
  const highlight = insight ? insight.split(":")[0].trim() : node.label || "";

  // 출처의 실제 발췌문을 미리보기 본문으로 사용
  const paras: string[] = [];
  if (src?.excerpt) paras.push(src.excerpt);
  if (insight && insight !== src?.excerpt) paras.push(insight);
  if (paras.length === 0) paras.push("이 노드에 연결된 본문 미리보기가 없습니다.");

  const renderHighlighted = (text: string): ReactNode => {
    if (!highlight || !text.includes(highlight)) return text;
    const parts = text.split(highlight);
    return parts.flatMap((p, i) =>
      i < parts.length - 1
        ? [
            p,
            <mark key={i} className={styles.mark}>
              {highlight}
            </mark>,
          ]
        : [p],
    );
  };

  return (
    <div className={styles.popup}>
      <div className={styles.head}>
        <div className={styles.headLeft}>
          <span className={styles.eyebrow}>Citation</span>
          {kind === "insight" && (
            <span className={styles.idx}>인사이트 #{String(insightIdx + 1).padStart(2, "0")}</span>
          )}
        </div>
        <button onClick={onClose} aria-label="닫기" className={styles.closeBtn}>
          <Icon name="x" size={13} />
        </button>
      </div>

      <div className={styles.titleWrap}>
        <div className={styles.title}>{src?.title || node.label}</div>
        {src && (
          <div className={styles.srcRow}>
            <span className={styles.favicon}>{hostFromUrl(src.url).slice(0, 2).toUpperCase()}</span>
            <span className={styles.srcHost}>{hostFromUrl(src.url)}</span>
          </div>
        )}
      </div>

      <div className={styles.preview}>
        {paras.map((p, i) => (
          <p key={i} className={styles.para}>
            {renderHighlighted(p)}
          </p>
        ))}
      </div>

      <div className={styles.footer}>
        {src ? (
          <a href={src.url} target="_blank" rel="noreferrer" className={styles.footerLink}>
            <Button variant="secondary" className={styles.footerBtn}>
              <Icon name="link" size={11} /> 원문 열기
            </Button>
          </a>
        ) : (
          <Button variant="secondary" className={styles.footerBtn} disabled>
            <Icon name="link" size={11} /> 원문 열기
          </Button>
        )}
        <Button variant="secondary" className={styles.footerBtn}>
          <Icon name="bookmark" size={11} /> 북마크
        </Button>
      </div>
    </div>
  );
}
