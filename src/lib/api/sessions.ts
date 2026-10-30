import { api } from "./client";
import type { SessionDetail, SessionListItem, SessionListParams, SessionPage, SessionUpdateRequest } from "./types";

export const getSessions = async ({ page = 0, size = 10, favorite = false }: SessionListParams = {}): Promise<SessionPage> => {
  const query = new URLSearchParams({ page: String(page), size: String(size), favorite: String(favorite) });
  const data = await api.get<SessionPage | SessionListItem[]>(`/sessions?${query}`);
  // BE 배포 전환용: 페이징 전 BE 는 전체 배열을 돌려준다 → 여기서 즐겨찾기 · 페이지를 나눔. BE 페이징 PR 머지 후 삭제
  if (Array.isArray(data)) {
    const filtered = favorite ? data.filter((s) => s.isFavorite) : data;
    return {
      sessions: filtered.slice(page * size, (page + 1) * size),
      hasNext: (page + 1) * size < filtered.length,
      totalCount: data.length,
      favoriteCount: data.filter((s) => s.isFavorite).length,
    };
  }
  return data;
};

/** 내 세션 전체의 해시태그 — 대소문자 무시 중복 제거, 목록 순서대로 처음 나온 순 */
export const getSessionHashtags = () => api.get<string[]>("/sessions/hashtags");

export const getSession = (id: number) => api.get<SessionDetail>(`/sessions/${id}`);

export const updateSession = (id: number, body: SessionUpdateRequest) =>
  api.patch<SessionDetail>(`/sessions/${id}`, body);

export const deleteSession = (id: number) => api.del<null>(`/sessions/${id}`);
