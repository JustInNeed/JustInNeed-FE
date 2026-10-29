import { Card } from "@/components/ui";
import styles from "./SessionEditor.module.css";

export interface SessionEditorProps {
  /** 본문 마크다운 원문. 저장 시 editedMarkdown으로 전송됨. */
  value: string;
  onChange: (v: string) => void;
}

export function SessionEditor({ value, onChange }: SessionEditorProps) {
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
    </Card>
  );
}
