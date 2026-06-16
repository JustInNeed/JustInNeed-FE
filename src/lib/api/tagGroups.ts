import { api } from "./client";
import type {
  TagGroup,
  TagGroupCreateRequest,
  TagGroupOrderRequest,
  TagGroupUpdateRequest,
} from "./types";

export const getTagGroups = () => api.get<TagGroup[]>("/tag-groups");

export const createTagGroup = (body: TagGroupCreateRequest) =>
  api.post<TagGroup>("/tag-groups", body);

export const updateTagGroup = (id: number, body: TagGroupUpdateRequest) =>
  api.patch<TagGroup>(`/tag-groups/${id}`, body);

export const deleteTagGroup = (id: number) => api.del<null>(`/tag-groups/${id}`);

/** groupIds는 내 그룹 전체를 원하는 순서대로 빠짐없이 한 번씩 포함해야 함. */
export const reorderTagGroups = (body: TagGroupOrderRequest) =>
  api.patch<TagGroup[]>("/tag-groups/order", body);
