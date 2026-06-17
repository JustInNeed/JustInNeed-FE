// 공통 API 클라이언트.
// - Base URL은 env에서 주입
// - 모든 보호 API에 Authorization: Bearer {accessToken} 자동 첨부 (토큰 없으면 백엔드가 401)
// - ApiResponse 언래핑 + 실패 시 message로 ApiError throw
// - 401 → refresh 1회 시도 후 원요청 재시도, refresh 실패 시 토큰 폐기 + 로그인 화면
import type { ApiResponse, TokenResponse } from "./types";
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "@/lib/auth/tokens";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// 동시 401에 대한 refresh 중복 호출 방지
let refreshPromise: Promise<boolean> | null = null;

/** refreshToken으로 새 토큰을 발급받아 저장. 성공 시 true. (인터셉터 재귀를 막기 위해 raw fetch 사용) */
export async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${BASE_URL}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) return false;
        const body = (await res.json()) as ApiResponse<TokenResponse>;
        if (!body?.success || !body.data) return false;
        setTokens(body.data);
        return true;
      } catch {
        return false;
      }
    })();
    void refreshPromise.finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

function redirectToLogin() {
  if (typeof window === "undefined") return;
  const path = window.location.pathname;
  if (path !== "/login" && !path.startsWith("/oauth")) {
    window.location.href = "/login";
  }
}

function buildHeaders(extra?: HeadersInit): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const accessToken = getAccessToken();
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
  return { ...headers, ...(extra as Record<string, string>) };
}

async function request<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, { ...options, headers: buildHeaders(options.headers) });
  } catch {
    throw new ApiError("서버에 연결할 수 없습니다. 백엔드가 실행 중인지 확인해주세요.", 0);
  }

  // 401 → 자동 재발급 후 1회 재시도
  if (res.status === 401 && retry && getRefreshToken()) {
    const ok = await refreshAccessToken();
    if (ok) return request<T>(path, options, false);
    clearTokens();
    redirectToLogin();
    throw new ApiError("인증이 만료되었습니다. 다시 로그인해주세요.", 401);
  }

  let body: ApiResponse<T> | null = null;
  try {
    body = (await res.json()) as ApiResponse<T>;
  } catch {
    body = null;
  }

  if (!res.ok || (body && body.success === false)) {
    const message = body?.message ?? `요청에 실패했습니다. (HTTP ${res.status})`;
    throw new ApiError(message, res.status);
  }

  return (body ? body.data : null) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
