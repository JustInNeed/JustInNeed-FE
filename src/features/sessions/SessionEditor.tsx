import { Icon, Card } from "@/components/ui";
import styles from "./SessionEditor.module.css";

export interface SessionEditorProps {
  /** 본문 마크다운 원문. 저장 시 editedMarkdown으로 전송됨. */
  value: string;
  onChange: (v: string) => void;
  /** 하이라이트(인사이트) 목록. */
  insights: string[];
  updateInsight: (idx: number, value: string) => void;
  removeInsight: (idx: number) => void;
}

export function SessionEditor({ value, onChange, insights, updateInsight, removeInsight }: SessionEditorProps) {
  return (
    <Card style={{ padding: 28, overflowY: "auto" }}>
      <div className={styles.eyebrow}>본문 (마크다운)</div>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="마크다운으로 작성하세요. 예) # 제목, ## 소제목, **굵게**, - 목록"
        className={styles.summary}
        autoFocus
      />
      <div className={styles.tip}>
        Tip: <code># 제목</code> / <code>## 소제목</code> / <code>**굵게**</code> / <code>- 목록</code> 등 마크다운 문법을
        그대로 쓸 수 있어요.
      </div>

      <div className={styles.highlightHead}>
        <div className={styles.eyebrow}>하이라이트 ({insights.length})</div>
      </div>

      {insights.length === 0 ? (
        <div className={styles.empty}>하이라이트가 모두 삭제되었습니다.</div>
      ) : (
        <ul className={styles.list}>
          {insights.map((ins, i) => (
            <li key={i} className={styles.item}>
              <span className={styles.num}>{String(i + 1).padStart(2, "0")}</span>
              <textarea
                value={ins}
                onChange={(e) => updateInsight(i, e.target.value)}
                rows={1}
                className={styles.itemInput}
              />
              <button
                onClick={() => removeInsight(i)}
                title="하이라이트 삭제"
                className={styles.removeBtn}
                aria-label="하이라이트 삭제"
              >
                <Icon name="trash" size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
