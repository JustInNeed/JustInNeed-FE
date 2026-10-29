import { act, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderPersonal } from "@/test/render";
import { setMockPathname } from "@/test/router";
import { MEMBER } from "@/test/fixtures/member";
import { Sidebar } from "./Sidebar";

const activeLinks = () => Array.from(document.querySelectorAll(".navItemActive")).map((el) => el.textContent);

afterEach(() => vi.useRealTimers());

describe("사이드바", () => {
  describe("메뉴", () => {
    it("개인 영역 4개 · 커뮤니티 4개 메뉴가 각 화면 주소로 연결된다", () => {
      renderPersonal(<Sidebar />);
      const links = screen.getAllByRole("link").map((a) => [a.textContent, a.getAttribute("href")]);
      expect(links).toEqual([
        ["홈", "/home"],
        ["분석/추천", "/analytics"],
        ["세션 목록", "/sessions"],
        ["설정", "/settings"],
        ["둘러보기", "/community"],
        ["검색", "/search"],
        ["북마크", "/bookmarks"],
        ["마이프로필", "/profile"],
      ]);
    });

    it.each([
      ["/home", "홈"],
      ["/settings", "설정"],
      ["/sessions/12", "세션 목록"],
      ["/profile/someone", "마이프로필"],
    ])("현재 경로가 %s 면 '%s' 만 강조된다", (path, label) => {
      setMockPathname(path);
      renderPersonal(<Sidebar />);
      expect(activeLinks()).toEqual([label]);
    });

    it("이름만 비슷한 경로(/sessionsabc)는 강조하지 않는다", () => {
      setMockPathname("/sessionsabc");
      renderPersonal(<Sidebar />);
      expect(activeLinks()).toEqual([]);
    });
  });

  describe("회원 · 로그아웃", () => {
    it("로그인한 회원의 닉네임과 첫 글자 아바타가 보인다", () => {
      renderPersonal(<Sidebar />);
      expect(screen.getByText("yesong")).toBeInTheDocument();
      expect(screen.getByText("Y")).toHaveClass("avatar");
    });

    it("닉네임이 없으면 '사용자' 와 '?' 아바타로 보인다", () => {
      renderPersonal(<Sidebar />, { member: { ...MEMBER, nickname: null } });
      expect(screen.getByText("사용자")).toBeInTheDocument();
      expect(screen.getByText("?")).toHaveClass("avatar");
    });

    it("로그아웃 버튼은 레이아웃의 logout 을 부른다 (확인 창은 레이아웃이 띄운다)", async () => {
      const { user, logout } = renderPersonal(<Sidebar />);
      await user.click(screen.getByRole("button", { name: "로그아웃" }));
      expect(logout).toHaveBeenCalledOnce();
    });
  });

  describe("수집 상태", () => {
    it("수집 중으로 시작하고, 경과 시간이 1초마다 늘어난다", () => {
      vi.useFakeTimers();
      renderPersonal(<Sidebar />);
      expect(screen.getByText("수집 중")).toBeInTheDocument();
      expect(screen.getByText("0분 00초")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "수집 종료" })).toBeInTheDocument();

      act(() => vi.advanceTimersByTime(65_000));
      expect(screen.getByText("1분 05초")).toBeInTheDocument();
    });

    it("수집 종료를 누르면 대기 중이 되고 시간이 멈추며, 다시 시작하면 0초부터 센다", () => {
      vi.useFakeTimers();
      renderPersonal(<Sidebar />);
      act(() => vi.advanceTimersByTime(3_000));

      fireEvent.click(screen.getByRole("button", { name: "수집 종료" }));
      expect(screen.getByText("대기 중")).toBeInTheDocument();
      expect(screen.getByText("버튼을 눌러 시작")).toBeInTheDocument();
      act(() => vi.advanceTimersByTime(5_000));
      expect(screen.getByText("버튼을 눌러 시작")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "수집 시작" }));
      expect(screen.getByText("수집 중")).toBeInTheDocument();
      expect(screen.getByText("0분 00초")).toBeInTheDocument();
      act(() => vi.advanceTimersByTime(1_000));
      expect(screen.getByText("0분 01초")).toBeInTheDocument();
    });
  });
});
