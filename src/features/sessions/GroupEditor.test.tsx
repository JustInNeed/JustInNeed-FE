import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TAG_GROUPS } from "@/test/fixtures/sessions";
import { renderApp } from "@/test/render";
import { GroupEditor } from "./GroupEditor";

const ALL_TAGS = ["로마", "로마여행", "콜로세움", "바티칸", "파리", "루브르", "항공권", "예산", "기차", "유레일", "프라하", "React"];

function renderEditor(props: Partial<Parameters<typeof GroupEditor>[0]> = {}) {
  const onSave = vi.fn();
  const onCancel = vi.fn();
  const view = renderApp(<GroupEditor allTags={ALL_TAGS} group={null} onCancel={onCancel} onSave={onSave} {...props} />, {
    authed: false,
  });
  return { ...view, onSave, onCancel };
}

/** 아래 '전체 해시태그' 목록의 태그 버튼 */
const tagButton = (tag: string) => {
  const list = document.querySelector<HTMLElement>(".tagList")!;
  return within(list).getByRole("button", { name: `#${tag}` });
};
const listedTags = () =>
  within(document.querySelector<HTMLElement>(".tagList")!)
    .queryAllByRole("button")
    .map((b) => b.textContent?.trim());

/** 위쪽 '선택된 해시태그' 칩 (드래그 가능) */
const selectedChips = () => screen.queryAllByTitle("드래그로 순서 변경");
const selectedTags = () => selectedChips().map((c) => c.textContent);

const saveButton = (name = "그룹 만들기") => screen.getByRole("button", { name });

describe("해시태그 그룹 편집기", () => {
  it("새 그룹이면 제목이 '새 그룹 만들기' 이고 아무것도 고르지 않으면 저장 버튼이 꺼져 있다", () => {
    renderEditor();
    expect(screen.getByRole("heading", { name: "새 그룹 만들기" })).toBeInTheDocument();
    expect(screen.getByText("(0/10)")).toBeInTheDocument();
    expect(screen.getByText("아래 목록에서 태그를 선택해 추가하세요.")).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
    expect(screen.queryByRole("button", { name: "모두 해제" })).not.toBeInTheDocument();
  });

  it("검색창에 포커스가 가 있고, 검색어(# 붙여도 됨)가 들어간 태그만 보인다", async () => {
    const { user } = renderEditor();
    const search = screen.getByPlaceholderText("해시태그 검색");
    expect(search).toHaveFocus();

    await user.type(search, "#로마");
    expect(listedTags()).toEqual(["#로마", "#로마여행"]);

    await user.clear(search);
    await user.type(search, "react");
    expect(listedTags()).toEqual(["#React"]);

    await user.clear(search);
    await user.type(search, "없는태그");
    expect(screen.getByText("검색 결과가 없습니다.")).toBeInTheDocument();
  });

  it("세션에 쓰인 해시태그가 하나도 없으면 그렇게 안내한다", () => {
    renderEditor({ allTags: [] });
    expect(screen.getByText("전체 해시태그 (0)")).toBeInTheDocument();
    expect(screen.getByText("세션에 사용된 해시태그가 없습니다.")).toBeInTheDocument();
  });

  it("태그를 누르면 고른 순서대로 위에 쌓이고, 다시 누르면 빠진다", async () => {
    const { user } = renderEditor();
    await user.click(tagButton("파리"));
    await user.click(tagButton("로마"));
    expect(selectedTags()).toEqual(["#파리", "#로마"]);
    expect(screen.getByText("(2/10)")).toBeInTheDocument();
    expect(tagButton("파리")).toHaveClass("tagBtnOn");
    expect(saveButton()).toBeEnabled();

    await user.click(tagButton("파리"));
    expect(selectedTags()).toEqual(["#로마"]);
    expect(tagButton("파리")).not.toHaveClass("tagBtnOn");
  });

  it("선택된 칩의 × 를 누르면 그 태그만 빠진다", async () => {
    const { user } = renderEditor();
    await user.click(tagButton("파리"));
    await user.click(tagButton("로마"));
    await user.click(within(selectedChips()[0]).getByRole("button", { name: "해제" }));
    expect(selectedTags()).toEqual(["#로마"]);
  });

  it("모두 해제를 누르면 선택이 비고 저장 버튼이 다시 꺼진다", async () => {
    const { user } = renderEditor();
    await user.click(tagButton("파리"));
    await user.click(tagButton("로마"));
    await user.click(screen.getByRole("button", { name: "모두 해제" }));
    expect(selectedTags()).toEqual([]);
    expect(saveButton()).toBeDisabled();
  });

  it("10개를 고르면 나머지 태그는 누를 수 없고 '최대 10개 선택됨' 이 보인다", async () => {
    const { user } = renderEditor();
    for (const t of ALL_TAGS.slice(0, 10)) await user.click(tagButton(t));
    expect(screen.getByText("(10/10)")).toBeInTheDocument();
    expect(screen.getByText("최대 10개 선택됨")).toBeInTheDocument();
    expect(tagButton("프라하")).toBeDisabled();
    expect(tagButton("React")).toBeDisabled();
    // 이미 고른 태그는 눌러서 뺄 수 있다
    expect(tagButton("로마")).toBeEnabled();
    await user.click(tagButton("로마"));
    expect(tagButton("프라하")).toBeEnabled();
  });

  it("두 개 이상 고르면 드래그 안내가 보이고, 칩을 끌어 놓으면 순서가 바뀐다", async () => {
    const { user } = renderEditor();
    await user.click(tagButton("로마"));
    expect(screen.queryByText("드래그로 순서 변경")).not.toBeInTheDocument();
    await user.click(tagButton("콜로세움"));
    await user.click(tagButton("바티칸"));
    expect(screen.getByText("드래그로 순서 변경")).toBeInTheDocument();

    const [first, , third] = selectedChips();
    const dataTransfer = { effectAllowed: "" };
    fireEvent.dragStart(third, { dataTransfer });
    fireEvent.dragOver(first, { dataTransfer });
    expect(first.style.outline).toContain("2px solid");
    fireEvent.drop(first, { dataTransfer });
    expect(selectedTags()).toEqual(["#바티칸", "#로마", "#콜로세움"]);
    expect(dataTransfer.effectAllowed).toBe("move");
  });

  it("같은 자리에 놓거나 드래그를 그만두면 순서가 그대로다", async () => {
    const { user } = renderEditor();
    await user.click(tagButton("로마"));
    await user.click(tagButton("콜로세움"));
    const [first, second] = selectedChips();
    const dataTransfer = { effectAllowed: "" };
    fireEvent.dragStart(first, { dataTransfer });
    fireEvent.drop(first, { dataTransfer });
    fireEvent.dragStart(second, { dataTransfer });
    fireEvent.dragEnd(second, { dataTransfer });
    expect(selectedTags()).toEqual(["#로마", "#콜로세움"]);
  });

  it("그룹 만들기를 누르면 고른 태그를 고른 순서대로 넘긴다", async () => {
    const { user, onSave } = renderEditor();
    await user.click(tagButton("항공권"));
    await user.click(tagButton("예산"));
    await user.click(saveButton());
    expect(onSave).toHaveBeenCalledWith({ id: undefined, hashtags: ["항공권", "예산"] });
  });

  it("기존 그룹을 열면 '그룹 수정' 으로 그 그룹의 태그가 골라져 있고, 수정 완료하면 id 와 함께 넘긴다", async () => {
    const { user, onSave } = renderEditor({ group: TAG_GROUPS[1] });
    expect(screen.getByRole("heading", { name: "그룹 수정" })).toBeInTheDocument();
    expect(selectedTags()).toEqual(["#항공권", "#예산"]);
    await user.click(tagButton("기차"));
    await user.click(saveButton("수정 완료"));
    expect(onSave).toHaveBeenCalledWith({ id: 2, hashtags: ["항공권", "예산", "기차"] });
  });

  it("취소 · 닫기 · 바깥 배경을 누르면 닫고, 창 안을 누르면 닫지 않는다", async () => {
    const { user, onCancel, container } = renderEditor();
    await user.click(screen.getByRole("heading", { name: "새 그룹 만들기" }));
    expect(onCancel).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "취소" }));
    await user.click(screen.getByRole("button", { name: "닫기" }));
    await user.click(container.querySelector<HTMLElement>(".overlay")!);
    expect(onCancel).toHaveBeenCalledTimes(3);
  });
});
