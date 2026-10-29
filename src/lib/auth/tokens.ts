// 토큰 저장·주입의 단일 지점. 추후 httpOnly 쿠키로 바꿀 때 이 파일만 교체하면 됨.
import type { ProviderId } from "@/lib/types";

const ACCESS_KEY = "jin_access_token";
const REFRESH_KEY = "jin_refresh_token";
const LAST_PROVIDER_KEY = "jin_last_provider";
const PENDING_PROVIDER_KEY = "jin_pending_provider";

const isBrowser = () => typeof window !== "undefined";

export function getAccessToken(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens(tokens: { accessToken: string; refreshToken: string }): void {
  if (!isBrowser()) return;
  localStorage.setItem(ACCESS_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
}

export function clearTokens(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}

// 로그인 화면의 "최근 사용" 표시용 (선택적 편의 기능)
export function getLastProvider(): ProviderId | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(LAST_PROVIDER_KEY) as ProviderId | null;
}

export function setLastProvider(provider: ProviderId): void {
  if (!isBrowser()) return;
  localStorage.setItem(LAST_PROVIDER_KEY, provider);
}

// 버튼을 누른 프로바이더는 OAuth 리다이렉트 동안 sessionStorage 에 대기시키고, 로그인 성공 시에만 "최근 사용"으로 확정
export function setPendingProvider(provider: ProviderId): void {
  if (!isBrowser()) return;
  try {
    sessionStorage.setItem(PENDING_PROVIDER_KEY, provider);
  } catch {
    /* ignore */
  }
}

/** 로그인 성공 시 호출 — 대기 중인 프로바이더를 확정 */
export function commitPendingProvider(): void {
  if (!isBrowser()) return;
  try {
    const provider = sessionStorage.getItem(PENDING_PROVIDER_KEY) as ProviderId | null;
    sessionStorage.removeItem(PENDING_PROVIDER_KEY);
    if (provider) setLastProvider(provider);
  } catch {
    /* ignore */
  }
}

/** 로그인 실패 시 호출 — 대기 중인 프로바이더를 버림 */
export function clearPendingProvider(): void {
  if (!isBrowser()) return;
  try {
    sessionStorage.removeItem(PENDING_PROVIDER_KEY);
  } catch {
    /* ignore */
  }
}
