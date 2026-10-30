import { http } from "msw";
import { describe, expect, it } from "vitest";
import { API, fail, ok, server } from "@/test/msw/server";
import { MEMBER } from "@/test/fixtures/member";
import { getAccessToken, getRefreshToken, setTokens } from "@/lib/auth/tokens";
import { ApiError, exchangeLoginCode, getMe } from "./index";

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

describe("로그인 코드 교환 (POST /auth/token)", () => {
  it("코드를 본문으로 보내고 토큰 · needsNickname 을 돌려준다 — 저장된 토큰이 있어도 Authorization 은 붙이지 않는다", async () => {
    setTokens({ accessToken: "old-access", refreshToken: "old-refresh" });
    let body: unknown = null;
    let auth: string | null = "unset";
    server.use(
      http.post(`${API}/auth/token`, async ({ request }) => {
        body = await request.json();
        auth = request.headers.get("Authorization");
        return ok({ accessToken: "a1", refreshToken: "r1", needsNickname: true });
      }),
    );

    await expect(exchangeLoginCode("c1")).resolves.toEqual({ accessToken: "a1", refreshToken: "r1", needsNickname: true });
    expect(body).toEqual({ code: "c1" });
    expect(auth).toBeNull();
  });

  it("401 이면 refresh 재시도 없이 서버 메시지로 ApiError 를 던지고, 저장된 토큰은 건드리지 않는다", async () => {
    setTokens({ accessToken: "old-access", refreshToken: "old-refresh" });
    let refreshCalls = 0;
    server.use(
      http.post(`${API}/auth/token`, () => fail(401, "로그인 정보가 만료되었어요. 다시 로그인해 주세요.")),
      http.post(`${API}/auth/refresh`, () => {
        refreshCalls += 1;
        return ok({ accessToken: "fresh", refreshToken: "r2" });
      }),
    );

    const err = await exchangeLoginCode("expired").catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ message: "로그인 정보가 만료되었어요. 다시 로그인해 주세요.", status: 401 });
    expect(refreshCalls).toBe(0);
    expect(getAccessToken()).toBe("old-access");
    expect(getRefreshToken()).toBe("old-refresh");
  });
});
