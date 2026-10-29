import { fireEvent, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ROME_DETAIL } from "@/test/fixtures/sessions";
import { renderDetail } from "./sessionDetailTestUtils";

// 방사형 배치는 requestAnimationFrame 으로 계속 움직여서, 테스트에서는 멈춰 두고 처음 위치로 확인한다
beforeEach(() => {
  vi.spyOn(window, "requestAnimationFrame").mockReturnValue(0);
});

type User = Awaited<ReturnType<typeof renderDetail>>["user"];

async function openMindmap() {
  const view = await renderDetail();
  await view.user.click(screen.getByRole("button", { name: "마인드맵 보기" }));
  return view;
}

const map = () => document.querySelector<SVGSVGElement>('svg[viewBox="0 0 1000 680"]')!;
/** 라벨로 찾은 노드 그룹 (<g>) — 라벨 글자는 pointer-events: none 이라 그룹을 누른다 */
const nodeOf = (label: string) => within(map() as unknown as HTMLElement).getByText(label).closest("g")!;
/** 노드 라벨 (svg > 확대·이동 g > 노드 g > text) — 좌하단 조작 안내 글자는 빼고 */
const nodeLabels = () => Array.from(map().querySelectorAll("svg > g > g > text")).map((t) => t.textContent);
const where = (label: string) => nodeOf(label).getAttribute("transform");
const popup = () => document.querySelector<HTMLElement>(".popup");
const toolbarButton = (name: string) =>
  within(document.querySelector<HTMLElement>(".mapToolbar")!).getByRole("button", { name });

async function renameNode(user: User, from: string, to: string) {
  await user.dblClick(nodeOf(from));
  const input = screen.getByRole("textbox", { name: "노드 이름" });
  await user.clear(input);
  await user.type(input, `${to}{Enter}`);
}

describe("세션 상세 — 줄글 / 마인드맵 탭", () => {
  it("처음엔 줄글 보기가 선택돼 있고, 마인드맵 보기를 누르면 본문 대신 마인드맵이 보인다", async () => {
    const { user } = await renderDetail();
    expect(screen.getByRole("button", { name: "줄글 보기" })).toHaveClass("tabActive");
    expect(map()).toBeNull();

    await user.click(screen.getByRole("button", { name: "마인드맵 보기" }));
    expect(screen.getByRole("button", { name: "마인드맵 보기" })).toHaveClass("tabActive");
    expect(screen.getByRole("button", { name: "줄글 보기" })).not.toHaveClass("tabActive");
    expect(map()).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2, name: "한눈에 보기" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "줄글 보기" }));
    expect(map()).toBeNull();
    expect(screen.getByRole("heading", { level: 2, name: "한눈에 보기" })).toBeInTheDocument();
  });

  it("마인드맵에는 제목 노드와 출처 도메인 노드가 보이고, 출처 목록은 옆에 그대로 있다", async () => {
    await openMindmap();
    expect(nodeLabels()).toEqual(["로마 3박", "coopculture.it", "tickets.museivaticani.va", "blog.naver.com"]);
    expect(map().querySelectorAll("line")).toHaveLength(3);
    expect(screen.getByText("드래그로 이동 · 휠로 줌 · 노드 클릭으로 선택")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "출처 (3)" })).toBeInTheDocument();
  });

  it("마인드맵 · 인용 팝업에도 하이라이트 · 인사이트는 없다", async () => {
    const { user } = await openMindmap();
    await user.click(nodeOf("coopculture.it"));
    expect(screen.queryByText(/하이라이트|인사이트/)).not.toBeInTheDocument();
  });
});

describe("세션 상세 — 마인드맵 배치", () => {
  it("처음엔 방사형이고, 계층형을 누르면 제목 노드를 왼쪽에 두고 출처를 오른쪽 열에 세로로 늘어놓는다", async () => {
    const { user } = await openMindmap();
    expect(toolbarButton("방사형")).toHaveAttribute("aria-pressed", "true");
    expect(where("로마 3박")).toBe("translate(500,360)");
    expect(where("coopculture.it")).toBe("translate(840,360)");

    await user.click(toolbarButton("계층형"));
    expect(toolbarButton("계층형")).toHaveAttribute("aria-pressed", "true");
    expect(toolbarButton("방사형")).toHaveAttribute("aria-pressed", "false");
    expect(where("로마 3박")).toBe("translate(360,340)");
    expect([where("coopculture.it"), where("tickets.museivaticani.va"), where("blog.naver.com")]).toEqual([
      "translate(640,284)",
      "translate(640,340)",
      "translate(640,396)",
    ]);

    await user.click(toolbarButton("방사형"));
    expect(where("로마 3박")).toBe("translate(500,360)");
  });

  it("노드를 끌어 옮긴 뒤 자동 정렬을 누르면 처음 배치로 돌아간다", async () => {
    const { user } = await openMindmap();
    fireEvent.mouseDown(nodeOf("coopculture.it"));
    fireEvent.mouseMove(map(), { clientX: 100, clientY: 120 });
    fireEvent.mouseUp(map());
    expect(where("coopculture.it")).toBe("translate(100,120)");

    await user.click(toolbarButton("자동 정렬"));
    expect(where("coopculture.it")).toBe("translate(840,360)");
  });
});

describe("세션 상세 — 마인드맵 노드 편집", () => {
  it("노드 편집을 누르면 취소 · 저장과 더블클릭 안내가 보이고 조작 안내는 숨는다", async () => {
    const { user } = await openMindmap();
    await user.click(toolbarButton("노드 편집"));
    expect(toolbarButton("취소")).toBeInTheDocument();
    expect(toolbarButton("저장")).toBeInTheDocument();
    expect(screen.getByText("노드를 더블클릭해 이름을 고쳐요")).toBeInTheDocument();
    expect(screen.queryByText("드래그로 이동 · 휠로 줌 · 노드 클릭으로 선택")).not.toBeInTheDocument();
  });

  it("편집 중이 아니면 더블클릭해도 이름 입력칸이 열리지 않는다", async () => {
    const { user } = await openMindmap();
    await user.dblClick(nodeOf("로마 3박"));
    expect(screen.queryByRole("textbox", { name: "노드 이름" })).not.toBeInTheDocument();
  });

  it("노드를 더블클릭하면 지금 이름이 든 입력칸이 열리고, Enter 로 바꾼 뒤 저장하면 그 이름이 남는다", async () => {
    const { user } = await openMindmap();
    await user.click(toolbarButton("노드 편집"));
    await user.dblClick(nodeOf("로마 3박"));
    const input = screen.getByRole("textbox", { name: "노드 이름" });
    expect(input).toHaveValue("로마 3박");
    expect(input).toHaveFocus();
    expect(input).toHaveAttribute("maxLength", "30");

    await user.clear(input);
    await user.type(input, "로마 여행{Enter}");
    expect(screen.queryByRole("textbox", { name: "노드 이름" })).not.toBeInTheDocument();
    expect(nodeLabels()[0]).toBe("로마 여행");

    await user.click(toolbarButton("저장"));
    expect(toolbarButton("노드 편집")).toBeInTheDocument();
    expect(nodeLabels()[0]).toBe("로마 여행");
    // 배치를 바꿔 다시 그려도 저장한 이름은 그대로 (이 화면에 있는 동안만 — 마인드맵 저장 API 는 아직 없음)
    await user.click(toolbarButton("계층형"));
    expect(nodeLabels()[0]).toBe("로마 여행");
  });

  it("Esc 를 누르면 입력을 버리고 원래 이름을 둔다", async () => {
    const { user } = await openMindmap();
    await user.click(toolbarButton("노드 편집"));
    await user.dblClick(nodeOf("blog.naver.com"));
    const input = screen.getByRole("textbox", { name: "노드 이름" });
    await user.clear(input);
    await user.type(input, "맛집 블로그{Escape}");
    expect(screen.queryByRole("textbox", { name: "노드 이름" })).not.toBeInTheDocument();
    expect(nodeLabels()[3]).toBe("blog.naver.com");
  });

  it("입력칸 밖을 누르면(포커스가 빠지면) 바꾼 이름으로 확정한다", async () => {
    const { user } = await openMindmap();
    await user.click(toolbarButton("노드 편집"));
    await user.dblClick(nodeOf("blog.naver.com"));
    const input = screen.getByRole("textbox", { name: "노드 이름" });
    await user.clear(input);
    await user.type(input, "맛집 블로그");
    await user.click(screen.getByText("노드를 더블클릭해 이름을 고쳐요"));
    expect(nodeLabels()[3]).toBe("맛집 블로그");
  });

  it("비우거나 공백만 넣으면 이름을 바꾸지 않는다", async () => {
    const { user } = await openMindmap();
    await user.click(toolbarButton("노드 편집"));
    await user.dblClick(nodeOf("로마 3박"));
    const input = screen.getByRole("textbox", { name: "노드 이름" });
    await user.clear(input);
    await user.type(input, "   {Enter}");
    expect(nodeLabels()[0]).toBe("로마 3박");
  });

  it("취소를 누르면 편집 중 바꾼 이름을 모두 되돌린다 (이전에 저장한 이름은 남는다)", async () => {
    const { user } = await openMindmap();
    await user.click(toolbarButton("노드 편집"));
    await renameNode(user, "로마 3박", "로마 여행");
    await user.click(toolbarButton("저장"));

    await user.click(toolbarButton("노드 편집"));
    await renameNode(user, "로마 여행", "로마 4박");
    await renameNode(user, "coopculture.it", "콜로세움 예매");
    expect(nodeLabels().slice(0, 2)).toEqual(["로마 4박", "콜로세움 예매"]);

    await user.click(toolbarButton("취소"));
    expect(nodeLabels().slice(0, 2)).toEqual(["로마 여행", "coopculture.it"]);
  });

  it("편집 중에는 노드를 눌러도 인용 팝업이 열리지 않는다", async () => {
    const { user } = await openMindmap();
    await user.click(toolbarButton("노드 편집"));
    await user.click(nodeOf("coopculture.it"));
    expect(popup()).toBeNull();
  });

  it("노드 편집을 시작하면 열려 있던 인용 팝업을 닫는다", async () => {
    const { user } = await openMindmap();
    await user.click(nodeOf("coopculture.it"));
    expect(popup()).toBeInTheDocument();
    await user.click(toolbarButton("노드 편집"));
    expect(popup()).toBeNull();
  });
});

describe("세션 상세 — 인용(Citation) 팝업", () => {
  it("출처 노드를 누르면 출처 제목 · 도메인 · 발췌문과 새 탭으로 여는 원문 열기 링크가 보인다", async () => {
    const { user } = await openMindmap();
    await user.click(nodeOf("coopculture.it"));

    const p = within(popup()!);
    expect(p.getByText("Citation")).toBeInTheDocument();
    expect(p.getByText("콜로세움 통합권 예매 안내")).toBeInTheDocument();
    expect(p.getByText("coopculture.it")).toBeInTheDocument();
    expect(p.getByText("CO")).toBeInTheDocument();
    expect(p.getByText(ROME_DETAIL.sources[0].excerpt)).toBeInTheDocument();

    const link = p.getByRole("button", { name: "원문 열기" }).closest("a")!;
    expect(link).toHaveAttribute("href", ROME_DETAIL.sources[0].url);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noreferrer");
  });

  it("발췌문 안에 노드 이름이 있으면 그 부분을 형광펜으로 표시한다", async () => {
    const { user } = await openMindmap();
    await user.click(nodeOf("tickets.museivaticani.va"));
    const mark = popup()!.querySelector("mark")!;
    expect(mark).toHaveTextContent("tickets.museivaticani.va");
    expect(mark.closest("p")).toHaveTextContent(ROME_DETAIL.sources[1].excerpt);
  });

  it("제목이 없는 출처면 노드 이름(도메인)을 제목으로 쓴다", async () => {
    const { user } = await openMindmap();
    await user.click(nodeOf("blog.naver.com"));
    expect(popup()!.querySelector(".title")).toHaveTextContent("blog.naver.com");
  });

  it("제목 노드를 누르면 미리보기가 없다고 안내하고 원문 열기는 누를 수 없다", async () => {
    const { user } = await openMindmap();
    await user.click(nodeOf("로마 3박"));
    const p = within(popup()!);
    expect(p.getByText("로마 3박")).toBeInTheDocument();
    expect(p.getByText("이 노드에 연결된 본문 미리보기가 없습니다.")).toBeInTheDocument();
    expect(p.getByRole("button", { name: "원문 열기" })).toBeDisabled();
    expect(p.queryByRole("link")).not.toBeInTheDocument();
  });

  it("닫기를 누르거나 같은 노드를 다시 누르면 팝업이 닫힌다", async () => {
    const { user } = await openMindmap();
    await user.click(nodeOf("coopculture.it"));
    await user.click(within(popup()!).getByRole("button", { name: "닫기" }));
    expect(popup()).toBeNull();

    await user.click(nodeOf("coopculture.it"));
    expect(popup()).toBeInTheDocument();
    await user.click(nodeOf("coopculture.it"));
    expect(popup()).toBeNull();
  });

  it("다른 노드를 누르면 그 노드의 출처로 바뀐다", async () => {
    const { user } = await openMindmap();
    await user.click(nodeOf("coopculture.it"));
    await user.click(nodeOf("tickets.museivaticani.va"));
    expect(within(popup()!).getByText("바티칸 박물관 예약")).toBeInTheDocument();
  });

  it("이름을 바꾼 노드를 누르면 팝업 미리보기에도 바뀐 이름을 쓴다", async () => {
    const { user } = await openMindmap();
    await user.click(toolbarButton("노드 편집"));
    await renameNode(user, "로마 3박", "로마 여행");
    await user.click(toolbarButton("저장"));

    await user.click(nodeOf("로마 여행"));
    expect(within(popup()!).getByText("로마 여행")).toBeInTheDocument();
  });
});
