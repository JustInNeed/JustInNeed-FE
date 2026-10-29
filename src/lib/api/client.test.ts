import { http } from "msw";
import { describe, expect, it } from "vitest";
import { API, fail, ok, server } from "@/test/msw/server";
import { MEMBER } from "@/test/fixtures/member";
import { getAccessToken, setTokens } from "@/lib/auth/tokens";
import { ApiError, getMe } from "./index";

describe("API 클라이언트", () => {
  it("성공 응답의 data 만 꺼내 준다", async () => {
    setTokens({ accessToken: "a1", refreshToken: "r1" });
    server.use(http.get(`${API}/members/me`, () => ok(MEMBER)));
    await expect(getMe()).resolves.toEqual(MEMBER);
  });

  it("access 토큰을 Authorization 헤더로 보낸다", async () => {
    setTokens({ accessToken: "a1", refreshToken: "r1" });
    let auth: string | null = null;
    server.use(
      http.get(`${API}/members/me`, ({ request }) => {
        auth = request.headers.get("Authorization");
        return ok(MEMBER);
      }),
    );
    await getMe();
    expect(auth).toBe("Bearer a1");
  });

  it("실패 응답이면 서버 메시지와 상태 코드로 ApiError 를 던진다", async () => {
    setTokens({ accessToken: "a1", refreshToken: "r1" });
    server.use(http.get(`${API}/members/me`, () => fail(404, "회원을 찾을 수 없습니다.")));
    const err = await getMe().catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ message: "회원을 찾을 수 없습니다.", status: 404 });
  });

  it("401 이면 refresh 로 토큰을 새로 받아 한 번 다시 요청한다", async () => {
    setTokens({ accessToken: "expired", refreshToken: "r1" });
    server.use(
      http.get(`${API}/members/me`, ({ request }) =>
        request.headers.get("Authorization") === "Bearer fresh" ? ok(MEMBER) : fail(401, "만료"),
      ),
      http.post(`${API}/auth/refresh`, () => ok({ accessToken: "fresh", refreshToken: "r2" })),
    );
    await expect(getMe()).resolves.toEqual(MEMBER);
    expect(getAccessToken()).toBe("fresh");
  });
});
