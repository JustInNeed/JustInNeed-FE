import type { ReactNode } from "react";
import { Icon, Button } from "@/components/ui";
import type { MindmapNode, Session } from "@/lib/types";
import styles from "./CitationPopup.module.css";

export interface CitationPopupProps {
  node: MindmapNode | undefined;
  session: Session;
  onClose: () => void;
}

export function CitationPopup({ node, session, onClose }: CitationPopupProps) {
  if (!node) return null;

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

  if (kind === "insight" && session.sources.length) {
    sourceIdx = insightIdx % session.sources.length;
  }
  const src = sourceIdx >= 0 ? session.sources[sourceIdx] : null;

  const insight = kind === "insight" ? session.insights[insightIdx] : null;
  const highlight = insight ? insight.split(":")[0].trim() : node.label || "";

  const fauxParas =
    kind === "insight" && insight
      ? [
          "일정을 짜다 보면 결국 비용과 효율 사이에서 타협이 필요하다. 여러 후기를 종합해보니 다음과 같은 결론을 얻을 수 있었다.",
          insight,
          "이 부분은 실제 방문 후기와 공식 사이트의 안내가 일치한다는 점에서 신뢰도가 높다고 판단된다. 추가로 시즌별 변동 가능성이 있으니 출발 직전 한 번 더 확인이 필요하다.",
        ]
      : [
          "일정을 짜다 보면 결국 비용과 효율 사이에서 타협이 필요하다. 여러 후기를 종합해보니 다음과 같은 결론을 얻을 수 있었다.",
          "이 부분은 실제 방문 후기와 공식 사이트의 안내가 일치한다는 점에서 신뢰도가 높다고 판단된다. 추가로 시즌별 변동 가능성이 있으니 출발 직전 한 번 더 확인이 필요하다.",
        ];

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
        <div className={styles.title}>{node.label}</div>
        {src && (
          <div className={styles.srcRow}>
            <span className={styles.favicon}>{src.host.slice(0, 2).toUpperCase()}</span>
            <span className={styles.srcHost}>{src.host}</span>
            <span>·</span>
            <span>{src.time}</span>
          </div>
        )}
      </div>

      <div className={styles.preview}>
        {fauxParas.map((p, i) => (
          <p key={i} className={styles.para}>
            {renderHighlighted(p)}
          </p>
        ))}
      </div>

      <div className={styles.footer}>
        <Button variant="secondary" className={styles.footerBtn}>
          <Icon name="link" size={11} /> 원문 열기
        </Button>
        <Button variant="secondary" className={styles.footerBtn}>
          <Icon name="bookmark" size={11} /> 북마크
        </Button>
      </div>
    </div>
  );
}
