import { screen, waitFor, within } from "@testing-library/react";
import { http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderPersonal } from "@/test/render";
import { API, SERVER_ERROR, fail, ok, server } from "@/test/msw/server";
import { EXCLUDED_URLS } from "@/test/fixtures/settings";
import type { ExcludedUrl } from "@/lib/viewTypes";
import { SettingsView } from "./SettingsView";

const URLS = `${API}/settings/collection/excluded-urls`;
const SELECTIONS = `${URLS}/selections`;
const EXTENSION = `${API}/settings/extension`;

/** 화면에 보이는 수집 제외 URL 순서 */
const shownUrls = () => Array.from(document.querySelectorAll(".exUrl")).map((el) => el.textContent);
/** URL 한 줄 (체크박스 · 기본 배지 · 삭제 버튼이 들어 있는 label) */
const row = (url: string) => screen.getByText(url, { selector: ".exUrl" }).closest("label") as HTMLElement;
const urlInput = () => screen.getByPlaceholderText("https://example.com");
const addBtn = () => screen.getByRole("button", { name: "추가" });

/** 저장 요청 본문을 모아 둔다 — 기본은 전부 성공 (실제 BE 응답 모양) */
let saved: { method: string; path: string; body: unknown }[];

beforeEach(() => {
  saved = [];
  const record = async (request: Request) => {
    saved.push({ method: request.method, path: new URL(request.url).pathname, body: await request.clone().json() });
  };
  let nextId = 100;
  server.use(
    http.post(URLS, async ({ request }) => {
      await record(request);
      const { url } = (await request.json()) as { url: string };
      return ok(
        { code: 201, excludedUrlId: nextId++, url, domain: url.split("/")[0], isDefault: false, isExcluded: true, createdAt: "2026-10-31T18:00:00" },
        { status: 201 },
      );
    }),
    http.patch(SELECTIONS, async ({ request }) => {
      await record(request);
      return ok({ code: 200, updatedCount: 1, isExcluded: true, updatedUrlIds: [] });
    }),
    http.delete(URLS, async ({ request }) => {
      await record(request);
      return ok({ code: 200, deletedUrlIds: [], uncheckedDefaultUrlIds: [], deletedCount: 1 });
    }),
    http.patch(`${EXTENSION}/:toggle`, async ({ request }) => {
      await record(request);
      return ok({ code: 200, userId: 1, updatedAt: "2026-10-31T18:00:00" });
    }),
  );
});

describe("설정 화면", () => {
  describe("섹션 메뉴", () => {
    it("데이터 수집 · 확장 프로그램 · 계정 3개만 있고 외부 플랫폼은 숨겨져 있다", () => {
      renderPersonal(<SettingsView excludedUrls={EXCLUDED_URLS} />);
      const nav = screen.getByRole("navigation");
      expect(within(nav).getAllByRole("button").map((b) => b.textContent)).toEqual(["데이터 수집", "확장 프로그램", "계정"]);
      expect(screen.queryByText("외부 플랫폼")).not.toBeInTheDocument();
    });

    it("처음엔 데이터 수집이 켜져 있고, 누른 메뉴로 강조와 내용이 바뀐다", async () => {
      const { user } = renderPersonal(<SettingsView excludedUrls={EXCLUDED_URLS} />);
      expect(screen.getByRole("button", { name: "데이터 수집" })).toHaveClass("navBtnOn");
      expect(screen.getByRole("heading", { name: "수집 제외 URL" })).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "확장 프로그램" }));
      expect(screen.getByRole("button", { name: "확장 프로그램" })).toHaveClass("navBtnOn");
      expect(screen.getByRole("button", { name: "데이터 수집" })).not.toHaveClass("navBtnOn");
      expect(screen.queryByRole("heading", { name: "수집 제외 URL" })).not.toBeInTheDocument();
      expect(screen.getByRole("switch", { name: "확장 프로그램 팝업 노출" })).toBeInTheDocument();
    });

    it("회원 탈퇴 화면에서 계정 메뉴를 다시 누르면 계정 설정으로 돌아온다", async () => {
      const { user } = renderPersonal(<SettingsView excludedUrls={EXCLUDED_URLS} />);
      await user.click(screen.getByRole("button", { name: "계정" }));
      await user.click(screen.getByRole("button", { name: "회원 탈퇴" }));
      expect(screen.getByRole("heading", { name: "마지막으로 확인해 주세요" })).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "계정" }));
      expect(screen.queryByRole("heading", { name: "마지막으로 확인해 주세요" })).not.toBeInTheDocument();
      expect(screen.getByText("연결된 계정")).toBeInTheDocument();
    });

    it("탈퇴 화면의 '← 계정 설정으로' 로 계정 설정에 돌아온다", async () => {
      const { user } = renderPersonal(<SettingsView excludedUrls={EXCLUDED_URLS} />);
      await user.click(screen.getByRole("button", { name: "계정" }));
      await user.click(screen.getByRole("button", { name: "회원 탈퇴" }));
      await user.click(screen.getByRole("button", { name: "← 계정 설정으로" }));
      expect(screen.getByText("연결된 계정")).toBeInTheDocument();
    });
  });

  describe("수집 제외 URL 목록", () => {
    it("도메인별로 묶고, 켜진 항목이 있는 묶음이 위 · 묶음 안에서는 상위 도메인이 먼저 온다", () => {
      renderPersonal(<SettingsView excludedUrls={EXCLUDED_URLS} />);
      expect(shownUrls()).toEqual([
        "instagram.com",
        "mail.google.com",
        "youtube.com/shorts",
        "tiktok.com",
        "tistory.com",
        "tistory.com/feed",
        "tistory.com/skin",
        "naver.com/blog",
        "twitter.com", // 꺼진 항목만 있는 묶음은 맨 아래
      ]);
      // 2개 이상인 도메인만 머리글(도메인 + 개수)을 단다
      const heads = Array.from(document.querySelectorAll(".exGroupHead"));
      expect(heads).toHaveLength(1);
      expect(heads[0]).toHaveTextContent("tistory.com3");
    });

    it("켜진 항목은 체크, 꺼진 항목은 체크 해제로 보인다", () => {
      renderPersonal(<SettingsView excludedUrls={EXCLUDED_URLS} />);
      expect(within(row("instagram.com")).getByRole("checkbox")).toBeChecked();
      expect(within(row("twitter.com")).getByRole("checkbox")).not.toBeChecked();
    });

    it("체크박스를 누르면 켜짐/꺼짐이 바뀌고 그 값을 저장한다", async () => {
      const { user } = renderPersonal(<SettingsView excludedUrls={EXCLUDED_URLS} />);
      await user.click(within(row("twitter.com")).getByRole("checkbox"));
      expect(within(row("twitter.com")).getByRole("checkbox")).toBeChecked();
      await user.click(within(row("instagram.com")).getByRole("checkbox"));
      expect(within(row("instagram.com")).getByRole("checkbox")).not.toBeChecked();

      await waitFor(() => expect(saved).toHaveLength(2));
      expect(saved).toContainEqual({
        method: "PATCH",
        path: "/settings/collection/excluded-urls/selections",
        body: { excludedUrlIds: [4], isExcluded: true },
      });
      expect(saved).toContainEqual({
        method: "PATCH",
        path: "/settings/collection/excluded-urls/selections",
        body: { excludedUrlIds: [1], isExcluded: false },
      });
    });

    it("체크 저장에 실패하면 원래 값으로 돌아가고 서버 문구를 토스트로 보여준다", async () => {
      server.use(http.patch(SELECTIONS, () => fail(404, "수집 제외 URL을 찾을 수 없습니다.")));
      const { user } = renderPersonal(<SettingsView excludedUrls={EXCLUDED_URLS} />);
      await user.click(within(row("instagram.com")).getByRole("checkbox"));

      expect(await screen.findByText("수집 제외 URL을 찾을 수 없습니다.")).toBeInTheDocument();
      expect(within(row("instagram.com")).getByRole("checkbox")).toBeChecked();
    });

    it("기본 항목은 '기본' 배지만 있고 삭제할 수 없다", () => {
      renderPersonal(<SettingsView excludedUrls={EXCLUDED_URLS} />);
      expect(within(row("instagram.com")).getByText("기본")).toBeInTheDocument();
      expect(within(row("instagram.com")).queryByRole("button", { name: "삭제" })).not.toBeInTheDocument();
    });

    it("직접 추가한 항목은 삭제 버튼으로 목록에서 지우고 서버에서도 삭제한다", async () => {
      const { user } = renderPersonal(<SettingsView excludedUrls={EXCLUDED_URLS} />);
      await user.click(within(row("naver.com/blog")).getByRole("button", { name: "삭제" }));
      expect(shownUrls()).not.toContain("naver.com/blog");
      expect(shownUrls()).toHaveLength(EXCLUDED_URLS.length - 1);

      await waitFor(() =>
        expect(saved).toEqual([
          { method: "DELETE", path: "/settings/collection/excluded-urls", body: { excludedUrlIds: [9] } },
        ]),
      );
    });

    it("삭제에 실패하면 항목이 돌아오고 서버 문구를 토스트로 보여준다", async () => {
      server.use(http.delete(URLS, () => fail(500, SERVER_ERROR)));
      const { user } = renderPersonal(<SettingsView excludedUrls={EXCLUDED_URLS} />);
      await user.click(within(row("naver.com/blog")).getByRole("button", { name: "삭제" }));

      expect(await screen.findByText(SERVER_ERROR)).toBeInTheDocument();
      expect(shownUrls()).toContain("naver.com/blog");
    });

    it("불러오는 동안에는 안내만 보이고 입력칸 · 빈 상태는 숨긴다", () => {
      renderPersonal(<SettingsView excludedUrls={[]} loading />);
      expect(screen.getByText("불러오는 중…")).toBeInTheDocument();
      expect(screen.queryByPlaceholderText("https://example.com")).not.toBeInTheDocument();
      expect(screen.queryByText("아직 등록한 URL이 없어요")).not.toBeInTheDocument();
    });

    it("목록이 비어 있으면 빈 상태 안내가 보이고, 추가하면 사라진다", async () => {
      const { user } = renderPersonal(<SettingsView excludedUrls={[]} />);
      expect(screen.getByRole("status")).toHaveTextContent("아직 등록한 URL이 없어요");
      expect(urlInput()).toBeInTheDocument();

      await user.type(urlInput(), "example.com");
      await user.click(addBtn());
      await waitFor(() => expect(shownUrls()).toEqual(["example.com"]));
      expect(screen.queryByText("아직 등록한 URL이 없어요")).not.toBeInTheDocument();
    });

    it("불러오기에 실패하면 오류 안내 + 다시 시도 버튼이 보이고, 입력칸 · 목록은 숨긴다", async () => {
      const onRetry = vi.fn();
      const { user } = renderPersonal(
        <SettingsView excludedUrls={[]} error="수집 제외 URL을 불러오지 못했어요." onRetry={onRetry} />,
      );
      expect(screen.getByRole("alert")).toHaveTextContent("수집 제외 URL을 불러오지 못했어요.");
      expect(screen.queryByPlaceholderText("https://example.com")).not.toBeInTheDocument();
      expect(screen.queryByText("아직 등록한 URL이 없어요")).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "다시 시도" }));
      expect(onRetry).toHaveBeenCalledOnce();
    });

    it("다시 불러와 새 목록이 오면 그 목록으로 바뀐다", () => {
      const { rerender } = renderPersonal(<SettingsView excludedUrls={[]} error="불러오지 못했어요." />);
      rerender(<SettingsView excludedUrls={EXCLUDED_URLS} />);
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(shownUrls()).toHaveLength(EXCLUDED_URLS.length);
    });
  });

  describe("수집 제외 URL 추가", () => {
    it("프로토콜 · www. · 끝 슬래시를 떼고 도메인은 소문자로 바꿔 저장하고 켜진 상태로 추가한다", async () => {
      const { user } = renderPersonal(<SettingsView excludedUrls={EXCLUDED_URLS} />);
      await user.type(urlInput(), "https://www.Example.com/path/");
      await user.click(addBtn());

      await waitFor(() => expect(shownUrls()).toContain("example.com/path"));
      expect(saved).toEqual([
        { method: "POST", path: "/settings/collection/excluded-urls", body: { url: "example.com/path" } },
      ]);
      expect(within(row("example.com/path")).getByRole("checkbox")).toBeChecked();
      expect(within(row("example.com/path")).getByRole("button", { name: "삭제" })).toBeInTheDocument();
      expect(urlInput()).toHaveValue("");
    });

    it("Enter 로도 추가된다", async () => {
      const { user } = renderPersonal(<SettingsView excludedUrls={EXCLUDED_URLS} />);
      await user.type(urlInput(), "example.org{Enter}");
      await waitFor(() => expect(shownUrls()).toContain("example.org"));
    });

    it("추가한 항목은 응답의 id 로 체크 · 삭제한다", async () => {
      const { user } = renderPersonal(<SettingsView excludedUrls={EXCLUDED_URLS} />);
      await user.type(urlInput(), "example.org{Enter}");
      await screen.findByText("example.org", { selector: ".exUrl" });
      await user.click(within(row("example.org")).getByRole("checkbox"));

      await waitFor(() => expect(saved.at(-1)?.body).toEqual({ excludedUrlIds: [100], isExcluded: false }));
    });

    it("서버가 거절하면 그 문구를 입력칸 아래에 보여주고 입력값을 남긴다", async () => {
      server.use(http.post(URLS, () => fail(409, "이미 등록된 URL입니다.")));
      const { user } = renderPersonal(<SettingsView excludedUrls={EXCLUDED_URLS} />);
      await user.type(urlInput(), "example.org");
      await user.click(addBtn());

      expect(await screen.findByRole("alert")).toHaveTextContent("이미 등록된 URL입니다.");
      expect(urlInput()).toHaveValue("example.org");
      expect(shownUrls()).toHaveLength(EXCLUDED_URLS.length);
    });

    it("추가 요청이 끝나기 전에 다시 눌러도 한 번만 보낸다", async () => {
      const { user } = renderPersonal(<SettingsView excludedUrls={EXCLUDED_URLS} />);
      await user.type(urlInput(), "example.org{Enter}{Enter}");
      await waitFor(() => expect(shownUrls()).toContain("example.org"));
      expect(saved).toHaveLength(1);
    });

    it("빈 입력으로 추가하면 아무 일도 없다", async () => {
      const { user } = renderPersonal(<SettingsView excludedUrls={EXCLUDED_URLS} />);
      await user.click(addBtn());
      expect(shownUrls()).toHaveLength(EXCLUDED_URLS.length);
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(saved).toEqual([]);
    });

    it("형식이 틀리면 '올바른 URL 형식이 아니에요.' 가 뜨고, 다시 입력하면 사라진다", async () => {
      const { user } = renderPersonal(<SettingsView excludedUrls={EXCLUDED_URLS} />);
      await user.type(urlInput(), "not a url");
      await user.click(addBtn());

      expect(screen.getByRole("alert")).toHaveTextContent("올바른 URL 형식이 아니에요.");
      expect(urlInput()).toHaveAttribute("aria-invalid", "true");
      expect(shownUrls()).toHaveLength(EXCLUDED_URLS.length);

      await user.type(urlInput(), "x");
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(urlInput()).not.toHaveAttribute("aria-invalid");
    });

    it("정규화하면 이미 있는 URL 이면 '이미 등록된 URL입니다.' 가 뜨고 추가되지 않는다", async () => {
      const { user } = renderPersonal(<SettingsView excludedUrls={EXCLUDED_URLS} />);
      await user.type(urlInput(), "https://www.instagram.com/");
      await user.click(addBtn());

      expect(screen.getByRole("alert")).toHaveTextContent("이미 등록된 URL입니다.");
      expect(shownUrls().filter((u) => u === "instagram.com")).toHaveLength(1);
      expect(saved).toEqual([]);
    });

    it("이미 100개면 더 추가하지 못한다", async () => {
      const full: ExcludedUrl[] = Array.from({ length: 100 }, (_, i) => ({ id: i + 1, url: `site${i}.com`, on: true, isDefault: false }));
      const { user } = renderPersonal(<SettingsView excludedUrls={full} />);
      await user.type(urlInput(), "example.com");
      await user.click(addBtn());

      expect(screen.getByRole("alert")).toHaveTextContent("URL은 최대 100개까지 등록할 수 있습니다.");
      expect(shownUrls()).toHaveLength(100);
    });
  });

  describe("확장 프로그램", () => {
    it("설정값이 없으면 세 토글이 모두 켜진 상태로 시작하고, 누르면 각각 꺼졌다 켜진다", async () => {
      const { user } = renderPersonal(<SettingsView excludedUrls={EXCLUDED_URLS} />);
      await user.click(screen.getByRole("button", { name: "확장 프로그램" }));

      for (const name of ["확장 프로그램 팝업 노출", "자동 종료 알림", "우클릭 컨텍스트 메뉴"]) {
        const sw = screen.getByRole("switch", { name });
        expect(sw).toHaveAttribute("aria-checked", "true");
        await user.click(sw);
        expect(sw).toHaveAttribute("aria-checked", "false");
        await user.click(sw);
        expect(sw).toHaveAttribute("aria-checked", "true");
      }
    });

    it("토글 하나를 꺼도 나머지는 그대로다", async () => {
      const { user } = renderPersonal(<SettingsView excludedUrls={EXCLUDED_URLS} />);
      await user.click(screen.getByRole("button", { name: "확장 프로그램" }));
      await user.click(screen.getByRole("switch", { name: "자동 종료 알림" }));

      expect(screen.getByRole("switch", { name: "자동 종료 알림" })).toHaveAttribute("aria-checked", "false");
      expect(screen.getByRole("switch", { name: "확장 프로그램 팝업 노출" })).toHaveAttribute("aria-checked", "true");
      expect(screen.getByRole("switch", { name: "우클릭 컨텍스트 메뉴" })).toHaveAttribute("aria-checked", "true");
    });

    it("불러온 값으로 시작한다", async () => {
      const { user } = renderPersonal(
        <SettingsView
          excludedUrls={EXCLUDED_URLS}
          extension={{ popupVisible: false, autoEndNotificationEnabled: true, manualScrapEnabled: false }}
        />,
      );
      await user.click(screen.getByRole("button", { name: "확장 프로그램" }));

      expect(screen.getByRole("switch", { name: "확장 프로그램 팝업 노출" })).toHaveAttribute("aria-checked", "false");
      expect(screen.getByRole("switch", { name: "자동 종료 알림" })).toHaveAttribute("aria-checked", "true");
      expect(screen.getByRole("switch", { name: "우클릭 컨텍스트 메뉴" })).toHaveAttribute("aria-checked", "false");
    });

    it.each([
      ["확장 프로그램 팝업 노출", "popup-visible"],
      ["자동 종료 알림", "auto-end-notification"],
      ["우클릭 컨텍스트 메뉴", "manual-scrap"],
    ])("%s 토글은 %s 경로로 저장한다", async (name, path) => {
      const { user } = renderPersonal(<SettingsView excludedUrls={EXCLUDED_URLS} />);
      await user.click(screen.getByRole("button", { name: "확장 프로그램" }));
      await user.click(screen.getByRole("switch", { name }));

      await waitFor(() =>
        expect(saved).toEqual([{ method: "PATCH", path: `/settings/extension/${path}`, body: { enabled: false } }]),
      );
    });

    it("저장에 실패하면 원래 값으로 돌아가고 서버 문구를 토스트로 보여준다", async () => {
      server.use(http.patch(`${EXTENSION}/:toggle`, () => fail(500, SERVER_ERROR)));
      const { user } = renderPersonal(<SettingsView excludedUrls={EXCLUDED_URLS} />);
      await user.click(screen.getByRole("button", { name: "확장 프로그램" }));
      await user.click(screen.getByRole("switch", { name: "자동 종료 알림" }));

      expect(await screen.findByText(SERVER_ERROR)).toBeInTheDocument();
      expect(screen.getByRole("switch", { name: "자동 종료 알림" })).toHaveAttribute("aria-checked", "true");
    });

    it("불러오는 중에는 안내만, 실패하면 오류 + 다시 시도가 보이고 토글은 숨긴다", async () => {
      const onRetry = vi.fn();
      const { user, rerender } = renderPersonal(<SettingsView excludedUrls={EXCLUDED_URLS} extensionLoading />);
      await user.click(screen.getByRole("button", { name: "확장 프로그램" }));
      expect(screen.getByText("불러오는 중…")).toBeInTheDocument();
      expect(screen.queryByRole("switch")).not.toBeInTheDocument();

      rerender(<SettingsView excludedUrls={EXCLUDED_URLS} extensionError="설정을 불러오지 못했어요." onRetryExtension={onRetry} />);
      expect(screen.getByRole("alert")).toHaveTextContent("설정을 불러오지 못했어요.");
      expect(screen.queryByRole("switch")).not.toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "다시 시도" }));
      expect(onRetry).toHaveBeenCalledOnce();
    });
  });
});
