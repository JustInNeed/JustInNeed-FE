// 로그인/로그아웃/탈퇴 직후 1회 노출되는 토스트 플래그 (sessionStorage).
// 콜백 페이지가 심고, (personal) 레이아웃 / 로그인 페이지가 꺼내서 표시한다.
export type AuthToastKind = "login" | "logout" | "withdraw";
export interface AuthToastFlag {
  kind: AuthToastKind;
  justSignedUp?: boolean;
}

const KEY = "jin_auth_toast";

export function setAuthToast(flag: AuthToastFlag): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(flag));
  } catch {
    /* ignore */
  }
}

/** 읽고 즉시 제거 (한 번만 표시) */
export function consumeAuthToast(): AuthToastFlag | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
    return JSON.parse(raw) as AuthToastFlag;
  } catch {
    return null;
  }
}
