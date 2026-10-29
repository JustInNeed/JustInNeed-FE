import { describe, expect, it } from "vitest";
import { normalizeHashtag, validateHashtag } from "./hashtag";

describe("해시태그 규칙 (1~10자 한글·영문·숫자, 최대 10개)", () => {
  it("앞쪽 # 와 공백을 지운 값을 저장한다", () => {
    expect(normalizeHashtag("  #로마 여행 ")).toBe("로마여행");
    expect(validateHashtag("#파리", [])).toEqual({ ok: true, value: "파리" });
  });

  it("비어 있으면 입력해 달라고 한다", () => {
    expect(validateHashtag("  # ", [])).toEqual({ ok: false, msg: "내용을 입력해주세요." });
  });

  it("10자를 넘으면 막는다", () => {
    expect(validateHashtag("가나다라마바사아자차카", [])).toEqual({ ok: false, msg: "최대 10자까지 입력할 수 있어요." });
  });

  it("특수문자는 막는다", () => {
    expect(validateHashtag("로마!", [])).toEqual({ ok: false, msg: "한글·영문·숫자만 사용할 수 있어요." });
  });

  it("대소문자만 다른 중복은 막는다", () => {
    expect(validateHashtag("react", ["React"])).toEqual({ ok: false, msg: "이미 추가된 해시태그입니다." });
  });

  it("이미 10개면 더 추가할 수 없다", () => {
    const ten = Array.from({ length: 10 }, (_, i) => `태그${i}`);
    expect(validateHashtag("새태그", ten)).toEqual({ ok: false, msg: "해시태그는 최대 10개까지 추가할 수 있어요." });
  });
});
