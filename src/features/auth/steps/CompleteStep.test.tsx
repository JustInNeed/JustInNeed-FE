import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderApp } from "@/test/render";
import { CompleteStep } from "./CompleteStep";

describe("가입 > 완료 단계", () => {
  it("3단계(완료)가 현재 단계이고 1 · 2 단계는 채워져 있다", () => {
    renderApp(<CompleteStep nickname="yesong" onStart={vi.fn()} />, { authed: false });
    expect(screen.getByLabelText("1단계 로그인")).toHaveClass("stepActive");
    expect(screen.getByLabelText("2단계 닉네임")).toHaveClass("stepActive");
    expect(screen.getByLabelText("3단계 완료")).toHaveAttribute("aria-current", "step");
  });

  it("닉네임으로 환영 인사를 하고, 확장 프로그램 안내 2가지를 순서대로 보여준다 (자동 로그인 동기화 안내는 없다)", () => {
    renderApp(<CompleteStep nickname="yesong" onStart={vi.fn()} />, { authed: false });
    expect(screen.getByRole("heading", { name: /환영해요/ })).toHaveTextContent("환영해요, yesong님!");
    const titles = Array.from(document.querySelectorAll(".onboardTitle")).map((el) => el.textContent);
    expect(titles).toEqual(["크롬 확장 프로그램 설치", "첫 세션 만들기"]);
    expect(screen.queryByText(/동기화|자동 연결/)).not.toBeInTheDocument();
  });

  it("시작하기를 누르면 onStart 를 부른다", async () => {
    const onStart = vi.fn();
    const { user } = renderApp(<CompleteStep nickname="yesong" onStart={onStart} />, { authed: false });
    expect(screen.getByRole("button", { name: "시작하기" })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "시작하기" }));
    expect(onStart).toHaveBeenCalledOnce();
  });
});
