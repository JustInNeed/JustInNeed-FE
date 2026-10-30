import { api, refreshAccessToken } from "./client";
import type { LoginCodeExchangeRequest, LoginTokenResponse } from "./types";

/**
 * 소셜 로그인 콜백의 일회용 코드(60초 · 1회용)로 토큰 받기.
 * 로그인 전 요청이라 저장된 토큰이 있어도 Authorization 을 붙이지 않고, 401 이어도 refresh 재시도를 하지 않는다.
 * 코드가 없거나 만료 · 이미 사용됐으면 401 → ApiError.
 */
export const exchangeLoginCode = (code: string) =>
  api.publicPost<LoginTokenResponse>("/auth/token", { code } satisfies LoginCodeExchangeRequest);

/** 로그아웃 — 서버에서 refresh 토큰 폐기. (FE는 호출 후 저장 토큰 삭제) */
export const logout = (refreshToken?: string) =>
  api.post<null>("/auth/logout", { refreshToken });

/** 토큰 재발급 (성공 시 true). 보통은 클라이언트의 401 인터셉터가 자동 호출. */
export const refresh = refreshAccessToken;
