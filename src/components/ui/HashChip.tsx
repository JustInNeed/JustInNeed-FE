import styles from "./HashChip.module.css";

export type HashChipSize = "sm" | "md" | "lg";

export interface HashChipProps {
  label: string;
  active?: boolean;
  size?: HashChipSize;
  onClick?: () => void;
}

export function HashChip({ label, active = false, size = "md", onClick }: HashChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[styles.chip, styles[size], active ? styles.active : ""].filter(Boolean).join(" ")}
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      {label}
    </button>
  );
}
