import { api } from "./client";
import type { SessionDetail, SessionListParams, SessionPage, SessionUpdateRequest } from "./types";

/** 세션 목록 한 페이지 — 진행 중 세션이 맨 위, 나머지는 종료 시각 최신순. 개수는 필터 · 페이지와 상관없는 전체 기준 */
export const getSessions = ({ page = 0, size = 10, favorite = false }: SessionListParams = {}) => {
  const query = new URLSearchParams({ page: String(page), size: String(size), favorite: String(favorite) });
  return api.get<SessionPage>(`/sessions?${query}`);
};

/** 내 세션 전체의 해시태그 — 대소문자 무시 중복 제거, 목록 순서대로 처음 나온 순 */
export const getSessionHashtags = () => api.get<string[]>("/sessions/hashtags");

export const getSession = (id: number) => api.get<SessionDetail>(`/sessions/${id}`);

export const updateSession = (id: number, body: SessionUpdateRequest) =>
  api.patch<SessionDetail>(`/sessions/${id}`, body);

export const deleteSession = (id: number) => api.del<null>(`/sessions/${id}`);
