// 닉네임 검증 규칙 — 백엔드와 동일하게 FE에서 미리 막아 UX 개선.
// 영문으로 시작하는 3~8자 (영문·숫자). 가입 · 설정 · 프로필 수정에서 공통 사용.

export const NICKNAME_RE = /^[a-zA-Z][a-zA-Z0-9]{2,7}$/;
export const NICKNAME_MAX_LENGTH = 8;
export const NICKNAME_HINT = "영어 시작, 3-8자 (영문/숫자)";
export const NICKNAME_FORMAT_ERROR = "영문으로 시작하는 3-8자(영문·숫자)로 입력해주세요.";

export function isValidNickname(value: string): boolean {
  return NICKNAME_RE.test(value);
}
