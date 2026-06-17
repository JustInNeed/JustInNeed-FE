import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import styles from "./Markdown.module.css";

export interface MarkdownProps {
  children: string;
}

/** 마크다운 문자열을 안전하게 렌더링 (##, **굵게**, 목록, 표 등). */
export function Markdown({ children }: MarkdownProps) {
  return (
    <div className={styles.prose}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
