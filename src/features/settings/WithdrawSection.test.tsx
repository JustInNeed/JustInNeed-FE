import { screen } from "@testing-library/react";
import { http } from "msw";
import { describe, expect, it, vi } from "vitest";
import { renderApp } from "@/test/render";
import { mockRouter } from "@/test/router";
import { API, fail, ok, server } from "@/test/msw/server";
import { getAccessToken, getRefreshToken } from "@/lib/auth/tokens";
import { consumeAuthToast } from "@/lib/auth/toast";
import { WithdrawSection } from "./WithdrawSection";

const confirmInput = () => screen.getByLabelText(/를 입력해 주세요/);
const withdrawBtn = () => screen.getByRole("button", { name: /탈퇴하기|탈퇴 처리 중/ });

describe("설정 > 회원 탈퇴", () => {
  it("확인 문구를 정확히 'WITHDRAW' 로 입력해야 탈퇴하기 버튼이 켜진다", async () => {
    const { user } = renderApp(<WithdrawSection onBack={vi.fn()} />);
    expect(withdrawBtn()).toBeDisabled();

    await user.type(confirmInput(), "withdraw");
    expect(withdrawBtn()).toBeDisabled();

    await user.clear(confirmInput());
    await user.type(confirmInput(), "WITHDRAW ");
    expect(withdrawBtn()).toBeDisabled();

    await user.clear(confirmInput());
    await user.type(confirmInput(), "WITHDRAW");
    expect(withdrawBtn()).toBeEnabled();
  });

  it("문구가 틀린 채로 Enter 를 눌러도 요청을 보내지 않는다", async () => {
    // 요청이 나가면 MSW 가 처리되지 않은 요청으로 실패시킨다
    const { user } = renderApp(<WithdrawSection onBack={vi.fn()} />);
    await user.type(confirmInput(), "WITHDRA{Enter}");
    expect(mockRouter.replace).not.toHaveBeenCalled();
    expect(getAccessToken()).toBe("test-access-token");
  });

  it("성공하면 DELETE /settings/account 에 확인 문구를 보내고, 토큰 삭제 · 탈퇴 토스트 예약 후 /login 으로 보낸다", async () => {
    let body: unknown = null;
    server.use(
      http.delete(`${API}/settings/account`, async ({ request }) => {
        body = await request.json();
        return ok({ memberId: 6, withdrawn: true });
      }),
    );
    const { user } = renderApp(<WithdrawSection onBack={vi.fn()} />);
    await user.type(confirmInput(), "WITHDRAW");
    await user.click(withdrawBtn());

    await vi.waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/login"));
    expect(body).toEqual({ confirmText: "WITHDRAW" });
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(consumeAuthToast()).toEqual({ kind: "withdraw" });
  });

  it("문구를 맞게 입력하고 Enter 를 눌러도 탈퇴된다", async () => {
    server.use(http.delete(`${API}/settings/account`, () => ok(null)));
    const { user } = renderApp(<WithdrawSection onBack={vi.fn()} />);
    await user.type(confirmInput(), "WITHDRAW{Enter}");
    await vi.waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/login"));
  });

  it("처리 중에는 버튼이 '탈퇴 처리 중…' 으로 꺼진다", async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    server.use(
      http.delete(`${API}/settings/account`, async () => {
        await gate;
        return ok(null);
      }),
    );
    const { user } = renderApp(<WithdrawSection onBack={vi.fn()} />);
    await user.type(confirmInput(), "WITHDRAW");
    await user.click(withdrawBtn());

    expect(withdrawBtn()).toHaveTextContent("탈퇴 처리 중…");
    expect(withdrawBtn()).toBeDisabled();
    release();
    await vi.waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/login"));
  });

  it("실패하면 서버 메시지를 오류 토스트로 띄우고, 토큰은 그대로 두고 다시 시도할 수 있다", async () => {
    server.use(http.delete(`${API}/settings/account`, () => fail(400, "탈퇴 확인 문구가 올바르지 않습니다.")));
    const { user } = renderApp(<WithdrawSection onBack={vi.fn()} />);
    await user.type(confirmInput(), "WITHDRAW");
    await user.click(withdrawBtn());

    expect(await screen.findByText("탈퇴 확인 문구가 올바르지 않습니다.")).toBeInTheDocument();
    expect(getAccessToken()).toBe("test-access-token");
    expect(consumeAuthToast()).toBeNull();
    expect(mockRouter.replace).not.toHaveBeenCalled();
    expect(withdrawBtn()).toBeEnabled();
  });

  it("취소 · '← 계정 설정으로' 는 onBack 을 부른다", async () => {
    const onBack = vi.fn();
    const { user } = renderApp(<WithdrawSection onBack={onBack} />);
    await user.click(screen.getByRole("button", { name: "취소" }));
    await user.click(screen.getByRole("button", { name: "← 계정 설정으로" }));
    expect(onBack).toHaveBeenCalledTimes(2);
  });
});
