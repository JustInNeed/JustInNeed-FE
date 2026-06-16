// 공통 API 클라이언트.
// - Base URL은 env에서 주입
// - 모든 요청에 X-User-Id 헤더 주입 (인증 도입 시 이 한 곳만 교체)
// - ApiResponse 언래핑 + 실패 시 message로 ApiError throw
import type { ApiResponse } from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
const DEV_USER_ID = process.env.NEXT_PUBLIC_DEV_USER_ID ?? "1";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** 인증 헤더 — 추후 토큰 방식으로 교체할 단일 지점. */
function authHeaders(): Record<string, string> {
  return { "X-User-Id": DEV_USER_ID };
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
        ...(options.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError("서버에 연결할 수 없습니다. 백엔드가 실행 중인지 확인해주세요.", 0);
  }

  let body: ApiResponse<T> | null = null;
  try {
    body = (await res.json()) as ApiResponse<T>;
  } catch {
    body = null;
  }

  if (!res.ok || !body || body.success === false) {
    const message = body?.message ?? `요청에 실패했습니다. (HTTP ${res.status})`;
    throw new ApiError(message, res.status);
  }

  return body.data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
