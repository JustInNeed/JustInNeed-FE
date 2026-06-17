import { api, refreshAccessToken } from "./client";

/** 로그아웃 — 서버에서 refresh 토큰 폐기. (FE는 호출 후 저장 토큰 삭제) */
export const logout = (refreshToken?: string) =>
  api.post<null>("/auth/logout", { refreshToken });

/** 토큰 재발급 (성공 시 true). 보통은 클라이언트의 401 인터셉터가 자동 호출. */
export const refresh = refreshAccessToken;
