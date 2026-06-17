import { api } from "./client";
import type { MemberResponse, SocialProvider } from "./types";

export const getMe = () => api.get<MemberResponse>("/members/me");

export const updateNickname = (nickname: string) =>
  api.patch<MemberResponse>("/members/me/nickname", { nickname });

export const SOCIAL_PROVIDER_LABEL: Record<SocialProvider, string> = {
  KAKAO: "카카오",
  NAVER: "네이버",
  GOOGLE: "Google",
};
