// 실제 응답 모양(URL_ONLY)으로 프로필 → 카드 → 팝업 → 전체 마인드맵 · 공유 세션까지 이어 본다.
import { screen, within } from "@testing-library/react";
import { http } from "msw";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { API_CONTENT_SESSION, API_MINDMAP, API_PROFILE, apiCard } from "@/test/fixtures/profile";
import { API, ok, server } from "@/test/msw/server";
import { renderPersonal } from "@/test/render";
import { mockRouter } from "@/test/router";
import { OtherProfile } from "./OtherProfile";

vi.mock("@/components/mindmap/MindmapPreview", async () => {
  const { createElement } = await import("react");
  return { MindmapPreview: ({ children }: { children?: ReactNode }) => createElement("div", null, children) };
});

/** 모달 관련 세션 응답 — URL_ONLY 면 title 이 "" */
const RELATED = [
  {
    id: 31,
    title: "",
    startedAt: "2026-10-20T20:10:00",
    endedAt: "2026-10-20T20:55:00",
    pageCount: 4,
    status: "COMPLETED" as const,
    isFavorite: false,
    isPublic: true,
    tags: ["놀이"],
  },
];

function serve(profile = API_PROFILE, cards = [apiCard()]) {
  server.use(
    http.get(`${API}/community/profiles/7`, () => ok(profile)),
    http.get(`${API}/community/profiles/7/mindmaps`, () => ok({ mindmaps: cards, hasNext: false })),
    http.get(`${API}/community/mindmaps/31/sessions`, () => ok({ sessions: RELATED })),
    http.get(`${API}/community/profiles/7/mindmap`, () => ok(API_MINDMAP)),
  );
}

describe("URL 만 공개한 사용자의 프로필", () => {
  beforeEach(() => {
    vi.spyOn(window, "requestAnimationFrame").mockReturnValue(0);
    serve();
  });

  const openCard = async (user: ReturnType<typeof renderPersonal>["user"]) => {
    await user.click(await screen.findByText("#놀이 #사료"));
    return screen.getByRole("dialog", { name: "#놀이 #사료" });
  };

  it("카드 제목 자리에 해시태그가 보이고 태그 줄에 또 찍히지 않는다", async () => {
    renderPersonal(<OtherProfile id="7" />);

    const title = await screen.findByText("#놀이 #사료");
    expect(title).toHaveClass("title");
    const card = title.closest<HTMLElement>('[role="button"]')!;
    expect(within(card).queryByText("#놀이")).not.toBeInTheDocument();
    expect(card).toHaveAccessibleName(/#놀이 #사료/);
  });

  it("해시태그도 없는 카드는 안내 문구가 제목 자리에 보인다", async () => {
    serve(API_PROFILE, [apiCard({ hashtags: [] })]);
    renderPersonal(<OtherProfile id="7" />);

    expect(await screen.findByText("원문 링크만 공개된 세션")).toBeInTheDocument();
  });

  it("상세 팝업은 해시태그를 제목과 접근성 이름으로 쓰고, 세션 행은 안내 문구를 보여준다", async () => {
    const { user } = renderPersonal(<OtherProfile id="7" />);

    const dialog = await openCard(user);

    expect(within(dialog).getByText("#놀이 #사료")).toBeInTheDocument();
    expect(await within(dialog).findByText("원문 링크만 공개된 세션")).toBeInTheDocument();
    expect(dialog.querySelector(".tags")?.children).toHaveLength(0);
  });

  it("전체 마인드맵의 URL 노드는 사이트 이름으로 보이고 해시태그 여럿에 이어져도 · 연결이 없어도 원문이 열린다", async () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    const { user } = renderPersonal(<OtherProfile id="7" />);
    const dialog = await openCard(user);
    await within(dialog).findByText("· 1개");

    await user.click(within(dialog).getByRole("button", { name: "마인드맵 크게 보기" }));
    const full = await screen.findByRole("dialog", { name: "냥집사님의 전체 마인드맵" });
    const node = (label: string) => within(full).getByText(label).closest("g")!;

    await user.click(node("nightjet.com")); // 태그 2개
    expect(open).toHaveBeenLastCalledWith("https://www.nightjet.com/en", "_blank", "noopener,noreferrer");
    await user.click(node("cd.cz")); // 태그 1개
    expect(open).toHaveBeenLastCalledWith("https://www.cd.cz/en/", "_blank", "noopener,noreferrer");
    await user.click(node("example.com")); // 연결 없음
    expect(open).toHaveBeenLastCalledWith("https://example.com/no-tags", "_blank", "noopener,noreferrer");

    open.mockClear();
    await user.click(node("놀이")); // 해시태그 노드는 URL 이 없다
    expect(open).not.toHaveBeenCalled();
    expect(within(full).queryByText(/https?:\/\//)).not.toBeInTheDocument();
  });

  it("공유 세션 카드는 제목 자리에 해시태그가 보이고 누르면 세션 상세로 이동한다", async () => {
    const { user } = renderPersonal(<OtherProfile id="7" />);

    await user.click(await screen.findByRole("button", { name: "세션 (2)" }));
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual([
      "#놀이 #사료",
      "원문 링크만 공개된 세션",
    ]);
    // 제목 자리에 쓴 해시태그를 태그 줄에 또 찍지 않는다
    expect(document.querySelector(".sessionGrid .tags")?.children).toHaveLength(0);

    await user.click(screen.getByRole("button", { name: /#놀이 #사료/ }));
    expect(mockRouter.push).toHaveBeenCalledWith("/sessions/31");
  });

  it("해시태그가 없는 공유 세션도 누르면 세션 상세로 이동한다", async () => {
    const { user } = renderPersonal(<OtherProfile id="7" />);

    await user.click(await screen.findByRole("button", { name: "세션 (2)" }));
    await user.click(screen.getByRole("button", { name: /원문 링크만 공개된 세션/ }));

    expect(mockRouter.push).toHaveBeenCalledWith("/sessions/32");
  });

  it("CONTENT 세션은 제목과 태그가 그대로 보인다", async () => {
    serve({ ...API_PROFILE, visibility: "CONTENT", pinnedSessions: [API_CONTENT_SESSION] });
    const { user } = renderPersonal(<OtherProfile id="7" />);

    await user.click(await screen.findByRole("button", { name: "세션 (1)" }));

    expect(screen.getByRole("heading", { level: 3, name: "로마 3박 4일 동선" })).toBeInTheDocument();
    expect(screen.getByText("#로마")).toBeInTheDocument();
  });

  it("닉네임이 null 이면 대체 이름을 보여주고 빈 핸들 자리는 그리지 않는다", async () => {
    serve({ ...API_PROFILE, nickname: null, bio: null });
    renderPersonal(<OtherProfile id="7" />);

    expect(await screen.findByRole("heading", { level: 1, name: "이름 없는 사용자" })).toBeInTheDocument();
    expect(document.querySelector(".handle")).toBeNull();
    expect(document.querySelector(".bio")).toBeNull();
  });
});
