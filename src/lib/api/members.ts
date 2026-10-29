import { api } from "./client";
import type { MemberResponse, SocialProvider } from "./types";

export const getMe = () => api.get<MemberResponse>("/members/me");

export const updateNickname = (nickname: string) =>
  api.patch<MemberResponse>("/members/me/nickname", { nickname });

/** 회원 탈퇴 — confirmText 는 "WITHDRAW" 와 정확히 같아야 한다. 성공 시 서버에서 토큰이 모두 무효화된다. */
export const withdrawAccount = (confirmText: string) =>
  api.del<unknown>("/settings/account", { confirmText });

export const SOCIAL_PROVIDER_LABEL: Record<SocialProvider, string> = {
  KAKAO: "카카오",
  NAVER: "네이버",
  GOOGLE: "Google",
};
