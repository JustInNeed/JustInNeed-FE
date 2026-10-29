import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderPersonal } from "@/test/render";
import { mockRouter } from "@/test/router";
import { BOOKMARKS_DATA } from "@/test/fixtures/community";
import { BookmarksView, type BookmarksViewProps } from "./BookmarksView";

function renderBookmarks(props: Partial<BookmarksViewProps> = {}) {
  return renderPersonal(<BookmarksView data={BOOKMARKS_DATA} {...props} />);
}

const tab = (name: RegExp) => screen.getByRole("button", { name });
/** 마인드맵 카드 (제목으로 찾기) */
const mapCard = (title: string) => screen.getByText(title).closest<HTMLElement>(".card")!;
const mapTitles = () => Array.from(document.querySelectorAll(".bmGrid .title"), (el) => el.textContent);
const sessionTitles = () => Array.from(document.querySelectorAll(".bmSession h3"), (el) => el.textContent);
const bundleNames = () => Array.from(document.querySelectorAll(".bundleTitle"), (el) => el.textContent);
const bundleCard = (name: string) => screen.getByText(name).closest<HTMLElement>(".bundleCard")!;

/** 노드가 강조 상태면 바깥 링이 그려진다 */
const hasRing = (g: Element) => g.querySelector('circle[stroke="#2D6A1B"]') !== null;

describe("BookmarksView — 탭 · 목록", () => {
  it("탭마다 북마크 수를 보여주고 처음에는 마인드맵 탭이 선택돼 있다", () => {
    renderBookmarks();
    expect(tab(/^마인드맵/)).toHaveTextContent("마인드맵 (6)");
    expect(tab(/^세션/)).toHaveTextContent("세션 (7)");
    expect(tab(/^해시태그 묶음/)).toHaveTextContent("해시태그 묶음 (4)");
    expect(tab(/^마인드맵/)).toHaveClass("active");
  });

  it("마인드맵 카드는 받은 순서대로 제목 · 작성자 · 저장 시점 · 앞의 해시태그 2개 · 노드 수를 보여준다", () => {
    renderBookmarks();
    expect(mapTitles()).toEqual([
      "동유럽 3주 살이 전체 동선",
      "파리 미식 지도 — 1구부터 20구까지",
      "유럽 한 달 200만원으로 살기",
      "유럽 미술관 30곳 우선순위",
      "이탈리아 시골 마을 7곳",
      "유레일 vs 저가항공 — 실비 비교",
    ]);
    const card = within(mapCard("동유럽 3주 살이 전체 동선"));
    expect(card.getByText("by wanderlust · 저장 4일 전")).toBeInTheDocument();
    expect(card.getByText("#프라하")).toBeInTheDocument();
    expect(card.getByText("#동유럽")).toBeInTheDocument();
    expect(card.queryByText("#야간열차")).toBeNull();
    expect(card.getByText("노드 142")).toBeInTheDocument();
  });

  it("세션 탭을 누르면 북마크한 세션 카드가, 해시태그 묶음 탭을 누르면 묶음이 보인다", async () => {
    const { user } = renderBookmarks();
    await user.click(tab(/^세션/));
    expect(tab(/^세션/)).toHaveClass("active");
    expect(sessionTitles()).toHaveLength(7);
    expect(sessionTitles()[0]).toBe("로마 3박 4일 동선 짜기");
    await user.click(tab(/^해시태그 묶음/));
    expect(bundleNames()).toEqual(["동유럽 자료", "미술관 모음", "예산 짜기", "항공권 비교"]);
    const bundle = within(bundleCard("미술관 모음"));
    ["#루브르", "#오르세", "#프라도", "#리이크스"].forEach((t) => expect(bundle.getByRole("button", { name: t })).toBeInTheDocument());
  });

  it("세션 카드를 누르면 그 세션 상세로 이동한다", async () => {
    const { user } = renderBookmarks();
    await user.click(tab(/^세션/));
    await user.click(screen.getByText("파리 미술관 4곳 비교 (루브르/오르세/오랑주리/퐁피두)"));
    expect(mockRouter.push).toHaveBeenCalledWith("/sessions/9003");
  });
});

describe("BookmarksView — 마인드맵 상세 팝업 · 원래 마인드맵에서 보기", () => {
  beforeEach(() => {
    // 전체 마인드맵 보기의 force simulation 은 멈춰 둔다 (노드 배치는 초기 좌표 그대로)
    vi.spyOn(window, "requestAnimationFrame").mockReturnValue(0);
  });

  it("마인드맵 카드를 누르면 상세 팝업이 관련 세션 · 원래 마인드맵에서 보기 버튼과 함께 열린다", async () => {
    const { user } = renderBookmarks();
    await user.click(mapCard("유레일 vs 저가항공 — 실비 비교"));
    const dialog = within(screen.getByRole("dialog", { name: "유레일 vs 저가항공 — 실비 비교" }));
    expect(dialog.getByText("· 2개")).toBeInTheDocument();
    expect(dialog.getByText("유레일패스 vs 개별 구매")).toBeInTheDocument();
    expect(dialog.getByRole("button", { name: "원래 마인드맵에서 보기" })).toBeInTheDocument();
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it("팝업에서 작성자 이름을 누르면 그 사람 프로필로 이동하고 팝업이 닫힌다", async () => {
    const { user } = renderBookmarks();
    await user.click(mapCard("파리 미식 지도 — 1구부터 20구까지"));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "🥖 foodtrip" }));
    expect(mockRouter.push).toHaveBeenCalledWith("/profile/foodtrip");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("원래 마인드맵에서 보기를 누르면 작성자 전체 마인드맵에서 저장한 노드만 강조한다", async () => {
    const { user } = renderBookmarks();
    await user.click(mapCard("동유럽 3주 살이 전체 동선"));
    await user.click(screen.getByRole("button", { name: "원래 마인드맵에서 보기" }));

    // 상세 팝업은 숨고 전체 보기만 남는다
    const dialogs = screen.getAllByRole("dialog");
    expect(dialogs).toHaveLength(1);
    const full = dialogs[0];
    expect(full).toHaveAccessibleName("wanderlust님의 전체 마인드맵");
    expect(within(full).getByText("저장한 노드 4개만 강조했어요")).toBeInTheDocument();

    const node = (label: string) => within(full).getByText(label).closest("g")!;
    // 저장한 노드: prague · castle · bridge · rail
    ["프라하", "프라하성", "카를교", "유레일패스"].forEach((label) => {
      expect(node(label)).toHaveStyle({ opacity: "1" });
      expect(hasRing(node(label))).toBe(true);
    });
    ["유럽 여행", "로마", "파리", "에펠탑"].forEach((label) => {
      expect(node(label)).toHaveStyle({ opacity: "0.25" });
      expect(hasRing(node(label))).toBe(false);
    });
  });

  it("전체 마인드맵 보기를 닫으면 원래의 상세 팝업으로 돌아온다", async () => {
    const { user } = renderBookmarks();
    await user.click(mapCard("동유럽 3주 살이 전체 동선"));
    await user.click(screen.getByRole("button", { name: "원래 마인드맵에서 보기" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "닫기" }));
    expect(screen.getByRole("dialog", { name: "동유럽 3주 살이 전체 동선" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "wanderlust님의 전체 마인드맵" })).toBeNull();
  });

  it("마인드맵마다 저장한 노드가 다르게 강조된다", async () => {
    const { user } = renderBookmarks();
    await user.click(mapCard("유레일 vs 저가항공 — 실비 비교"));
    await user.click(screen.getByRole("button", { name: "원래 마인드맵에서 보기" }));
    const full = screen.getByRole("dialog", { name: "rail.kr님의 전체 마인드맵" });
    expect(within(full).getByText("저장한 노드 5개만 강조했어요")).toBeInTheDocument();
    expect(within(full).getByText("항공권").closest("g")).toHaveStyle({ opacity: "1" });
    expect(within(full).getByText("프라하").closest("g")).toHaveStyle({ opacity: "0.25" });
  });
});

describe("BookmarksView — 북마크 해제", () => {
  it("마인드맵 북마크를 해제하면 카드가 빠지고 탭 수가 줄며, 팝업은 열리지 않는다", async () => {
    const { user } = renderBookmarks();
    await user.click(within(mapCard("파리 미식 지도 — 1구부터 20구까지")).getByRole("button", { name: "북마크 해제" }));
    expect(screen.queryByText("파리 미식 지도 — 1구부터 20구까지")).toBeNull();
    expect(tab(/^마인드맵/)).toHaveTextContent("마인드맵 (5)");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("북마크를 해제했어요.")).toBeInTheDocument();
  });

  it("토스트의 되돌리기를 누르면 해제한 마인드맵이 같은 자리로 돌아온다", async () => {
    const { user } = renderBookmarks();
    const before = mapTitles();
    await user.click(within(mapCard("유럽 한 달 200만원으로 살기")).getByRole("button", { name: "북마크 해제" }));
    expect(mapTitles()).not.toContain("유럽 한 달 200만원으로 살기");
    await user.click(screen.getByRole("button", { name: "되돌리기" }));
    expect(mapTitles()).toEqual(before);
    expect(tab(/^마인드맵/)).toHaveTextContent("마인드맵 (6)");
    expect(screen.queryByText("북마크를 해제했어요.")).toBeNull();
  });

  it("세션 북마크를 해제하면 세션 카드가 빠지고 상세로 이동하지 않으며, 되돌리면 같은 자리로 돌아온다", async () => {
    const { user } = renderBookmarks();
    await user.click(tab(/^세션/));
    const before = sessionTitles();
    const session = screen.getByText("유럽 항공권 비교 (인천→로마 IN, 프라하→인천 OUT)").closest<HTMLElement>(".bmSession")!;
    await user.click(within(session).getByRole("button", { name: "북마크 해제" }));
    expect(sessionTitles()).not.toContain("유럽 항공권 비교 (인천→로마 IN, 프라하→인천 OUT)");
    expect(tab(/^세션/)).toHaveTextContent("세션 (6)");
    expect(mockRouter.push).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "되돌리기" }));
    expect(sessionTitles()).toEqual(before);
  });

  it("해시태그 묶음 북마크를 해제하면 묶음이 빠지고, 되돌리면 같은 자리로 돌아온다", async () => {
    const { user } = renderBookmarks();
    await user.click(tab(/^해시태그 묶음/));
    await user.click(within(bundleCard("미술관 모음")).getByRole("button", { name: "북마크 해제" }));
    expect(bundleNames()).toEqual(["동유럽 자료", "예산 짜기", "항공권 비교"]);
    expect(tab(/^해시태그 묶음/)).toHaveTextContent("해시태그 묶음 (3)");
    await user.click(screen.getByRole("button", { name: "되돌리기" }));
    expect(bundleNames()).toEqual(["동유럽 자료", "미술관 모음", "예산 짜기", "항공권 비교"]);
  });

  it("탭의 마지막 항목까지 해제하면 그 탭에 빈 안내가 보인다", async () => {
    const { user } = renderBookmarks({ data: { ...BOOKMARKS_DATA, mindmaps: BOOKMARKS_DATA.mindmaps.slice(0, 1) } });
    await user.click(within(mapCard("동유럽 3주 살이 전체 동선")).getByRole("button", { name: "북마크 해제" }));
    expect(tab(/^마인드맵/)).toHaveTextContent("마인드맵 (0)");
    expect(screen.getByText("북마크한 항목이 없어요")).toBeInTheDocument();
  });
});

describe("BookmarksView — 빈 · 오류 상태", () => {
  it("한 탭만 비어 있으면 그 탭에서만 빈 안내를 보여준다", async () => {
    const { user } = renderBookmarks({ data: { ...BOOKMARKS_DATA, sessions: [] } });
    expect(screen.queryByText("북마크한 항목이 없어요")).toBeNull();
    await user.click(tab(/^세션/));
    expect(tab(/^세션/)).toHaveTextContent("세션 (0)");
    expect(screen.getByRole("status")).toHaveTextContent("북마크한 항목이 없어요");
  });

  it("데이터가 없으면 북마크 빈 상태를 보여주고 탭은 그리지 않는다", () => {
    renderBookmarks({ data: null });
    expect(screen.getByRole("heading", { name: "북마크" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("아직 북마크한 항목이 없어요");
    expect(screen.queryByRole("button", { name: /^마인드맵/ })).toBeNull();
  });

  it("불러오는 중이면 안내 문구만 보여준다", () => {
    renderBookmarks({ loading: true });
    expect(screen.getByText("불러오는 중…")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^마인드맵/ })).toBeNull();
  });

  it("불러오지 못하면 오류 메시지와 다시 시도 버튼을 보여주고, 누르면 onRetry 를 부른다", async () => {
    const onRetry = vi.fn();
    const { user } = renderBookmarks({ data: null, error: "북마크를 불러오지 못했어요.", onRetry });
    expect(screen.getByRole("alert")).toHaveTextContent("북마크를 불러오지 못했어요.");
    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
