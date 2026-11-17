// 정책 #30 차등 테스트 — 같은 입력을 BE 와 나눠 쓰는 표(validation-cases.json)로 FE 검증을 돌린다.
// 기대값은 BE 기준 정답이고, 표에 fe 칸이 있으면 이유(reason)가 적힌 승인된 차이다.
// 표의 원본은 BE 레포 src/test/resources/differential/validation-cases.json 이다. 여기 사본만 고치지 않는다.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { normalizeExcludedUrl } from "@/features/settings/excludedUrl";
import { validateHashtag } from "@/lib/hashtag";
import { isValidNickname } from "@/lib/nickname";

type ValueCase = { input: string; value: string | null; fe?: string | null; be?: string | null; reason?: string };
type ValidCase = { input: string; valid: boolean; fe?: boolean; be?: boolean; reason?: string };
type Cases = { nickname: ValidCase[]; hashtag: ValueCase[]; excludedUrl: ValueCase[] };

const cases: Cases = JSON.parse(readFileSync(join(__dirname, "validation-cases.json"), "utf8"));

/** FE 가 따라야 할 값: 승인된 차이가 있으면 fe 칸, 없으면 공통 기대값 */
const feExpected = <T,>(c: { fe?: T; reason?: string }, common: T): T => ("fe" in c ? (c.fe as T) : common);

describe("차등 테스트 (FE vs BE 검증 규칙)", () => {
  it("승인된 차이에는 모두 이유가 적혀 있다", () => {
    const all = [...cases.nickname, ...cases.hashtag, ...cases.excludedUrl] as { fe?: unknown; be?: unknown; reason?: string }[];
    expect(all.filter((c) => ("fe" in c || "be" in c) && !c.reason?.trim())).toEqual([]);
  });

  it.each(cases.nickname)("닉네임 %j", (c) => {
    expect(isValidNickname(c.input)).toBe(feExpected(c, c.valid));
  });

  it.each(cases.hashtag)("해시태그 %j", (c) => {
    const r = validateHashtag(c.input, []);
    expect(r.ok ? r.value : null).toBe(feExpected(c, c.value));
  });

  it.each(cases.excludedUrl)("수집 제외 URL %j", (c) => {
    expect(normalizeExcludedUrl(c.input)).toBe(feExpected(c, c.value));
  });
});
