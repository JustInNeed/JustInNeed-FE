import styles from "./HashChip.module.css";

export type HashChipSize = "sm" | "md" | "lg";

export interface HashChipProps {
  label: string;
  active?: boolean;
  size?: HashChipSize;
  onClick?: () => void;
}

/**
 * 해시태그 칩. 누를 동작(onClick)이 있을 때만 버튼으로 그리고, 없으면 글자(span)로 그린다 —
 * 보기만 하는 칩이 Tab 에 걸리지 않게 (QA-039). 모양은 둘 다 같다 (.static 이 버튼 기본 모양을 맞춤)
 */
export function HashChip({ label, active = false, size = "md", onClick }: HashChipProps) {
  const cls = [styles.chip, styles[size], active ? styles.active : ""].filter(Boolean).join(" ");
  if (!onClick) return <span className={`${cls} ${styles.static}`}>{label}</span>;
  return (
    <button type="button" onClick={onClick} className={cls} style={{ cursor: "pointer" }}>
      {label}
    </button>
  );
}
