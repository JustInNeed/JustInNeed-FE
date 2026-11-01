import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http } from "msw";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProfilePageData } from "@/lib/viewTypes";
import { MEMBER } from "@/test/fixtures/member";
import {
  API_MINDMAP,
  MY_MINDMAPS,
  MY_PROFILE,
  MY_PROFILE_PAGE,
  MY_SESSIONS,
  OTHER_MINDMAPS,
  OTHER_PROFILE,
  OTHER_PROFILE_PAGE,
} from "@/test/fixtures/profile";
import { API, SERVER_ERROR, fail, ok, server } from "@/test/msw/server";
import { renderPersonal } from "@/test/render";
import { mockRouter } from "@/test/router";
import { ProfileView, type ProfileSessionsSection } from "./ProfileView";

// 카드 · 팝업의 미리보기 그래프는 장식(aria-hidden)이라 가벼운 div 로 바꿔 DOM 을 줄인다 (요소 수천 개 → 쿼리가 느려짐)
vi.mock("@/components/mindmap/MindmapPreview", async () => {
  const { createElement } = await import("react");
  return { MindmapPreview: ({ children }: { children?: ReactNode }) => createElement("div", null, children) };
});

/** 통계 숫자 (노드 · 공유 세션 · 좋아요 · 나도 탐색중) */
function stat(label: string) {
  return screen.getByText(label, { selector: ".statL" }).previousElementSibling?.textContent;
}

function tagRow() {
  return document.querySelector<HTMLElement>(".tagRow")!;
}

/** 세션 탭 카드 제목 (표시 순서) */
function sessionCardTitles() {
  return screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
}

const titleOf = (id: number) => MY_SESSIONS.find((s) => s.id === id)!.title;

/** 다른 사용자 카드의 관련 세션 · 전체 마인드맵 응답 */
function serveDetail() {
  server.use(
    http.get(`${API}/community/mindmaps/:id/sessions`, ({ params }) => {
      const card = OTHER_MINDMAPS.find((m) => m.id === params.id)!;
      return ok({ sessions: card.sessions });
    }),
    http.get(`${API}/community/profiles/7/mindmap`, () => ok(API_MINDMAP)),
  );
}

/** 내 카드의 관련 세션 · 전체 마인드맵 응답 */
function serveMyDetail() {
  server.use(
    http.get(`${API}/community/me/mindmaps/:id/sessions`, ({ params }) => {
      const card = MY_MINDMAPS.find((m) => m.id === params.id)!;
      return ok({ sessions: card.sessions });
    }),
    http.get(`${API}/community/me/mindmap`, () => ok(API_MINDMAP)),
  );
}

const sessionsSection = (over: Partial<ProfileSessionsSection> = {}): ProfileSessionsSection => ({
  loading: false,
  error: null,
  onRetry: vi.fn(),
  hasNext: false,
  onLoadMore: vi.fn(),
  sessions: MY_SESSIONS,
  ...over,
});

const renderMine = (data: ProfilePageData = MY_PROFILE_PAGE, section = sessionsSection()) =>
  renderPersonal(<ProfileView data={data} sessionsSection={section} />);

describe("내 프로필", () => {
  const cardOf = (title: string) => screen.getByText(title).closest<HTMLElement>('[role="button"]')!;
  const sessionCardOf = (id: number) => screen.getByRole("heading", { level: 3, name: titleOf(id) }).closest<HTMLElement>('[role="button"]')!;

  it("이름 · 핸들은 프로필 데이터가 아니라 로그인 회원 닉네임으로 보이고 소개 · 통계가 보인다", () => {
    renderMine();

    expect(screen.getByRole("heading", { level: 1, name: "yesong" })).toBeInTheDocument();
    expect(screen.getByText("@yesong")).toBeInTheDocument();
    expect(screen.queryByText("sprout.kr")).not.toBeInTheDocument();
    expect(screen.getByText(MY_PROFILE.bio)).toBeInTheDocument();
    expect(stat("노드")).toBe("218"); // 비공개 태그의 노드를 빼지 않는다
    expect(stat("공유 세션")).toBe("5"); // 응답의 공개 세션 수 — 핀고정 수가 아니다
    expect(stat("좋아요")).toBe("87");
    expect(screen.queryByText("나도 탐색중")).not.toBeInTheDocument();
  });

  it("자주 쓴 해시태그는 노드 수와 함께, 관심 해시태그는 그 뒤에 보인다", () => {
    renderMine();
    const row = within(tagRow());

    for (const t of MY_PROFILE.topTags) {
      const chip = row.getAllByText(t.tag).find((el) => el.classList.contains("topTag"))!;
      expect(chip.querySelector(".countBadge")).toHaveTextContent(String(t.count));
    }
    for (const h of MY_PROFILE.interests) {
      expect(row.getAllByText(h).some((el) => el.classList.contains("interest"))).toBe(true);
    }
    // 내 프로필 태그는 고르는 버튼이 아니다
    expect(row.queryAllByRole("button")).toHaveLength(0);
  });

  it("비공개 해시태그는 내 프로필에서만 잠금 아이콘과 함께 흐리게 보인다", () => {
    renderMine();
    const row = within(tagRow());

    const privateTag = row.getByText("#예산");
    expect(privateTag).toHaveClass("topTagPrivate");
    expect(privateTag).toHaveAttribute("title", "비공개 · 나만 보여요");
    expect(privateTag.querySelector("svg")).not.toBeNull();

    const publicTag = row.getByText("#파리");
    expect(publicTag).not.toHaveClass("topTagPrivate");
    expect(publicTag.querySelector("svg")).toBeNull();
  });

  it("처음엔 마인드맵 탭이 열려 있고 내 마인드맵 카드가 노드 수와 함께 보인다", () => {
    renderMine();

    expect(screen.getByRole("button", { name: "마인드맵" })).toHaveClass("tabOn");
    expect(screen.getByRole("button", { name: "세션" })).not.toHaveClass("tabOn");
    for (const m of MY_MINDMAPS) {
      expect(screen.getByText(m.title)).toBeInTheDocument();
      expect(screen.getByText(`노드 ${m.nodes}`)).toBeInTheDocument();
    }
    // 카드 태그는 앞의 2개만, 내 프로필이라 비공개(#예산)도 보인다
    const card = screen.getByText("유럽 항공권 · 예산 정리").parentElement!;
    expect(within(card).getByText("#예산")).toBeInTheDocument();
    expect(within(card).getByText("#항공권")).toBeInTheDocument();
    expect(within(screen.getByText("로마 3박 4일 동선").parentElement!).queryByText("#먹거리")).not.toBeInTheDocument();
  });

  it("핀 표시는 고정한 카드에만, 비공개 표시는 비공개 카드에만 보인다", () => {
    renderMine();

    expect(screen.getAllByTitle("핀고정됨")).toHaveLength(2);
    expect(within(cardOf("로마 3박 4일 동선")).getByRole("img", { name: "핀고정됨" })).toBeInTheDocument();
    expect(within(cardOf("유럽 항공권 · 예산 정리")).queryByRole("img", { name: "핀고정됨" })).not.toBeInTheDocument();

    expect(screen.getAllByText("비공개")).toHaveLength(1);
    const mark = within(cardOf("쉥겐 비자 서류")).getByText("비공개");
    expect(mark.querySelector("svg")).not.toBeNull();
    expect(mark).toHaveAttribute("title", "비공개 · 나만 보여요");
  });

  it("세션 탭은 받은 내 세션을 공개 · 비공개 모두 응답 순서대로 보여주고 수를 붙이지 않는다", async () => {
    const { user } = renderMine();

    await user.click(screen.getByRole("button", { name: "세션" }));

    expect(screen.getByRole("button", { name: "세션" })).toHaveClass("tabOn");
    expect(sessionCardTitles()).toEqual(MY_SESSIONS.map((s) => s.title));
  });

  it("세션 카드는 비공개면 비공개 표시, 고정했으면 핀 표시가 붙고 둘 다 아니면 없다", async () => {
    const { user } = renderMine();

    await user.click(screen.getByRole("button", { name: "세션" }));

    expect(within(sessionCardOf(9006)).getByText("비공개").querySelector("svg")).not.toBeNull();
    expect(within(sessionCardOf(9006)).queryByRole("img", { name: "핀고정됨" })).not.toBeInTheDocument();
    expect(within(sessionCardOf(9001)).getByRole("img", { name: "핀고정됨" })).toBeInTheDocument();
    expect(within(sessionCardOf(9001)).queryByText("비공개")).not.toBeInTheDocument();
    expect(within(sessionCardOf(9004)).queryByRole("img", { name: "핀고정됨" })).not.toBeInTheDocument();
    expect(within(sessionCardOf(9004)).queryByText("비공개")).not.toBeInTheDocument();
    expect(screen.getAllByText("비공개")).toHaveLength(2);
  });

  it("세션 카드를 누르면 그 세션 상세로 이동한다", async () => {
    const { user } = renderMine();

    await user.click(screen.getByRole("button", { name: "세션" }));
    await user.click(sessionCardOf(9003));

    expect(mockRouter.push).toHaveBeenCalledWith("/sessions/9003");
  });

  it("세션이 없으면 세션 탭에 빈 상태가 보이고 핀고정 안내는 없다", async () => {
    const { user } = renderMine(MY_PROFILE_PAGE, sessionsSection({ sessions: [] }));

    await user.click(screen.getByRole("button", { name: "세션" }));

    expect(screen.getByRole("status")).toHaveTextContent("아직 세션이 없어요.");
    expect(screen.queryByText(/핀고정하면/)).not.toBeInTheDocument();
  });

  it("세션 탭은 받는 중 · 실패 · 더 보기를 스스로 보여준다", async () => {
    const onRetry = vi.fn();
    const onLoadMore = vi.fn();
    const { user, rerender } = renderMine(MY_PROFILE_PAGE, sessionsSection({ sessions: [], loading: true }));
    await user.click(screen.getByRole("button", { name: "세션" }));
    expect(screen.getByText("불러오는 중…")).toBeInTheDocument();

    rerender(<ProfileView data={MY_PROFILE_PAGE} sessionsSection={sessionsSection({ sessions: [], error: SERVER_ERROR, onRetry })} />);
    expect(screen.getByRole("alert")).toHaveTextContent("세션을 불러오지 못했어요.");
    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(onRetry).toHaveBeenCalledOnce();

    rerender(<ProfileView data={MY_PROFILE_PAGE} sessionsSection={sessionsSection({ hasNext: true, onLoadMore })} />);
    await user.click(screen.getByRole("button", { name: "더 보기" }));
    expect(onLoadMore).toHaveBeenCalledOnce();

    rerender(<ProfileView data={MY_PROFILE_PAGE} sessionsSection={sessionsSection({ error: SERVER_ERROR })} />);
    expect(screen.getByRole("alert")).toHaveTextContent("세션을 더 불러오지 못했어요.");
    expect(sessionCardTitles()).toEqual(MY_SESSIONS.map((s) => s.title)); // 받아 둔 세션은 그대로
  });

  it("마인드맵이 없으면 마인드맵 탭에 빈 상태가 보인다", () => {
    renderMine({ ...MY_PROFILE_PAGE, mindmaps: [] });

    expect(screen.getByRole("status")).toHaveTextContent("아직 마인드맵이 없어요.");
  });

  it("마인드맵 카드를 누르면 내가 작성자인 상세 팝업이 관련 세션과 함께 뜬다", async () => {
    serveMyDetail();
    const { user } = renderMine();

    await user.click(screen.getByText("유럽 항공권 · 예산 정리"));

    const dialog = screen.getByRole("dialog", { name: "유럽 항공권 · 예산 정리" });
    expect(within(dialog).getByRole("button", { name: "🌱 yesong" })).toBeInTheDocument();
    expect(within(dialog).getByText("노드 38")).toBeInTheDocument();
    expect(await within(dialog).findByText("· 2개")).toBeInTheDocument();
    expect(within(dialog).getByText(titleOf(9002))).toBeInTheDocument();
    expect(within(dialog).getByText(titleOf(9004))).toBeInTheDocument();
  });

  it("관련 세션은 내 카드용 주소에서 팝업을 열 때 받고, 실패하면 그 자리에서 다시 시도한다", async () => {
    server.use(http.get(`${API}/community/me/mindmaps/:id/sessions`, () => fail(500, SERVER_ERROR)));
    const { user } = renderMine();

    await user.click(screen.getByText("로마 3박 4일 동선"));
    const dialog = screen.getByRole("dialog", { name: "로마 3박 4일 동선" });
    const alert = await within(dialog).findByRole("alert");
    expect(alert).toHaveTextContent("관련 세션을 불러오지 못했어요.");

    serveMyDetail();
    await user.click(within(alert).getByRole("button", { name: "다시 시도" }));

    expect(await within(dialog).findByText("· 1개")).toBeInTheDocument();
  });

  it("상세 팝업에서 작성자 이름을 누르면 이미 내 프로필이라 팝업만 닫힌다", async () => {
    serveMyDetail();
    const { user } = renderMine();

    await user.click(screen.getByText("로마 3박 4일 동선"));
    await user.click(screen.getByRole("button", { name: "🌱 yesong" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it("마인드맵 크게 보기를 누르면 내 전체 마인드맵을 받아 띄우고, 닫으면 상세 팝업으로 돌아간다", async () => {
    serveMyDetail();
    const { user } = renderMine();

    await user.click(screen.getByText("파리 미술관 투어 지도"));
    await user.click(screen.getByRole("button", { name: "마인드맵 크게 보기" }));

    const full = await screen.findByRole("dialog", { name: "yesong님의 전체 마인드맵" });
    expect(within(full).getByText(`노드 ${API_MINDMAP.hashtags.length + API_MINDMAP.nodes.length}개`)).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "파리 미술관 투어 지도" })).not.toBeInTheDocument();

    await user.click(within(full).getByRole("button", { name: "닫기" }));

    expect(screen.queryByRole("dialog", { name: "yesong님의 전체 마인드맵" })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "파리 미술관 투어 지도" })).toBeInTheDocument();
  });

  it("전체 마인드맵을 못 받으면 팝업에서 다시 시도한다", async () => {
    serveMyDetail();
    server.use(http.get(`${API}/community/me/mindmap`, () => fail(500, SERVER_ERROR)));
    const { user } = renderMine();

    await user.click(screen.getByText("파리 미술관 투어 지도"));
    await user.click(screen.getByRole("button", { name: "마인드맵 크게 보기" }));
    const alert = await screen.findByText("전체 마인드맵을 불러오지 못했어요.");

    serveMyDetail();
    await user.click(within(alert.closest<HTMLElement>('[role="alert"]')!).getByRole("button", { name: "다시 시도" }));

    expect(await screen.findByRole("dialog", { name: "yesong님의 전체 마인드맵" })).toBeInTheDocument();
  });

  it("프로필 수정 옆에 설정 버튼은 없다", () => {
    renderMine();

    expect(screen.getByRole("button", { name: "프로필 수정" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "설정" })).not.toBeInTheDocument();
  });

  it("프로필 수정을 누르면 수정 화면으로 바뀐다", async () => {
    server.use(http.get(`${API}/community/me/sessions`, () => ok({ sessions: [], hasNext: false })));
    const { user } = renderMine();

    await user.click(screen.getByRole("button", { name: "프로필 수정" }));

    expect(screen.getByRole("heading", { level: 1, name: "프로필 수정" })).toBeInTheDocument();
  });
});

describe("다른 사용자 프로필", () => {
  beforeEach(serveDetail);

  const renderOther = (data: ProfilePageData = OTHER_PROFILE_PAGE) =>
    renderPersonal(<ProfileView userId={7} data={data} />);
  const otherTitle = (id: number) => OTHER_PROFILE_PAGE.sessions.find((s) => s.id === id)!.title;
  const cardOf = (title: string) => screen.getByText(title).closest<HTMLElement>('[role="button"]')!;
  const cardTags = (title: string) => within(cardOf(title)).queryAllByText(/^#/).map((el) => el.textContent);
  const HIDDEN = ["#카페", "#슬로우트래블"];
  const expectNoHiddenTags = () => HIDDEN.forEach((t) => expect(screen.queryByText(t)).not.toBeInTheDocument());

  it("그 사람의 이름 · 핸들 · 소개와 좋아요 · 팔로우 버튼이 보이고 프로필 수정은 없다", () => {
    renderOther();

    expect(screen.getByRole("heading", { level: 1, name: "wanderlust" })).toBeInTheDocument();
    expect(screen.getByText("@wanderlust")).toBeInTheDocument();
    expect(screen.getByText(OTHER_PROFILE.bio)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "좋아요" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "팔로우" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "프로필 수정" })).not.toBeInTheDocument();
  });

  it("노드 수는 비공개 해시태그의 노드를 뺀 값이고 나도 탐색중 수가 함께 보인다", () => {
    renderOther();

    expect(stat("노드")).toBe(String(142 - 14 - 12));
    expect(stat("공유 세션")).toBe("3");
    expect(stat("좋아요")).toBe("284");
    expect(stat("나도 탐색중")).toBe("12");
  });

  it("비공개 해시태그는 태그 줄 · 카드 태그 · 공유 세션 · 상세 팝업 어디에도 보이지 않는다", async () => {
    const { user } = renderOther();

    // 태그 줄 — 공개 태그만, 잠금 표시 없이
    expectNoHiddenTags();
    expect(within(tagRow()).getByRole("button", { name: /^#프라하\s?32$/ })).not.toHaveClass("topTagPrivate");
    expect(within(tagRow()).getByRole("button", { name: "#카페투어" })).toBeInTheDocument(); // 이름만 비슷한 관심 태그는 보인다
    // 카드 태그 — 비공개를 빼고 앞의 2개
    expect(cardTags("비엔나 카페 투어")).toEqual(["#비엔나", "#자허토르테"]);
    expect(cardTags("프라하 천천히 걷기")).toEqual(["#프라하"]);

    // 공유 세션 카드 태그
    await user.click(screen.getByRole("button", { name: "세션 (3)" }));
    expectNoHiddenTags();
    expect(screen.getByText("#자허토르테")).toBeInTheDocument();
    expect(screen.getAllByText("#카를교")).toHaveLength(1);

    // 상세 팝업 태그 · 관련 세션 태그
    await user.click(screen.getByRole("button", { name: "마인드맵" }));
    await user.click(screen.getByText("비엔나 카페 투어"));
    const dialog = screen.getByRole("dialog", { name: "비엔나 카페 투어" });
    expect(await within(dialog).findByText(otherTitle(9104))).toBeInTheDocument();
    expect(within(dialog).queryByText("#카페")).not.toBeInTheDocument();
    expect(within(dialog).getAllByText("#자허토르테")).toHaveLength(2); // 팝업 태그 + 관련 세션 태그
  });

  describe("좋아요 · 팔로우", () => {
    /** PATCH 본문을 모으며 응답을 돌려준다 */
    const servePatch = <T,>(path: string, respond: (body: T) => Response) => {
      const bodies: T[] = [];
      server.use(
        http.patch(`${API}${path}`, async ({ request }) => {
          const body = (await request.json()) as T;
          bodies.push(body);
          return respond(body);
        }),
      );
      return bodies;
    };
    const serveLike = (likeCount: number) =>
      servePatch<{ liked: boolean }>("/community/profiles/7/like", ({ liked }) => ok({ code: 200, userId: 7, liked, likeCount }));
    const serveFollow = () =>
      servePatch<{ following: boolean }>("/community/profiles/7/follow", ({ following }) => ok({ following }));

    it("처음 상태는 응답의 내 좋아요 · 팔로우를 따르고 좋아요 수를 또 더하지 않는다", () => {
      renderOther({ ...OTHER_PROFILE_PAGE, likedByMe: true, following: true });

      expect(screen.getByRole("button", { name: "좋아요" })).toHaveClass("active");
      expect(screen.getByRole("button", { name: "팔로잉" })).toBeInTheDocument();
      expect(stat("좋아요")).toBe("284");
    });

    it("좋아요를 누르면 바로 바뀌고 서버가 준 수로 맞춘다", async () => {
      const bodies = serveLike(300);
      const { user } = renderOther();
      const like = screen.getByRole("button", { name: "좋아요" });

      await user.click(like);

      await waitFor(() => expect(stat("좋아요")).toBe("300"));
      expect(like).toHaveClass("active");
      expect(bodies).toEqual([{ liked: true }]);
    });

    it("좋아요를 취소하면 liked false 를 보낸다", async () => {
      const bodies = serveLike(283);
      const { user } = renderOther({ ...OTHER_PROFILE_PAGE, likedByMe: true });

      await user.click(screen.getByRole("button", { name: "좋아요" }));

      await waitFor(() => expect(stat("좋아요")).toBe("283"));
      expect(screen.getByRole("button", { name: "좋아요" })).not.toHaveClass("active");
      expect(bodies).toEqual([{ liked: false }]);
    });

    it("좋아요가 실패하면 되돌리고 서버 메시지를 토스트로 보여준다", async () => {
      server.use(http.patch(`${API}/community/profiles/7/like`, () => fail(500, SERVER_ERROR)));
      const { user } = renderOther();
      const like = screen.getByRole("button", { name: "좋아요" });

      await user.click(like);

      expect(await screen.findByText(SERVER_ERROR)).toBeInTheDocument();
      expect(stat("좋아요")).toBe("284");
      expect(like).not.toHaveClass("active");
    });

    it("응답을 기다리는 동안 다시 눌러도 요청은 하나만 간다", async () => {
      let release = () => {};
      const gate = new Promise<void>((resolve) => (release = resolve));
      let calls = 0;
      server.use(
        http.patch(`${API}/community/profiles/7/like`, async () => {
          calls += 1;
          await gate;
          return ok({ code: 200, userId: 7, liked: true, likeCount: 285 });
        }),
      );
      const { user } = renderOther();
      const like = screen.getByRole("button", { name: "좋아요" });

      await user.click(like);
      await user.click(like);
      release();

      await waitFor(() => expect(like).toHaveClass("active"));
      expect(stat("좋아요")).toBe("285");
      expect(calls).toBe(1);
    });

    it("팔로우를 누르면 following 을 보내고 팔로잉으로 바뀐다", async () => {
      const bodies = serveFollow();
      const { user } = renderOther();

      await user.click(screen.getByRole("button", { name: "팔로우" }));

      expect(await screen.findByRole("button", { name: "팔로잉" })).toBeInTheDocument();
      await waitFor(() => expect(bodies).toEqual([{ following: true }]));
    });

    it("팔로우가 실패하면 되돌리고 토스트를 보여준다", async () => {
      server.use(http.patch(`${API}/community/profiles/7/follow`, () => fail(500, SERVER_ERROR)));
      const { user } = renderOther({ ...OTHER_PROFILE_PAGE, following: true });

      await user.click(screen.getByRole("button", { name: "팔로잉" }));

      expect(await screen.findByText(SERVER_ERROR)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "팔로잉" })).toBeInTheDocument();
    });

    describe("카드", () => {
      const TITLE = "동유럽 3주 살이 전체 동선";
      const CARD_ID = OTHER_MINDMAPS[0].id;

      it("좋아요를 누르면 서버 값으로 맞추고 상세 팝업은 열리지 않는다", async () => {
        const bodies = servePatch<{ liked: boolean }>(`/community/mindmaps/${CARD_ID}/like`, () => ok({ likeCount: 290, likedByMe: true }));
        const { user } = renderOther();
        const like = within(cardOf(TITLE)).getByRole("button", { name: "마인드맵 좋아요" });

        await user.click(like);

        await waitFor(() => expect(like).toHaveTextContent("♥ 290"));
        expect(like).toHaveAttribute("aria-pressed", "true");
        expect(bodies).toEqual([{ liked: true }]);
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });

      it("북마크를 누르면 저장 표시로 바뀌고, 저장된 카드는 해제를 보낸다", async () => {
        const bodies = servePatch<{ bookmarked: boolean }>(`/community/mindmaps/${CARD_ID}/bookmark`, ({ bookmarked }) =>
          ok({ bookmarkCount: bookmarked ? 92 : 91, bookmarkId: bookmarked ? 5 : null }),
        );
        const { user } = renderOther();
        const bookmark = within(cardOf(TITLE)).getByRole("button", { name: "마인드맵 북마크" });

        await user.click(bookmark);
        await waitFor(() => expect(bookmark).toHaveTextContent("◆ 92"));
        await user.click(bookmark);

        await waitFor(() => expect(bookmark).toHaveTextContent("◇ 91"));
        expect(bodies).toEqual([{ bookmarked: true }, { bookmarked: false }]);
      });

      it("나도 탐색을 누르면 그 카드만 바뀌고 프로필의 나도 탐색중 수도 함께 움직인다", async () => {
        const bodies = servePatch<{ exploring: boolean }>(`/community/mindmaps/${CARD_ID}/exploring`, ({ exploring }) =>
          ok({ exploringCount: exploring ? 1 : 0, exploringByMe: exploring }),
        );
        const { user } = renderOther();
        const card = cardOf(TITLE);

        await user.click(within(card).getByRole("button", { name: "+ 나도 탐색" }));

        expect(await within(card).findByRole("button", { name: "✓ 탐색중" })).toHaveClass("exploreBtnOn");
        expect(screen.getAllByRole("button", { name: "+ 나도 탐색" })).toHaveLength(OTHER_MINDMAPS.length - 1);
        expect(stat("나도 탐색중")).toBe("13");
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        await waitFor(() => expect(bodies).toEqual([{ exploring: true }]));
      });

      it.each([
        ["좋아요", "like", "마인드맵 좋아요", "♡ 284"],
        ["북마크", "bookmark", "마인드맵 북마크", "◇ 91"],
      ])("%s 가 실패하면 되돌리고 토스트를 보여준다", async (_, path, name, text) => {
        server.use(http.patch(`${API}/community/mindmaps/${CARD_ID}/${path}`, () => fail(500, SERVER_ERROR)));
        const { user } = renderOther();
        const button = within(cardOf(TITLE)).getByRole("button", { name });

        await user.click(button);

        expect(await screen.findByText(SERVER_ERROR)).toBeInTheDocument();
        expect(button).toHaveTextContent(text);
        expect(button).toHaveAttribute("aria-pressed", "false");
      });

      it("나도 탐색이 실패하면 카드와 프로필 수를 되돌린다", async () => {
        server.use(http.patch(`${API}/community/mindmaps/${CARD_ID}/exploring`, () => fail(500, SERVER_ERROR)));
        const { user } = renderOther();
        const card = cardOf(TITLE);

        await user.click(within(card).getByRole("button", { name: "+ 나도 탐색" }));

        expect(await screen.findByText(SERVER_ERROR)).toBeInTheDocument();
        expect(within(card).getByRole("button", { name: "+ 나도 탐색" })).toBeInTheDocument();
        expect(stat("나도 탐색중")).toBe("12");
      });

      it("상세 팝업의 좋아요 수는 카드에서 바뀐 값을 따른다", async () => {
        servePatch(`/community/mindmaps/${CARD_ID}/like`, () => ok({ likeCount: 290, likedByMe: true }));
        const { user } = renderOther();
        const like = within(cardOf(TITLE)).getByRole("button", { name: "마인드맵 좋아요" });
        await user.click(like);
        await waitFor(() => expect(like).toHaveTextContent("♥ 290"));

        await user.click(screen.getByText(TITLE));

        expect(within(screen.getByRole("dialog")).getByText("좋아요 290")).toBeInTheDocument();
      });

      it("내 카드엔 좋아요 버튼이 없고 수만 보인다", () => {
        const mine = { ...OTHER_MINDMAPS[0], ownerId: MEMBER.id };
        renderOther({ ...OTHER_PROFILE_PAGE, mindmaps: [mine] });

        expect(within(cardOf(TITLE)).queryByRole("button", { name: "마인드맵 좋아요" })).not.toBeInTheDocument();
        expect(within(cardOf(TITLE)).getByText("♡ 284")).toBeInTheDocument();
      });
    });
  });

  it("마인드맵 카드가 모두 보이고 내 프로필과 달리 핀 표시는 없다", () => {
    renderOther();

    for (const m of OTHER_MINDMAPS) expect(screen.getByText(m.title)).toBeInTheDocument();
    expect(screen.queryAllByTitle("핀고정됨")).toHaveLength(0);
    expect(screen.getAllByRole("button", { name: "+ 나도 탐색" })).toHaveLength(OTHER_MINDMAPS.length);
  });

  it("세션 카드엔 핀 · 비공개 표시가 없다", async () => {
    const { user } = renderOther();

    await user.click(screen.getByRole("button", { name: "세션 (3)" }));

    expect(screen.queryByText("비공개")).not.toBeInTheDocument();
    expect(screen.queryAllByTitle("핀고정됨")).toHaveLength(0);
  });

  it("핀고정 id 중 세션 목록에 없는 것은 건너뛰고 개수에서도 빠진다", async () => {
    const { user } = renderOther({ ...OTHER_PROFILE_PAGE, profile: { ...OTHER_PROFILE, pinnedSessionIds: [9999, 9102] } });

    expect(stat("공유 세션")).toBe("1");
    await user.click(screen.getByRole("button", { name: "세션 (1)" }));
    expect(sessionCardTitles()).toEqual([otherTitle(9102)]);
  });

  it("카드를 누르면 이 사람이 작성자인 상세 팝업이 뜨고 크게 보기에서 그 사람의 전체 마인드맵을 본다", async () => {
    const { user } = renderOther();

    await user.click(screen.getByText("동유럽 3주 살이 전체 동선"));
    const dialog = screen.getByRole("dialog", { name: "동유럽 3주 살이 전체 동선" });
    expect(within(dialog).getByRole("button", { name: "🌿 wanderlust" })).toBeInTheDocument();
    expect(await within(dialog).findByText("· 2개")).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "마인드맵 크게 보기" }));
    const full = await screen.findByRole("dialog", { name: "wanderlust님의 전체 마인드맵" });
    expect(within(full).getByText(`노드 ${API_MINDMAP.hashtags.length + API_MINDMAP.nodes.length}개`)).toBeInTheDocument();
  });

  it("관련 세션은 팝업을 열 때 받고, 같은 카드를 다시 열면 또 받지 않는다", async () => {
    let calls = 0;
    server.use(
      http.get(`${API}/community/mindmaps/:id/sessions`, () => {
        calls += 1;
        return ok({ sessions: OTHER_MINDMAPS[0].sessions });
      }),
    );
    const { user } = renderOther();
    expect(calls).toBe(0);

    await user.click(screen.getByText("동유럽 3주 살이 전체 동선"));
    expect(await screen.findByText("· 2개")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await user.click(screen.getByText("동유럽 3주 살이 전체 동선"));

    expect(await screen.findByText("· 2개")).toBeInTheDocument();
    expect(calls).toBe(1);
  });

  it("관련 세션을 못 받으면 팝업은 그대로이고 그 자리에서 다시 시도할 수 있다", async () => {
    server.use(http.get(`${API}/community/mindmaps/:id/sessions`, () => fail(500, SERVER_ERROR)));
    const { user } = renderOther();

    await user.click(screen.getByText("동유럽 3주 살이 전체 동선"));
    const dialog = screen.getByRole("dialog", { name: "동유럽 3주 살이 전체 동선" });
    const alert = await within(dialog).findByRole("alert");
    expect(alert).toHaveTextContent("관련 세션을 불러오지 못했어요.");
    expect(within(dialog).getByRole("button", { name: "마인드맵 크게 보기" })).toBeEnabled();

    serveDetail();
    await user.click(within(alert).getByRole("button", { name: "다시 시도" }));

    expect(await within(dialog).findByText("· 2개")).toBeInTheDocument();
  });

  it("전체 마인드맵은 크게 보기를 누를 때 받고, 실패하면 팝업에서 다시 시도한다", async () => {
    let calls = 0;
    server.use(
      http.get(`${API}/community/profiles/7/mindmap`, () => {
        calls += 1;
        return fail(500, SERVER_ERROR);
      }),
    );
    const { user } = renderOther();
    await user.click(screen.getByText("동유럽 3주 살이 전체 동선"));
    const dialog = screen.getByRole("dialog", { name: "동유럽 3주 살이 전체 동선" });
    await within(dialog).findByText("· 2개");
    expect(calls).toBe(0);

    await user.click(within(dialog).getByRole("button", { name: "마인드맵 크게 보기" }));
    const alert = await within(dialog).findByRole("alert");
    expect(alert).toHaveTextContent("전체 마인드맵을 불러오지 못했어요.");
    expect(within(dialog).getByText(otherTitle(9102))).toBeInTheDocument();

    serveDetail();
    await user.click(within(alert).getByRole("button", { name: "다시 시도" }));

    expect(await screen.findByRole("dialog", { name: "wanderlust님의 전체 마인드맵" })).toBeInTheDocument();
  });

  it("전체 마인드맵을 못 받고 팝업을 닫았다가 다시 열면 크게 보기로 다시 받는다", async () => {
    let broken = true;
    let calls = 0;
    server.use(
      http.get(`${API}/community/profiles/7/mindmap`, () => {
        calls += 1;
        return broken ? fail(500, SERVER_ERROR) : ok(API_MINDMAP);
      }),
    );
    const { user } = renderOther();
    await user.click(screen.getByText("동유럽 3주 살이 전체 동선"));
    await user.click(screen.getByRole("button", { name: "마인드맵 크게 보기" }));
    await screen.findByText("전체 마인드맵을 불러오지 못했어요.");

    await user.keyboard("{Escape}");
    await user.click(screen.getByText("동유럽 3주 살이 전체 동선"));
    expect(screen.queryByText("전체 마인드맵을 불러오지 못했어요.")).not.toBeInTheDocument();

    broken = false;
    await user.click(screen.getByRole("button", { name: "마인드맵 크게 보기" }));

    expect(await screen.findByRole("dialog", { name: "wanderlust님의 전체 마인드맵" })).toBeInTheDocument();
    expect(calls).toBe(2);
  });

  it("공유 세션은 핀고정 순서대로 보이고 카드를 누르면 세션 상세로 이동한다", async () => {
    const { user } = renderOther();

    await user.click(screen.getByRole("button", { name: "세션 (3)" }));

    expect(sessionCardTitles()).toEqual([9107, 9104, 9102].map(otherTitle));
    expect(screen.queryByText(otherTitle(9105))).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: new RegExp(otherTitle(9107)) }));
    expect(mockRouter.push).toHaveBeenCalledWith("/sessions/9107");
  });

  it("공유한 마인드맵 · 세션이 없으면 빈 상태가 보이고 핀고정 안내는 없다", async () => {
    const { user } = renderOther({ ...OTHER_PROFILE_PAGE, mindmaps: [], profile: { ...OTHER_PROFILE, pinnedSessionIds: [] } });

    expect(screen.getByRole("status")).toHaveTextContent("공유한 마인드맵이 없어요.");
    await user.click(screen.getByRole("button", { name: "세션 (0)" }));
    expect(screen.getByRole("status")).toHaveTextContent("공유한 세션이 없어요.");
    expect(screen.queryByText("프로필 수정에서 세션을 핀고정하면 여기에 보여요.")).not.toBeInTheDocument();
  });

  describe("해시태그 골라 북마크", () => {
    const pick = async (user: ReturnType<typeof renderOther>["user"]) => {
      await user.click(screen.getByRole("button", { name: "#카페투어" }));
      await user.click(screen.getByRole("button", { name: /^#비엔나\s?28$/ }));
    };

    it("해시태그를 고르면 N개 선택 바가 뜨고 같은 태그를 다시 누르면 선택이 풀린다", async () => {
      const { user } = renderOther();
      expect(screen.queryByText(/개 선택$/)).not.toBeInTheDocument();

      await pick(user);
      expect(screen.getByText("2개 선택")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "#카페투어" })).toHaveAttribute("aria-pressed", "true");
      // 자주 쓴 태그 · 관심 태그에 같은 태그가 있으면 함께 선택된다
      expect(screen.getByRole("button", { name: "#비엔나" })).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByRole("button", { name: /^#프라하\s?32$/ })).toHaveAttribute("aria-pressed", "false");

      await user.click(screen.getByRole("button", { name: "#카페투어" }));
      expect(screen.getByText("1개 선택")).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "#비엔나" }));
      expect(screen.queryByText(/개 선택$/)).not.toBeInTheDocument();
    });

    describe("저장", () => {
      const BOOKMARKS = `${API}/community/bookmarks`;
      const MINDMAP = `${API}/community/profiles/7/mindmap`;
      const BAD_SELECTION = "저장할 대상은 중복 없이 1개부터 100개까지 선택할 수 있습니다.";
      const SAVED = "북마크에 저장했어요.";
      /** 고른 태그의 행 — #카페투어 14 · #비엔나 12 */
      const hashtag = (hashtagId: number, name: string) => ({ hashtagId, ownerId: 7, name });
      const TAGS = [hashtag(11, "프라하"), hashtag(12, "비엔나"), hashtag(13, "야간열차"), hashtag(14, "카페투어")];

      /** 실제로 나간 POST 본문. MSW 가 모르는 요청은 네트워크 오류로 끝나 테스트를 실패시키지 않으므로 fetch 를 직접 본다 */
      const spyFetch = () => {
        const spy = vi.spyOn(globalThis, "fetch");
        return {
          posted: () =>
            spy.mock.calls
              .filter(([url, init]) => url === BOOKMARKS && init?.method === "POST")
              .map(([, init]) => JSON.parse(init!.body as string) as unknown),
          count: () => spy.mock.calls.length,
        };
      };
      const serveTags = (hashtags = TAGS) => server.use(http.get(MINDMAP, () => ok({ ...API_MINDMAP, hashtags })));
      const serveSave = () =>
        server.use(http.post(BOOKMARKS, () => ok({ code: 201, bookmarkId: 5, targetIds: [], saveType: "MINI_MINDMAP" }, { status: 201 })));
      const openMenu = async (user: ReturnType<typeof renderOther>["user"]) => {
        await user.click(screen.getByRole("button", { name: "북마크" }));
        return within(screen.getByRole("menu"));
      };
      const openNameForm = async (user: ReturnType<typeof renderOther>["user"]) => {
        const menu = await openMenu(user);
        await user.click(menu.getByRole("menuitem", { name: /해시태그 묶음으로 저장/ }));
        return screen.getByRole("textbox", { name: "묶음 이름" });
      };
      const expectCleared = () => {
        expect(screen.queryByText(/개 선택$/)).not.toBeInTheDocument();
        expect(within(tagRow()).queryAllByRole("button", { pressed: true })).toHaveLength(0);
      };

      it("미니 마인드맵은 이름을 묻지 않고 바로 저장하고 선택을 푼다", async () => {
        serveTags();
        serveSave();
        const sent = spyFetch();
        const { user } = renderOther();
        await pick(user);

        const menu = await openMenu(user);
        expect(menu.getAllByRole("menuitem")).toHaveLength(2);
        await user.click(menu.getByRole("menuitem", { name: /미니 마인드맵으로 저장/ }));

        expect(await screen.findByText(SAVED)).toBeInTheDocument();
        expect(sent.posted()).toEqual([{ targetType: "HASHTAG", targetIds: [14, 12], saveType: "MINI_MINDMAP", sourceMindmapId: 7 }]);
        expect(screen.queryByRole("textbox", { name: "묶음 이름" })).not.toBeInTheDocument();
        expect(screen.queryByRole("menu")).not.toBeInTheDocument();
        expectCleared();
      });

      it("해시태그 묶음은 이름 입력이 뜨고, 저장을 누르기 전엔 요청이 나가지 않는다", async () => {
        const sent = spyFetch();
        const { user } = renderOther();
        await pick(user);

        const input = await openNameForm(user);

        expect(input).toHaveFocus();
        expect(input).toHaveAttribute("maxlength", "30");
        expect(screen.queryByRole("menu")).not.toBeInTheDocument();
        expect(sent.count()).toBe(0);
      });

      it("Enter 를 누르면 앞뒤 공백을 뺀 이름으로 묶음을 저장한다", async () => {
        serveTags();
        serveSave();
        const sent = spyFetch();
        const { user } = renderOther();
        await pick(user);

        await user.type(await openNameForm(user), "  동유럽 카페  {Enter}");

        expect(await screen.findByText(SAVED)).toBeInTheDocument();
        expect(sent.posted()).toEqual([
          { targetType: "HASHTAG", targetIds: [14, 12], saveType: "HASHTAG_BUNDLE", sourceMindmapId: 7, name: "동유럽 카페" },
        ]);
        expect(screen.queryByRole("textbox", { name: "묶음 이름" })).not.toBeInTheDocument();
        expectCleared();
      });

      it.each([
        ["비워 두면", ""],
        ["공백만 넣으면", "   "],
      ])("%s 이름 없이 저장한다", async (_, typed) => {
        serveTags();
        serveSave();
        const sent = spyFetch();
        const { user } = renderOther();
        await pick(user);

        const input = await openNameForm(user);
        if (typed) await user.type(input, typed);
        await user.click(screen.getByRole("button", { name: "저장" }));

        expect(await screen.findByText(SAVED)).toBeInTheDocument();
        expect(sent.posted()).toEqual([{ targetType: "HASHTAG", targetIds: [14, 12], saveType: "HASHTAG_BUNDLE", sourceMindmapId: 7 }]);
      });

      it("한글 조합을 끝내는 Enter 로는 저장하지 않는다", async () => {
        const sent = spyFetch();
        const { user } = renderOther();
        await pick(user);

        fireEvent.keyDown(await openNameForm(user), { key: "Enter", isComposing: true });

        expect(sent.count()).toBe(0);
        expect(screen.getByRole("textbox", { name: "묶음 이름" })).toBeInTheDocument();
      });

      it.each([
        ["Esc", (user: ReturnType<typeof renderOther>["user"]) => user.keyboard("{Escape}")],
        ["취소", (user: ReturnType<typeof renderOther>["user"]) => user.click(screen.getByRole("button", { name: "취소" }))],
      ])("%s 는 저장 없이 닫고 선택은 그대로 둔다", async (_, cancel) => {
        const sent = spyFetch();
        const { user } = renderOther();
        await pick(user);
        await user.type(await openNameForm(user), "이름");

        await cancel(user);

        expect(screen.queryByRole("textbox", { name: "묶음 이름" })).not.toBeInTheDocument();
        expect(screen.getByText("2개 선택")).toBeInTheDocument();
        expect(sent.count()).toBe(0);

        // 다시 열면 입력이 비어 있다
        expect(await openNameForm(user)).toHaveValue("");
      });

      it("저장 중에 다시 눌러도 요청은 하나만 가고, 응답을 기다리는 동안 닫거나 선택을 바꿀 수 없다", async () => {
        let release = () => {};
        const gate = new Promise<void>((resolve) => (release = resolve));
        serveTags();
        server.use(
          http.post(BOOKMARKS, async () => {
            await gate;
            return ok({ code: 201, bookmarkId: 5 }, { status: 201 });
          }),
        );
        const sent = spyFetch();
        const { user } = renderOther();
        await pick(user);
        const input = await openNameForm(user);

        await user.type(input, "묶음{Enter}{Enter}");
        await waitFor(() => expect(sent.posted()).toHaveLength(1));
        expect(screen.getByRole("button", { name: "저장" })).toBeDisabled();
        await user.type(input, "{Enter}");
        await user.keyboard("{Escape}");
        await user.click(screen.getByRole("button", { name: /^#프라하\s?32$/ }));

        expect(input).toBeInTheDocument();
        expect(screen.getByText("2개 선택")).toBeInTheDocument();
        release();

        expect(await screen.findByText(SAVED)).toBeInTheDocument();
        expect(sent.posted()).toHaveLength(1);
        expectCleared();
      });

      it("저장이 실패하면 서버 메시지를 보여주고 선택 · 입력을 그대로 둬 다시 저장할 수 있다", async () => {
        serveTags();
        server.use(http.post(BOOKMARKS, () => fail(400, BAD_SELECTION)));
        const sent = spyFetch();
        const { user } = renderOther();
        await pick(user);
        const input = await openNameForm(user);
        await user.type(input, "묶음{Enter}");

        expect(await screen.findByText(BAD_SELECTION)).toBeInTheDocument();
        expect(screen.queryByText(SAVED)).not.toBeInTheDocument();
        expect(screen.getByText("2개 선택")).toBeInTheDocument();
        expect(input).toHaveValue("묶음");
        await waitFor(() => expect(screen.getByRole("button", { name: "저장" })).toBeEnabled());

        serveSave();
        await user.click(screen.getByRole("button", { name: "저장" }));

        expect(await screen.findByText(SAVED)).toBeInTheDocument();
        expect(sent.posted()).toHaveLength(2);
        expectCleared();
      });

      it("미니 마인드맵 저장이 실패해도 선택은 남고 메뉴에서 다시 고를 수 있다", async () => {
        serveTags();
        server.use(http.post(BOOKMARKS, () => fail(500, SERVER_ERROR)));
        const { user } = renderOther();
        await pick(user);

        await user.click((await openMenu(user)).getByRole("menuitem", { name: /미니 마인드맵으로 저장/ }));

        expect(await screen.findByText(SERVER_ERROR)).toBeInTheDocument();
        expect(screen.getByText("2개 선택")).toBeInTheDocument();
        await waitFor(() => expect(screen.getByRole("menuitem", { name: /미니 마인드맵으로 저장/ })).toBeEnabled());
      });

      it("해시태그 id 를 받지 못하면 저장 요청을 보내지 않고 선택을 남긴다", async () => {
        server.use(http.get(MINDMAP, () => fail(500, SERVER_ERROR)));
        const sent = spyFetch();
        const { user } = renderOther();
        await pick(user);

        await user.click((await openMenu(user)).getByRole("menuitem", { name: /미니 마인드맵으로 저장/ }));

        expect(await screen.findByText(SERVER_ERROR)).toBeInTheDocument();
        expect(sent.posted()).toEqual([]);
        expect(screen.getByText("2개 선택")).toBeInTheDocument();
      });

      it("id 가 없는 태그가 섞이면 일부만 저장하지 않고 그 태그를 알려준다", async () => {
        serveTags(TAGS.filter((t) => t.name !== "카페투어"));
        const sent = spyFetch();
        const { user } = renderOther();
        await pick(user);

        await user.click((await openMenu(user)).getByRole("menuitem", { name: /미니 마인드맵으로 저장/ }));

        expect(await screen.findByText(/#카페투어 태그는 저장할 수 없어요/)).toBeInTheDocument();
        expect(sent.posted()).toEqual([]);
        expect(screen.getByText("2개 선택")).toBeInTheDocument();
      });

      it("대소문자만 다른 자주 쓴 태그 · 관심 태그는 같은 id 하나로 보낸다", async () => {
        serveTags([hashtag(21, "HCI")]);
        serveSave();
        const sent = spyFetch();
        const profile = { ...OTHER_PROFILE, interests: ["#hci"], topTags: [{ tag: "#HCI", count: 3, isPublic: true }] };
        const { user } = renderOther({ ...OTHER_PROFILE_PAGE, profile });

        await user.click(screen.getByRole("button", { name: "#hci" }));
        await user.click(screen.getByRole("button", { name: /^#HCI\s?3$/ }));
        await user.click((await openMenu(user)).getByRole("menuitem", { name: /미니 마인드맵으로 저장/ }));

        expect(await screen.findByText(SAVED)).toBeInTheDocument();
        expect(sent.posted()).toEqual([{ targetType: "HASHTAG", targetIds: [21], saveType: "MINI_MINDMAP", sourceMindmapId: 7 }]);
      });
    });

    it("× 를 누르면 고른 해시태그가 모두 풀린다", async () => {
      const { user } = renderOther();
      await pick(user);

      await user.click(screen.getByRole("button", { name: "선택 해제" }));

      expect(screen.queryByText(/개 선택$/)).not.toBeInTheDocument();
      expect(within(tagRow()).queryAllByRole("button", { pressed: true })).toHaveLength(0);
    });

    it("북마크 메뉴는 Esc 나 바깥을 누르면 닫히고 선택은 그대로다", async () => {
      const { user } = renderOther();
      await pick(user);

      await user.click(screen.getByRole("button", { name: "북마크" }));
      expect(screen.getByRole("button", { name: "북마크" })).toHaveAttribute("aria-expanded", "true");
      await user.keyboard("{Escape}");
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "북마크" }));
      await user.click(screen.getByText(OTHER_PROFILE.bio));
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
      expect(screen.getByText("2개 선택")).toBeInTheDocument();
    });
  });
});

describe("프로필을 불러오는 중 · 실패 · 없음", () => {
  it("없는 프로필이면 찾을 수 없다는 안내와 커뮤니티로 가는 버튼이 보인다", async () => {
    const { user } = renderPersonal(<ProfileView notFound data={null} />);

    expect(screen.getByRole("status")).toHaveTextContent("프로필을 찾을 수 없어요");
    expect(screen.queryByRole("button", { name: /좋아요/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "커뮤니티로" }));
    expect(mockRouter.push).toHaveBeenCalledWith("/community");
  });

  it.each([
    ["내 프로필", undefined],
    ["다른 사용자 프로필", 7],
  ])("%s을 불러오는 중이면 불러오는 중… 만 보인다", (_, userId) => {
    renderPersonal(<ProfileView userId={userId} data={null} loading />);

    expect(screen.getByText("불러오는 중…")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it.each([
    ["내 프로필", undefined],
    ["다른 사용자 프로필", 7],
  ])("%s을 불러오지 못하면 오류와 다시 시도가 보이고 누르면 onRetry 가 불린다", async (_, userId) => {
    const onRetry = vi.fn();
    const { user } = renderPersonal(
      <ProfileView userId={userId} data={MY_PROFILE_PAGE} error="서버에 연결할 수 없습니다." onRetry={onRetry} />,
    );

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("프로필을 불러오지 못했어요.");
    expect(alert).toHaveTextContent("서버에 연결할 수 없습니다.");
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();

    await user.click(within(alert).getByRole("button", { name: "다시 시도" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
