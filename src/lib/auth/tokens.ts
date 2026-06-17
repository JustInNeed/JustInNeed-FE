// 토큰 저장·주입의 단일 지점. 추후 httpOnly 쿠키로 바꿀 때 이 파일만 교체하면 됨.
import type { ProviderId } from "@/lib/types";

const ACCESS_KEY = "jin_access_token";
const REFRESH_KEY = "jin_refresh_token";
const LAST_PROVIDER_KEY = "jin_last_provider";

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
