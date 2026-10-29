import { render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { mockRouter } from "@/test/router";
import { getAccessToken, getLastProvider, getRefreshToken, setPendingProvider } from "@/lib/auth/tokens";
import { consumeAuthToast } from "@/lib/auth/toast";
import OauthCallbackPage from "./page";

/** 백엔드가 토큰을 붙여 돌려보낸 콜백 주소로 들어온 상태 */
const arrive = (query: string) => window.history.replaceState(null, "", `/oauth/callback${query}`);
const pendingProvider = () => sessionStorage.getItem("jin_pending_provider");

afterEach(() => window.history.replaceState(null, "", "/"));

describe("OAuth 콜백", () => {
  it("처리하는 동안 '로그인 처리 중…' 이 보인다", () => {
    arrive("?accessToken=a1&refreshToken=r1&needsNickname=false");
    render(<OauthCallbackPage />);
    expect(screen.getByText("로그인 처리 중…")).toBeInTheDocument();
  });

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

  it("토큰이 빠져 있으면 /login?error=oauth 로 보내고, 대기 중이던 프로바이더는 버린다", () => {
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
