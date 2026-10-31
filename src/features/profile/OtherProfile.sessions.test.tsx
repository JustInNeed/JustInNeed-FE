// 다른 사용자 프로필의 세션 탭 — 공개 세션 전부를 따로 받아, 실패해도 프로필은 그대로 보인다.
import { screen, within } from "@testing-library/react";
import { http } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { CommunitySharedSession } from "@/lib/api";
import { API_CONTENT_SESSION, API_PROFILE, API_SHARED_SESSIONS, apiCard } from "@/test/fixtures/profile";
import { API, SERVER_ERROR, fail, ok, server } from "@/test/msw/server";
import { renderPersonal } from "@/test/render";
import { mockRouter } from "@/test/router";
import { OtherProfile } from "./OtherProfile";

vi.mock("@/components/mindmap/MindmapPreview", async () => {
  const { createElement } = await import("react");
  return { MindmapPreview: ({ children }: { children?: ReactNode }) => createElement("div", null, children) };
});

const SESSIONS_URL = `${API}/community/profiles/7/shared-sessions`;
const PIN = "핀고정됨";

const titled = (id: number, title: string, isPinned = false): CommunitySharedSession => ({ ...API_CONTENT_SESSION, id, title, isPinned });
const PINNED = titled(1, "고정한 세션", true);
const PLAIN = titled(2, "고정하지 않은 세션");
const LATER = titled(3, "다음 페이지 세션");

function serveProfile(profile = API_PROFILE, cards = [apiCard()]) {
  server.use(
    http.get(`${API}/community/profiles/7`, () => ok(profile)),
    http.get(`${API}/community/profiles/7/mindmaps`, () => ok({ mindmaps: cards, hasNext: false })),
  );
}

/** 페이지 번호별 응답. 세션 목록 요청의 쿼리 문자열을 모은다 */
function serveSessions(...pages: CommunitySharedSession[][]) {
  const queries: string[] = [];
  server.use(
    http.get(SESSIONS_URL, ({ request }) => {
      const url = new URL(request.url);
      queries.push(url.search);
      const page = Number(url.searchParams.get("page"));
      return ok({ sessions: pages[page], hasNext: page + 1 < pages.length });
    }),
  );
  return queries;
}

const openTab = async (user: ReturnType<typeof renderPersonal>["user"], count = API_PROFILE.sharedSessionCount) =>
  user.click(await screen.findByRole("button", { name: `세션 (${count})` }));
const sessionCard = async (title: string) =>
  (await screen.findByRole("heading", { level: 3, name: title })).closest<HTMLElement>('[role="button"]')!;
const titles = () => screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
const stat = (label: string) => screen.getByText(label, { selector: ".statL" }).previousElementSibling?.textContent;

describe("다른 사용자 프로필 세션 탭", () => {
  it("핀고정한 세션만이 아니라 공개 세션 전부를 응답 순서대로 보여준다", async () => {
    serveProfile();
    const queries = serveSessions([PINNED, PLAIN]);
    const { user } = renderPersonal(<OtherProfile id="7" />);

    await openTab(user);
    await sessionCard(PLAIN.title!);

    expect(titles()).toEqual([PINNED.title, PLAIN.title]);
    expect(queries).toEqual(["?page=0&size=12"]);
  });

  it("서버가 아직 pinnedSessions 를 보내도 읽지 않는다", async () => {
    serveProfile({ ...API_PROFILE, pinnedSessions: [titled(9, "옛 핀 세션")] } as typeof API_PROFILE);
    serveSessions([PLAIN]);
    const { user } = renderPersonal(<OtherProfile id="7" />);

    await openTab(user);
    await sessionCard(PLAIN.title!);

    expect(screen.queryByText("옛 핀 세션")).not.toBeInTheDocument();
  });

  it("핀 표시는 고정한 세션에만 붙고 비공개 표시는 붙지 않는다", async () => {
    serveProfile();
    serveSessions([PINNED, PLAIN]);
    const { user } = renderPersonal(<OtherProfile id="7" />);

    await openTab(user);

    expect(within(await sessionCard(PINNED.title!)).getByRole("img", { name: PIN })).toBeInTheDocument();
    expect(within(await sessionCard(PLAIN.title!)).queryByRole("img", { name: PIN })).not.toBeInTheDocument();
    expect(screen.queryByText("비공개")).not.toBeInTheDocument();
  });

  it("마인드맵 탭도 고정한 카드에만 핀 표시가 붙는다", async () => {
    serveProfile(API_PROFILE, [apiCard({ mindmapId: 1, title: "고정한 카드", isPinned: true }), apiCard({ mindmapId: 2, title: "그냥 카드" })]);
    serveSessions([]);
    renderPersonal(<OtherProfile id="7" />);
    const cardOf = async (title: string) => (await screen.findByText(title)).closest<HTMLElement>('[role="button"]')!;

    expect(within(await cardOf("고정한 카드")).getByRole("img", { name: PIN })).toBeInTheDocument();
    expect(within(await cardOf("그냥 카드")).queryByRole("img", { name: PIN })).not.toBeInTheDocument();
  });

  it("세션 수는 받은 목록 길이가 아니라 응답의 sharedSessionCount 다", async () => {
    serveProfile({ ...API_PROFILE, sharedSessionCount: 25 });
    serveSessions([PINNED, PLAIN]);
    const { user } = renderPersonal(<OtherProfile id="7" />);

    await openTab(user, 25);
    await sessionCard(PLAIN.title!);

    expect(screen.getByRole("button", { name: "세션 (25)" })).toBeInTheDocument();
    expect(stat("공유 세션")).toBe("25");
  });

  it("더 보기를 누르면 2페이지를 이어 붙이고, 겹치는 세션은 한 번만 보인다", async () => {
    serveProfile();
    const queries = serveSessions([PINNED, PLAIN], [PLAIN, LATER]);
    const { user } = renderPersonal(<OtherProfile id="7" />);

    await openTab(user);
    await sessionCard(PLAIN.title!);
    await user.click(screen.getByRole("button", { name: "더 보기" }));
    await sessionCard(LATER.title!);

    expect(titles()).toEqual([PINNED.title, PLAIN.title, LATER.title]);
    expect(queries).toEqual(["?page=0&size=12", "?page=1&size=12"]);
    expect(screen.queryByRole("button", { name: "더 보기" })).not.toBeInTheDocument();
  });

  it("세션을 못 받아도 프로필 · 마인드맵은 그대로이고 세션 탭에서 다시 시도한다", async () => {
    serveProfile(API_PROFILE, [apiCard({ title: "멀쩡한 카드" })]);
    server.use(http.get(SESSIONS_URL, () => fail(500, SERVER_ERROR)));
    const { user } = renderPersonal(<OtherProfile id="7" />);

    expect(await screen.findByText("멀쩡한 카드")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "냥집사" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    await openTab(user);
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("세션을 불러오지 못했어요.");

    serveSessions([PINNED]);
    await user.click(within(alert).getByRole("button", { name: "다시 시도" }));

    await sessionCard(PINNED.title!);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("다음 페이지를 못 받아도 받은 세션은 그대로이고 그 페이지만 다시 받는다", async () => {
    serveProfile();
    const requested: (string | null)[] = [];
    let broken = true;
    server.use(
      http.get(SESSIONS_URL, ({ request }) => {
        const page = new URL(request.url).searchParams.get("page");
        requested.push(page);
        if (page === "1" && broken) return fail(500, SERVER_ERROR);
        return page === "0" ? ok({ sessions: [PINNED], hasNext: true }) : ok({ sessions: [LATER], hasNext: false });
      }),
    );
    const { user } = renderPersonal(<OtherProfile id="7" />);

    await openTab(user);
    await sessionCard(PINNED.title!);
    await user.click(screen.getByRole("button", { name: "더 보기" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("세션을 더 불러오지 못했어요.");
    expect(titles()).toEqual([PINNED.title]);

    broken = false;
    await user.click(within(alert).getByRole("button", { name: "다시 시도" }));

    await sessionCard(LATER.title!);
    expect(requested).toEqual(["0", "1", "1"]);
  });

  it("URL 만 공개한 세션은 제목 자리에 해시태그, 없으면 안내 문구가 보이고 핀 표시는 그대로다", async () => {
    serveProfile();
    serveSessions(API_SHARED_SESSIONS);
    const { user } = renderPersonal(<OtherProfile id="7" />);

    await openTab(user);

    const card = await sessionCard("#놀이 #사료");
    expect(within(card).getByRole("img", { name: PIN })).toBeInTheDocument();
    expect(within(await sessionCard("원문 링크만 공개된 세션")).queryByRole("img", { name: PIN })).not.toBeInTheDocument();
    expect(card.querySelector(".tags")?.children).toHaveLength(0);
  });

  it.each([
    ["고정한", PINNED],
    ["고정하지 않은", PLAIN],
  ])("%s 세션을 누르면 그 세션 상세로 이동한다", async (_, target) => {
    serveProfile();
    serveSessions([PINNED, PLAIN]);
    const { user } = renderPersonal(<OtherProfile id="7" />);

    await openTab(user);
    await user.click(await sessionCard(target.title!));

    expect(mockRouter.push).toHaveBeenCalledWith(`/sessions/${target.id}`);
  });

  it("공개 세션이 없으면 빈 상태가 보인다", async () => {
    serveProfile({ ...API_PROFILE, sharedSessionCount: 0 });
    serveSessions([]);
    const { user } = renderPersonal(<OtherProfile id="7" />);

    await openTab(user, 0);

    expect(await screen.findByText("공유한 세션이 없어요.")).toBeInTheDocument();
  });
});
