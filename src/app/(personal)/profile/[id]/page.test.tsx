import { screen, waitFor, within } from "@testing-library/react";
import { http } from "msw";
import type { ReactElement, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MEMBER } from "@/test/fixtures/member";
import { API_PROFILE, apiCard } from "@/test/fixtures/profile";
import { API, SERVER_ERROR, fail, ok, server } from "@/test/msw/server";
import { renderPersonal } from "@/test/render";
import { mockRouter } from "@/test/router";
import OtherProfilePage from "./page";

// 카드 미리보기 그래프는 장식이라 가벼운 div 로 바꾼다
vi.mock("@/components/mindmap/MindmapPreview", async () => {
  const { createElement } = await import("react");
  return { MindmapPreview: ({ children }: { children?: ReactNode }) => createElement("div", null, children) };
});

/** 주소의 [id] 로 페이지가 만든 요소 */
async function page(id: string) {
  return (await OtherProfilePage({ params: Promise.resolve({ id }) })) as ReactElement;
}

/** 프로필 · 카드 요청 횟수와 함께 응답을 등록 */
function serveProfile(profile = API_PROFILE) {
  const calls = { profile: 0, cards: [] as string[] };
  server.use(
    http.get(`${API}/community/profiles/${profile.userId}`, () => {
      calls.profile += 1;
      return ok(profile);
    }),
    http.get(`${API}/community/profiles/${profile.userId}/mindmaps`, ({ request }) => {
      calls.cards.push(new URL(request.url).search);
      return ok({ mindmaps: [apiCard({ title: `${profile.nickname} 카드` })], hasNext: false });
    }),
  );
  return calls;
}

describe("/profile/[id] 페이지", () => {
  beforeEach(() => mockRouter.replace.mockClear());

  it("주소의 id 로 프로필과 카드를 받아 보여준다", async () => {
    const calls = serveProfile();

    renderPersonal(await page("7"));

    expect(screen.getByText("불러오는 중…")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { level: 1, name: "냥집사" })).toBeInTheDocument();
    expect(await screen.findByText("냥집사 카드")).toBeInTheDocument();
    expect(calls.profile).toBe(1);
    expect(calls.cards).toEqual(["?page=0&size=12"]);
  });

  it.each(["wanderlust", "0", "-1", "1.5", "99999999999999999999", encodeURIComponent("여행자")])(
    "숫자 id 가 아닌 주소 %s 는 요청 없이 찾을 수 없다고 보여준다",
    async (id) => {
      // 등록하지 않은 요청이 나가면 테스트가 실패한다
      renderPersonal(await page(id));

      expect(screen.getByRole("status")).toHaveTextContent("프로필을 찾을 수 없어요");
    },
  );

  it("없거나 탈퇴한 사용자(404)면 찾을 수 없다고 보여주고 다시 시도는 없다", async () => {
    server.use(
      http.get(`${API}/community/profiles/7`, () => fail(404, "프로필을 찾을 수 없습니다.")),
      http.get(`${API}/community/profiles/7/mindmaps`, () => fail(404, "프로필을 찾을 수 없습니다.")),
    );

    renderPersonal(await page("7"));

    expect(await screen.findByText("프로필을 찾을 수 없어요")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "다시 시도" })).not.toBeInTheDocument();
  });

  it("프로필을 못 받으면 오류가 보이고 다시 시도하면 프로필이 나온다", async () => {
    server.use(
      http.get(`${API}/community/profiles/7`, () => fail(500, SERVER_ERROR)),
      http.get(`${API}/community/profiles/7/mindmaps`, () => ok({ mindmaps: [], hasNext: false })),
    );
    const { user } = renderPersonal(await page("7"));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("프로필을 불러오지 못했어요.");
    expect(alert).toHaveTextContent(SERVER_ERROR);

    serveProfile();
    await user.click(within(alert).getByRole("button", { name: "다시 시도" }));

    expect(await screen.findByRole("heading", { level: 1, name: "냥집사" })).toBeInTheDocument();
  });

  it("내 id 면 요청 없이 /profile 로 바꿔 보낸다", async () => {
    // 등록하지 않은 요청이 나가면 테스트가 실패한다
    renderPersonal(await page(String(MEMBER.id)));

    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith("/profile"));
    expect(screen.getByText("불러오는 중…")).toBeInTheDocument();
  });

  it("다른 사람 id 면 /profile 로 보내지 않는다", async () => {
    serveProfile();

    renderPersonal(await page("7"));

    await screen.findByRole("heading", { level: 1, name: "냥집사" });
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it("카드를 못 받아도 프로필은 보이고 마인드맵 탭만 다시 시도한다", async () => {
    const { pinnedSessions } = API_PROFILE;
    server.use(
      http.get(`${API}/community/profiles/7`, () => ok(API_PROFILE)),
      http.get(`${API}/community/profiles/7/mindmaps`, () => fail(500, SERVER_ERROR)),
    );
    const { user } = renderPersonal(await page("7"));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("마인드맵을 불러오지 못했어요.");
    expect(screen.getByRole("heading", { level: 1, name: "냥집사" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: `세션 (${pinnedSessions.length})` })).toBeInTheDocument();

    serveProfile();
    await user.click(within(alert).getByRole("button", { name: "다시 시도" }));

    expect(await screen.findByText("냥집사 카드")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("카드가 더 있으면 더 보기로 다음 페이지를 이어 붙이고, 겹치는 카드는 한 번만 보인다", async () => {
    const pages = [
      { mindmaps: [apiCard({ mindmapId: 1, title: "첫 카드" }), apiCard({ mindmapId: 2, title: "둘째 카드" })], hasNext: true },
      { mindmaps: [apiCard({ mindmapId: 2, title: "둘째 카드" }), apiCard({ mindmapId: 3, title: "셋째 카드" })], hasNext: false },
    ];
    server.use(
      http.get(`${API}/community/profiles/7`, () => ok(API_PROFILE)),
      http.get(`${API}/community/profiles/7/mindmaps`, ({ request }) =>
        ok(pages[Number(new URL(request.url).searchParams.get("page"))]),
      ),
    );
    const { user } = renderPersonal(await page("7"));

    await screen.findByText("첫 카드");
    await user.click(screen.getByRole("button", { name: "더 보기" }));

    expect(await screen.findByText("셋째 카드")).toBeInTheDocument();
    expect(screen.getAllByText("둘째 카드")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "더 보기" })).not.toBeInTheDocument();
  });

  it("다음 페이지를 못 받아도 받은 카드는 그대로이고 그 페이지만 다시 받는다", async () => {
    const requested: (string | null)[] = [];
    let broken = true;
    server.use(
      http.get(`${API}/community/profiles/7`, () => ok(API_PROFILE)),
      http.get(`${API}/community/profiles/7/mindmaps`, ({ request }) => {
        const p = new URL(request.url).searchParams.get("page");
        requested.push(p);
        if (p === "1" && broken) return fail(500, SERVER_ERROR);
        return ok({ mindmaps: [apiCard({ mindmapId: Number(p) + 1, title: `카드 ${p}` })], hasNext: p === "0" });
      }),
    );
    const { user } = renderPersonal(await page("7"));

    await screen.findByText("카드 0");
    await user.click(screen.getByRole("button", { name: "더 보기" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("마인드맵을 더 불러오지 못했어요.");
    expect(screen.getByText("카드 0")).toBeInTheDocument();

    broken = false;
    await user.click(within(alert).getByRole("button", { name: "다시 시도" }));

    expect(await screen.findByText("카드 1")).toBeInTheDocument();
    expect(requested).toEqual(["0", "1", "1"]);
  });

  it("다른 사용자 프로필로 이동하면 화면 상태가 새로 시작된다", async () => {
    serveProfile();
    serveProfile({ ...API_PROFILE, userId: 8, nickname: "빵순이", likedByMe: false, following: false, likeCount: 9 });
    const { user, rerender } = renderPersonal(await page("7"));
    await screen.findByRole("heading", { level: 1, name: "냥집사" });
    await user.click(screen.getByRole("button", { name: "#놀이 7" }));
    expect(screen.getByText("1개 선택")).toBeInTheDocument();

    rerender(await page("8"));

    expect(await screen.findByRole("heading", { level: 1, name: "빵순이" })).toBeInTheDocument();
    expect(screen.queryByText(/개 선택$/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "좋아요" })).not.toHaveClass("active");
    expect(screen.getByRole("button", { name: "팔로우" })).toBeInTheDocument();
    expect(screen.getByText("좋아요", { selector: ".statL" }).previousElementSibling).toHaveTextContent("9");
  });
});
