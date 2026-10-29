import type { MemberResponse } from "@/lib/api";

/** 로그인한 회원 (GET /members/me 응답) */
export const MEMBER: MemberResponse = {
  id: 6,
  nickname: "yesong",
  socialProvider: "KAKAO",
  email: null,
  joinedAt: "2026-04-01T10:00:00",
};

/** 가입 직후 — 닉네임 입력 전 */
export const NEW_MEMBER: MemberResponse = { ...MEMBER, id: 13, nickname: null };
