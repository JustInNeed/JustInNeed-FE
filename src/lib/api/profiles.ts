import { api } from "./client";
import type {
  CardSessionsResponse,
  CommunityProfileCardPage,
  CommunityProfileMindmap,
  CommunityProfileResponse,
  CommunitySharedSessionPage,
  MyProfileCardPage,
  MyProfileResponse,
  MySessionPage,
  ProfileLikeResponse,
  UpdateMyProfileRequest,
} from "./types";

// 다른 사용자 프로필 화면. 프로필 · 카드 목록은 작성자 본인이 불러도 방문자 규칙이다

/** 없거나 탈퇴한 회원이면 404 */
export const getCommunityProfile = (userId: number) =>
  api.get<CommunityProfileResponse>(`/community/profiles/${userId}`);

export const getProfileCards = (userId: number, page: number, size: number) =>
  api.get<CommunityProfileCardPage>(`/community/profiles/${userId}/mindmaps?page=${page}&size=${size}`);

/** 공개 세션 전부 — 핀고정이 먼저 */
export const getSharedSessions = (userId: number, page: number, size: number) =>
  api.get<CommunitySharedSessionPage>(`/community/profiles/${userId}/shared-sessions?page=${page}&size=${size}`);

export const getProfileMindmap = (userId: number) =>
  api.get<CommunityProfileMindmap>(`/community/profiles/${userId}/mindmap`);

/** 내 프로필이면 400 */
export const updateProfileLike = (userId: number, liked: boolean) =>
  api.patch<ProfileLikeResponse>(`/community/profiles/${userId}/like`, { liked });


// 내 프로필 화면. 비공개 세션까지 포함한 본인 전용 응답이다

export const getMyProfile = () => api.get<MyProfileResponse>("/community/me/profile");

/** publicOnly 면 공개 세션만 — 핀고정 후보 */
export const getMySessions = (page: number, size: number, publicOnly = false) =>
  api.get<MySessionPage>(`/community/me/sessions?page=${page}&size=${size}&publicOnly=${publicOnly}`);

export const getMyCards = (page: number, size: number) =>
  api.get<MyProfileCardPage>(`/community/me/mindmaps?page=${page}&size=${size}`);

export const getMyCardSessions = (mindmapId: number) =>
  api.get<CardSessionsResponse>(`/community/me/mindmaps/${mindmapId}/sessions`);

export const getMyMindmap = () => api.get<CommunityProfileMindmap>("/community/me/mindmap");

/** 값이 잘못되면 400 + 한글 메시지. 일부만 저장되지 않는다 */
export const updateMyProfile = (body: UpdateMyProfileRequest) => api.put<void>("/community/me/profile", body);
