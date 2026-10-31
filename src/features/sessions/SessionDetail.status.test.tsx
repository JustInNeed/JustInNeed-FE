import { screen, waitFor } from "@testing-library/react";
import { http } from "msw";
import { describe, expect, it, vi } from "vitest";
import {
  ANALYZING_DETAIL,
  COLLECTING_DETAIL,
  FAILED_DETAIL,
  READY_DETAIL,
} from "@/test/fixtures/sessions";
import { API, fail, ok, server } from "@/test/msw/server";
import { mockRouter } from "@/test/router";
import { renderDetail } from "./sessionDetailTestUtils";

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
