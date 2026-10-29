// 화면 테스트 공통 렌더 — 앱과 같은 Provider(토스트 · 개인 영역 컨텍스트)로 감싼다.
import { render, type RenderOptions } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { vi } from "vitest";
import type { MemberResponse } from "@/lib/api";
import { PersonalProvider } from "@/lib/app/PersonalContext";
import { ToastProvider } from "@/lib/app/ToastContext";
import { setTokens } from "@/lib/auth/tokens";
import { MEMBER } from "./fixtures/member";

export interface RenderAppOptions extends Omit<RenderOptions, "wrapper"> {
  /** (personal) 화면이면 넘긴다 — 사이드바 · 설정 등이 쓰는 로그인 회원 */
  member?: MemberResponse;
  /** 로그인 토큰을 넣어 둔다 (API 호출 화면용) */
  authed?: boolean;
}

export function renderApp(ui: ReactElement, { member, authed = true, ...options }: RenderAppOptions = {}) {
  if (authed) setTokens({ accessToken: "test-access-token", refreshToken: "test-refresh-token" });
  const updateMember = vi.fn();
  const logout = vi.fn();
  const user = userEvent.setup();
  const result = render(ui, {
    wrapper: ({ children }) => (
      <ToastProvider>
        {member ? (
          <PersonalProvider member={member} updateMember={updateMember} logout={logout}>
            {children}
          </PersonalProvider>
        ) : (
          children
        )}
      </ToastProvider>
    ),
    ...options,
  });
  return { ...result, user, updateMember, logout };
}

/** 로그인한 회원으로 (personal) 화면을 렌더 */
export function renderPersonal(ui: ReactElement, options: Omit<RenderAppOptions, "member"> & { member?: MemberResponse } = {}) {
  return renderApp(ui, { member: MEMBER, ...options });
}
