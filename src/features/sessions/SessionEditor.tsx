import { Icon, Card } from "@/components/ui";
import styles from "./SessionEditor.module.css";

export interface SessionEditorProps {
  heading: string;
  setHeading: (v: string) => void;
  summary: string;
  setSummary: (v: string) => void;
  insights: string[];
  updateInsight: (idx: number, value: string) => void;
  removeInsight: (idx: number) => void;
}

export function SessionEditor({
  heading,
  setHeading,
  summary,
  setSummary,
  insights,
  updateInsight,
  removeInsight,
}: SessionEditorProps) {
  return (
    <Card style={{ padding: 28, overflowY: "auto" }}>
      <div className={styles.eyebrow}>본문</div>

      <input
        value={heading}
        onChange={(e) => setHeading(e.target.value)}
        placeholder="소제목"
        className={styles.heading}
      />

      <textarea
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        placeholder="본문을 입력하세요. (## 소제목 같은 마크다운 지원 예정)"
        rows={8}
        className={styles.summary}
      />
      <div className={styles.tip}>
        Tip: <code>## 소제목</code> / <code>**굵게**</code> 같은 마크다운으로 작성할 수 있어요.
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
