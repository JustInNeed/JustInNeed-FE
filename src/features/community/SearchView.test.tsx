import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderPersonal } from "@/test/render";
import { mockRouter } from "@/test/router";
import { SEARCH_DATA } from "@/test/fixtures/community";
import { SearchView, type SearchViewProps } from "./SearchView";

// 검색 화면은 보류 상태 — 필터 탭과 이동만 가볍게 확인한다
function renderSearch(props: Partial<SearchViewProps> = {}) {
  return renderPersonal(<SearchView data={SEARCH_DATA} initialQuery="파리" {...props} />);
}

const resultCount = () => document.querySelector(".resultCount")!;

describe("SearchView", () => {
  it("검색어와 마인드맵 · 사용자 수를 보여주고 처음에는 마인드맵 결과가 보인다", () => {
    renderSearch();
    expect(screen.getByRole("textbox", { name: "해시태그 검색" })).toHaveValue("파리");
    expect(screen.getByRole("button", { name: "마인드맵 (6)" })).toHaveClass("active");
    expect(screen.getByRole("button", { name: "사용자 (6)" })).not.toHaveClass("active");
    expect(resultCount()).toHaveTextContent('"파리" 관련 결과 6개');
    expect(screen.getByText("by wanderlust · 노드 142")).toBeInTheDocument();
  });

  it("검색어를 바꾸면 결과 문구의 검색어도 바뀐다", async () => {
    const { user } = renderSearch();
    const input = screen.getByRole("textbox", { name: "해시태그 검색" });
    await user.clear(input);
    await user.type(input, "로마");
    expect(resultCount()).toHaveTextContent('"로마" 관련 결과 6개');
  });

  it("마인드맵 카드를 누르면 작성자 프로필로 이동한다", async () => {
    const { user } = renderSearch();
    await user.click(screen.getByText("동유럽 3주 살이 전체 동선"));
    expect(mockRouter.push).toHaveBeenCalledWith("/profile/wanderlust");
  });

  it("마인드맵마다 관련 세션을 보여주고, 누르면 작성자 프로필로 이동한다", async () => {
    const { user } = renderSearch();
    const card = within(screen.getByText("유레일 vs 저가항공 — 실비 비교").closest<HTMLElement>(".mapCard")!);
    expect(card.getByText("관련 세션 · 2")).toBeInTheDocument();
    expect(card.getByText("39분 · 출처 7개")).toBeInTheDocument();
    await user.click(card.getByRole("button", { name: /유레일패스 vs 개별 구매/ }));
    expect(mockRouter.push).toHaveBeenCalledWith("/profile/rail.kr");
  });

  it("사용자 탭으로 바꾸면 사용자 카드가 보이고, 누르면 그 사람 프로필로 이동한다", async () => {
    const { user } = renderSearch();
    await user.click(screen.getByRole("button", { name: "사용자 (6)" }));
    expect(screen.getByRole("button", { name: "사용자 (6)" })).toHaveClass("active");
    const card = screen.getByText("@foodtrip").closest<HTMLElement>(".profileCard")!;
    expect(within(card).getByText("노드 88 · 좋아요 412")).toBeInTheDocument();
    await user.click(card);
    expect(mockRouter.push).toHaveBeenCalledWith("/profile/foodtrip");
  });

  it("데이터가 없으면 검색 결과 빈 상태를 보여준다", () => {
    renderSearch({ data: null, initialQuery: undefined });
    expect(screen.getByRole("status")).toHaveTextContent("검색 결과가 없어요");
    expect(screen.getByRole("button", { name: "마인드맵 (0)" })).toBeInTheDocument();
  });

  it("불러오지 못하면 오류 메시지와 다시 시도 버튼을 보여주고, 누르면 onRetry 를 부른다", async () => {
    const onRetry = vi.fn();
    const { user } = renderSearch({ data: null, error: "검색 결과를 불러오지 못했어요.", onRetry });
    expect(screen.getByRole("alert")).toHaveTextContent("검색 결과를 불러오지 못했어요.");
    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
