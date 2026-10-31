import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { http } from "msw";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import SessionDetailPage from "@/app/(personal)/sessions/[id]/page";
import { ToastProvider } from "@/lib/app/ToastContext";
import { OLD_EDITED_DETAIL, PARIS_DETAIL, ROME_DETAIL } from "@/test/fixtures/sessions";
import { API, SERVER_ERROR, fail, ok, server } from "@/test/msw/server";
import { renderPersonal } from "@/test/render";
import { mockRouter } from "@/test/router";
import { SessionDetail } from "./SessionDetail";
import { gate, renderDetail, serveSession } from "./sessionDetailTestUtils";

const isFilled = (el: HTMLElement) => el.querySelector("path")?.getAttribute("fill") === "currentColor";

/** 제목 아래 해시태그 (드래그 가능한 칩) */
const tagChips = () => screen.queryAllByTitle("드래그로 순서 변경");
const tagTexts = () => tagChips().map((c) => c.textContent);

const ROME_TAGS = ["#로마", "#콜로세움", "#바티칸", "#먹거리"];
/** 백엔드 ErrorCode.INVALID_HASHTAG */
const INVALID_HASHTAG = "해시태그는 한글, 영문, 숫자만 사용할 수 있으며 최대 10자까지 입력 가능합니다.";

describe("세션 상세 — 보기", () => {
  it("불러오는 동안 안내가 보이고, 받아 오면 제목이 보인다", async () => {
    serveSession();
    renderPersonal(<SessionDetail sessionId={9001} />);
    expect(screen.getByText("불러오는 중…")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { level: 1, name: "로마 3박 4일 동선 짜기" })).toBeInTheDocument();
  });

  it("시작 → 종료 시각, 걸린 시간, 페이지 수, 분석 상태가 보인다", async () => {
    await renderDetail();
    expect(screen.getByText("2026-04-26 21:14 → 22:48")).toBeInTheDocument();
    expect(screen.getByText("1시간 34분")).toBeInTheDocument();
    expect(screen.getByText("18개 페이지")).toBeInTheDocument();
    expect(screen.getByText("분석 완료")).toBeInTheDocument();
  });

  it("해시태그가 # 를 붙여 순서대로 보이고, 하나씩 지우는 버튼이 있다", async () => {
    await renderDetail();
    expect(tagTexts()).toEqual(ROME_TAGS);
    for (const t of ROME_TAGS) expect(screen.getByRole("button", { name: `${t} 삭제` })).toBeInTheDocument();
  });

  it("즐겨찾기 별은 채워져 있고, 비공개 세션이면 '비공개' 로 보인다", async () => {
    await renderDetail();
    expect(isFilled(screen.getByRole("button", { name: "즐겨찾기" }))).toBe(true);
    const visibility = screen.getByRole("button", { name: "비공개" });
    expect(visibility).toHaveAttribute("title", "비공개 — 클릭하여 공개로");
    expect(visibility).not.toHaveClass("active");
  });

  it("본문 마크다운의 ## 소제목과 굵은 글씨가 그대로 그려진다", async () => {
    await renderDetail();
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      "한눈에 보기",
      "1일차 · 고대 로마",
      "2일차 · 바티칸",
      "먹거리",
    ]);
    expect(screen.getByText("고대 로마 → 바티칸 → 트라스테베레").tagName).toBe("STRONG");
    expect(screen.getByText("오전 첫 타임 예약이 가장 덜 붐빈다.").tagName).toBe("LI");
  });

  it("출처마다 제목(없으면 도메인) · 도메인 · 원문 링크가 보이고 원문은 새 탭으로 연다", async () => {
    await renderDetail();
    expect(screen.getByRole("heading", { name: "출처 (3)" })).toBeInTheDocument();
    const rows = Array.from(document.querySelectorAll<HTMLElement>(".source"));
    expect(rows.map((r) => [r.querySelector(".sourceHost")?.textContent, r.querySelector(".sourceMeta span")?.textContent])).toEqual([
      ["콜로세움 통합권 예매 안내", "coopculture.it"],
      ["바티칸 박물관 예약", "tickets.museivaticani.va"],
      ["blog.naver.com", "blog.naver.com"],
    ]);
    expect(rows.map((r) => r.querySelector(".favicon")?.textContent)).toEqual(["CO", "TI", "BL"]);

    const links = screen.getAllByRole("button", { name: "원문 열기" }).map((b) => b.closest("a")!);
    expect(links.map((a) => a.getAttribute("href"))).toEqual(ROME_DETAIL.sources.map((s) => s.url));
    for (const a of links) {
      expect(a).toHaveAttribute("target", "_blank");
      expect(a).toHaveAttribute("rel", "noreferrer");
    }
  });

  it("출처마다 방문 시각이 보이고, 값이 없으면 시각 자리를 비운다", async () => {
    await renderDetail();
    const meta = Array.from(document.querySelectorAll<HTMLElement>(".sourceMeta"), (m) =>
      Array.from(m.children, (c) => c.textContent),
    );
    expect(meta).toEqual([
      ["coopculture.it", "2026-04-26 21:16"],
      ["tickets.museivaticani.va", "2026-04-26 21:40"],
      ["blog.naver.com"],
    ]);
  });

  it("하이라이트 · 인사이트 화면은 어디에도 없다", async () => {
    await renderDetail();
    expect(screen.queryByText(/하이라이트|인사이트/)).not.toBeInTheDocument();
    expect(document.querySelector("[class*='highlight']")).not.toBeInTheDocument();
  });

  it("편집으로 본문을 비워 저장했으면 '요약 본문이 없습니다.' 가 보인다", async () => {
    await renderDetail({ ...ROME_DETAIL, summary: { markdown: "" } });
    expect(screen.getByText("요약 본문이 없습니다.")).toBeInTheDocument();
  });

});

describe("세션 상세 — 못 여는 경우", () => {
  it("없는 세션(404)이면 '세션을 찾을 수 없어요' 와 세션 목록으로 버튼이 보인다", async () => {
    server.use(http.get(`${API}/sessions/:id`, () => fail(404, "세션을 찾을 수 없습니다.")));
    const { user } = renderPersonal(<SessionDetail sessionId={404} />);
    expect(await screen.findByText("세션을 찾을 수 없어요")).toBeInTheDocument();
    expect(screen.getByText("삭제됐거나 주소가 잘못됐어요.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "세션 목록으로" }));
    expect(mockRouter.push).toHaveBeenCalledWith("/sessions");
  });

  it("권한이 없는 세션(403)이면 '볼 수 없는 세션이에요' 가 보인다", async () => {
    server.use(http.get(`${API}/sessions/:id`, () => fail(403, "비공개 세션이라 볼 수 없어요.")));
    renderPersonal(<SessionDetail sessionId={77} />);
    expect(await screen.findByText("볼 수 없는 세션이에요")).toBeInTheDocument();
    expect(screen.getByText("비공개 세션이라 볼 수 없어요.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "세션 목록으로" })).toBeInTheDocument();
  });

  it("그 밖의 오류면 서버 메시지와 세션 목록으로 버튼이 보인다", async () => {
    server.use(http.get(`${API}/sessions/:id`, () => fail(500, SERVER_ERROR)));
    const { user } = renderPersonal(<SessionDetail sessionId={9001} />);
    expect(await screen.findByText(SERVER_ERROR)).toBeInTheDocument();
    expect(screen.queryByText("세션을 찾을 수 없어요")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "세션 목록으로" }));
    expect(mockRouter.push).toHaveBeenCalledWith("/sessions");
  });

  it("상세 라우트는 주소의 id 로 세션을 불러온다", async () => {
    serveSession(PARIS_DETAIL);
    render(await SessionDetailPage({ params: Promise.resolve({ id: "9003" }) }), { wrapper: ToastProvider });
    expect(await screen.findByRole("heading", { level: 1, name: PARIS_DETAIL.title })).toBeInTheDocument();
  });

  it.each(["abc", "0", "-1", "1.5"])("주소의 id 가 %s 처럼 양의 정수가 아니면 요청 없이 바로 404 화면을 보여 준다", async (id) => {
    const requested: string[] = [];
    const onStart = ({ request }: { request: Request }) => requested.push(request.url);
    server.events.on("request:start", onStart);
    render(await SessionDetailPage({ params: Promise.resolve({ id }) }), { wrapper: ToastProvider });
    expect(screen.getByText("세션을 찾을 수 없어요")).toBeInTheDocument();
    expect(screen.queryByText("불러오는 중…")).not.toBeInTheDocument();

    await new Promise((r) => setTimeout(r, 50));
    server.events.removeListener("request:start", onStart);
    expect(requested).toEqual([]);
    expect(screen.getByText("세션을 찾을 수 없어요")).toBeInTheDocument();
  });
});

describe("세션 상세 — 즐겨찾기 · 공개", () => {
  it("별을 누르면 바로 비워지고 PATCH 에 { isFavorite: false } 를 보낸다", async () => {
    const { user, patches } = await renderDetail();
    const star = screen.getByRole("button", { name: "즐겨찾기" });
    await user.click(star);
    expect(isFilled(star)).toBe(false);
    await waitFor(() => expect(patches).toEqual([{ isFavorite: false }]));
  });

  it("비공개를 누르면 '공개' 로 바뀌고 PATCH 에 { isPublic: true } 를 보낸다", async () => {
    const { user, patches } = await renderDetail();
    await user.click(screen.getByRole("button", { name: "비공개" }));
    const visibility = screen.getByRole("button", { name: "공개" });
    expect(visibility).toHaveClass("active");
    expect(visibility).toHaveAttribute("title", "공개 — 클릭하여 비공개로");
    await waitFor(() => expect(patches).toEqual([{ isPublic: true }]));
  });

  it("공개 세션에서 공개를 누르면 PATCH 에 { isPublic: false } 를 보낸다", async () => {
    const { user, patches } = await renderDetail(PARIS_DETAIL);
    await user.click(screen.getByRole("button", { name: "공개" }));
    expect(screen.getByRole("button", { name: "비공개" })).toBeInTheDocument();
    await waitFor(() => expect(patches).toEqual([{ isPublic: false }]));
  });

  it("저장에 실패하면 원래대로 되돌리고 서버 메시지를 토스트로 띄운다", async () => {
    const g = gate();
    const { user } = await renderDetail(ROME_DETAIL, async () => {
      await g.opened;
      return fail(500, SERVER_ERROR);
    });
    await user.click(screen.getByRole("button", { name: "비공개" }));
    expect(screen.getByRole("button", { name: "공개" })).toBeInTheDocument(); // 응답 전 — 낙관적 반영
    g.open();

    expect(await screen.findByText(SERVER_ERROR)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "비공개" })).toBeInTheDocument();
  });
});

describe("세션 상세 — 해시태그 추가", () => {
  const popover = () => screen.getByText("해시태그 추가").closest<HTMLElement>(".popover")!;
  const input = () => screen.getByPlaceholderText("예: 로마");
  const openPicker = async (user: ReturnType<typeof renderPersonal>["user"]) => {
    await user.click(screen.getByRole("button", { name: "추가" }));
    return popover();
  };

  it("추가를 누르면 입력창에 포커스가 간 팝오버가 열리고 규칙 안내가 보인다", async () => {
    const { user } = await renderDetail();
    const pop = await openPicker(user);
    expect(input()).toHaveFocus();
    expect(within(pop).getByText("Enter로 추가 · 한글/영문/숫자, 최대 10자")).toBeInTheDocument();
    expect(within(pop).getByRole("button", { name: "추가" })).toBeDisabled();
  });

  it("입력하고 Enter 를 누르면 PATCH 에 기존 태그 뒤에 붙인 목록을 보내고 팝오버를 닫는다", async () => {
    const { user, patches } = await renderDetail();
    await openPicker(user);
    await user.type(input(), "트레비{Enter}");

    expect(screen.queryByText("해시태그 추가")).not.toBeInTheDocument();
    expect(tagTexts()).toEqual([...ROME_TAGS, "#트레비"]);
    await waitFor(() => expect(patches).toEqual([{ tags: ["로마", "콜로세움", "바티칸", "먹거리", "트레비"] }]));
  });

  it("앞의 # 와 사이 공백은 빼고 저장하고, 추가 버튼으로도 넣을 수 있다", async () => {
    const { user, patches } = await renderDetail();
    const pop = await openPicker(user);
    await user.type(input(), "#트레비 분수");
    await user.click(within(pop).getByRole("button", { name: "추가" }));
    await waitFor(() => expect(patches).toEqual([{ tags: ["로마", "콜로세움", "바티칸", "먹거리", "트레비분수"] }]));
  });

  it("10자를 넘으면 오류를 보여 주고 저장하지 않는다, 다시 입력하면 오류가 사라진다", async () => {
    const { user, patches } = await renderDetail();
    const pop = await openPicker(user);
    await user.type(input(), "가나다라마바사아자차카{Enter}");
    expect(within(pop).getByText("최대 10자까지 입력할 수 있어요.")).toBeInTheDocument();
    expect(within(pop).queryByText(/Enter로 추가/)).not.toBeInTheDocument();

    await user.type(input(), "{Backspace}");
    expect(within(pop).queryByText("최대 10자까지 입력할 수 있어요.")).not.toBeInTheDocument();
    expect(patches).toEqual([]);
  });

  it("입력창은 12자에서 더 받지 않는다", async () => {
    const { user } = await renderDetail();
    await openPicker(user);
    await user.type(input(), "가나다라마바사아자차카타파하");
    expect(input()).toHaveValue("가나다라마바사아자차카타");
  });

  it("이미 있는 태그면 '이미 추가된 해시태그입니다.' 를 보여 준다", async () => {
    const { user, patches } = await renderDetail();
    const pop = await openPicker(user);
    await user.type(input(), "#로마{Enter}");
    expect(within(pop).getByText("이미 추가된 해시태그입니다.")).toBeInTheDocument();
    expect(patches).toEqual([]);
  });

  it("특수문자가 있으면 한글 · 영문 · 숫자만 된다고 알려 준다", async () => {
    const { user } = await renderDetail();
    const pop = await openPicker(user);
    await user.type(input(), "로마!{Enter}");
    expect(within(pop).getByText("한글·영문·숫자만 사용할 수 있어요.")).toBeInTheDocument();
  });

  it("이미 10개면 더 추가할 수 없다고 알려 준다", async () => {
    const ten = Array.from({ length: 10 }, (_, i) => `태그${i}`);
    const { user } = await renderDetail({ ...ROME_DETAIL, tags: ten });
    const pop = await openPicker(user);
    await user.type(input(), "새태그{Enter}");
    expect(within(pop).getByText("해시태그는 최대 10개까지 추가할 수 있어요.")).toBeInTheDocument();
  });

  it("Esc 를 누르면 저장하지 않고 닫는다", async () => {
    const { user, patches } = await renderDetail();
    await openPicker(user);
    await user.type(input(), "트레비");
    await user.keyboard("{Escape}");
    expect(screen.queryByText("해시태그 추가")).not.toBeInTheDocument();
    expect(patches).toEqual([]);
  });

  it("팝오버 바깥을 누르면 닫히고, 안쪽을 누르면 그대로다", async () => {
    const { user } = await renderDetail();
    const pop = await openPicker(user);
    await user.click(within(pop).getByText("해시태그 추가"));
    expect(screen.getByText("해시태그 추가")).toBeInTheDocument();

    await user.click(screen.getByRole("heading", { level: 1 }));
    expect(screen.queryByText("해시태그 추가")).not.toBeInTheDocument();
  });

  it("취소를 누르면 닫힌다", async () => {
    const { user } = await renderDetail();
    const pop = await openPicker(user);
    await user.click(within(pop).getByRole("button", { name: "취소" }));
    expect(screen.queryByText("해시태그 추가")).not.toBeInTheDocument();
  });

  it("추가 저장에 실패하면 태그를 되돌리고 토스트를 띄운다", async () => {
    const { user } = await renderDetail(ROME_DETAIL, () => fail(400, INVALID_HASHTAG));
    await openPicker(user);
    await user.type(input(), "트레비{Enter}");
    expect(await screen.findByText(INVALID_HASHTAG)).toBeInTheDocument();
    expect(tagTexts()).toEqual(ROME_TAGS);
  });
});

describe("세션 상세 — 해시태그 삭제 · 순서", () => {
  it("× 를 누르면 그 태그만 빠진 목록을 PATCH 로 보낸다", async () => {
    const { user, patches } = await renderDetail();
    await user.click(screen.getByRole("button", { name: "#콜로세움 삭제" }));
    expect(tagTexts()).toEqual(["#로마", "#바티칸", "#먹거리"]);
    await waitFor(() => expect(patches).toEqual([{ tags: ["로마", "바티칸", "먹거리"] }]));
  });

  it("삭제 저장에 실패하면 태그를 되살리고 토스트를 띄운다", async () => {
    const g = gate();
    const { user } = await renderDetail(ROME_DETAIL, async () => {
      await g.opened;
      return fail(500, SERVER_ERROR);
    });
    await user.click(screen.getByRole("button", { name: "#콜로세움 삭제" }));
    expect(tagTexts()).toEqual(["#로마", "#바티칸", "#먹거리"]);
    g.open();

    expect(await screen.findByText(SERVER_ERROR)).toBeInTheDocument();
    expect(tagTexts()).toEqual(ROME_TAGS);
  });

  it("태그를 끌어 다른 태그 위에 놓으면 바뀐 순서로 PATCH 를 보낸다", async () => {
    const { patches } = await renderDetail();
    const [first, , third] = tagChips();
    const dataTransfer = { effectAllowed: "" };
    fireEvent.dragStart(first, { dataTransfer });
    expect(first.style.opacity).toBe("0.4");
    fireEvent.dragOver(third, { dataTransfer });
    expect(third.style.outline).toContain("2px solid");
    fireEvent.drop(third, { dataTransfer });

    expect(tagTexts()).toEqual(["#콜로세움", "#바티칸", "#로마", "#먹거리"]);
    await waitFor(() => expect(patches).toEqual([{ tags: ["콜로세움", "바티칸", "로마", "먹거리"] }]));
  });

  it("제자리에 놓으면 아무 요청도 보내지 않는다", async () => {
    const { patches } = await renderDetail();
    const [first] = tagChips();
    const dataTransfer = { effectAllowed: "" };
    fireEvent.dragStart(first, { dataTransfer });
    fireEvent.drop(first, { dataTransfer });
    expect(first.style.opacity).toBe("1");
    expect(tagTexts()).toEqual(ROME_TAGS);
    expect(patches).toEqual([]);
  });
});

describe("세션 상세 — 삭제", () => {
  function onDelete(respond: () => Response) {
    const ids: string[] = [];
    server.use(
      http.delete(`${API}/sessions/:id`, ({ params }) => {
        ids.push(String(params.id));
        return respond();
      }),
    );
    return ids;
  }

  it("확인창에서 확인하면 DELETE /sessions/{id} 를 보내고 세션 목록으로 간다", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const ids = onDelete(() => ok(null));
    const { user } = await renderDetail();
    await user.click(screen.getByRole("button", { name: "삭제" }));

    expect(confirm).toHaveBeenCalledWith("이 세션을 삭제할까요?");
    await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith("/sessions"));
    expect(ids).toEqual(["9001"]);
  });

  it("확인창에서 취소하면 아무것도 하지 않는다", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const ids = onDelete(() => ok(null));
    const { user } = await renderDetail();
    await user.click(screen.getByRole("button", { name: "삭제" }));
    expect(ids).toEqual([]);
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it("삭제에 실패하면 토스트를 띄우고 화면에 남는다", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    onDelete(() => fail(404, "세션을 찾을 수 없습니다."));
    const { user } = await renderDetail();
    await user.click(screen.getByRole("button", { name: "삭제" }));
    expect(await screen.findByText("세션을 찾을 수 없습니다.")).toBeInTheDocument();
    expect(mockRouter.push).not.toHaveBeenCalled();
  });
});

describe("세션 상세 — 줄글 복사 · .md 다운로드", () => {
  // jsdom 에는 innerText · URL.createObjectURL 이 없어서 테스트 동안만 채워 둔다
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

  const readBlob = (blob: Blob) =>
    new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsText(blob);
    });

  function spyDownload() {
    const create = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:session");
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    return { create, revoke, click };
  }

  it("줄글 복사를 누르면 제목과 본문 글을 클립보드에 넣고 알려 준다", async () => {
    const { user } = await renderDetail();
    const write = vi.spyOn(navigator.clipboard, "writeText");
    await user.click(screen.getByRole("button", { name: "줄글 복사" }));

    expect(write).toHaveBeenCalledOnce();
    const text = write.mock.calls[0][0];
    expect(text.startsWith("로마 3박 4일 동선 짜기\n\n")).toBe(true);
    expect(text).toContain("한눈에 보기");
    expect(text).toContain("트라스테베레의 카초 에 페페");
    expect(text).not.toContain("**"); // 마크다운 기호가 아니라 화면에 보이는 글
    expect(await screen.findByText("줄글을 복사했어요.")).toBeInTheDocument();
  });

  it("본문이 이미 # 제목으로 시작하면 제목을 또 붙이지 않는다", async () => {
    const { user } = await renderDetail(OLD_EDITED_DETAIL);
    const write = vi.spyOn(navigator.clipboard, "writeText");
    await user.click(screen.getByRole("button", { name: "줄글 복사" }));
    expect(write.mock.calls[0][0].startsWith("유레일패스 비교 (옛 제목)")).toBe(true);
    expect(write.mock.calls[0][0]).not.toContain(OLD_EDITED_DETAIL.title);
  });

  it("클립보드에 못 넣으면 다시 시도하라고 알려 준다", async () => {
    const { user } = await renderDetail();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("denied"));
    await user.click(screen.getByRole("button", { name: "줄글 복사" }));
    expect(await screen.findByText("복사하지 못했어요. 다시 시도해 주세요.")).toBeInTheDocument();
  });

  it(".md 다운로드를 누르면 '# 제목' 을 붙인 마크다운을 '제목.md' 로 내려받는다", async () => {
    const { user } = await renderDetail();
    const { create, revoke, click } = spyDownload();
    await user.click(screen.getByRole("button", { name: ".md 파일 다운로드" }));

    const blob = create.mock.calls[0][0] as Blob;
    expect(blob.type).toBe("text/markdown;charset=utf-8");
    expect(await readBlob(blob)).toBe(`# 로마 3박 4일 동선 짜기\n\n${ROME_DETAIL.summary!.markdown}\n`);
    expect(click).toHaveBeenCalledOnce();
    const anchor = click.mock.contexts[0] as HTMLAnchorElement;
    expect(anchor.download).toBe("로마 3박 4일 동선 짜기.md");
    expect(anchor.getAttribute("href")).toBe("blob:session");
    await waitFor(() => expect(revoke).toHaveBeenCalledWith("blob:session"), { timeout: 2000 });
  });

  it("본문이 # 제목으로 시작하면 그대로 내려받는다", async () => {
    const { user } = await renderDetail(OLD_EDITED_DETAIL);
    const { create } = spyDownload();
    await user.click(screen.getByRole("button", { name: ".md 파일 다운로드" }));
    expect(await readBlob(create.mock.calls[0][0] as Blob)).toBe(`${OLD_EDITED_DETAIL.summary!.markdown}\n`);
  });

  it("파일 이름에 못 쓰는 글자는 _ 로 바꾼다", async () => {
    const { user } = await renderDetail(PARIS_DETAIL);
    const { click } = spyDownload();
    await user.click(screen.getByRole("button", { name: ".md 파일 다운로드" }));
    expect((click.mock.contexts[0] as HTMLAnchorElement).download).toBe(
      "파리 미술관 4곳 비교 (루브르_오르세_오랑주리_퐁피두).md",
    );
  });
});
