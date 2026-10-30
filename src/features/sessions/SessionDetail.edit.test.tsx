import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ROME_DETAIL } from "@/test/fixtures/sessions";
import { fail } from "@/test/msw/server";
import { mockRouter } from "@/test/router";
import { gate, renderDetail, type PatchReply } from "./sessionDetailTestUtils";

const ROME_MD = ROME_DETAIL.summary!.markdown;

const titleInput = () => screen.getByPlaceholderText("세션 제목");
const bodyInput = () => screen.getByPlaceholderText(/마크다운으로 작성하세요/);
const leaveDialog = () => screen.queryByRole("dialog", { name: "저장하지 않은 변경 사항이 있어요" });
const button = (name: string) => screen.getByRole("button", { name });

async function startEditing(reply?: PatchReply) {
  const view = await renderDetail(ROME_DETAIL, reply);
  await view.user.click(button("편집"));
  return view;
}

/** 제목을 바꿔 저장되지 않은 변경을 만든다 */
async function changeTitle(user: Awaited<ReturnType<typeof startEditing>>["user"], title = "로마 4박 5일") {
  await user.clear(titleInput());
  await user.type(titleInput(), title);
}

describe("세션 상세 — 편집 모드", () => {
  it("편집을 누르면 제목 입력칸과 마크다운 원문 입력칸이 지금 값으로 열린다", async () => {
    await startEditing();
    expect(titleInput()).toHaveValue("로마 3박 4일 동선 짜기");
    expect(titleInput()).toHaveAttribute("maxLength", "100");
    expect(bodyInput()).toHaveValue(ROME_MD);
    expect(bodyInput()).toHaveFocus();
    expect(screen.getByText("본문 (마크다운)")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
  });

  it("편집 중에는 취소 · 저장만 보이고 별 · 공개 · 편집 · 삭제 버튼은 숨는다", async () => {
    await startEditing();
    expect(button("취소")).toBeInTheDocument();
    expect(button("저장")).toBeInTheDocument();
    for (const name of ["즐겨찾기", "비공개", "편집", "삭제"]) {
      expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
    }
  });

  it("편집 화면에도 하이라이트 · 인사이트 편집은 없다", async () => {
    await startEditing();
    expect(screen.queryByText(/하이라이트|인사이트/)).not.toBeInTheDocument();
    expect(screen.getAllByRole("textbox")).toHaveLength(2); // 제목 · 본문
  });

  it("마인드맵을 보다가 편집을 누르면 줄글 편집으로 바뀐다", async () => {
    vi.spyOn(window, "requestAnimationFrame").mockReturnValue(0);
    const { user } = await renderDetail();
    await user.click(screen.getByRole("button", { name: "마인드맵 보기" }));
    await user.click(button("편집"));
    expect(bodyInput()).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "줄글 보기" })).toHaveClass("tabActive");
  });

  it("저장을 누르면 PATCH 에 제목과 editedMarkdown 만 보내고 바뀐 내용으로 보기 모드가 된다", async () => {
    const { user, patches } = await startEditing();
    await changeTitle(user);
    await user.clear(bodyInput());
    await user.type(bodyInput(), "## 3일차 · 트레비 분수{Enter}- 동전 던지기");
    await user.click(button("저장"));

    await waitFor(() =>
      expect(patches).toEqual([{ title: "로마 4박 5일", editedMarkdown: "## 3일차 · 트레비 분수\n- 동전 던지기" }]),
    );
    expect(screen.getByRole("heading", { level: 1, name: "로마 4박 5일" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "3일차 · 트레비 분수" })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("세션 제목")).not.toBeInTheDocument();
  });

  it("저장에 실패하면 서버 메시지를 토스트로 띄우고, 취소하면 원래 제목으로 돌아간다", async () => {
    const { user } = await startEditing(() => fail(400, "제목을 입력해 주세요."));
    await user.clear(titleInput());
    await user.type(titleInput(), " ");
    await user.click(button("저장"));
    expect(await screen.findByText("제목을 입력해 주세요.")).toBeInTheDocument();

    await user.click(button("취소"));
    await user.click(button("저장 안 하고 나가기"));
    expect(screen.getByRole("heading", { level: 1, name: ROME_DETAIL.title })).toBeInTheDocument();
  });

  it("저장에 실패하면 편집 모드에 남아 쓰던 초안을 지킨다", async () => {
    const { user } = await startEditing(() => fail(500, "일시적인 오류가 발생했습니다."));
    await changeTitle(user);
    await user.click(button("저장"));
    expect(await screen.findByText("일시적인 오류가 발생했습니다.")).toBeInTheDocument();
    expect(titleInput()).toHaveValue("로마 4박 5일");
    expect(bodyInput()).toHaveValue(ROME_MD);
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
  });

  it("저장 응답을 기다리는 동안 저장을 또 눌러도 요청은 한 번만 나간다", async () => {
    const g = gate();
    const { user, patches } = await startEditing(async () => {
      await g.opened;
      return undefined;
    });
    await changeTitle(user);
    await user.click(button("저장"));
    await user.click(button("저장"));
    g.open();

    expect(await screen.findByRole("heading", { level: 1, name: "로마 4박 5일" })).toBeInTheDocument();
    expect(patches).toEqual([{ title: "로마 4박 5일", editedMarkdown: ROME_MD }]);
  });

  it("바뀐 게 없으면 취소를 눌러도 경고 없이 보기 모드로 돌아간다", async () => {
    const { user, patches } = await startEditing();
    await user.click(button("취소"));
    expect(leaveDialog()).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: ROME_DETAIL.title })).toBeInTheDocument();
    expect(patches).toEqual([]);
  });

  it("제목을 원래대로 돌려 놓으면 바뀐 게 없는 것으로 본다", async () => {
    const { user } = await startEditing();
    await changeTitle(user);
    await changeTitle(user, ROME_DETAIL.title);
    await user.click(button("취소"));
    expect(leaveDialog()).not.toBeInTheDocument();
  });
});

describe("세션 상세 — 저장 안 하고 나가기 경고", () => {
  it("바꾼 채 취소를 누르면 경고 창이 뜨고, '계속 편집' 을 누르면 쓰던 내용 그대로 편집을 이어 간다", async () => {
    const { user } = await startEditing();
    await changeTitle(user);
    await user.click(button("취소"));

    expect(leaveDialog()).toBeInTheDocument();
    expect(button("계속 편집")).toHaveFocus();
    await user.click(button("계속 편집"));
    expect(leaveDialog()).not.toBeInTheDocument();
    expect(titleInput()).toHaveValue("로마 4박 5일");
  });

  it("'저장 안 하고 나가기' 를 누르면 요청 없이 원래 내용으로 보기 모드가 된다", async () => {
    const { user, patches } = await startEditing();
    await changeTitle(user);
    await user.click(button("취소"));
    await user.click(button("저장 안 하고 나가기"));

    expect(leaveDialog()).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: ROME_DETAIL.title })).toBeInTheDocument();
    expect(patches).toEqual([]);
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it("'저장하고 나가기' 를 누르면 저장하는 동안 버튼이 잠기고, 저장되면 보기 모드가 된다", async () => {
    const g = gate();
    const { user, patches } = await startEditing(async () => {
      await g.opened;
      return undefined;
    });
    await changeTitle(user);
    await user.click(button("취소"));
    await user.click(button("저장하고 나가기"));

    expect(button("저장 중…")).toBeDisabled();
    expect(button("저장 안 하고 나가기")).toBeDisabled();
    expect(button("계속 편집")).toBeDisabled();
    g.open();

    expect(await screen.findByRole("heading", { level: 1, name: "로마 4박 5일" })).toBeInTheDocument();
    expect(leaveDialog()).not.toBeInTheDocument();
    expect(patches).toEqual([{ title: "로마 4박 5일", editedMarkdown: ROME_MD }]);
  });

  it("'저장하고 나가기' 가 실패하면 토스트를 띄우고 경고 창과 편집 모드를 그대로 둔다", async () => {
    const { user } = await startEditing(() => fail(500, "일시적인 오류가 발생했습니다."));
    await changeTitle(user);
    await user.click(button("취소"));
    await user.click(button("저장하고 나가기"));

    expect(await screen.findByText("저장에 실패했어요. 다시 시도해 주세요.")).toBeInTheDocument();
    expect(leaveDialog()).toBeInTheDocument();
    expect(button("저장하고 나가기")).toBeEnabled();
    expect(titleInput()).toHaveValue("로마 4박 5일");
  });

  it("Esc 나 바깥 배경을 누르면 경고 창만 닫고 편집을 이어 간다", async () => {
    const { user } = await startEditing();
    await changeTitle(user);
    await user.click(button("취소"));
    await user.keyboard("{Escape}");
    expect(leaveDialog()).not.toBeInTheDocument();

    await user.click(button("취소"));
    fireEvent.mouseDown(leaveDialog()!.parentElement!);
    expect(leaveDialog()).not.toBeInTheDocument();
    expect(titleInput()).toHaveValue("로마 4박 5일");
  });

  it("바꾼 게 없으면 ← 세션 목록을 누르자마자 목록으로 간다", async () => {
    const { user } = await startEditing();
    await user.click(button("← 세션 목록"));
    expect(mockRouter.push).toHaveBeenCalledWith("/sessions");
  });

  it("바꾼 채 ← 세션 목록을 누르면 경고하고, '저장 안 하고 나가기' 면 목록으로 간다", async () => {
    const { user, patches } = await startEditing();
    await changeTitle(user);
    await user.click(button("← 세션 목록"));
    expect(leaveDialog()).toBeInTheDocument();
    expect(mockRouter.push).not.toHaveBeenCalled();

    await user.click(button("저장 안 하고 나가기"));
    expect(mockRouter.push).toHaveBeenCalledWith("/sessions");
    expect(patches).toEqual([]);
  });

  it("바꾼 채 ← 세션 목록에서 '저장하고 나가기' 면 저장한 뒤 목록으로 간다", async () => {
    const { user, patches } = await startEditing();
    await changeTitle(user);
    await user.click(button("← 세션 목록"));
    await user.click(button("저장하고 나가기"));

    await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith("/sessions"));
    expect(patches).toEqual([{ title: "로마 4박 5일", editedMarkdown: ROME_MD }]);
  });

  it("바꾼 채 사이드바 같은 앱 안 링크를 누르면 경고하고, 나가기를 고르면 그 주소로 간다", async () => {
    const { user } = await startEditing();
    const link = document.createElement("a");
    link.href = "/home?tab=week";
    link.textContent = "홈";
    document.body.appendChild(link);

    await changeTitle(user);
    await user.click(link);
    expect(leaveDialog()).toBeInTheDocument();

    await user.click(button("저장 안 하고 나가기"));
    expect(mockRouter.push).toHaveBeenCalledWith("/home?tab=week");
    link.remove();
  });

  it("바꾼 게 없으면 앱 안 링크를 막지 않는다", async () => {
    const { user } = await startEditing();
    const link = document.createElement("a");
    link.href = "#top";
    document.body.appendChild(link);
    const clicked = vi.fn((e: MouseEvent) => e.defaultPrevented);
    document.addEventListener("click", clicked);

    await user.click(link);
    expect(clicked).toHaveReturnedWith(false);
    expect(leaveDialog()).not.toBeInTheDocument();
    document.removeEventListener("click", clicked);
    link.remove();
  });

  it("바꾼 채 새로고침 · 탭 닫기를 하면 브라우저 확인창을 띄우도록 막는다", async () => {
    const { user } = await startEditing();
    const before = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(before);
    expect(before.defaultPrevented).toBe(false);

    await changeTitle(user);
    const after = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(after);
    expect(after.defaultPrevented).toBe(true);
  });
});

describe("세션 상세 — 30초 자동 저장", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  /** setInterval · Date 만 가짜로 — fetch · user-event · waitFor 는 진짜 setTimeout 을 쓴다 */
  function useFakeClock() {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"], now: new Date("2026-04-27T10:00:00") });
  }
  const tick = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));
  const status = () => document.querySelector(".autoSave");

  it("바꾼 채 30초가 지나면 저장하고 '저장 중…' → '저장됨 · 방금 전' 이 보이며 편집 모드는 그대로다", async () => {
    useFakeClock();
    const g = gate();
    const { user, patches } = await startEditing(async () => {
      await g.opened;
      return undefined;
    });
    await user.type(bodyInput(), "{Enter}- 젤라또 한 번 더");
    expect(status()).not.toBeInTheDocument();

    await tick(29_000);
    expect(patches).toEqual([]);
    await tick(1_000);
    await waitFor(() => expect(status()).toHaveTextContent("저장 중…"));
    g.open();

    await waitFor(() => expect(status()).toHaveTextContent("저장됨 · 방금 전"));
    expect(patches).toEqual([{ title: ROME_DETAIL.title, editedMarkdown: `${ROME_MD}\n- 젤라또 한 번 더` }]);
    expect(bodyInput()).toBeInTheDocument();
  });

  it("저장된 뒤 시간이 지나면 'N분 전' 으로 바뀌고, 더 바꾼 게 없으면 다시 저장하지 않는다", async () => {
    useFakeClock();
    const { user, patches } = await startEditing();
    await changeTitle(user);
    await tick(30_000);
    await waitFor(() => expect(status()).toHaveTextContent("저장됨 · 방금 전"));

    await tick(60_000);
    expect(status()).toHaveTextContent("저장됨 · 1분 전");
    await tick(2 * 60_000);
    expect(status()).toHaveTextContent("저장됨 · 3분 전");
    expect(patches).toHaveLength(1);
  });

  it("바꾼 게 없으면 30초가 지나도 저장하지 않는다", async () => {
    useFakeClock();
    const { patches } = await startEditing();
    await tick(90_000);
    expect(patches).toEqual([]);
    expect(status()).not.toBeInTheDocument();
  });

  it("자동 저장 뒤 더 바꾸지 않았다면 취소해도 경고 없이 저장된 내용으로 돌아간다", async () => {
    useFakeClock();
    const { user } = await startEditing();
    await changeTitle(user);
    await tick(30_000);
    await waitFor(() => expect(status()).toHaveTextContent("저장됨"));

    await user.click(button("취소"));
    expect(leaveDialog()).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "로마 4박 5일" })).toBeInTheDocument();
  });

  it("자동 저장 뒤 또 바꾸면 다음 30초에 다시 저장한다", async () => {
    useFakeClock();
    const { user, patches } = await startEditing();
    await changeTitle(user);
    await tick(30_000);
    await waitFor(() => expect(patches).toHaveLength(1));

    await changeTitle(user, "로마 5박 6일");
    await tick(30_000);
    await waitFor(() => expect(patches).toHaveLength(2));
    expect(patches[1]).toEqual({ title: "로마 5박 6일", editedMarkdown: ROME_MD });
  });

  it("자동 저장이 실패하면 토스트로만 알리고 상태 문구는 띄우지 않는다", async () => {
    useFakeClock();
    const { user } = await startEditing(() => fail(500, "일시적인 오류가 발생했습니다."));
    await changeTitle(user);
    await tick(30_000);

    expect(await screen.findByText("자동 저장에 실패했어요. 저장 버튼을 눌러 저장해 주세요.")).toBeInTheDocument();
    expect(status()).not.toBeInTheDocument();
    expect(titleInput()).toHaveValue("로마 4박 5일");
  });

  it("편집을 끝내면 자동 저장도 멈춘다", async () => {
    useFakeClock();
    const { user, patches } = await startEditing();
    await user.click(button("취소"));
    await tick(60_000);
    expect(patches).toEqual([]);
  });
});
