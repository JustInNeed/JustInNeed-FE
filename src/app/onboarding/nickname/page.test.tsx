import { screen } from "@testing-library/react";
import { http } from "msw";
import { describe, expect, it, vi } from "vitest";
import { renderApp } from "@/test/render";
import { mockRouter } from "@/test/router";
import { API, fail, ok, server } from "@/test/msw/server";
import { MEMBER, NEW_MEMBER } from "@/test/fixtures/member";
import { consumeAuthToast, setAuthToast } from "@/lib/auth/toast";
import NicknameOnboardingPage from "./page";

const input = () => screen.getByPlaceholderText("영문 3-8자");
const nextBtn = () => screen.getByRole("button", { name: /다음|처리 중/ });

/** 가입 중인 회원(닉네임 없음)으로 들어와 닉네임 단계가 뜰 때까지 기다린다 */
async function openAsNewMember() {
  server.use(http.get(`${API}/members/me`, () => ok(NEW_MEMBER)));
  const result = renderApp(<NicknameOnboardingPage />);
  await screen.findByRole("heading", { name: "닉네임을 정해주세요" });
  return result;
}

/** 닉네임을 입력하고 중복 확인까지 통과시킨다 (기본 확인은 형식만 본다) */
async function fillNickname(user: ReturnType<typeof renderApp>["user"], value: string) {
  await user.type(input(), value);
  await user.click(screen.getByRole("button", { name: "중복 확인" }));
  await screen.findByText("사용 가능한 닉네임입니다.");
}

describe("가입 > 닉네임 온보딩 화면", () => {
  describe("들어올 수 있는 사람", () => {
    it("로그인 토큰이 없으면 /login 으로 보낸다", () => {
      const { container } = renderApp(<NicknameOnboardingPage />, { authed: false });
      expect(mockRouter.replace).toHaveBeenCalledWith("/login");
      expect(container).toBeEmptyDOMElement();
    });

    it("이미 닉네임이 있는 회원이면 /home 으로 보낸다", async () => {
      server.use(http.get(`${API}/members/me`, () => ok(MEMBER)));
      renderApp(<NicknameOnboardingPage />);
      await vi.waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/home"));
      expect(screen.queryByRole("heading", { name: "닉네임을 정해주세요" })).not.toBeInTheDocument();
    });

    it("회원 정보를 불러오지 못하면 /login 으로 보낸다", async () => {
      server.use(http.get(`${API}/members/me`, () => fail(500, "서버 오류가 발생했습니다.")));
      renderApp(<NicknameOnboardingPage />);
      await vi.waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/login"));
    });

    it("가입 중인 회원이면 닉네임 단계와 '카카오 계정 인증 완료' 가 보인다", async () => {
      await openAsNewMember();
      expect(screen.getByLabelText("2단계 닉네임")).toHaveAttribute("aria-current", "step");
      expect(screen.getByText("카카오 계정 인증 완료")).toBeInTheDocument();
    });
  });

  describe("닉네임 저장 (PATCH /members/me/nickname)", () => {
    it("성공하면 완료 화면(3단계)에 '환영해요, {닉네임}님!' 이 뜨고, 시작하기로 /home 에 간다", async () => {
      let body: unknown = null;
      server.use(
        http.patch(`${API}/members/me/nickname`, async ({ request }) => {
          body = await request.json();
          return ok({ ...NEW_MEMBER, nickname: "newbie" });
        }),
      );
      const { user } = await openAsNewMember();
      await fillNickname(user, "newbie");
      await user.click(nextBtn());

      expect(await screen.findByRole("heading", { name: /환영해요/ })).toHaveTextContent("환영해요, newbie님!");
      expect(body).toEqual({ nickname: "newbie" });
      expect(screen.getByLabelText("3단계 완료")).toHaveAttribute("aria-current", "step");

      await user.click(screen.getByRole("button", { name: "시작하기" }));
      expect(mockRouter.replace).toHaveBeenCalledWith("/home");
    });

    it("완료 화면이 환영 인사를 하므로, 콜백이 예약한 가입 환영 토스트는 지운다", async () => {
      setAuthToast({ kind: "login", justSignedUp: true });
      server.use(http.patch(`${API}/members/me/nickname`, () => ok({ ...NEW_MEMBER, nickname: "newbie" })));
      const { user } = await openAsNewMember();
      await fillNickname(user, "newbie");
      await user.click(nextBtn());

      await screen.findByRole("heading", { name: /환영해요/ });
      expect(consumeAuthToast()).toBeNull();
    });

    it("저장하는 동안 버튼이 '처리 중…' 으로 꺼진다", async () => {
      let release!: () => void;
      const gate = new Promise<void>((r) => (release = r));
      server.use(
        http.patch(`${API}/members/me/nickname`, async () => {
          await gate;
          return ok({ ...NEW_MEMBER, nickname: "newbie" });
        }),
      );
      const { user } = await openAsNewMember();
      await fillNickname(user, "newbie");
      await user.click(nextBtn());

      expect(nextBtn()).toHaveTextContent("처리 중…");
      expect(nextBtn()).toBeDisabled();
      release();
      await screen.findByRole("heading", { name: /환영해요/ });
    });

    it("409(중복)면 닉네임 단계에 남아 서버의 중복 메시지를 보여주고, 다시 제출할 수 있다", async () => {
      server.use(http.patch(`${API}/members/me/nickname`, () => fail(409, "이미 사용 중인 닉네임입니다.")));
      const { user } = await openAsNewMember();
      await fillNickname(user, "admin");
      await user.click(nextBtn());

      expect(await screen.findByText("이미 사용 중인 닉네임입니다.")).toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: /환영해요/ })).not.toBeInTheDocument();
      expect(nextBtn()).toHaveTextContent("다음");
      expect(nextBtn()).toBeEnabled();
    });

    it("그 밖의 실패도 서버 메시지를 닉네임 단계에 보여준다", async () => {
      server.use(http.patch(`${API}/members/me/nickname`, () => fail(400, "닉네임 형식이 올바르지 않습니다.")));
      const { user } = await openAsNewMember();
      await fillNickname(user, "newbie");
      await user.click(nextBtn());

      expect(await screen.findByText("닉네임 형식이 올바르지 않습니다.")).toBeInTheDocument();
    });
  });
});
