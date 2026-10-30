import { http } from "msw";
import { describe, expect, it } from "vitest";
import { API, fail, ok, server } from "@/test/msw/server";
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

describe("기본 닉네임 중복 확인 — GET /members/nickname/available", () => {
  const NICKNAME_API = `${API}/members/nickname/available`;

  it("서버가 사용 가능하다고 하면 true, 이미 사용 중이면 false — 보낸 닉네임은 쿼리로 그대로", async () => {
    const asked: (string | null)[] = [];
    server.use(
      http.get(NICKNAME_API, ({ request }) => {
        const nickname = new URL(request.url).searchParams.get("nickname");
        asked.push(nickname);
        return ok({ nickname, available: nickname !== "WANDERER" });
      }),
    );
    await expect(checkNicknameAvailable("sprout")).resolves.toBe(true);
    await expect(checkNicknameAvailable("WANDERER")).resolves.toBe(false);
    expect(asked).toEqual(["sprout", "WANDERER"]);
  });

  it("형식이 틀리면 요청하지 않고 사용할 수 없다", async () => {
    // 등록한 핸들러가 없어 요청이 나가면 테스트가 실패한다 (setup.ts: onUnhandledRequest "error")
    await expect(checkNicknameAvailable("1ab")).resolves.toBe(false);
  });

  it("요청이 실패하면 에러를 던진다 — 화면에서 \"중복 확인에 실패했어요\" 를 보여준다", async () => {
    server.use(http.get(NICKNAME_API, () => fail(500, "서버 오류가 발생했습니다.")));
    await expect(checkNicknameAvailable("sprout")).rejects.toThrow("서버 오류가 발생했습니다.");
  });
});
