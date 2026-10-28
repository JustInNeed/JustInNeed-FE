import styles from "./StatCard.module.css";

export interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}

export function StatCard({ label, value, sub, accent }: StatCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.label}>{label}</div>
      <div className={styles.row}>
        <span className={styles.value}>{value}</span>
        {accent && <span className={styles.accent}>{accent}</span>}
      </div>
      {sub && <div className={styles.sub}>{sub}</div>}
    </div>
  );
}
