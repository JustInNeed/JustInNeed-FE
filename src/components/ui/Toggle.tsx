import styles from "./Toggle.module.css";

export interface ToggleProps {
  label: string;
  desc?: string;
  on: boolean;
  onChange?: (v: boolean) => void;
}

export function Toggle({ label, desc, on, onChange }: ToggleProps) {
  return (
    <div className={styles.row}>
      <div>
        <div className={styles.label}>{label}</div>
        {desc && <div className={styles.desc}>{desc}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => onChange?.(!on)}
        className={styles.track}
        style={{ background: on ? "var(--green-500)" : "var(--line-2)" }}
      >
        <span className={styles.thumb} style={{ transform: `translateX(${on ? 16 : 0}px)` }} />
      </button>
    </div>
  );
}
