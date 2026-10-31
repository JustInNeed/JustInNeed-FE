import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderApp } from "@/test/render";
import { COMMUNITY_FEED, relatedSessionsFor } from "@/test/fixtures/design";
import { MindmapDetailModal, type MindmapDetailModalProps } from "./MindmapDetailModal";

// c6 — 유레일 vs 저가항공 (관련 세션 2개: 항공권 비교 · 유레일패스)
const POST = COMMUNITY_FEED.find((p) => p.id === "c6")!;
const SESSIONS = relatedSessionsFor(POST);

function renderModal(props: Partial<MindmapDetailModalProps> = {}) {
  const onClose = vi.fn();
  const onOpenProfile = vi.fn();
  const result = renderApp(
    <MindmapDetailModal post={POST} sessions={SESSIONS} onClose={onClose} onOpenProfile={onOpenProfile} {...props} />,
    { authed: false },
  );
  return { ...result, onClose, onOpenProfile, dialog: screen.getByRole("dialog", { name: POST.title }) };
}

describe("MindmapDetailModal", () => {
  it("제목 · 작성자 · 노드 수 · 좋아요 수 · 해시태그 · 소개글을 보여준다", () => {
    const { dialog } = renderModal();
    const d = within(dialog);
    expect(d.getByText("유레일 vs 저가항공 — 실비 비교")).toBeInTheDocument();
    expect(d.getByRole("button", { name: "🚆 rail.kr" })).toBeInTheDocument();
    expect(d.getByText("노드 41")).toBeInTheDocument();
    expect(d.getByText("좋아요 178")).toBeInTheDocument();
    // 세션 태그에도 같은 태그가 있어 마인드맵 해시태그 영역만 본다
    const tags = dialog.querySelector<HTMLElement>(".tags")!;
    expect(Array.from(tags.children, (el) => el.textContent)).toEqual(["#유레일", "#항공권", "#예산"]);
    expect(d.getByText("4개국 이상이면 패스. 2~3개국이면 라이언에어가 더 싸다.")).toBeInTheDocument();
  });

  it("관련 세션의 제목 · 소요 시간 · 시작 시각 · 출처 수 · 태그를 보여준다", () => {
    const { dialog } = renderModal();
    const d = within(dialog);
    expect(d.getByText("· 2개")).toBeInTheDocument();
    expect(d.getByText("유럽 항공권 비교 (인천→로마 IN, 프라하→인천 OUT)")).toBeInTheDocument();
    expect(d.getByText("1시간 19분")).toBeInTheDocument();
    expect(d.getByText("2026-04-25 14:02 · 출처 11개")).toBeInTheDocument();
    expect(d.getByText("유레일패스 vs 개별 구매")).toBeInTheDocument();
    expect(d.getByText("39분")).toBeInTheDocument();
    expect(d.getByText("2026-04-23 19:12 · 출처 7개")).toBeInTheDocument();
    expect(d.getByText("#스카이스캐너")).toBeInTheDocument();
  });

  it("소개글이 비어 있으면 소개 문단을 그리지 않는다", () => {
    const { dialog } = renderModal({ post: { ...POST, snippet: "" } });
    expect(dialog.querySelector(".snippet")).toBeNull();
  });

  it("작성자 이름을 누르면 작성자 핸들로 프로필 이동을 요청하고 팝업을 닫는다", async () => {
    const { user, dialog, onOpenProfile, onClose } = renderModal();
    await user.click(within(dialog).getByRole("button", { name: "🚆 rail.kr" }));
    expect(onOpenProfile).toHaveBeenCalledWith("@rail.kr");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("Esc 를 누르면 닫힌다", async () => {
    const { user, onClose } = renderModal();
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("× 버튼을 누르면 닫힌다", async () => {
    const { user, dialog, onClose } = renderModal();
    await user.click(within(dialog).getByRole("button", { name: "닫기" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("바깥 배경을 누르면 닫히고, 팝업 안을 눌러서는 닫히지 않는다", async () => {
    const { user, dialog, onClose } = renderModal();
    await user.click(within(dialog).getByText("유레일패스 vs 개별 구매"));
    expect(onClose).not.toHaveBeenCalled();
    await user.click(dialog.parentElement!);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("열려 있는 동안 body 스크롤을 잠그고, 닫히면 원래대로 돌려놓는다", () => {
    document.body.style.overflow = "auto";
    const { unmount } = renderModal();
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe("auto");
    document.body.style.overflow = "";
  });

  it("onSessionClick 이 없으면 세션 행은 눌러지는 버튼이 아니다", () => {
    const { dialog } = renderModal();
    expect(within(dialog).queryByRole("button", { name: /유레일패스 vs 개별 구매/ })).toBeNull();
  });

  it("onSessionClick 을 넘기면 세션 행을 눌러 그 세션 id 로 알린다", async () => {
    const onSessionClick = vi.fn();
    const { user, dialog } = renderModal({ onSessionClick });
    await user.click(within(dialog).getByRole("button", { name: /유레일패스 vs 개별 구매/ }));
    expect(onSessionClick).toHaveBeenCalledWith(9004);
  });

  it("actions 로 넘긴 버튼을 하단에 보여준다", async () => {
    const onAction = vi.fn();
    const { user, dialog } = renderModal({ actions: <button onClick={onAction}>원래 마인드맵에서 보기</button> });
    await user.click(within(dialog).getByRole("button", { name: "원래 마인드맵에서 보기" }));
    expect(onAction).toHaveBeenCalledOnce();
  });
});
