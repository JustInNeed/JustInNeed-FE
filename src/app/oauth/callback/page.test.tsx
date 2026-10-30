import { render, screen } from "@testing-library/react";
import { http } from "msw";
import { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { API, fail, ok, server } from "@/test/msw/server";
import { mockRouter } from "@/test/router";
import { getAccessToken, getLastProvider, getRefreshToken, setPendingProvider, setTokens } from "@/lib/auth/tokens";
import { consumeAuthToast } from "@/lib/auth/toast";
import OauthCallbackPage from "./page";

/** 백엔드가 소셜 로그인 후 돌려보낸 콜백 주소로 들어온 상태 */
const arrive = (query: string) => window.history.replaceState(null, "", `/oauth/callback${query}`);
const pendingProvider = () => sessionStorage.getItem("jin_pending_provider");

/** POST /auth/token — 받은 요청(본문 · Authorization)을 모아 두고 needsNickname 에 맞는 토큰을 준다 */
function exchangeOk(needsNickname: boolean) {
  const calls: { body: unknown; auth: string | null }[] = [];
  server.use(
    http.post(`${API}/auth/token`, async ({ request }) => {
      calls.push({ body: await request.json(), auth: request.headers.get("Authorization") });
      return ok({ accessToken: "a1", refreshToken: "r1", needsNickname });
    }),
  );
  return calls;
}

afterEach(() => window.history.replaceState(null, "", "/"));

describe("OAuth 콜백", () => {
  // 교환 응답이 테스트가 끝난 뒤 도착해 다음 테스트에 토큰을 남기지 않도록, 코드 교환 테스트는 이동까지 기다린다
  it("처리하는 동안 '로그인 처리 중…' 이 보인다", async () => {
    exchangeOk(false);
    arrive("?code=c1");
    render(<OauthCallbackPage />);
    expect(screen.getByText("로그인 처리 중…")).toBeInTheDocument();
    await vi.waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/home"));
  });

  describe("일회용 코드 교환", () => {
    it("코드를 POST /auth/token 으로 보내고 (Authorization 없이), 받은 토큰을 저장하고 프로바이더를 '최근 사용' 으로 확정한다", async () => {
      // 이전 로그인 토큰이 남아 있어도 교환 요청에는 붙이지 않는다
      setTokens({ accessToken: "old-access", refreshToken: "old-refresh" });
      setPendingProvider("naver");
      const calls = exchangeOk(false);
      arrive("?code=c1");
      render(<OauthCallbackPage />);

      await vi.waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/home"));
      expect(calls).toEqual([{ body: { code: "c1" }, auth: null }]);
      expect(getAccessToken()).toBe("a1");
      expect(getRefreshToken()).toBe("r1");
      expect(getLastProvider()).toBe("naver");
      expect(pendingProvider()).toBeNull();
    });

    it("교환 응답을 기다리기 전에 주소창 · 히스토리에서 코드를 바로 지운다", async () => {
      exchangeOk(false);
      arrive("?code=c1");
      render(<OauthCallbackPage />);
      expect(mockRouter.replace).not.toHaveBeenCalled(); // 아직 교환 중
      expect(window.location.pathname).toBe("/oauth/callback");
      expect(window.location.search).toBe("");
      await vi.waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/home"));
    });

    it("기존 회원(needsNickname=false)이면 /home 으로 가고, 로그인 토스트를 예약한다", async () => {
      exchangeOk(false);
      arrive("?code=c1");
      render(<OauthCallbackPage />);
      await vi.waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/home"));
      expect(consumeAuthToast()).toEqual({ kind: "login", justSignedUp: false });
    });

    it("새 회원(needsNickname=true)이면 닉네임 온보딩으로 가고, 가입 직후 토스트로 예약한다", async () => {
      exchangeOk(true);
      arrive("?code=c1");
      render(<OauthCallbackPage />);
      await vi.waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/onboarding/nickname"));
      expect(consumeAuthToast()).toEqual({ kind: "login", justSignedUp: true });
      expect(window.location.search).toBe("");
    });

    it("코드가 만료 · 이미 사용돼 401 이면 /login?error=oauth 로 보내고, 토큰은 저장하지 않고 대기 프로바이더는 버린다", async () => {
      setPendingProvider("kakao");
      server.use(http.post(`${API}/auth/token`, () => fail(401, "로그인 정보가 만료되었어요. 다시 로그인해 주세요.")));
      arrive("?code=expired");
      render(<OauthCallbackPage />);

      await vi.waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/login?error=oauth"));
      expect(mockRouter.replace).toHaveBeenCalledTimes(1);
      expect(getAccessToken()).toBeNull();
      expect(getRefreshToken()).toBeNull();
      expect(getLastProvider()).toBeNull();
      expect(pendingProvider()).toBeNull();
      expect(consumeAuthToast()).toBeNull();
      expect(window.location.search).toBe("");
    });

    it("StrictMode 로 effect 가 두 번 돌아도 교환 요청은 한 번만 보낸다 (일회용 코드)", async () => {
      setPendingProvider("kakao");
      const calls = exchangeOk(false);
      arrive("?code=c1");
      render(
        <StrictMode>
          <OauthCallbackPage />
        </StrictMode>,
      );

      await vi.waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/home"));
      expect(calls).toHaveLength(1);
      expect(mockRouter.replace).not.toHaveBeenCalledWith("/login?error=oauth");
      expect(getAccessToken()).toBe("a1");
      expect(getLastProvider()).toBe("kakao");
    });
  });

  it("코드도 토큰도 없으면 /login?error=oauth 로 보내고, 대기 중이던 프로바이더는 버린다", () => {
    setPendingProvider("kakao");
    arrive("");
    render(<OauthCallbackPage />);

    expect(mockRouter.replace).toHaveBeenCalledWith("/login?error=oauth");
    expect(getAccessToken()).toBeNull();
    expect(getLastProvider()).toBeNull();
    expect(pendingProvider()).toBeNull();
    expect(consumeAuthToast()).toBeNull();
  });

  // BE 배포 전환 기간: 주소에 토큰을 바로 붙여 보내는 기존 BE 도 계속 로그인된다 (BE PR 머지 후 이 묶음과 함께 삭제)
  describe("기존 방식 — 쿼리로 토큰을 받는 경우", () => {
    it("토큰이 오면 저장하고, 누른 프로바이더를 '최근 사용' 으로 확정한다", () => {
      setPendingProvider("naver");
      arrive("?accessToken=a1&refreshToken=r1&needsNickname=false");
      render(<OauthCallbackPage />);

      expect(getAccessToken()).toBe("a1");
      expect(getRefreshToken()).toBe("r1");
      expect(getLastProvider()).toBe("naver");
      expect(pendingProvider()).toBeNull();
    });

    it("주소창 · 히스토리에서 토큰 쿼리를 바로 지운다", () => {
      arrive("?accessToken=a1&refreshToken=r1&needsNickname=false");
      render(<OauthCallbackPage />);
      expect(window.location.pathname).toBe("/oauth/callback");
      expect(window.location.search).toBe("");
    });

    it("기존 회원(needsNickname=false)이면 /home 으로 가고, 로그인 토스트를 예약한다", () => {
      arrive("?accessToken=a1&refreshToken=r1&needsNickname=false");
      render(<OauthCallbackPage />);
      expect(mockRouter.replace).toHaveBeenCalledWith("/home");
      expect(consumeAuthToast()).toEqual({ kind: "login", justSignedUp: false });
    });

    it("새 회원(needsNickname=true)이면 닉네임 온보딩으로 가고, 가입 직후 토스트로 예약한다", () => {
      arrive("?accessToken=a1&refreshToken=r1&needsNickname=true");
      render(<OauthCallbackPage />);
      expect(mockRouter.replace).toHaveBeenCalledWith("/onboarding/nickname");
      expect(consumeAuthToast()).toEqual({ kind: "login", justSignedUp: true });
    });

    it("토큰이 하나만 있으면 /login?error=oauth 로 보내고, 대기 중이던 프로바이더는 버린다", () => {
      setPendingProvider("kakao");
      arrive("?accessToken=a1");
      render(<OauthCallbackPage />);

      expect(mockRouter.replace).toHaveBeenCalledWith("/login?error=oauth");
      expect(getAccessToken()).toBeNull();
      expect(getLastProvider()).toBeNull();
      expect(pendingProvider()).toBeNull();
      expect(consumeAuthToast()).toBeNull();
    });

    it("StrictMode 로 effect 가 두 번 돌아도 성공한 로그인은 실패로 바뀌지 않는다", () => {
      setPendingProvider("kakao");
      arrive("?accessToken=a1&refreshToken=r1&needsNickname=false");
      render(
        <StrictMode>
          <OauthCallbackPage />
        </StrictMode>,
      );

      expect(mockRouter.replace).not.toHaveBeenCalledWith("/login?error=oauth");
      expect(mockRouter.replace).toHaveBeenLastCalledWith("/home");
      expect(getAccessToken()).toBe("a1");
      expect(getLastProvider()).toBe("kakao");
    });
  });
});
