"use client";

// 앱 전역 토스트 (오류 메시지 후보 A).
// - 한 번에 하나만 표시, 새 토스트가 오면 교체
// - 기본 4.5초 후 자동으로 닫힘 (AuthToast 와 동일)
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Toast, type IconName, type ToastAction, type ToastTone } from "@/components/ui";

const DEFAULT_DURATION_MS = 4500;

export interface ToastOptions {
  action?: ToastAction;
  icon?: IconName;
  durationMs?: number;
}

export interface ToastApi {
  show: (tone: ToastTone, message: string, options?: ToastOptions) => void;
  error: (message: string, options?: ToastOptions) => void;
  warning: (message: string, options?: ToastOptions) => void;
  success: (message: string, options?: ToastOptions) => void;
  info: (message: string, options?: ToastOptions) => void;
  dismiss: () => void;
}

interface Current {
  id: number;
  tone: ToastTone;
  message: string;
  options: ToastOptions;
}

const Ctx = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<Current | null>(null);

  const dismiss = useCallback(() => setCurrent(null), []);
  const show = useCallback((tone: ToastTone, message: string, options: ToastOptions = {}) => {
    setCurrent({ id: Date.now(), tone, message, options });
  }, []);

  useEffect(() => {
    if (!current) return;
    const t = setTimeout(dismiss, current.options.durationMs ?? DEFAULT_DURATION_MS);
    return () => clearTimeout(t);
  }, [current, dismiss]);

  const api = useMemo<ToastApi>(
    () => ({
      show,
      error: (m, o) => show("error", m, o),
      warning: (m, o) => show("warning", m, o),
      success: (m, o) => show("success", m, o),
      info: (m, o) => show("info", m, o),
      dismiss,
    }),
    [show, dismiss],
  );

  const action = current?.options.action;

  return (
    <Ctx.Provider value={api}>
      {children}
      {current && (
        <Toast
          key={current.id}
          tone={current.tone}
          message={current.message}
          icon={current.options.icon}
          action={
            action && {
              label: action.label,
              onClick: () => {
                dismiss();
                action.onClick();
              },
            }
          }
          onClose={dismiss}
        />
      )}
    </Ctx.Provider>
  );
}

export function useToast(): ToastApi {
  const v = useContext(Ctx);
  if (!v) throw new Error("useToast must be used inside ToastProvider");
  return v;
}
