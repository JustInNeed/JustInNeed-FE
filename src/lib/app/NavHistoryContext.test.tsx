import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { BackLink, PageHeader } from "@/components/ui";
import { mockRouter, setMockPathname } from "@/test/router";
import { NavHistoryProvider, nextHistory, pageLabel, type NavEntry } from "./NavHistoryContext";

const e = (pathname: string): NavEntry => ({ pathname });
const paths = (s: NavEntry[]) => s.map((x) => x.pathname);

describe("nextHistory — 앱 안 이동 기록 (QA-025)", () => {
  it("다른 화면으로 가면 쌓인다", () => {
    expect(paths(nextHistory([e("/community")], e("/sessions/2"), false))).toEqual(["/community", "/sessions/2"]);
  });

  it("사이드바 메뉴로 가면 그 화면부터 다시 시작한다", () => {
    expect(paths(nextHistory([e("/community"), e("/sessions/2")], e("/home"), true))).toEqual(["/home"]);
  });

  it("바로 앞 화면으로 돌아오면 기록에서 뺀다", () => {
    expect(paths(nextHistory([e("/search"), e("/profile/6"), e("/sessions/3")], e("/profile/6"), false))).toEqual([
      "/search",
      "/profile/6",
    ]);
  });

  it("같은 화면이면 그대로 (새로고침 · 쿼리만 바뀜)", () => {
    const s = [e("/community"), e("/search")];
    expect(nextHistory(s, e("/search"), false)).toBe(s);
  });

  it("기록이 없으면 지금 화면 하나", () => {
    expect(paths(nextHistory([], e("/sessions/2"), false))).toEqual(["/sessions/2"]);
  });
});

describe("pageLabel — 화면 제목과 같은 이름", () => {
  it.each([
    ["/community", "커뮤니티"],
    ["/sessions", "세션 목록"],
    ["/sessions/12", "세션 상세"],
    ["/search", "검색"],
    ["/profile", "내 프로필"],
    ["/profile/6", "프로필"],
    ["/bookmarks", "북마크"],
    ["/home", "홈"],
  ])("%s → %s", (path, label) => {
    expect(pageLabel(path)).toBe(label);
  });
});

describe("BackLink — 직전 화면 이름으로 돌아가기", () => {
  beforeEach(() => sessionStorage.clear());

  function mountAt(path: string, ui: React.ReactNode) {
    setMockPathname(path);
    return render(<NavHistoryProvider>{ui}</NavHistoryProvider>);
  }

  it("메뉴로 바로 온 화면(기록 하나)엔 뒤로 버튼이 없다", () => {
    mountAt("/community", <PageHeader title="커뮤니티" />);
    expect(screen.queryByRole("button", { name: /^←/ })).not.toBeInTheDocument();
  });

  it("커뮤니티에서 세션 상세로 오면 '← 커뮤니티' 이고, 누르면 뒤로 간다", async () => {
    const { rerender } = mountAt("/community", <BackLink fallback="/sessions" />);
    setMockPathname("/sessions/2");
    rerender(<NavHistoryProvider><BackLink fallback="/sessions" /></NavHistoryProvider>);
    const back = await screen.findByRole("button", { name: "← 커뮤니티" });
    await userEvent.click(back);
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it("세션 상세에 주소로 바로 들어오면 '← 세션 목록' 으로 목록에 간다", async () => {
    mountAt("/sessions/2", <BackLink fallback="/sessions" />);
    await userEvent.click(screen.getByRole("button", { name: "← 세션 목록" }));
    expect(mockRouter.push).toHaveBeenCalledWith("/sessions");
  });

  it("사이드바 메뉴 링크로 간 화면엔 뒤로 버튼이 없다", async () => {
    const ui = (
      <>
        <a href="/home" data-nav-root="" onClick={(ev) => ev.preventDefault()}>홈 메뉴</a>
        <PageHeader title="화면" />
      </>
    );
    const { rerender } = mountAt("/community", ui);
    setMockPathname("/sessions/2");
    rerender(<NavHistoryProvider>{ui}</NavHistoryProvider>);
    expect(await screen.findByRole("button", { name: "← 커뮤니티" })).toBeInTheDocument();
    await userEvent.click(screen.getByText("홈 메뉴"));
    setMockPathname("/home");
    rerender(<NavHistoryProvider>{ui}</NavHistoryProvider>);
    expect(screen.queryByRole("button", { name: /^←/ })).not.toBeInTheDocument();
  });

  it("메뉴가 아닌 이동은 그 화면 이름을 보여 준다 (홈 → 세션 목록)", async () => {
    const { rerender } = mountAt("/home", <PageHeader title="세션 목록" />);
    setMockPathname("/sessions");
    rerender(<NavHistoryProvider><PageHeader title="세션 목록" /></NavHistoryProvider>);
    expect(await screen.findByRole("button", { name: "← 홈" })).toBeInTheDocument();
  });

  it("새로고침해도 기록이 이어진다 (sessionStorage)", async () => {
    const first = mountAt("/search", <BackLink />);
    setMockPathname("/profile/6");
    first.rerender(<NavHistoryProvider><BackLink /></NavHistoryProvider>);
    first.unmount();
    mountAt("/profile/6", <BackLink />);
    expect(await screen.findByRole("button", { name: "← 검색" })).toBeInTheDocument();
  });
});
