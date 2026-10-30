// 닉네임 검증 규칙 — 백엔드와 동일하게 FE에서 미리 막아 UX 개선.
// 영문으로 시작하는 3~8자 (영문·숫자). 가입 · 설정 · 프로필 수정에서 공통 사용.
import { checkNicknameAvailability } from "@/lib/api";

export const NICKNAME_RE = /^[a-zA-Z][a-zA-Z0-9]{2,7}$/;
export const NICKNAME_MAX_LENGTH = 8;
export const NICKNAME_HINT = "영어 시작, 3-8자 (영문/숫자)";
export const NICKNAME_FORMAT_ERROR = "영문으로 시작하는 3-8자(영문·숫자)로 입력해주세요.";
export const NICKNAME_TAKEN_MESSAGE = "이미 사용 중인 닉네임입니다.";
export const NICKNAME_AVAILABLE_MESSAGE = "사용 가능한 닉네임입니다.";
export const NICKNAME_CHECK_FAILED_MESSAGE = "중복 확인에 실패했어요. 다시 시도해 주세요.";

export function isValidNickname(value: string): boolean {
  return NICKNAME_RE.test(value);
}

/** 닉네임 중복 확인 — 쓸 수 있으면 true */
export type CheckNickname = (nickname: string) => Promise<boolean>;

/** 기본 중복 확인 — GET /members/nickname/available. 형식이 틀리면 요청 없이 false, 요청 실패는 throw (화면에서 "중복 확인 실패").
 * 확인 뒤 저장 전에 다른 사람이 가져가면 저장 시 서버 409 로 막는다. */
export const checkNicknameAvailable: CheckNickname = async (nickname) =>
  isValidNickname(nickname) && (await checkNicknameAvailability(nickname)).available;
