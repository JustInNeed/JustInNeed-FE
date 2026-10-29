import { fireEvent, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderApp } from "@/test/render";
import { AUTHOR_MINDMAP } from "@/test/fixtures/community";
import { MindmapFullView, type MindmapFullViewProps } from "./MindmapFullView";

function renderFullView(props: Partial<MindmapFullViewProps> = {}) {
  const onClose = vi.fn();
  const result = renderApp(
    <MindmapFullView title="rail.kr님의 전체 마인드맵" mindmap={AUTHOR_MINDMAP} onClose={onClose} {...props} />,
    { authed: false },
  );
  const dialog = screen.getByRole("dialog", { name: "rail.kr님의 전체 마인드맵" });
  /** 라벨로 마인드맵 노드(<g>) 찾기 */
  const node = (label: string) => within(dialog).getByText(label).closest("g")!;
  return { ...result, onClose, dialog, node };
}

/** 노드가 강조(선택 · 호버 · 일치) 상태면 바깥 링이 그려진다 */
const hasRing = (g: Element) => g.querySelector('circle[stroke="#2D6A1B"]') !== null;

describe("MindmapFullView", () => {
  beforeEach(() => {
    // force simulation 이 매 프레임 위치를 바꾸지 않도록 멈춰 둔다 (노드 배치는 초기 좌표 그대로)
    vi.spyOn(window, "requestAnimationFrame").mockReturnValue(0);
  });

  it("제목과 전체 노드 수를 보여준다", () => {
    const { dialog } = renderFullView();
    expect(within(dialog).getByText("rail.kr님의 전체 마인드맵")).toBeInTheDocument();
    expect(within(dialog).getByText("노드 28개")).toBeInTheDocument();
  });

  it("연결이 1개인 리프 노드를 누르면 원문 URL 을 새 탭으로 연다", async () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    const { user, node } = renderFullView();
    await user.click(node("예산"));
    expect(open).toHaveBeenCalledWith("https://wise.com/kr/currency-converter/eur-to-krw-rate", "_blank", "noopener,noreferrer");
  });

  it("URL 이 있어도 연결이 여러 개인 노드는 원문을 열지 않고 선택만 된다", async () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    const { user, node } = renderFullView({
      mindmap: { ...AUTHOR_MINDMAP, nodeUrls: { ...AUTHOR_MINDMAP.nodeUrls, paris: "https://www.parisinfo.com/" } },
    });
    await user.click(node("파리"));
    expect(open).not.toHaveBeenCalled();
    await user.unhover(node("파리"));
    expect(hasRing(node("파리"))).toBe(true);
  });

  it("노드를 끌어 옮긴 뒤의 클릭으로는 원문을 열지 않는다", () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    const { node } = renderFullView();
    fireEvent.mouseDown(node("예산"), { clientX: 0, clientY: 0 });
    fireEvent.click(node("예산"), { clientX: 30, clientY: 0 });
    expect(open).not.toHaveBeenCalled();
  });

  it("리프 노드에 올리면 어느 사이트 원문이 열리는지 안내한다", async () => {
    const { user, dialog, node } = renderFullView();
    await user.hover(node("예산"));
    expect(within(dialog).getByText(/예산 · wise\.com 원문 열기/)).toBeInTheDocument();
  });

  it("강조할 노드를 넘기면 그 노드만 색칠하고 나머지는 흐리게 보인다", () => {
    const { dialog, node } = renderFullView({ highlightIds: ["prague", "castle", "bridge", "rail"] });
    expect(within(dialog).getByText("저장한 노드 4개만 강조했어요")).toBeInTheDocument();
    expect(dialog.querySelector(".canvas")).toHaveClass("canvasDim");
    ["프라하", "프라하성", "카를교", "유레일패스"].forEach((label) => {
      expect(node(label)).toHaveStyle({ opacity: "1" });
      expect(hasRing(node(label))).toBe(true);
    });
    ["로마", "파리", "예산"].forEach((label) => {
      expect(node(label)).toHaveStyle({ opacity: "0.25" });
      expect(hasRing(node(label))).toBe(false);
    });
  });

  it("강조할 노드가 없으면 흐린 노드 없이 전체를 보여준다", () => {
    const { dialog, node } = renderFullView();
    expect(dialog.querySelector(".canvas")).not.toHaveClass("canvasDim");
    expect(node("로마")).toHaveStyle({ opacity: "1" });
  });

  it("Esc 를 누르면 닫힌다", async () => {
    const { user, onClose } = renderFullView();
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("× 버튼을 누르면 닫힌다", async () => {
    const { user, dialog, onClose } = renderFullView();
    await user.click(within(dialog).getByRole("button", { name: "닫기" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("바깥 배경을 누르면 닫힌다", async () => {
    const { user, dialog, onClose } = renderFullView();
    await user.click(dialog.parentElement!);
    expect(onClose).toHaveBeenCalledOnce();
  });
});
