// 공통 API 클라이언트.
// - Base URL은 env에서 주입
// - 모든 보호 API에 Authorization: Bearer {accessToken} 자동 첨부 (토큰 없으면 백엔드가 401)
// - ApiResponse 언래핑 + 실패 시 message로 ApiError throw
// - 401 → refresh 1회 시도 후 원요청 재시도, refresh 실패 시 토큰 폐기 + 로그인 화면
// - refresh 는 탭 사이에서도 한 번에 하나씩 (다른 탭이 이미 재발급했으면 그 토큰을 쓴다)
// - 로그인 전 공개 요청(publicPost)은 Authorization 을 붙이지 않고 401 이어도 refresh 하지 않음
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

// 동시 401에 대한 refresh 중복 호출 방지 (탭 안)
let refreshPromise: Promise<boolean> | null = null;

// refresh 토큰은 1회용인데 저장소는 탭끼리 공유 → 재발급은 탭 사이에서도 한 번에 하나씩
const REFRESH_LOCK = "jin-token-refresh";

/** 저장된 refresh 토큰이 보낸 것과 다르면 다른 탭이 이미 재발급한 것 (없어졌으면 로그아웃이라 아님) */
function rotatedElsewhere(sent: string): boolean {
  const stored = getRefreshToken();
  return !!stored && stored !== sent;
}

/** seen 을 새 토큰으로 교환해 저장. 성공 시 true. (인터셉터 재귀를 막기 위해 raw fetch 사용) */
async function rotateTokens(seen: string): Promise<boolean> {
  // 락을 기다리는 동안 저장소가 바뀌었을 수 있어 다시 읽는다
  if (!getRefreshToken()) return false;
  if (rotatedElsewhere(seen)) return true;
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: seen }),
    });
    if (res.ok) {
      const body = (await res.json()) as ApiResponse<TokenResponse>;
      if (body?.success && body.data) {
        setTokens(body.data);
        return true;
      }
    }
  } catch {
    /* 아래에서 판단 */
  }
  // 락 없이 동시에 보내 진 경우: 이긴 탭이 저장한 토큰을 쓴다
  return rotatedElsewhere(seen);
}

/** Web Locks 가 있으면 락 안에서, 없으면(구형 브라우저 · 비보안 출처) 바로 실행. 락을 못 얻어도 바로 실행 */
async function withRefreshLock(run: () => Promise<boolean>): Promise<boolean> {
  if (!navigator.locks) return run();
  try {
    return await navigator.locks.request(REFRESH_LOCK, run);
  } catch {
    return run();
  }
}

/** 토큰을 재발급받거나 다른 탭이 재발급한 토큰을 쓸 수 있으면 true */
export async function refreshAccessToken(): Promise<boolean> {
  const seen = getRefreshToken();
  if (!seen) return false;
  if (!refreshPromise) {
    refreshPromise = withRefreshLock(() => rotateTokens(seen));
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

function buildHeaders(extra: HeadersInit | undefined, auth: boolean): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const accessToken = auth ? getAccessToken() : null;
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
  return { ...headers, ...(extra as Record<string, string>) };
}

interface RequestConfig {
  /** false 면 Authorization 을 붙이지 않고 401 refresh 재시도도 하지 않는다 (로그인 전 공개 API) */
  auth?: boolean;
  /** 401 시 refresh 후 재시도할지 (재시도 요청 자신은 false) */
  retry?: boolean;
}

async function request<T>(path: string, options: RequestInit = {}, { auth = true, retry = true }: RequestConfig = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, { ...options, headers: buildHeaders(options.headers, auth) });
  } catch {
    throw new ApiError("서버에 연결할 수 없습니다. 백엔드가 실행 중인지 확인해주세요.", 0);
  }

  // 401 → 자동 재발급 후 1회 재시도
  if (res.status === 401 && auth && retry && getRefreshToken()) {
    const ok = await refreshAccessToken();
    if (ok) return request<T>(path, options, { retry: false });
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
  /** 로그인 전 공개 POST — 저장된 토큰이 있어도 Authorization 을 붙이지 않고, 401 이어도 refresh 하지 않는다 */
  publicPost: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }, { auth: false }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  del: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "DELETE", body: body === undefined ? undefined : JSON.stringify(body) }),
};
