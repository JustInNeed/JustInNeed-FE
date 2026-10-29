import { act, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderApp } from "@/test/render";
import { NicknameStep, type NicknameStepProps } from "./NicknameStep";

const input = () => screen.getByPlaceholderText("영문 3-8자");
const checkBtn = () => screen.getByRole("button", { name: /중복 확인|확인 중/ });
const nextBtn = () => screen.getByRole("button", { name: /다음|처리 중/ });
const step = (label: string) => screen.getByLabelText(label);

function renderStep(props: Partial<NicknameStepProps> = {}) {
  const onSubmit = vi.fn();
  const result = renderApp(<NicknameStep onSubmit={onSubmit} {...props} />, { authed: false });
  return { ...result, onSubmit };
}

describe("가입 > 닉네임 단계", () => {
  it("단계 표시: 1 로그인은 지난 단계, 2 닉네임이 현재 단계, 3 완료는 아직", () => {
    renderStep();
    expect(step("1단계 로그인")).toHaveClass("stepActive");
    expect(step("1단계 로그인")).not.toHaveAttribute("aria-current");
    expect(step("2단계 닉네임")).toHaveClass("stepActive");
    expect(step("2단계 닉네임")).toHaveAttribute("aria-current", "step");
    expect(step("3단계 완료")).not.toHaveClass("stepActive");
  });

  it("비어 있으면 안내 문구 없이 중복 확인 · 다음이 꺼져 있다", () => {
    renderStep();
    expect(checkBtn()).toBeDisabled();
    expect(nextBtn()).toBeDisabled();
    expect(screen.queryByText("중복 확인 버튼을 눌러주세요.")).not.toBeInTheDocument();
  });

  it("형식이 틀리면 형식 오류 문구가 뜨고 중복 확인을 누를 수 없다", async () => {
    const { user } = renderStep();
    await user.type(input(), "1ab");
    expect(screen.getByText("영문으로 시작하는 3-8자(영문·숫자)로 입력해주세요.")).toBeInTheDocument();
    expect(checkBtn()).toBeDisabled();
  });

  it("형식이 맞으면 '중복 확인 버튼을 눌러주세요.' 가 뜨고, 다음은 아직 꺼져 있다", async () => {
    const { user } = renderStep();
    await user.type(input(), "yesong");
    expect(screen.getByText("중복 확인 버튼을 눌러주세요.")).toBeInTheDocument();
    expect(checkBtn()).toBeEnabled();
    expect(nextBtn()).toBeDisabled();
  });

  it("중복 확인을 통과해야 '다음' 버튼이 켜진다", async () => {
    const checkNickname = vi.fn().mockResolvedValue(true);
    const { user } = renderStep({ checkNickname });
    await user.type(input(), "yesong");
    await user.click(checkBtn());

    expect(checkNickname).toHaveBeenCalledWith("yesong");
    expect(await screen.findByText("사용 가능한 닉네임입니다.")).toBeInTheDocument();
    expect(nextBtn()).toBeEnabled();
  });

  it("이미 쓰는 닉네임이면 '이미 사용 중인 닉네임입니다.' 가 뜨고 다음은 꺼진 채다", async () => {
    const { user } = renderStep({ checkNickname: vi.fn().mockResolvedValue(false) });
    await user.type(input(), "admin");
    await user.click(checkBtn());

    expect(await screen.findByText("이미 사용 중인 닉네임입니다.")).toBeInTheDocument();
    expect(nextBtn()).toBeDisabled();
  });

  it("중복 확인 요청이 실패하면 다시 시도 안내가 뜨고 다음은 꺼진 채다", async () => {
    const { user } = renderStep({ checkNickname: vi.fn().mockRejectedValue(new Error("network")) });
    await user.type(input(), "yesong");
    await user.click(checkBtn());

    expect(await screen.findByText("중복 확인에 실패했어요. 다시 시도해 주세요.")).toBeInTheDocument();
    expect(nextBtn()).toBeDisabled();
    expect(checkBtn()).toBeEnabled();
  });

  it("확인을 통과한 뒤 입력을 바꾸면 확인 결과가 지워지고 다시 확인해야 한다", async () => {
    const { user } = renderStep({ checkNickname: vi.fn().mockResolvedValue(true) });
    await user.type(input(), "yesong");
    await user.click(checkBtn());
    await screen.findByText("사용 가능한 닉네임입니다.");

    await user.type(input(), "2");
    expect(screen.queryByText("사용 가능한 닉네임입니다.")).not.toBeInTheDocument();
    expect(screen.getByText("중복 확인 버튼을 눌러주세요.")).toBeInTheDocument();
    expect(nextBtn()).toBeDisabled();
  });

  it("확인 중에는 '확인 중…' 으로 꺼지고, 그 사이 입력이 바뀌면 늦게 온 결과는 버린다", async () => {
    let resolve!: (v: boolean) => void;
    const { user } = renderStep({ checkNickname: vi.fn(() => new Promise<boolean>((r) => (resolve = r))) });
    await user.type(input(), "yesong");
    await user.click(checkBtn());
    expect(checkBtn()).toHaveTextContent("확인 중…");
    expect(checkBtn()).toBeDisabled();

    await user.type(input(), "2");
    await act(async () => resolve(true));
    expect(screen.queryByText("사용 가능한 닉네임입니다.")).not.toBeInTheDocument();
    expect(nextBtn()).toBeDisabled();
  });

  it("Enter 는 다음 버튼이 켜졌을 때만 제출한다", async () => {
    const { user, onSubmit } = renderStep({ checkNickname: vi.fn().mockResolvedValue(true) });
    await user.type(input(), "yesong{Enter}");
    expect(onSubmit).not.toHaveBeenCalled();

    await user.click(checkBtn());
    await screen.findByText("사용 가능한 닉네임입니다.");
    await user.type(input(), "{Enter}");
    expect(onSubmit).toHaveBeenCalledWith("yesong");
  });

  it("다음을 누르면 입력한 닉네임으로 onSubmit 을 부른다", async () => {
    const { user, onSubmit } = renderStep({ checkNickname: vi.fn().mockResolvedValue(true) });
    await user.type(input(), "yesong");
    await user.click(checkBtn());
    await screen.findByText("사용 가능한 닉네임입니다.");
    await user.click(nextBtn());
    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onSubmit).toHaveBeenCalledWith("yesong");
  });

  it("제출 중이면 버튼이 '처리 중…' 으로 바뀌고 중복 확인 · 다음 모두 꺼진다", async () => {
    const { user } = renderStep({ submitting: true });
    await user.type(input(), "yesong");
    expect(nextBtn()).toHaveTextContent("처리 중…");
    expect(nextBtn()).toBeDisabled();
    expect(checkBtn()).toBeDisabled();
  });

  it("서버 오류는 제출한 닉네임을 그대로 두는 동안만 보인다", async () => {
    const checkNickname = vi.fn().mockResolvedValue(true);
    const { user, onSubmit, rerender } = renderStep({ checkNickname });
    await user.type(input(), "yesong");
    await user.click(checkBtn());
    await screen.findByText("사용 가능한 닉네임입니다.");
    await user.click(nextBtn());

    rerender(<NicknameStep onSubmit={onSubmit} checkNickname={checkNickname} error="이미 사용 중인 닉네임입니다." />);
    expect(screen.getByText("이미 사용 중인 닉네임입니다.")).toBeInTheDocument();

    await user.type(input(), "2");
    expect(screen.queryByText("이미 사용 중인 닉네임입니다.")).not.toBeInTheDocument();
  });

  it("providerLabel 이 있으면 '{프로바이더} 계정 인증 완료' 가 보인다", () => {
    renderStep({ providerLabel: "카카오" });
    expect(screen.getByText("카카오 계정 인증 완료")).toBeInTheDocument();
  });

  it("중복 확인 함수를 넘기지 않으면 형식만 맞으면 통과한다", async () => {
    const { user } = renderStep();
    await user.type(input(), "yesong");
    await user.click(checkBtn());
    expect(await screen.findByText("사용 가능한 닉네임입니다.")).toBeInTheDocument();
    expect(nextBtn()).toBeEnabled();
  });
});
