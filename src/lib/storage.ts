// localStorage 헬퍼 (인증 임시 보관). 추후 토큰 방식으로 교체 예정.
import type { Auth } from "./types";

const AUTH_KEY = "jin_auth";

const isBrowser = () => typeof window !== "undefined";

export function readAuth(): Auth | null {
  if (!isBrowser()) return null;
  try {
    return JSON.parse(localStorage.getItem(AUTH_KEY) || "null");
  } catch {
    return null;
  }
}

export function writeAuth(value: Auth): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(AUTH_KEY, JSON.stringify(value));
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

export function clearAuth(): void {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(AUTH_KEY);
  } catch {
    /* ignore */
  }
}
