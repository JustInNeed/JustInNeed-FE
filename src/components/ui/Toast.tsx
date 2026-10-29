import { Icon, type IconName } from "./Icon";
import styles from "./Toast.module.css";

export type ToastTone = "error" | "warning" | "success" | "info";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastProps {
  tone: ToastTone;
  message: string;
  /** 기본 아이콘 대신 쓸 아이콘 (예: 로그인 만료 → lock) */
  icon?: IconName;
  action?: ToastAction;
  onClose?: () => void;
}

const DEFAULT_ICON: Record<ToastTone, IconName> = {
  error: "x",
  warning: "exclaim",
  success: "check",
  info: "bell",
};

/** 화면 상단 중앙 토스트 (오류 메시지 후보 A). 띄우고 닫는 건 `useToast()` 가 맡는다. */
export function Toast({ tone, message, icon, action, onClose }: ToastProps) {
  return (
    <div className={`${styles.toast} ${styles[tone]}`} role={tone === "error" ? "alert" : "status"}>
      <span className={`${styles.badge} ${styles[`badge_${tone}`]}`}>
        <Icon name={icon ?? DEFAULT_ICON[tone]} size={12} stroke={2.6} />
      </span>
      <span className={styles.message}>{message}</span>
      {action && (
        <button type="button" onClick={action.onClick} className={styles.action}>
          {action.label}
        </button>
      )}
      {onClose && (
        <button type="button" onClick={onClose} className={styles.close} aria-label="닫기">
          <Icon name="x" size={14} stroke={2} />
        </button>
      )}
    </div>
  );
}
