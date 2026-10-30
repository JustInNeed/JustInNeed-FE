import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";
import { API, fail, ok, server } from "@/test/msw/server";
import { MEMBER } from "@/test/fixtures/member";
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "@/lib/auth/tokens";
import { consumeAuthToast } from "@/lib/auth/toast";
import { ApiError, exchangeLoginCode, getMe, refreshAccessToken, SessionExpiredError } from "./index";

const EXPIRED = "로그인이 만료되었습니다. 다시 로그인해 주세요.";

/** 콜백을 한 번에 하나씩 실행하는 navigator.locks 대역 (jsdom 에는 없다). onGrant 는 락을 얻기 직전에 불린다 */
function installLocks(onGrant?: () => void) {
  let tail: Promise<unknown> = Promise.resolve();
  const request = vi.fn((_name: string, callback: () => Promise<unknown>) => {
    const granted = tail.then(() => {
      onGrant?.();
      return callback();
    });
    tail = granted.catch(() => undefined);
    return granted;
  });
  Object.defineProperty(navigator, "locks", { value: { request }, configurable: true });
  return request;
}

/** 모듈을 새로 불러 탭 하나를 흉내 낸다 — refreshPromise 는 탭마다 따로, localStorage 는 공유 */
async function openTab() {
  vi.resetModules();
  return import("./client");
}

/** 실제 서버처럼 refresh 토큰이 1회용인 재발급 핸들러. 지금까지 받은 요청 수를 돌려준다 */
function rotatingRefreshServer(current: string, next: { accessToken: string; refreshToken: string }) {
  const calls = { count: 0 };
  let valid = current;
  server.use(
    http.post(`${API}/auth/refresh`, async ({ request }) => {
      calls.count += 1;
      const { refreshToken } = (await request.json()) as { refreshToken: string };
      if (refreshToken !== valid) return fail(401, EXPIRED);
      valid = next.refreshToken;
      return ok(next);
    }),
  );
  return calls;
}

/** Bearer fresh 일 때만 통과하는 보호 API. 받은 Authorization 을 순서대로 모은다 */
function protectedMe() {
  const auths: (string | null)[] = [];
  server.use(
    http.get(`${API}/members/me`, ({ request }) => {
      auths.push(request.headers.get("Authorization"));
      return request.headers.get("Authorization") === "Bearer fresh" ? ok(MEMBER) : fail(401, "만료");
    }),
  );
  return auths;
}

afterEach(() => {
  Reflect.deleteProperty(navigator, "locks");
  vi.unstubAllGlobals();
});

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

describe("토큰 재발급이 겹칠 때", () => {
  const FRESH = { accessToken: "fresh", refreshToken: "r2" };

  it("한 탭에서 동시에 불러도 POST /auth/refresh 는 한 번만 나가고 결과를 같이 받는다", async () => {
    setTokens({ accessToken: "expired", refreshToken: "r1" });
    const calls = rotatingRefreshServer("r1", FRESH);

    await expect(Promise.all([refreshAccessToken(), refreshAccessToken()])).resolves.toEqual([true, true]);
    expect(calls.count).toBe(1);
    expect(getRefreshToken()).toBe("r2");
  });

  describe("Web Locks 가 있으면", () => {
    it("jin-token-refresh 락 안에서 재발급한다", async () => {
      const request = installLocks();
      setTokens({ accessToken: "expired", refreshToken: "r1" });
      rotatingRefreshServer("r1", FRESH);

      await expect(refreshAccessToken()).resolves.toBe(true);
      expect(request).toHaveBeenCalledTimes(1);
      expect(request.mock.calls[0][0]).toBe("jin-token-refresh");
    });

    it("락을 기다리는 사이 다른 탭이 재발급했으면 요청 없이 새 access 토큰으로 원래 요청을 다시 보낸다", async () => {
      installLocks(() => setTokens(FRESH));
      setTokens({ accessToken: "expired", refreshToken: "r1" });
      const calls = rotatingRefreshServer("r1", FRESH);
      const auths = protectedMe();

      await expect(getMe()).resolves.toEqual(MEMBER);
      expect(calls.count).toBe(0);
      expect(auths).toEqual(["Bearer expired", "Bearer fresh"]);
    });

    it("락을 기다리는 사이 다른 탭이 로그아웃했으면 요청 없이 실패로 끝난다", async () => {
      installLocks(clearTokens);
      setTokens({ accessToken: "expired", refreshToken: "r1" });
      const calls = rotatingRefreshServer("r1", FRESH);

      await expect(refreshAccessToken()).resolves.toBe(false);
      expect(calls.count).toBe(0);
    });

    it("같은 저장소를 쓰는 두 탭이 동시에 401 을 받아도 재발급은 한 번이고 둘 다 성공한다", async () => {
      installLocks();
      setTokens({ accessToken: "expired", refreshToken: "r1" });
      const calls = rotatingRefreshServer("r1", FRESH);
      protectedMe();
      const [tabA, tabB] = [await openTab(), await openTab()];

      await expect(Promise.all([tabA.api.get("/members/me"), tabB.api.get("/members/me")])).resolves.toEqual([MEMBER, MEMBER]);
      expect(calls.count).toBe(1);
      expect(getAccessToken()).toBe("fresh");
      expect(getRefreshToken()).toBe("r2");
    });

    it("락을 얻지 못하면 락 없이 재발급한다", async () => {
      const request = installLocks();
      request.mockRejectedValue(new DOMException("차단됨", "SecurityError"));
      setTokens({ accessToken: "expired", refreshToken: "r1" });
      const calls = rotatingRefreshServer("r1", FRESH);

      await expect(refreshAccessToken()).resolves.toBe(true);
      expect(calls.count).toBe(1);
      expect(getRefreshToken()).toBe("r2");
    });
  });

  describe("Web Locks 가 없으면", () => {
    it.each([
      ["401", () => fail(401, EXPIRED)],
      ["500", () => fail(500, "서버 오류가 발생했습니다.")],
      ["네트워크 오류", () => HttpResponse.error()],
    ])("재발급이 %s 로 실패해도 저장된 토큰이 바뀌었으면 그 토큰으로 원래 요청을 다시 보낸다", async (_name, response) => {
      const location = { href: "http://localhost:3000/sessions", pathname: "/sessions" };
      vi.stubGlobal("location", location);
      setTokens({ accessToken: "expired", refreshToken: "r1" });
      const auths = protectedMe();
      server.use(
        http.post(`${API}/auth/refresh`, () => {
          setTokens(FRESH); // 이긴 탭이 먼저 저장
          return response();
        }),
      );

      await expect(getMe()).resolves.toEqual(MEMBER);
      expect(auths).toEqual(["Bearer expired", "Bearer fresh"]);
      expect(getRefreshToken()).toBe("r2");
      expect(consumeAuthToast()).toBeNull();
      expect(location.href).toBe("http://localhost:3000/sessions");
    });

    it("재발급이 실패했는데 저장된 토큰이 없어졌으면(로그아웃) 성공으로 보지 않는다", async () => {
      setTokens({ accessToken: "expired", refreshToken: "r1" });
      server.use(
        http.post(`${API}/auth/refresh`, () => {
          clearTokens();
          return fail(401, EXPIRED);
        }),
      );

      await expect(refreshAccessToken()).resolves.toBe(false);
    });
  });
});

describe("세션 만료 (재발급 최종 실패)", () => {
  /** 만료된 토큰으로 pathname 화면에 있는 상태 — 재발급은 401 */
  function expiredAt(pathname: string) {
    const location = { href: `http://localhost:3000${pathname}`, pathname };
    vi.stubGlobal("location", location);
    setTokens({ accessToken: "expired", refreshToken: "r1" });
    server.use(
      http.get(`${API}/members/me`, () => new HttpResponse(null, { status: 401 })),
      http.post(`${API}/auth/refresh`, () => fail(401, EXPIRED)),
    );
    return location;
  }

  it("토큰을 지우고 만료 안내를 남긴 뒤 /login 으로 보내고, 요구사항 문구로 ApiError 를 던진다", async () => {
    const location = expiredAt("/sessions");

    const err = await getMe().catch((e) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect(err).toBeInstanceOf(SessionExpiredError);
    expect(err).toMatchObject({ message: EXPIRED, status: 401 });
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(consumeAuthToast()).toEqual({ kind: "expired" });
    expect(location.href).toBe("/login");
  });

  it("두 탭이 같이 재발급에 실패해도 양쪽 다 세션 만료로 끝난다", async () => {
    installLocks();
    const location = expiredAt("/sessions");
    const [tabA, tabB] = [await openTab(), await openTab()];

    const errs = await Promise.all([tabA.api.get("/members/me").catch((e) => e), tabB.api.get("/members/me").catch((e) => e)]);

    expect(errs.map((e) => (e as ApiError).message)).toEqual([EXPIRED, EXPIRED]);
    expect(getRefreshToken()).toBeNull();
    expect(location.href).toBe("/login");
  });

  it.each(["/login", "/oauth/callback"])("이미 %s 에 있으면 이동이 없으니 만료 안내도 남기지 않는다", async (pathname) => {
    const location = expiredAt(pathname);

    const err = await getMe().catch((e) => e);

    expect(err).toMatchObject({ message: EXPIRED, status: 401 });
    expect(getRefreshToken()).toBeNull();
    expect(consumeAuthToast()).toBeNull();
    expect(location.href).toBe(`http://localhost:3000${pathname}`);
  });
});

describe("401 응답 본문 (비어 있거나 JSON)", () => {
  const JSON_401 = ["JSON", () => fail(401, EXPIRED)] as const;
  const EMPTY_401 = ["빈", () => new HttpResponse(null, { status: 401 })] as const;

  it.each([
    [...JSON_401, EXPIRED],
    [...EMPTY_401, "요청에 실패했습니다. (HTTP 401)"],
  ])("refresh 토큰이 없으면 %s 본문이어도 ApiError 로 끝나고 재발급 · 이동 · 안내는 없다", async (_name, response, message) => {
    const location = { href: "http://localhost:3000/sessions", pathname: "/sessions" };
    vi.stubGlobal("location", location);
    localStorage.setItem("jin_access_token", "a1");
    server.use(http.get(`${API}/members/me`, response));

    const err = await getMe().catch((e) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect(err).not.toBeInstanceOf(SessionExpiredError);
    expect(err).toMatchObject({ message, status: 401 });
    expect(consumeAuthToast()).toBeNull();
    expect(location.href).toBe("http://localhost:3000/sessions");
  });

  it.each([JSON_401, EMPTY_401])("refresh 토큰이 있으면 %s 본문이어도 재발급 후 다시 요청한다", async (_name, response) => {
    setTokens({ accessToken: "expired", refreshToken: "r1" });
    server.use(
      http.get(`${API}/members/me`, ({ request }) =>
        request.headers.get("Authorization") === "Bearer fresh" ? ok(MEMBER) : response(),
      ),
      http.post(`${API}/auth/refresh`, () => ok({ accessToken: "fresh", refreshToken: "r2" })),
    );

    await expect(getMe()).resolves.toEqual(MEMBER);
  });

  it.each([
    [...JSON_401, EXPIRED],
    [...EMPTY_401, "요청에 실패했습니다. (HTTP 401)"],
  ])("재시도한 요청도 %s 본문 401 이면 다시 재발급하지 않고 ApiError 로 끝난다", async (_name, response, message) => {
    setTokens({ accessToken: "expired", refreshToken: "r1" });
    let refreshCalls = 0;
    server.use(
      http.get(`${API}/members/me`, response),
      http.post(`${API}/auth/refresh`, () => {
        refreshCalls += 1;
        return ok({ accessToken: "fresh", refreshToken: "r2" });
      }),
    );

    await expect(getMe()).rejects.toMatchObject({ message, status: 401 });
    expect(refreshCalls).toBe(1);
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
