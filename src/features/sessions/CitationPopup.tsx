import type { ReactNode } from "react";
import { Icon, Button } from "@/components/ui";
import { hostFromUrl } from "@/lib/format";
import type { SessionMapNode } from "./buildSessionMindmap";
import styles from "./CitationPopup.module.css";

export interface CitationPopupProps {
  node: SessionMapNode | undefined;
  onClose: () => void;
}

export function CitationPopup({ node, onClose }: CitationPopupProps) {
  if (!node) return null;

  const { citation } = node;
  const keyword = node.label.trim();

  // 노드의 근거 원문을 미리보기 본문으로 사용. 루트 · 주제 노드는 원문이 없다
  const paras: string[] = [];
  if (citation?.excerpt) paras.push(citation.excerpt);
  if (paras.length === 0) paras.push("이 노드에 연결된 본문 미리보기가 없습니다.");

  const renderHighlighted = (text: string): ReactNode => {
    if (!citation?.excerpt || !keyword || !text.includes(keyword)) return text;
    const parts = text.split(keyword);
    return parts.flatMap((p, i) =>
      i < parts.length - 1
        ? [
            p,
            <mark key={i} className={styles.mark}>
              {keyword}
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
        </div>
        <button onClick={onClose} aria-label="닫기" className={styles.closeBtn}>
          <Icon name="x" size={13} />
        </button>
      </div>

      <div className={styles.titleWrap}>
        <div className={styles.title}>{citation?.title || node.label}</div>
        {citation && (
          <div className={styles.srcRow}>
            <span className={styles.favicon}>{hostFromUrl(citation.url).slice(0, 2).toUpperCase()}</span>
            <span className={styles.srcHost}>{hostFromUrl(citation.url)}</span>
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
        {citation ? (
          <a href={citation.url} target="_blank" rel="noreferrer" className={styles.footerLink}>
            <Button variant="secondary" className={styles.footerBtn}>
              <Icon name="link" size={11} /> 원문 열기
            </Button>
          </a>
        ) : (
          <Button variant="secondary" className={styles.footerBtn} disabled>
            <Icon name="link" size={11} /> 원문 열기
          </Button>
        )}
      </div>
    </div>
  );
}
