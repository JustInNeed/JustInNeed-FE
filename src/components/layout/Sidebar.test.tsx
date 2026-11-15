import { act, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderPersonal } from "@/test/render";
import { setMockPathname } from "@/test/router";
import { MEMBER } from "@/test/fixtures/member";
import { STATUS_POLL_MS } from "@/lib/app/PersonalContext";
import { NAV_ROOT_ATTR } from "@/lib/app/NavHistoryContext";
import { installFakeExtension, loggedOutExtension, removeFakeExtension } from "@/test/extension";
import { Sidebar } from "./Sidebar";

const activeLinks = () => Array.from(document.querySelectorAll(".navItemActive")).map((el) => el.textContent);

afterEach(() => vi.useRealTimers());

describe("사이드바", () => {
  describe("메뉴", () => {
    it("개인 영역 4개 · 커뮤니티 4개 메뉴가 각 화면 주소로 연결된다", () => {
      renderPersonal(<Sidebar />);
      const links = within(screen.getByRole("navigation"))
        .getAllByRole("link")
        .map((a) => [a.textContent, a.getAttribute("href")]);
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

  describe("로고 홈 링크 (QA-031)", () => {
    // 상단 바 로고는 데스크톱 너비에서 CSS 로 숨겨져 있어 hidden 요소도 찾는다
    const brandLinks = () => screen.getAllByRole("link", { name: "JustInNeed 홈으로 이동", hidden: true });

    it("사이드바 로고와 상단 바 로고 둘 다 홈으로 가는 링크이고, 메뉴처럼 이동 기록을 비운다", () => {
      setMockPathname("/settings");
      renderPersonal(<Sidebar />);
      const links = brandLinks();
      expect(links).toHaveLength(2);
      for (const a of links) {
        expect(a).toHaveAttribute("href", "/home");
        expect(a).toHaveAttribute(NAV_ROOT_ATTR);
      }
      expect(links.map((a) => a.closest("header, aside")?.tagName)).toEqual(["HEADER", "ASIDE"]);
    });

    it("이미 홈에서 서랍을 열고 로고를 눌러도 서랍이 닫힌다", async () => {
      // jsdom 은 링크 이동을 지원하지 않아 기본 동작만 막는다 (전파는 그대로)
      const prevent = (e: Event) => e.preventDefault();
      window.addEventListener("click", prevent, true);
      setMockPathname("/home");
      const { user } = renderPersonal(<Sidebar />);
      await user.click(screen.getByRole("button", { name: "메뉴 열기", hidden: true }));
      const aside = document.getElementById("app-sidebar")!;
      expect(aside).toHaveClass("asideOpen");

      await user.click(within(aside).getByRole("link", { name: "JustInNeed 홈으로 이동" }));
      expect(aside).not.toHaveClass("asideOpen");
      window.removeEventListener("click", prevent, true);
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

  describe("확장 상태 카드", () => {
    const card = () => screen.getByText("EXTENSION").closest("div")!.parentElement!;
    // 이 회원(MEMBER)으로 연결된, 수집 상태를 알려 주는 확장. state 를 바꾸면 다음 물음부터 그 값으로 답한다
    function recorder(state: { recording: boolean; startedAt: number | null }, memberId = MEMBER.id) {
      return installFakeExtension((m) => {
        if (m.type === "JIN_STATUS") return { loggedIn: true, memberId, version: "0.3.2", ...state };
        if (m.type === "JIN_START") {
          Object.assign(state, { recording: true, startedAt: Date.now() });
          return { ok: true, ...state };
        }
        if (m.type === "JIN_STOP") {
          Object.assign(state, { recording: false, startedAt: null });
          return { ok: true, ...state };
        }
        return { ok: false, why: `모르는 메시지: ${m.type}` };
      });
    }

    afterEach(() => removeFakeExtension());

    it("확장이 없으면 '연결 안 됨' 이고 시작 버튼이 없다", async () => {
      renderPersonal(<Sidebar />);
      expect(await within(card()).findByText("연결 안 됨")).toBeInTheDocument();
      expect(within(card()).queryByRole("button")).toBeNull();
    });

    it("확장이 로그아웃이면 '로그인 필요' 와 연결 페이지 링크를 보여 준다", async () => {
      installFakeExtension(loggedOutExtension());
      renderPersonal(<Sidebar />);
      expect(await within(card()).findByText("로그인 필요")).toBeInTheDocument();
      expect(within(card()).getByRole("link", { name: "연결하기" })).toHaveAttribute("href", "/extension/connect");
    });

    it("확장이 다른 회원으로 로그인돼 있어도 '로그인 필요' 다", async () => {
      recorder({ recording: true, startedAt: Date.now() }, MEMBER.id + 1);
      renderPersonal(<Sidebar />);
      expect(await within(card()).findByText("로그인 필요")).toBeInTheDocument();
    });

    it("수집 상태를 모르는 옛 확장이면 '연결됨' 과 업데이트 안내만 보여 준다", async () => {
      installFakeExtension(() => ({ loggedIn: true, memberId: MEMBER.id, version: "0.3.1" }));
      renderPersonal(<Sidebar />);
      expect(await within(card()).findByText("연결됨")).toBeInTheDocument();
      expect(within(card()).queryByRole("button")).toBeNull();
    });

    it("확장이 기록 중이면 확장이 시작한 시각 기준 경과 시간을 1초마다 늘린다", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      recorder({ recording: true, startedAt: Date.now() - 125_000 });
      renderPersonal(<Sidebar />);
      expect(await within(card()).findByText("수집 중")).toBeInTheDocument();
      expect(within(card()).getByText("2분 05초")).toBeInTheDocument();
      await act(() => vi.advanceTimersByTimeAsync(2_000));
      expect(within(card()).getByText("2분 07초")).toBeInTheDocument();
      expect(within(card()).getByRole("button", { name: "수집 종료" })).toBeInTheDocument();
    });

    it("수집 시작 · 종료 버튼은 확장에 JIN_START · JIN_STOP 을 보내고 답대로 카드를 바꾼다", async () => {
      const sent = recorder({ recording: false, startedAt: null });
      const { user } = renderPersonal(<Sidebar />);
      await user.click(await within(card()).findByRole("button", { name: "수집 시작" }));
      expect(await within(card()).findByText("수집 중")).toBeInTheDocument();
      expect(within(card()).getByText("0분 00초")).toBeInTheDocument();

      await user.click(within(card()).getByRole("button", { name: "수집 종료" }));
      expect(await within(card()).findByText("대기 중")).toBeInTheDocument();
      expect(sent.map((s) => s.message.type).filter((t) => t !== "JIN_STATUS")).toEqual(["JIN_START", "JIN_STOP"]);
    });

    it("확장 팝업에서 켜는 등 확장 쪽 상태가 바뀌면 다음 물음 때 카드가 따라간다", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const state = { recording: false, startedAt: null as number | null };
      recorder(state);
      renderPersonal(<Sidebar />);
      expect(await within(card()).findByText("대기 중")).toBeInTheDocument();
      Object.assign(state, { recording: true, startedAt: Date.now() });
      await act(() => vi.advanceTimersByTimeAsync(STATUS_POLL_MS));
      expect(within(card()).getByText("수집 중")).toBeInTheDocument();
    });

    it("시작을 확장이 거절하면 이유를 카드에 보여 주고 상태는 그대로다", async () => {
      installFakeExtension((m) =>
        m.type === "JIN_STATUS"
          ? { loggedIn: true, memberId: MEMBER.id, version: "0.3.2", recording: false, startedAt: null }
          : { ok: false, why: "no-login" },
      );
      const { user } = renderPersonal(<Sidebar />);
      await user.click(await within(card()).findByRole("button", { name: "수집 시작" }));
      expect(await within(card()).findByRole("alert")).toHaveTextContent("확장 프로그램에 로그인이 필요해요.");
      expect(within(card()).getByText("대기 중")).toBeInTheDocument();
    });
  });
  describe("좁은 화면 서랍 메뉴 (QA-003)", () => {
    const aside = () => document.getElementById("app-sidebar")!;
    // 테스트 환경은 데스크톱 너비라 상단 바·닫기 버튼이 CSS 로 숨겨져 있다 → hidden 요소도 찾는다. 너비별 표시는 브라우저 촬영으로 확인
    const menuBtn = () => screen.getByRole("button", { name: "메뉴 열기", hidden: true });

    it("처음엔 닫혀 있고, 메뉴 버튼을 누르면 열린다", async () => {
      const { user } = renderPersonal(<Sidebar />);
      expect(aside()).not.toHaveClass("asideOpen");
      expect(menuBtn()).toHaveAttribute("aria-expanded", "false");

      await user.click(menuBtn());
      expect(aside()).toHaveClass("asideOpen");
      expect(menuBtn()).toHaveAttribute("aria-expanded", "true");
    });

    it("✕ 버튼, 바깥 영역, Esc 로 닫힌다", async () => {
      const { user } = renderPersonal(<Sidebar />);

      await user.click(menuBtn());
      await user.click(screen.getByLabelText("메뉴 닫기"));
      expect(aside()).not.toHaveClass("asideOpen");

      await user.click(menuBtn());
      await user.click(document.querySelector(".scrim")!);
      expect(aside()).not.toHaveClass("asideOpen");

      await user.click(menuBtn());
      await user.keyboard("{Escape}");
      expect(aside()).not.toHaveClass("asideOpen");
    });

    it("다른 화면으로 이동하면 닫힌다", async () => {
      setMockPathname("/home");
      const { user, rerender } = renderPersonal(<Sidebar />);
      await user.click(menuBtn());
      expect(aside()).toHaveClass("asideOpen");

      setMockPathname("/settings");
      rerender(<Sidebar />);
      expect(aside()).not.toHaveClass("asideOpen");
    });
  });
});
