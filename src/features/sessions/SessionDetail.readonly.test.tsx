import { screen, waitFor } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { FOREIGN_DETAIL, LINK_ONLY_DETAIL, PARIS_DETAIL } from "@/test/fixtures/sessions";
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

describe("세션 상세 — 작성자가 원문 URL만 공개한 세션", () => {
  it("내 세션이면 본문이 없어도 링크 전용 화면이 아니다", async () => {
    await renderDetail({ ...PARIS_DETAIL, summary: null });
    expect(screen.getByRole("heading", { level: 1, name: PARIS_DETAIL.title })).toBeInTheDocument();
    expect(screen.getByText("요약 본문이 없습니다.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "마인드맵 보기" })).toBeInTheDocument();
  });

  it("제목 대신 안내를 보여주고 본문 자리에 링크만 공개됐다고 알린다", async () => {
    await renderDetail(LINK_ONLY_DETAIL);
    expect(screen.getByRole("heading", { level: 1, name: "원문 링크만 공개된 세션" })).toBeInTheDocument();
    expect(screen.getByText("작성자가 원문 링크만 공개했어요.")).toBeInTheDocument();
    expect(screen.queryByText("요약 본문이 없습니다.")).not.toBeInTheDocument();
  });

  it("출처는 도메인과 링크로 보이고 마인드맵 탭 · 복사 · .md 는 없다", async () => {
    await renderDetail(LINK_ONLY_DETAIL);
    expect(screen.getByRole("heading", { name: `출처 (${LINK_ONLY_DETAIL.sources!.length})` })).toBeInTheDocument();
    for (const { url } of LINK_ONLY_DETAIL.sources!) expect(document.querySelector(`a[href="${url}"]`)).toBeInTheDocument();
    for (const name of ["마인드맵 보기", "줄글 보기", "줄글 복사", ".md 파일 다운로드"]) {
      expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
    }
  });
});
