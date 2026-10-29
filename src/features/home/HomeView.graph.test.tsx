// 홈 마인드맵 주변 상호작용 — 필터 팝오버 · 검색 · 노드 선택 팝오버.
// 마인드맵은 실제 컴포넌트를 쓰되 포스 시뮬레이션(rAF)만 멈춰서 노드를 초기 좌표에 고정한다.
// 노드 흐림 여부는 Mindmap 이 노드 <g> 에 거는 투명도(흐림 0.25 · 보통 1)로 확인한다.
import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HOME_DATA } from "@/test/fixtures/home";
import { renderPersonal } from "@/test/render";
import { mockRouter } from "@/test/router";
import { HomeView } from "./HomeView";

beforeEach(() => {
  vi.spyOn(window, "requestAnimationFrame").mockReturnValue(0);
});

const setup = () => renderPersonal(<HomeView data={HOME_DATA} />);
/** 마인드맵 노드 (<text> 라벨을 가진 <g>) */
const node = (label: string) => screen.getByText(label, { selector: "text" }).parentElement!;
const DIMMED = { opacity: "0.25" };
const NORMAL = { opacity: "1" };
const filterButton = () => screen.getByRole("button", { name: "필터" });
const filterDialog = () => screen.getByRole("dialog", { name: "그래프 필터" });
const popover = () => screen.getByText("선택됨").parentElement!;

describe("그래프 필터", () => {
  it("필터를 누르면 기간 · 해시태그 그룹(노드 수) · 해시태그를 고르는 팝오버가 열린다", async () => {
    const { user } = setup();
    await user.click(filterButton());

    const dialog = filterDialog();
    expect(filterButton()).toHaveAttribute("aria-expanded", "true");
    expect(within(dialog).getAllByRole("radio").map((r) => r.parentElement?.textContent)).toEqual([
      "오늘",
      "이번 주",
      "이번 달",
      "전체",
    ]);
    expect(within(dialog).getByRole("radio", { name: "전체" })).toBeChecked();
    expect(within(dialog).getByRole("checkbox", { name: "유럽 여행 준비 노드 15" })).not.toBeChecked();
    expect(within(dialog).getByRole("checkbox", { name: "React 학습 노드 0" })).toBeInTheDocument();
    expect(within(dialog).getAllByRole("button", { pressed: false }).map((b) => b.textContent)).toEqual([
      "#로마",
      "#파리",
      "#항공권",
      "#예산",
      "#바르셀로나",
      "#프라하",
    ]);
    expect(within(dialog).queryByText(/개 적용/)).not.toBeInTheDocument();
  });

  it("조건을 골라도 '적용'을 누르기 전에는 그래프가 그대로이고, 적용하면 맞지 않는 노드가 흐려진다", async () => {
    const { user } = setup();
    await user.click(filterButton());
    await user.click(within(filterDialog()).getByRole("radio", { name: "오늘" }));

    expect(within(filterDialog()).getByText("1개 적용")).toBeInTheDocument();
    expect(node("파리")).toHaveStyle(NORMAL);

    await user.click(within(filterDialog()).getByRole("button", { name: "적용" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(node("파리")).toHaveStyle(DIMMED); // 이번 주에 본 노드
    expect(node("바르셀로나")).toHaveStyle(DIMMED); // 이번 달
    expect(node("로마")).toHaveStyle(NORMAL); // 오늘
    expect(node("항공권")).toHaveStyle(NORMAL);
    expect(filterButton()).toHaveClass("iconBtnOn");
  });

  it("해시태그를 고르면 그 태그 노드만 남고, 중심 노드는 흐려지지 않는다", async () => {
    const { user } = setup();
    await user.click(filterButton());
    const chip = within(filterDialog()).getByRole("button", { name: "#바르셀로나" });
    await user.click(chip);
    expect(chip).toHaveAttribute("aria-pressed", "true");
    await user.click(within(filterDialog()).getByRole("button", { name: "적용" }));

    ["바르셀로나", "사그라다 파밀리아", "구엘공원", "타파스"].forEach((l) => expect(node(l)).toHaveStyle(NORMAL));
    ["로마", "파리", "프라하", "항공권"].forEach((l) => expect(node(l)).toHaveStyle(DIMMED));
    expect(node("유럽 여행")).toHaveStyle(NORMAL);
  });

  it("해시태그 그룹을 고르면 그룹 태그가 붙은 노드만 남는다", async () => {
    const { user } = setup();
    await user.click(filterButton());
    await user.click(within(filterDialog()).getByRole("checkbox", { name: /유럽 여행 준비/ }));
    await user.click(within(filterDialog()).getByRole("button", { name: "적용" }));

    ["로마", "콜로세움", "파리", "비자/입국", "여행블로그"].forEach((l) => expect(node(l)).toHaveStyle(NORMAL));
    ["바르셀로나", "프라하", "예산", "유레일패스"].forEach((l) => expect(node(l)).toHaveStyle(DIMMED));
  });

  it("기간 · 그룹 · 해시태그를 모두 고르면 '3개 적용'으로 센다", async () => {
    const { user } = setup();
    await user.click(filterButton());
    const dialog = filterDialog();
    await user.click(within(dialog).getByRole("radio", { name: "이번 주" }));
    await user.click(within(dialog).getByRole("checkbox", { name: /유럽 여행 준비/ }));
    await user.click(within(dialog).getByRole("button", { name: "#로마" }));
    await user.click(within(dialog).getByRole("button", { name: "#파리" }));
    expect(within(dialog).getByText("3개 적용")).toBeInTheDocument();
  });

  it("적용한 조건은 다시 열었을 때 그대로 남아 있다", async () => {
    const { user } = setup();
    await user.click(filterButton());
    await user.click(within(filterDialog()).getByRole("radio", { name: "오늘" }));
    await user.click(within(filterDialog()).getByRole("button", { name: "적용" }));
    await user.click(filterButton());
    expect(within(filterDialog()).getByRole("radio", { name: "오늘" })).toBeChecked();
    expect(within(filterDialog()).getByText("1개 적용")).toBeInTheDocument();
  });

  it("'초기화'를 누르면 조건이 모두 풀리고 팝오버가 닫힌다", async () => {
    const { user } = setup();
    await user.click(filterButton());
    await user.click(within(filterDialog()).getByRole("radio", { name: "오늘" }));
    await user.click(within(filterDialog()).getByRole("button", { name: "적용" }));
    expect(node("파리")).toHaveStyle(DIMMED);

    await user.click(filterButton());
    await user.click(within(filterDialog()).getByRole("button", { name: "초기화" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(node("파리")).toHaveStyle(NORMAL);
    expect(filterButton()).not.toHaveClass("iconBtnOn");
  });

  it("적용하지 않고 닫으면 고르던 조건은 버려진다", async () => {
    const { user } = setup();
    await user.click(filterButton());
    await user.click(within(filterDialog()).getByRole("radio", { name: "오늘" }));
    await user.click(filterButton()); // 닫기
    expect(node("파리")).toHaveStyle(NORMAL);

    await user.click(filterButton());
    expect(within(filterDialog()).getByRole("radio", { name: "전체" })).toBeChecked();
    expect(within(filterDialog()).queryByText(/개 적용/)).not.toBeInTheDocument();
  });

  it("팝오버 바깥을 누르면 닫힌다", async () => {
    const { user } = setup();
    await user.click(filterButton());
    await user.click(screen.getByRole("heading", { name: "홈" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(filterButton()).toHaveAttribute("aria-expanded", "false");
  });
});

describe("그래프 검색", () => {
  const openSearch = async (user: ReturnType<typeof setup>["user"], query: string) => {
    await user.click(screen.getByRole("button", { name: "검색" }));
    await user.type(screen.getByRole("combobox", { name: "노드 · 세션 검색" }), query);
  };
  const options = () => screen.getAllByRole("option");

  it("검색어가 들어간 노드와 세션이 '노드' · '세션'으로 나뉘어 보인다", async () => {
    const { user } = setup();
    await openSearch(user, "로마");

    const list = screen.getByRole("listbox", { name: "검색 결과" });
    expect(within(list).getByText("노드")).toBeInTheDocument();
    expect(within(list).getByText("세션")).toBeInTheDocument();
    expect(options().map((o) => o.textContent)).toEqual([
      "로마연결 6개",
      "로마 3박 4일 동선 짜기2026-04-26",
      "유럽 항공권 비교 (인천→로마 IN, 프라하→인천 OUT)2026-04-25",
    ]);
    expect(options()[0]).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("↑↓ 이동 · Enter 선택 · Esc 닫기")).toBeInTheDocument();
  });

  it("검색을 열면 필터 팝오버는 닫힌다", async () => {
    const { user } = setup();
    await user.click(filterButton());
    await user.click(screen.getByRole("button", { name: "검색" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveFocus();
  });

  it("↓ 로 세션을 고르고 Enter 를 누르면 그 세션 상세로 이동한다", async () => {
    const { user } = setup();
    await openSearch(user, "로마");
    await user.keyboard("{ArrowDown}");
    expect(options()[1]).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{Enter}");
    expect(mockRouter.push).toHaveBeenCalledWith("/sessions/9001");
  });

  it("처음 결과에서 ↑ 를 누르면 마지막 결과로 넘어간다", async () => {
    const { user } = setup();
    await openSearch(user, "로마");
    await user.keyboard("{ArrowUp}");
    expect(options()[2]).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{ArrowDown}");
    expect(options()[0]).toHaveAttribute("aria-selected", "true");
  });

  it("세션 결과를 클릭해도 그 세션 상세로 이동한다", async () => {
    const { user } = setup();
    await openSearch(user, "로마");
    await user.click(screen.getByRole("option", { name: /유럽 항공권 비교/ }));
    expect(mockRouter.push).toHaveBeenCalledWith("/sessions/9002");
  });

  it("노드 결과를 고르면 검색이 닫히고 그 노드가 선택된다", async () => {
    const { user } = setup();
    await openSearch(user, "로마");
    await user.keyboard("{Enter}");

    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(within(popover()).getByText("로마")).toBeInTheDocument();
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it("맞는 결과가 없으면 '일치하는 결과가 없어요.'가 보인다", async () => {
    const { user } = setup();
    await openSearch(user, "없는검색어");
    expect(screen.getByText("일치하는 결과가 없어요.")).toBeInTheDocument();
    expect(screen.queryAllByRole("option")).toHaveLength(0);
  });

  it("Esc 를 누르면 검색이 닫히고, 다시 열면 검색어가 비어 있다", async () => {
    const { user } = setup();
    await openSearch(user, "로마");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "검색" }));
    expect(screen.getByRole("combobox")).toHaveValue("");
  });

  it("X(검색 닫기)를 눌러도 닫힌다", async () => {
    const { user } = setup();
    await openSearch(user, "로마");
    await user.click(screen.getByRole("button", { name: "검색 닫기" }));
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "검색" })).toBeInTheDocument();
  });

  it("검색창 바깥을 누르면 닫힌다", async () => {
    const { user } = setup();
    await openSearch(user, "로마");
    await user.click(screen.getByRole("heading", { name: "홈" }));
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});

describe("노드 선택 팝오버", () => {
  it("노드를 누르면 연결된 노드 수와 출처 수, '관련 세션 보기'가 보인다", async () => {
    const { user } = setup();
    await user.click(node("로마"));
    const pop = popover();
    expect(within(pop).getByText("로마")).toBeInTheDocument();
    // 로마 연결 6개, 가장 잘 맞는 세션 9001 페이지 18개
    expect(within(pop).getByText("연결된 노드 6개 · 출처 18개")).toBeInTheDocument();
    expect(within(pop).getByRole("button", { name: "관련 세션 보기" })).toBeInTheDocument();
  });

  it("'관련 세션 보기'를 누르면 가장 잘 맞는 세션 상세로 이동한다", async () => {
    const { user } = setup();
    await user.click(node("프라하"));
    await user.click(within(popover()).getByRole("button", { name: "관련 세션 보기" }));
    expect(mockRouter.push).toHaveBeenCalledWith("/sessions/9007");
  });

  it("맞는 세션이 없는 노드는 출처 수 없이 보이고, '관련 세션 보기'는 세션 목록으로 이동한다", async () => {
    const { user } = setup();
    await user.click(node("짐싸기"));
    expect(within(popover()).getByText("연결된 노드 1개")).toBeInTheDocument();
    await user.click(within(popover()).getByRole("button", { name: "관련 세션 보기" }));
    expect(mockRouter.push).toHaveBeenCalledWith("/sessions");
  });

  it("노드에 마우스를 올리기만 해도 보이고, 벗어나면 사라진다", async () => {
    const { user } = setup();
    await user.hover(node("파리"));
    expect(within(popover()).getByText("파리")).toBeInTheDocument();
    await user.unhover(node("파리"));
    expect(screen.queryByText("선택됨")).not.toBeInTheDocument();
  });

  it("선택한 노드를 다시 누르면 선택이 풀린다", async () => {
    const { user } = setup();
    await user.click(node("로마"));
    await user.click(node("로마"));
    await user.unhover(node("로마"));
    expect(screen.queryByText("선택됨")).not.toBeInTheDocument();
  });
});
