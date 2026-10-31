import { screen, waitFor } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { FOREIGN_DETAIL, PARIS_DETAIL } from "@/test/fixtures/sessions";
import { renderDetail } from "./sessionDetailTestUtils";

describe("세션 상세 — 다른 사람의 공개 세션 (읽기 전용)", () => {
  it.each(["즐겨찾기", "공개", "비공개", "편집", "삭제", "추가"])("'%s' 버튼이 없다", async (name) => {
    await renderDetail(FOREIGN_DETAIL);
    expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
  });

  it("해시태그는 보이지만 지우거나 끌어서 옮길 수 없다", async () => {
    await renderDetail(FOREIGN_DETAIL);
    for (const tag of FOREIGN_DETAIL.tags) expect(screen.getByText(`#${tag}`)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /삭제$/ })).not.toBeInTheDocument();
    expect(screen.queryAllByTitle("드래그로 순서 변경")).toEqual([]);
    expect(document.querySelector("[draggable='true']")).not.toBeInTheDocument();
  });

  it("본문 · 출처 · 마인드맵 탭 · 복사 · .md 는 그대로 있다", async () => {
    await renderDetail(FOREIGN_DETAIL);
    expect(screen.getByRole("heading", { level: 2, name: "루브르" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "출처 (2)" })).toBeInTheDocument();
    for (const name of ["줄글 보기", "마인드맵 보기", "줄글 복사", ".md 파일 다운로드"]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
  });

  describe("복사 · 내려받기", () => {
    beforeAll(() => {
      Object.defineProperty(HTMLElement.prototype, "innerText", {
        configurable: true,
        get(this: HTMLElement) {
          return this.textContent ?? "";
        },
      });
      Object.assign(URL, { createObjectURL: () => "blob:x", revokeObjectURL: () => {} });
    });
    afterAll(() => {
      delete (HTMLElement.prototype as { innerText?: string }).innerText;
    });

    it("읽기 전용이어도 복사 · 내려받기는 되고 수정 요청은 나가지 않는다", async () => {
      const { user, patches } = await renderDetail(FOREIGN_DETAIL);
      const write = vi.spyOn(navigator.clipboard, "writeText");
      const create = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:session");
      vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

      await user.click(screen.getByRole("button", { name: "줄글 복사" }));
      await user.click(screen.getByRole("button", { name: ".md 파일 다운로드" }));

      await waitFor(() => expect(write).toHaveBeenCalledOnce());
      expect(create).toHaveBeenCalledOnce();
      expect(patches).toEqual([]);
    });
  });
});

describe("세션 상세 — 내 세션", () => {
  it("별 · 공개 · 편집 · 삭제 · 해시태그 추가가 모두 있다", async () => {
    await renderDetail(PARIS_DETAIL);
    for (const name of ["즐겨찾기", "공개", "편집", "삭제", "추가"]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
    expect(screen.queryAllByTitle("드래그로 순서 변경")).toHaveLength(PARIS_DETAIL.tags.length);
  });
});
