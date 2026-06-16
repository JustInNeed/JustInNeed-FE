import { api } from "./client";
import type { SessionDetail, SessionListItem, SessionUpdateRequest } from "./types";

export const getSessions = () => api.get<SessionListItem[]>("/sessions");

export const getSession = (id: number) => api.get<SessionDetail>(`/sessions/${id}`);

export const updateSession = (id: number, body: SessionUpdateRequest) =>
  api.patch<SessionDetail>(`/sessions/${id}`, body);

export const deleteSession = (id: number) => api.del<null>(`/sessions/${id}`);
