import { act, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderApp } from "@/test/render";
import { API } from "@/test/msw/server";
import { getLastProvider, setLastProvider, setPendingProvider } from "@/lib/auth/tokens";
import { consumeAuthToast, setAuthToast } from "@/lib/auth/toast";
import LoginPage from "./page";

const pendingProvider = () => sessionStorage.getItem("jin_pending_provider");
const renderLogin = () => renderApp(<LoginPage />, { authed: false });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  window.history.replaceState(null, "", "/");
});

describe("로그인 화면", () => {
  it("카카오 · 네이버로 시작하기 버튼만 있고 Google 버튼은 없다", () => {
    renderLogin();
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual(["카카오로 시작하기", "네이버로 시작하기"]);
    expect(screen.queryByText(/google/i)).not.toBeInTheDocument();
  });

  it.each([
    ["카카오로 시작하기", "kakao"],
    ["네이버로 시작하기", "naver"],
  ])("'%s' 를 누르면 프로바이더(%s)를 대기시켜 두고 백엔드 OAuth 시작 주소로 이동한다", async (label, id) => {
    // 실제 이동 대신 href 대입만 확인한다
    const location = { href: "http://localhost:3000/login", search: "" };
    vi.stubGlobal("location", location);
    const { user } = renderLogin();
    await user.click(screen.getByRole("button", { name: label }));

    expect(location.href).toBe(`${API}/oauth2/authorization/${id}`);
    expect(pendingProvider()).toBe(id);
    // "최근 사용" 은 로그인 성공(콜백) 때 확정한다
    expect(getLastProvider()).toBeNull();
  });

  it("지난번에 쓴 프로바이더 버튼에만 '최근 사용' 배지가 붙는다", () => {
    setLastProvider("naver");
    renderLogin();
    expect(within(screen.getByRole("button", { name: /네이버로 시작하기/ })).getByText("최근 사용")).toBeInTheDocument();
    expect(within(screen.getByRole("button", { name: /카카오로 시작하기/ })).queryByText("최근 사용")).not.toBeInTheDocument();
  });

  it("처음 로그인하면 '최근 사용' 배지가 없다", () => {
    renderLogin();
    expect(screen.queryByText("최근 사용")).not.toBeInTheDocument();
  });

  it("?error=oauth 로 돌아오면 실패 토스트를 띄우고, 대기 프로바이더를 버리고, 주소에서 쿼리를 지운다", async () => {
    setPendingProvider("kakao");
    window.history.replaceState(null, "", "/login?error=oauth");
    renderLogin();

    expect(await screen.findByRole("alert")).toHaveTextContent("로그인에 실패했어요. 다시 시도해 주세요.");
    expect(pendingProvider()).toBeNull();
    expect(window.location.pathname).toBe("/login");
    expect(window.location.search).toBe("");
  });

  it("오류 쿼리가 없으면 실패 토스트도 없고 대기 프로바이더도 그대로다", () => {
    setPendingProvider("kakao");
    renderLogin();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(pendingProvider()).toBe("kakao");
  });

  it("로그아웃 직후면 로그아웃 안내 토스트를 한 번 띄운다", () => {
    setAuthToast({ kind: "logout" });
    renderLogin();
    expect(screen.getByRole("status")).toHaveTextContent("로그아웃되었습니다. 확장 프로그램도 함께 종료되었어요.");
    expect(consumeAuthToast()).toBeNull();
  });

  it("탈퇴 직후면 '탈퇴가 완료되었어요.' 토스트를 띄운다", () => {
    setAuthToast({ kind: "withdraw" });
    renderLogin();
    expect(screen.getByRole("status")).toHaveTextContent("탈퇴가 완료되었어요.");
  });

  it("로그아웃 · 탈퇴 토스트는 4.5초 뒤 사라진다", () => {
    vi.useFakeTimers();
    setAuthToast({ kind: "logout" });
    renderLogin();
    expect(screen.getByRole("status")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(4499));
    expect(screen.getByRole("status")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
