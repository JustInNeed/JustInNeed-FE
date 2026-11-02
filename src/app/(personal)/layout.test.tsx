import { act, screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderApp } from "@/test/render";
import { mockRouter } from "@/test/router";
import { API, fail, ok, server } from "@/test/msw/server";
import { MEMBER, NEW_MEMBER } from "@/test/fixtures/member";
import { getAccessToken, getRefreshToken } from "@/lib/auth/tokens";
import { consumeAuthToast, setAuthToast } from "@/lib/auth/toast";
import { AccountSection } from "@/features/settings/AccountSection";
import { installFakeExtension, loggedOutExtension, removeFakeExtension } from "@/test/extension";
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

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

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

    it("세션이 만료되면 이동은 클라이언트에 맡긴다 — 여기서 또 이동하면 만료 안내가 사라진다", async () => {
      const location = { href: "http://localhost:3000/home", pathname: "/home" };
      vi.stubGlobal("location", location);
      server.use(
        http.get(`${API}/members/me`, () => new HttpResponse(null, { status: 401 })),
        http.post(`${API}/auth/refresh`, () => fail(401, "로그인이 만료되었습니다. 다시 로그인해 주세요.")),
      );
      renderLayout();
      await vi.waitFor(() => expect(location.href).toBe("/login"));
      await act(async () => {});

      expect(mockRouter.replace).not.toHaveBeenCalled();
      expect(consumeAuthToast()).toEqual({ kind: "expired" });
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
      expect(screen.getByRole("status")).toHaveTextContent(/^카카오 계정으로 로그인되었어요\.$/);
      expect(consumeAuthToast()).toBeNull();
    });

    it("가입 직후면 '{닉네임}님 환영합니다!' 를 띄운다", async () => {
      setAuthToast({ kind: "login", justSignedUp: true });
      await openAsMember();
      expect(screen.getByRole("status")).toHaveTextContent(/^yesong님 환영합니다!$/);
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

      expect(confirm).toHaveBeenCalledWith("로그아웃하시겠어요?");
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

  describe("크롬 확장 맞추기", () => {
    /** POST /auth/extension-code — 몇 번 불렸는지 센다 */
    function issueOk() {
      let calls = 0;
      server.use(
        http.post(`${API}/auth/extension-code`, () => {
          calls++;
          return ok({ code: "ext-code-1", expiresInSeconds: 60 });
        }),
      );
      return () => calls;
    }

    afterEach(() => removeFakeExtension());

    it("확장이 로그아웃 상태면 연결 코드를 받아 이 회원으로 연결한다", async () => {
      const calls = issueOk();
      const sent = installFakeExtension(loggedOutExtension(MEMBER.id));
      await openAsMember();
      await vi.waitFor(() => expect(sent.map((s) => s.message.type)).toEqual(["JIN_STATUS", "JIN_STATUS", "JIN_CONNECT"]));
      expect(calls()).toBe(1);
    });

    it("확장이 이미 같은 회원이면 상태만 묻고 연결하지 않는다", async () => {
      const sent = installFakeExtension(() => ({ loggedIn: true, memberId: MEMBER.id, version: "0.1.0" }));
      await openAsMember();
      await vi.waitFor(() => expect(sent).toHaveLength(1));
      await act(async () => {});
      expect(sent.map((s) => s.message.type)).toEqual(["JIN_STATUS"]);
    });

    it("확장이 다른 회원이면 이 회원으로 다시 연결한다", async () => {
      issueOk();
      const sent = installFakeExtension((m) =>
        m.type === "JIN_STATUS" ? { loggedIn: true, memberId: 999, version: "0.1.0" } : { ok: true, memberId: MEMBER.id },
      );
      await openAsMember();
      await vi.waitFor(() => expect(sent.map((s) => s.message.type)).toContain("JIN_CONNECT"));
    });

    it("연결이 실패해도 화면은 그대로이고 콘솔 경고만 남긴다", async () => {
      issueOk();
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      installFakeExtension((m) =>
        m.type === "JIN_STATUS" ? { loggedIn: false, memberId: null, version: "0.1.0" } : { ok: false, why: "확장 오류" },
      );
      await openAsMember();
      await vi.waitFor(() => expect(warn).toHaveBeenCalledWith("[JustInNeed] 확장 프로그램 연결 실패:", "확장 오류"));
      expect(within(screen.getByRole("main")).getByText("본문")).toBeInTheDocument();
      expect(mockRouter.replace).not.toHaveBeenCalled();
      warn.mockRestore();
    });

    it("웹에서 로그아웃하면 확장에도 JIN_LOGOUT 을 보낸다", async () => {
      vi.spyOn(window, "confirm").mockReturnValue(true);
      server.use(http.post(`${API}/auth/logout`, () => ok(null)));
      const sent = installFakeExtension(() => ({ loggedIn: true, memberId: MEMBER.id, version: "0.1.0" }));
      const { user } = await openAsMember();
      await user.click(screen.getByRole("button", { name: "로그아웃" }));

      await vi.waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/login"));
      expect(sent.map((s) => s.message.type)).toContain("JIN_LOGOUT");
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
