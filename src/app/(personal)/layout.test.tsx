import { act, screen, within } from "@testing-library/react";
import { http } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderApp } from "@/test/render";
import { mockRouter } from "@/test/router";
import { API, fail, ok, server } from "@/test/msw/server";
import { MEMBER, NEW_MEMBER } from "@/test/fixtures/member";
import { getAccessToken, getRefreshToken } from "@/lib/auth/tokens";
import { consumeAuthToast, setAuthToast } from "@/lib/auth/toast";
import { AccountSection } from "@/features/settings/AccountSection";
import PersonalLayout from "./layout";

const renderLayout = (options?: Parameters<typeof renderApp>[1]) =>
  renderApp(
    <PersonalLayout>
      <p>본문</p>
    </PersonalLayout>,
    options,
  );

/** 정상 회원으로 들어와 셸이 그려질 때까지 기다린다 */
async function openAsMember() {
  server.use(http.get(`${API}/members/me`, () => ok(MEMBER)));
  const result = renderLayout();
  await screen.findByText("본문");
  return result;
}

afterEach(() => vi.useRealTimers());

describe("개인 영역 레이아웃", () => {
  describe("들어올 수 있는 사람", () => {
    it("로그인 토큰이 없으면 아무것도 그리지 않고 /login 으로 보낸다", () => {
      renderLayout({ authed: false });
      expect(mockRouter.replace).toHaveBeenCalledWith("/login");
      expect(screen.queryByText("본문")).not.toBeInTheDocument();
    });

    it("닉네임을 아직 안 정한 회원이면 /onboarding/nickname 으로 보낸다", async () => {
      server.use(http.get(`${API}/members/me`, () => ok(NEW_MEMBER)));
      renderLayout();
      await vi.waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/onboarding/nickname"));
      expect(screen.queryByText("본문")).not.toBeInTheDocument();
    });

    it("회원 정보를 불러오지 못하면 토큰을 지우고 /login 으로 보낸다", async () => {
      server.use(http.get(`${API}/members/me`, () => fail(500, "서버 오류가 발생했습니다.")));
      renderLayout();
      await vi.waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/login"));
      expect(getAccessToken()).toBeNull();
      expect(screen.queryByText("본문")).not.toBeInTheDocument();
    });

    it("닉네임이 있는 회원이면 사이드바와 화면 본문을 그린다", async () => {
      await openAsMember();
      expect(screen.getByRole("complementary")).toHaveTextContent("yesong");
      expect(within(screen.getByRole("main")).getByText("본문")).toBeInTheDocument();
      expect(mockRouter.replace).not.toHaveBeenCalled();
    });
  });

  describe("로그인 직후 토스트", () => {
    it("기존 회원이면 '{프로바이더} 계정으로 로그인되었어요.' 를 한 번 띄운다", async () => {
      setAuthToast({ kind: "login", justSignedUp: false });
      await openAsMember();
      expect(screen.getByRole("status")).toHaveTextContent("카카오 계정으로 로그인되었어요. 확장 프로그램도 동기화 완료.");
      expect(consumeAuthToast()).toBeNull();
    });

    it("가입 직후면 '{닉네임}님 환영합니다!' 를 띄운다", async () => {
      setAuthToast({ kind: "login", justSignedUp: true });
      await openAsMember();
      expect(screen.getByRole("status")).toHaveTextContent("yesong님 환영합니다! 확장 프로그램에도 자동 로그인되었어요.");
    });

    it("예약된 토스트가 없으면 아무것도 띄우지 않는다", async () => {
      await openAsMember();
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    it("토스트는 4.5초 뒤 사라진다", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      setAuthToast({ kind: "login", justSignedUp: false });
      await openAsMember();
      expect(screen.getByRole("status")).toBeInTheDocument();
      // 토스트를 띄운 뒤의 타이머 effect 까지 반영하고 시간을 보낸다
      await act(async () => {});
      act(() => vi.advanceTimersByTime(4500));
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });
  });

  describe("로그아웃", () => {
    it("확인하면 POST /auth/logout 에 refresh 토큰을 보내고, 토큰 삭제 · 로그아웃 토스트 예약 후 /login 으로 보낸다", async () => {
      const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
      let body: unknown = null;
      server.use(
        http.post(`${API}/auth/logout`, async ({ request }) => {
          body = await request.json();
          return ok(null);
        }),
      );
      const { user } = await openAsMember();
      await user.click(screen.getByRole("button", { name: "로그아웃" }));

      expect(confirm).toHaveBeenCalledWith("로그아웃하시겠어요? 확장 프로그램에서도 로그아웃됩니다.");
      await vi.waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/login"));
      expect(body).toEqual({ refreshToken: "test-refresh-token" });
      expect(getAccessToken()).toBeNull();
      expect(getRefreshToken()).toBeNull();
      expect(consumeAuthToast()).toEqual({ kind: "logout" });
    });

    it("확인 창에서 취소하면 요청도 이동도 없다", async () => {
      vi.spyOn(window, "confirm").mockReturnValue(false);
      const { user } = await openAsMember();
      await user.click(screen.getByRole("button", { name: "로그아웃" }));

      expect(mockRouter.replace).not.toHaveBeenCalled();
      expect(getAccessToken()).toBe("test-access-token");
    });

    it("서버 로그아웃이 실패해도 토큰은 지우고 /login 으로 보낸다", async () => {
      vi.spyOn(window, "confirm").mockReturnValue(true);
      server.use(http.post(`${API}/auth/logout`, () => fail(500, "서버 오류가 발생했습니다.")));
      const { user } = await openAsMember();
      await user.click(screen.getByRole("button", { name: "로그아웃" }));

      await vi.waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/login"));
      expect(getAccessToken()).toBeNull();
    });
  });

  it("설정에서 닉네임을 바꾸면 사이드바 닉네임도 바뀐다", async () => {
    server.use(
      http.get(`${API}/members/me`, () => ok(MEMBER)),
      http.patch(`${API}/members/me/nickname`, () => ok({ ...MEMBER, nickname: "newnick" })),
    );
    const { user } = renderApp(
      <PersonalLayout>
        <AccountSection onWithdraw={vi.fn()} />
      </PersonalLayout>,
    );
    const input = await screen.findByRole("textbox");
    await user.clear(input);
    await user.type(input, "newnick");
    await user.click(screen.getByRole("button", { name: "저장" }));

    await vi.waitFor(() => expect(screen.getByRole("complementary")).toHaveTextContent("newnick"));
    expect(screen.getByRole("complementary")).not.toHaveTextContent("yesong");
  });
});
