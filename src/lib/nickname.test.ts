import { describe, expect, it } from "vitest";
import { checkNicknameAvailable, isValidNickname } from "./nickname";

describe("닉네임 규칙 (영문으로 시작하는 3~8자, 영문·숫자)", () => {
  it.each(["abc", "yesong", "user1234"])("%s 는 쓸 수 있다", (v) => {
    expect(isValidNickname(v)).toBe(true);
  });

  it.each([
    ["2자", "ab"],
    ["9자", "abcdefghi"],
    ["숫자로 시작", "1abc"],
    ["한글", "예송abc"],
    ["특수문자", "ab_cd"],
  ])("%s(%s)는 막는다", (_, v) => {
    expect(isValidNickname(v)).toBe(false);
  });
});

describe("기본 닉네임 중복 확인 (전용 API 전)", () => {
  it("형식이 맞으면 사용 가능으로 본다 — 실제 중복은 저장 시 서버 409 가 막는다", async () => {
    await expect(checkNicknameAvailable("admin")).resolves.toBe(true);
  });

  it("형식이 틀리면 사용할 수 없다", async () => {
    await expect(checkNicknameAvailable("1ab")).resolves.toBe(false);
  });
});
