import { api } from "./client";
import type {
  CommunityProfileCardPage,
  CommunityProfileMindmap,
  CommunityProfileResponse,
  ProfileLikeResponse,
} from "./types";

// 다른 사용자 프로필 화면. 프로필 · 카드 목록은 작성자 본인이 불러도 방문자 규칙이다

/** 없거나 탈퇴한 회원이면 404 */
export const getCommunityProfile = (userId: number) =>
  api.get<CommunityProfileResponse>(`/community/profiles/${userId}`);

export const getProfileCards = (userId: number, page: number, size: number) =>
  api.get<CommunityProfileCardPage>(`/community/profiles/${userId}/mindmaps?page=${page}&size=${size}`);

export const getProfileMindmap = (userId: number) =>
  api.get<CommunityProfileMindmap>(`/community/profiles/${userId}/mindmap`);

/** 내 프로필이면 400 */
export const updateProfileLike = (userId: number, liked: boolean) =>
  api.patch<ProfileLikeResponse>(`/community/profiles/${userId}/like`, { liked });

