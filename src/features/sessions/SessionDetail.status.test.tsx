import { act, screen, waitFor, within } from "@testing-library/react";
import { http } from "msw";
import { describe, expect, it, vi } from "vitest";
import {
  ANALYZING_DETAIL,
  COLLECTING_DETAIL,
  FAILED_DETAIL,
  READY_DETAIL,
} from "@/test/fixtures/sessions";
import { API, SERVER_ERROR, fail, ok, server } from "@/test/msw/server";
import { mockRouter } from "@/test/router";
import { gate, renderDetail } from "./sessionDetailTestUtils";

const STATUSES = [
  { label: "수집 중", detail: COLLECTING_DETAIL, copy: "아직 수집 중이에요. 수집이 끝나면 분석을 시작해요." },
  { label: "분석 대기", detail: READY_DETAIL, copy: "분석을 기다리고 있어요. 잠시 후 다시 확인해주세요." },
  { label: "분석 중", detail: ANALYZING_DETAIL, copy: "아직 분석 중이에요. 잠시 후 다시 확인해주세요." },
  { label: "분석 실패", detail: FAILED_DETAIL, copy: "분석에 실패했어요." },
];

describe("세션 상세 — 분석 완료 전 · 실패 상태 화면", () => {
  it.each(STATUSES)("$label 세션은 제목 · 상태 · 안내를 보여 준다", async ({ label, detail, copy }) => {
    await renderDetail(detail);
    expect(screen.getByRole("heading", { level: 1, name: detail.title })).toBeInTheDocument();
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByText(copy)).toBeInTheDocument();
  });

  it.each(STATUSES)("$label 세션에는 본문 화면의 요소가 하나도 없다", async ({ detail }) => {
    await renderDetail(detail);
    for (const name of ["즐겨찾기", "비공개", "공개", "편집", "추가", "줄글 보기", "마인드맵 보기"]) {
      expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
    }
    expect(screen.queryByText(/개 페이지/)).not.toBeInTheDocument();
    expect(screen.queryByText("요약 본문이 없습니다.")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /출처/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "줄글 복사" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: ".md 파일 다운로드" })).not.toBeInTheDocument();
  });

  it("← 세션 목록을 누르면 목록으로 간다", async () => {
    const { user } = await renderDetail(ANALYZING_DETAIL);
    await user.click(screen.getByRole("button", { name: "← 세션 목록" }));
    expect(mockRouter.push).toHaveBeenCalledWith("/sessions");
  });
});

describe("세션 상세 — 상태 화면의 삭제", () => {
  function onDelete(respond: () => Response) {
    const ids: string[] = [];
    server.use(
      http.delete(`${API}/sessions/:id`, ({ params }) => {
        ids.push(String(params.id));
        return respond();
      }),
    );
    return ids;
  }

  it.each(STATUSES)("$label 세션도 확인창을 거쳐 삭제하고 목록으로 간다", async ({ detail }) => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const ids = onDelete(() => ok(null));
    const { user } = await renderDetail(detail);
    await user.click(screen.getByRole("button", { name: "삭제" }));

    expect(confirm).toHaveBeenCalledWith("이 세션을 삭제할까요?");
    await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith("/sessions"));
    expect(ids).toEqual([String(detail.id)]);
  });

  it("확인창에서 취소하면 삭제하지 않는다", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const ids = onDelete(() => ok(null));
    const { user } = await renderDetail(FAILED_DETAIL);
    await user.click(screen.getByRole("button", { name: "삭제" }));
    expect(ids).toEqual([]);
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it("삭제에 실패하면 토스트를 띄우고 화면에 남는다", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    onDelete(() => fail(404, "세션을 찾을 수 없습니다."));
    const { user } = await renderDetail(ANALYZING_DETAIL);
    await user.click(screen.getByRole("button", { name: "삭제" }));
    expect(await screen.findByText("세션을 찾을 수 없습니다.")).toBeInTheDocument();
    expect(screen.getByText("아직 분석 중이에요. 잠시 후 다시 확인해주세요.")).toBeInTheDocument();
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it("내 세션이 아니면 삭제 버튼이 없다", async () => {
    await renderDetail({ ...ANALYZING_DETAIL, isOwner: false });
    expect(screen.queryByRole("button", { name: "삭제" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "← 세션 목록" })).toBeInTheDocument();
  });
});

describe("세션 상세 — 재분석", () => {
  const button = () => screen.getByRole("button", { name: "재분석" });

  function onReanalyze(respond: () => Response | Promise<Response>) {
    const ids: string[] = [];
    server.use(
      http.post(`${API}/sessions/:id/reanalyze`, ({ params }) => {
        ids.push(String(params.id));
        return respond();
      }),
    );
    return ids;
  }

  it("실패 세션에는 안내 문장과 재분석 버튼이 보인다", async () => {
    await renderDetail(FAILED_DETAIL);
    const alert = within(screen.getByRole("alert"));
    expect(alert.getByText("분석에 실패했어요.")).toBeInTheDocument();
    expect(alert.getByText("재분석 버튼을 눌러 다시 시도해 주세요.")).toBeInTheDocument();
    expect(alert.getByRole("button", { name: "재분석" })).toBeEnabled();
  });

  it.each([COLLECTING_DETAIL, READY_DETAIL, ANALYZING_DETAIL])("실패가 아니면 재분석 버튼이 없다 ($status)", async (detail) => {
    await renderDetail(detail);
    expect(screen.queryByRole("button", { name: "재분석" })).not.toBeInTheDocument();
    expect(screen.queryByText("재분석 버튼을 눌러 다시 시도해 주세요.")).not.toBeInTheDocument();
  });

  it("내 세션이 아니면 실패해도 재분석 버튼과 안내 문장이 없다", async () => {
    await renderDetail({ ...FAILED_DETAIL, isOwner: false });
    expect(screen.getByText("분석에 실패했어요.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "재분석" })).not.toBeInTheDocument();
    expect(screen.queryByText("재분석 버튼을 눌러 다시 시도해 주세요.")).not.toBeInTheDocument();
  });

  it.each([
    { status: "ANALYZING" as const, label: "분석 중", copy: "아직 분석 중이에요. 잠시 후 다시 확인해주세요." },
    { status: "READY" as const, label: "분석 대기", copy: "분석을 기다리고 있어요. 잠시 후 다시 확인해주세요." },
  ])("재분석에 성공하면 응답의 새 상태($status)를 보여 준다", async ({ status, label, copy }) => {
    const ids = onReanalyze(() => ok({ ...FAILED_DETAIL, status }));
    const { user } = await renderDetail(FAILED_DETAIL);
    await user.click(button());

    expect(await screen.findByText(copy)).toBeInTheDocument();
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.queryByText("분석에 실패했어요.")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "재분석" })).not.toBeInTheDocument();
    expect(ids).toEqual([String(FAILED_DETAIL.id)]);
  });

  it("응답을 기다리는 동안 버튼이 잠기고 연달아 눌러도 요청은 한 번만 나간다", async () => {
    const g = gate();
    const ids = onReanalyze(async () => {
      await g.opened;
      return ok({ ...FAILED_DETAIL, status: "ANALYZING" });
    });
    const { user } = await renderDetail(FAILED_DETAIL);
    // 버튼이 잠기기 전(다시 그리기 전)에 두 번
    const b = button();
    act(() => {
      b.click();
      b.click();
    });
    const pending = screen.getByRole("button", { name: "재분석 요청 중…" });
    expect(pending).toBeDisabled();
    await user.click(pending);
    g.open();
    expect(await screen.findByText("분석 중")).toBeInTheDocument();
    expect(ids).toHaveLength(1);
  });

  it.each([
    [409, "분석에 실패한 세션만 다시 분석할 수 있습니다."],
    [500, SERVER_ERROR],
  ])("실패(%i)하면 토스트를 띄우고 그대로 남아 다시 누를 수 있다", async (status, message) => {
    const ids = onReanalyze(() => fail(status, message));
    const { user } = await renderDetail(FAILED_DETAIL);
    await user.click(button());

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.getByText("분석에 실패했어요.")).toBeInTheDocument();
    expect(mockRouter.push).not.toHaveBeenCalled();

    await waitFor(() => expect(button()).toBeEnabled());
    await user.click(button());
    await waitFor(() => expect(ids).toHaveLength(2));
  });
});
