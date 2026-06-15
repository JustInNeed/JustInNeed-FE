import type { ButtonHTMLAttributes } from "react";
import styles from "./Button.module.css";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "icon" | "iconSm";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  /** Applies the "active chip" styling — used for toggle buttons (secondary variant). */
  active?: boolean;
}

export function Button({
  variant = "secondary",
  active = false,
  className,
  type = "button",
  children,
  ...rest
}: ButtonProps) {
  const cls = [styles.btn, styles[variant], active ? styles.active : "", className]
    .filter(Boolean)
    .join(" ");
  return (
    <button type={type} className={cls} {...rest}>
      {children}
    </button>
  );
}
