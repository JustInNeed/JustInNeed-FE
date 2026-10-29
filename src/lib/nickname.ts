// 닉네임 검증 규칙 — 백엔드와 동일하게 FE에서 미리 막아 UX 개선.
// 영문으로 시작하는 3~8자 (영문·숫자). 가입 · 설정 · 프로필 수정에서 공통 사용.
import { TAKEN_NICKNAMES } from "@/lib/mock/designData";

export const NICKNAME_RE = /^[a-zA-Z][a-zA-Z0-9]{2,7}$/;
export const NICKNAME_MAX_LENGTH = 8;
export const NICKNAME_HINT = "영어 시작, 3-8자 (영문/숫자)";
export const NICKNAME_FORMAT_ERROR = "영문으로 시작하는 3-8자(영문·숫자)로 입력해주세요.";
export const NICKNAME_TAKEN_MESSAGE = "이미 사용 중인 닉네임입니다.";
export const NICKNAME_AVAILABLE_MESSAGE = "사용 가능한 닉네임입니다.";

export function isValidNickname(value: string): boolean {
  return NICKNAME_RE.test(value);
}

/** 중복 확인 — 전용 API가 없어 로컬 시뮬레이션. 실제 중복은 저장 시 서버 409 로 확인. */
export function isNicknameTaken(value: string): boolean {
  return TAKEN_NICKNAMES.includes(value.toLowerCase());
}
