import { act, screen } from "@testing-library/react";
import { http } from "msw";
import { describe, expect, it, vi } from "vitest";
import { renderPersonal } from "@/test/render";
import { API, fail, ok, server } from "@/test/msw/server";
import { MEMBER } from "@/test/fixtures/member";
import { AccountSection } from "./AccountSection";

const nicknameInput = () => screen.getByRole("textbox");
const checkBtn = () => screen.getByRole("button", { name: /중복 확인|확인 중/ });
const saveBtn = () => screen.getByRole("button", { name: /저장/ });

/** 닉네임 입력칸을 비우고 새 값을 입력한 상태로 렌더 */
async function renderWithNickname(value: string, checkNickname?: (n: string) => Promise<boolean>) {
  const result = renderPersonal(<AccountSection onWithdraw={vi.fn()} checkNickname={checkNickname} />);
  await result.user.clear(nicknameInput());
  await result.user.type(nicknameInput(), value);
  return result;
}

describe("설정 > 계정", () => {
  describe("연결된 계정 · 버튼", () => {
    it("가입한 소셜 계정과 이메일이 보이고, 이메일이 없으면 '이메일 정보 없음'", () => {
      renderPersonal(<AccountSection onWithdraw={vi.fn()} />);
      expect(screen.getByText("카카오로 로그인")).toBeInTheDocument();
      expect(screen.getByText("이메일 정보 없음")).toBeInTheDocument();
    });

    it("네이버 계정이면 '네이버로 로그인' 과 이메일이 보인다", () => {
      renderPersonal(<AccountSection onWithdraw={vi.fn()} />, {
        member: { ...MEMBER, socialProvider: "NAVER", email: "yesong@naver.com" },
      });
      expect(screen.getByText("네이버로 로그인")).toBeInTheDocument();
      expect(screen.getByText("yesong@naver.com")).toBeInTheDocument();
    });

    it("로그아웃 버튼은 레이아웃의 logout 을 부른다", async () => {
      const { user, logout } = renderPersonal(<AccountSection onWithdraw={vi.fn()} />);
      await user.click(screen.getByRole("button", { name: "로그아웃" }));
      expect(logout).toHaveBeenCalledOnce();
    });

    it("회원 탈퇴 버튼은 onWithdraw 를 부른다", async () => {
      const onWithdraw = vi.fn();
      const { user } = renderPersonal(<AccountSection onWithdraw={onWithdraw} />);
      await user.click(screen.getByRole("button", { name: "회원 탈퇴" }));
      expect(onWithdraw).toHaveBeenCalledOnce();
    });
  });

  describe("닉네임 입력 · 중복 확인", () => {
    it("현재 닉네임이 채워져 있고, 그대로면 중복 확인 · 저장이 꺼져 있다", () => {
      renderPersonal(<AccountSection onWithdraw={vi.fn()} />);
      expect(nicknameInput()).toHaveValue("yesong");
      expect(checkBtn()).toBeDisabled();
      expect(saveBtn()).toBeDisabled();
    });

    it("형식이 틀리면 형식 안내가 뜨고 중복 확인 · 저장이 꺼진다", async () => {
      await renderWithNickname("1ab");
      expect(screen.getByRole("alert")).toHaveTextContent("영문으로 시작하는 3-8자(영문·숫자)로 입력해주세요.");
      expect(nicknameInput()).toHaveAttribute("aria-invalid", "true");
      expect(checkBtn()).toBeDisabled();
      expect(saveBtn()).toBeDisabled();
    });

    it("쓸 수 있는 닉네임이면 '사용 가능한 닉네임입니다.' 가 뜬다", async () => {
      const checkNickname = vi.fn().mockResolvedValue(true);
      const { user } = await renderWithNickname("newnick", checkNickname);
      await user.click(checkBtn());
      expect(checkNickname).toHaveBeenCalledWith("newnick");
      expect(await screen.findByRole("status")).toHaveTextContent("사용 가능한 닉네임입니다.");
    });

    it("이미 쓰는 닉네임이면 '이미 사용 중인 닉네임입니다.' 가 뜬다", async () => {
      const { user } = await renderWithNickname("admin", vi.fn().mockResolvedValue(false));
      await user.click(checkBtn());
      expect(await screen.findByRole("alert")).toHaveTextContent("이미 사용 중인 닉네임입니다.");
    });

    it("중복 확인 요청이 실패하면 다시 시도 안내가 뜬다", async () => {
      const { user } = await renderWithNickname("newnick", vi.fn().mockRejectedValue(new Error("network")));
      await user.click(checkBtn());
      expect(await screen.findByRole("alert")).toHaveTextContent("중복 확인에 실패했어요. 다시 시도해 주세요.");
    });

    it("확인 결과가 나온 뒤 입력을 바꾸면 결과가 지워진다", async () => {
      const { user } = await renderWithNickname("admin", vi.fn().mockResolvedValue(false));
      await user.click(checkBtn());
      await screen.findByRole("alert");
      await user.type(nicknameInput(), "2");
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(checkBtn()).toBeEnabled();
    });

    it("확인 중에는 버튼이 '확인 중…' 으로 꺼지고, 그 사이 입력이 바뀌면 늦게 온 결과는 버린다", async () => {
      let resolve!: (v: boolean) => void;
      const checkNickname = vi.fn(() => new Promise<boolean>((r) => (resolve = r)));
      const { user } = await renderWithNickname("admin", checkNickname);
      await user.click(checkBtn());
      expect(checkBtn()).toHaveTextContent("확인 중…");
      expect(checkBtn()).toBeDisabled();

      await user.type(nicknameInput(), "2");
      await act(async () => resolve(false));
      expect(checkBtn()).toHaveTextContent("중복 확인");
      expect(screen.queryByText("이미 사용 중인 닉네임입니다.")).not.toBeInTheDocument();
    });

    it("중복 확인 함수를 넘기지 않으면 GET /members/nickname/available 로 확인한다", async () => {
      const asked: (string | null)[] = [];
      server.use(
        http.get(`${API}/members/nickname/available`, ({ request }) => {
          const nickname = new URL(request.url).searchParams.get("nickname");
          asked.push(nickname);
          return ok({ nickname, available: nickname === "newnick" });
        }),
      );
      const { user } = await renderWithNickname("newnick");
      await user.click(checkBtn());
      expect(await screen.findByRole("status")).toHaveTextContent("사용 가능한 닉네임입니다.");

      await user.clear(nicknameInput());
      await user.type(nicknameInput(), "wanderer");
      await user.click(checkBtn());
      expect(await screen.findByText("이미 사용 중인 닉네임입니다.")).toBeInTheDocument();
      expect(asked).toEqual(["newnick", "wanderer"]);
    });

    it("중복 확인 요청이 실패하면 다시 시도하라고 안내한다", async () => {
      server.use(http.get(`${API}/members/nickname/available`, () => fail(500, "서버 오류가 발생했습니다.")));
      const { user } = await renderWithNickname("newnick");
      await user.click(checkBtn());
      expect(await screen.findByText("중복 확인에 실패했어요. 다시 시도해 주세요.")).toBeInTheDocument();
    });
  });

  describe("닉네임 저장 (PATCH /members/me/nickname)", () => {
    it("중복 확인을 하지 않아도 형식이 맞으면 저장 버튼이 켜진다 (중복은 서버 409 로 막는다)", async () => {
      await renderWithNickname("newnick");
      expect(saveBtn()).toBeEnabled();
    });

    it("성공하면 새 닉네임을 보내고, 받은 회원 정보로 updateMember 를 부른 뒤 성공 토스트를 띄운다", async () => {
      const updated = { ...MEMBER, nickname: "newnick" };
      let body: unknown = null;
      server.use(
        http.patch(`${API}/members/me/nickname`, async ({ request }) => {
          body = await request.json();
          return ok(updated);
        }),
      );
      const { user, updateMember } = await renderWithNickname("newnick");
      await user.click(saveBtn());

      expect(await screen.findByText("닉네임을 변경했어요.")).toBeInTheDocument();
      expect(body).toEqual({ nickname: "newnick" });
      expect(updateMember).toHaveBeenCalledWith(updated);
    });

    it("409 면 입력칸 아래에 서버의 중복 메시지가 뜨고 회원 정보는 그대로다", async () => {
      server.use(http.patch(`${API}/members/me/nickname`, () => fail(409, "이미 사용 중인 닉네임입니다.")));
      const { user, updateMember } = await renderWithNickname("admin");
      await user.click(saveBtn());

      expect(await screen.findByRole("alert")).toHaveTextContent("이미 사용 중인 닉네임입니다.");
      expect(nicknameInput()).toHaveAttribute("aria-invalid", "true");
      expect(updateMember).not.toHaveBeenCalled();

      // 입력을 바꾸면 서버 오류도 지워진다
      await user.type(nicknameInput(), "2");
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("그 밖의 실패는 서버 메시지를 오류 토스트로 띄운다", async () => {
      server.use(http.patch(`${API}/members/me/nickname`, () => fail(500, "서버 오류가 발생했습니다.")));
      const { user, updateMember } = await renderWithNickname("newnick");
      await user.click(saveBtn());

      expect(await screen.findByRole("alert")).toHaveTextContent("서버 오류가 발생했습니다.");
      expect(nicknameInput()).not.toHaveAttribute("aria-invalid");
      expect(updateMember).not.toHaveBeenCalled();
      expect(saveBtn()).toBeEnabled();
    });
  });
});
