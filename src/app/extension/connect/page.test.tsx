import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { API, ok, server } from "@/test/msw/server";
import { mockRouter } from "@/test/router";
import { installFakeExtension, loggedOutExtension, removeFakeExtension } from "@/test/extension";
import { setTokens } from "@/lib/auth/tokens";
import { consumeConnectAfterLogin } from "@/lib/extension";
import ExtensionConnectPage from "./page";

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

describe("확장 연결 페이지", () => {
  it("로그인 안 됐으면 로그인 화면으로 보내고, 로그인 뒤 이 페이지로 돌아오게 표시한다", () => {
    render(<ExtensionConnectPage />);
    expect(screen.getByText("로그인 화면으로 이동하는 중…")).toBeInTheDocument();
    expect(mockRouter.replace).toHaveBeenCalledWith("/login");
    expect(consumeConnectAfterLogin()).toBe(true);
  });

  it("로그인돼 있으면 연결하고 '연결됐어요' 를 보여 준다. 표시는 지운다", async () => {
    setTokens({ accessToken: "web-a", refreshToken: "web-r" });
    issueOk();
    const sent = installFakeExtension(loggedOutExtension(12));
    render(<ExtensionConnectPage />);

    expect(screen.getByText("확장 프로그램과 연결하는 중…")).toBeInTheDocument();
    expect(await screen.findByText("확장 프로그램과 연결됐어요")).toBeInTheDocument();
    expect(sent.map((s) => s.message)).toContainEqual({ type: "JIN_CONNECT", code: "ext-code-1" });
    expect(consumeConnectAfterLogin()).toBe(false);
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it("StrictMode 로 effect 가 두 번 돌아도 연결 코드는 한 번만 받는다 (1회용)", async () => {
    setTokens({ accessToken: "web-a", refreshToken: "web-r" });
    const calls = issueOk();
    installFakeExtension(loggedOutExtension());
    render(
      <StrictMode>
        <ExtensionConnectPage />
      </StrictMode>,
    );
    expect(await screen.findByText("확장 프로그램과 연결됐어요")).toBeInTheDocument();
    expect(calls()).toBe(1);
  });

  it("확장이 없으면 '설치돼 있지 않아요' 와 [다시 시도] — 설치한 뒤 누르면 연결된다", async () => {
    setTokens({ accessToken: "web-a", refreshToken: "web-r" });
    issueOk();
    render(<ExtensionConnectPage />);
    expect(await screen.findByText("확장 프로그램이 설치돼 있지 않아요")).toBeInTheDocument();

    installFakeExtension(loggedOutExtension());
    await userEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(await screen.findByText("확장 프로그램과 연결됐어요")).toBeInTheDocument();
  });

  it("확장이 거절하면 그 문구를 그대로 보여 준다", async () => {
    setTokens({ accessToken: "web-a", refreshToken: "web-r" });
    issueOk();
    installFakeExtension((m) =>
      m.type === "JIN_STATUS"
        ? { loggedIn: false, memberId: null, version: "0.1.0" }
        : { ok: false, memberId: null, why: "JIN_CONNECT: POST /auth/token: 403 Invalid CORS request" },
    );
    render(<ExtensionConnectPage />);
    expect(await screen.findByText("확장 프로그램과 연결하지 못했어요")).toBeInTheDocument();
    expect(screen.getByText("JIN_CONNECT: POST /auth/token: 403 Invalid CORS request")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeInTheDocument();
  });

  it("연결 도중 로그인이 만료되면(재발급 실패) 표시를 남겨 다시 로그인한 뒤 이 페이지로 돌아온다", async () => {
    // 클라이언트가 /login 으로 전체 이동한다 — jsdom 은 이동을 못 하므로 location 을 바꿔 끼운다 (client.test 와 같은 방식)
    const location = { href: "http://localhost:3000/extension/connect", pathname: "/extension/connect" };
    vi.stubGlobal("location", location);
    setTokens({ accessToken: "old-a", refreshToken: "old-r" });
    server.use(
      http.post(`${API}/auth/extension-code`, () =>
        Response.json({ success: false, data: null, message: "로그인이 만료되었습니다. 다시 로그인해 주세요." }, { status: 401 }),
      ),
      http.post(`${API}/auth/refresh`, () =>
        Response.json({ success: false, data: null, message: "유효하지 않은 리프레시 토큰입니다." }, { status: 401 }),
      ),
    );
    installFakeExtension(loggedOutExtension());
    render(<ExtensionConnectPage />);
    await vi.waitFor(() => expect(sessionStorage.getItem("jin_extension_connect")).toBe("1"));
    // 화면은 연결 중 그대로 (클라이언트가 /login 으로 전체 이동하는 중)
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByText("확장 프로그램과 연결하지 못했어요")).not.toBeInTheDocument();
    expect(location.href).toBe("/login");
    expect(consumeConnectAfterLogin()).toBe(true);
    vi.unstubAllGlobals();
  });
});
