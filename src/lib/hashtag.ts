// 해시태그 검증 규칙 — 백엔드와 동일하게 FE에서 미리 막아 UX 개선.
// - 그룹당/세션당 최대 10개
// - 각 태그 1~10자, 한글·영문·숫자만 (공백·특수문자·'#' 불가)
// - 대소문자 무시 중복 불가
// 저장값은 '#' 없는 raw 문자열.

export const MAX_HASHTAGS = 10;
export const HASHTAG_RE = /^[가-힣A-Za-z0-9]{1,10}$/;

/** 앞쪽 '#'·공백 제거 → raw 태그. */
export function normalizeHashtag(raw: string): string {
  return raw.trim().replace(/^#+/, "").replace(/\s+/g, "");
}

export type ValidateResult = { ok: true; value: string } | { ok: false; msg: string };

export function validateHashtag(raw: string, existing: string[]): ValidateResult {
  const value = normalizeHashtag(raw);
  if (!value) return { ok: false, msg: "내용을 입력해주세요." };
  if (value.length > 10) return { ok: false, msg: "최대 10자까지 입력할 수 있어요." };
  if (!HASHTAG_RE.test(value)) return { ok: false, msg: "한글·영문·숫자만 사용할 수 있어요." };
  if (existing.some((t) => t.toLowerCase() === value.toLowerCase())) {
    return { ok: false, msg: "이미 추가된 해시태그입니다." };
  }
  if (existing.length >= MAX_HASHTAGS) {
    return { ok: false, msg: `해시태그는 최대 ${MAX_HASHTAGS}개까지 추가할 수 있어요.` };
  }
  return { ok: true, value };
}
