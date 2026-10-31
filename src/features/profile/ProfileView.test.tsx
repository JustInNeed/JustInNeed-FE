import { screen, waitFor, within } from "@testing-library/react";
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
  OTHER_MINDMAPS,
  OTHER_PROFILE,
  OTHER_PROFILE_PAGE,
} from "@/test/fixtures/profile";
import { API, SERVER_ERROR, fail, ok, server } from "@/test/msw/server";
import { renderPersonal } from "@/test/render";
import { mockRouter } from "@/test/router";
import { ProfileView } from "./ProfileView";

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

const titleOf = (id: number) => MY_PROFILE_PAGE.sessions.find((s) => s.id === id)!.title;

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

describe("내 프로필", () => {
  it("이름 · 핸들은 프로필 데이터가 아니라 로그인 회원 닉네임으로 보이고 소개 · 통계가 보인다", () => {
    renderPersonal(<ProfileView data={MY_PROFILE_PAGE} />);

    expect(screen.getByRole("heading", { level: 1, name: "yesong" })).toBeInTheDocument();
    expect(screen.getByText("@yesong")).toBeInTheDocument();
    expect(screen.queryByText("sprout.kr")).not.toBeInTheDocument();
    expect(screen.getByText(MY_PROFILE.bio)).toBeInTheDocument();
    expect(stat("노드")).toBe("218");
    expect(stat("공유 세션")).toBe("4"); // 핀고정 세션 수
    expect(stat("좋아요")).toBe("87");
    expect(screen.queryByText("나도 탐색중")).not.toBeInTheDocument();
  });

  it("자주 쓴 해시태그는 노드 수와 함께, 관심 해시태그는 그 뒤에 보인다", () => {
    renderPersonal(<ProfileView data={MY_PROFILE_PAGE} />);
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
    renderPersonal(<ProfileView data={MY_PROFILE_PAGE} />);
    const row = within(tagRow());

    const privateTag = row.getByText("#예산");
    expect(privateTag).toHaveClass("topTagPrivate");
    expect(privateTag).toHaveAttribute("title", "비공개 · 나만 보여요");
    expect(privateTag.querySelector("svg")).not.toBeNull();

    const publicTag = row.getByText("#파리");
    expect(publicTag).not.toHaveClass("topTagPrivate");
    expect(publicTag.querySelector("svg")).toBeNull();
  });

  it("처음엔 마인드맵 탭이 열려 있고 내 마인드맵 카드가 핀 표시 · 노드 수와 함께 보인다", () => {
    renderPersonal(<ProfileView data={MY_PROFILE_PAGE} />);

    expect(screen.getByRole("button", { name: "마인드맵" })).toHaveClass("tabOn");
    expect(screen.getByRole("button", { name: "세션 (4)" })).not.toHaveClass("tabOn");
    for (const m of MY_MINDMAPS) {
      expect(screen.getByText(m.title)).toBeInTheDocument();
      expect(screen.getByText(`노드 ${m.nodes}`)).toBeInTheDocument();
    }
    expect(screen.getAllByTitle("핀고정됨")).toHaveLength(MY_MINDMAPS.length);
    // 카드 태그는 앞의 2개만, 내 프로필이라 비공개(#예산)도 보인다
    const card = screen.getByText("유럽 항공권 · 예산 정리").parentElement!;
    expect(within(card).getByText("#예산")).toBeInTheDocument();
    expect(within(card).getByText("#항공권")).toBeInTheDocument();
    expect(within(screen.getByText("로마 3박 4일 동선").parentElement!).queryByText("#먹거리")).not.toBeInTheDocument();
  });

  it("세션 탭을 누르면 핀고정한 세션이 핀고정 순서대로 보인다", async () => {
    const { user } = renderPersonal(<ProfileView data={MY_PROFILE_PAGE} />);

    await user.click(screen.getByRole("button", { name: "세션 (4)" }));

    expect(screen.getByRole("button", { name: "세션 (4)" })).toHaveClass("tabOn");
    expect(sessionCardTitles()).toEqual([9001, 9003, 9002, 9005].map(titleOf));
    expect(screen.queryByText(titleOf(9004))).not.toBeInTheDocument();
  });

  it("핀고정 id 중 세션 목록에 없는 것은 건너뛰고 개수에서도 빠진다", async () => {
    const data: ProfilePageData = { ...MY_PROFILE_PAGE, profile: { ...MY_PROFILE, pinnedSessionIds: [9999, 9002] } };
    const { user } = renderPersonal(<ProfileView data={data} />);

    expect(stat("공유 세션")).toBe("1");
    await user.click(screen.getByRole("button", { name: "세션 (1)" }));
    expect(sessionCardTitles()).toEqual([titleOf(9002)]);
  });

  it("공유 세션 카드를 누르면 그 세션 상세로 이동한다", async () => {
    const { user } = renderPersonal(<ProfileView data={MY_PROFILE_PAGE} />);

    await user.click(screen.getByRole("button", { name: "세션 (4)" }));
    await user.click(screen.getByRole("button", { name: new RegExp(titleOf(9003).slice(0, 8)) }));

    expect(mockRouter.push).toHaveBeenCalledWith("/sessions/9003");
  });

  it("핀고정한 세션이 없으면 세션 탭에 빈 상태와 핀고정 안내가 보인다", async () => {
    const data: ProfilePageData = { ...MY_PROFILE_PAGE, profile: { ...MY_PROFILE, pinnedSessionIds: [] } };
    const { user } = renderPersonal(<ProfileView data={data} />);

    expect(stat("공유 세션")).toBe("0");
    await user.click(screen.getByRole("button", { name: "세션 (0)" }));

    const empty = screen.getByRole("status");
    expect(empty).toHaveTextContent("공유한 세션이 없어요.");
    expect(empty).toHaveTextContent("프로필 수정에서 세션을 핀고정하면 여기에 보여요.");
  });

  it("마인드맵이 없으면 마인드맵 탭에 빈 상태가 보인다", () => {
    renderPersonal(<ProfileView data={{ ...MY_PROFILE_PAGE, mindmaps: [] }} />);

    expect(screen.getByRole("status")).toHaveTextContent("공유한 마인드맵이 없어요.");
  });

  it("마인드맵 카드를 누르면 내가 작성자인 상세 팝업이 관련 세션과 함께 뜬다", async () => {
    const { user } = renderPersonal(<ProfileView data={MY_PROFILE_PAGE} />);

    await user.click(screen.getByText("유럽 항공권 · 예산 정리"));

    const dialog = screen.getByRole("dialog", { name: "유럽 항공권 · 예산 정리" });
    expect(within(dialog).getByRole("button", { name: "🌱 yesong" })).toBeInTheDocument();
    expect(within(dialog).getByText("노드 38")).toBeInTheDocument();
    expect(within(dialog).getByText("· 2개")).toBeInTheDocument();
    expect(within(dialog).getByText(titleOf(9002))).toBeInTheDocument();
    expect(within(dialog).getByText(titleOf(9004))).toBeInTheDocument();
  });

  it("상세 팝업에서 작성자 이름을 누르면 이미 내 프로필이라 팝업만 닫힌다", async () => {
    const { user } = renderPersonal(<ProfileView data={MY_PROFILE_PAGE} />);

    await user.click(screen.getByText("로마 3박 4일 동선"));
    await user.click(screen.getByRole("button", { name: "🌱 yesong" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it("마인드맵 크게 보기를 누르면 내 전체 마인드맵이 뜨고, 닫으면 상세 팝업으로 돌아간다", async () => {
    const { user } = renderPersonal(<ProfileView data={MY_PROFILE_PAGE} />);

    await user.click(screen.getByText("파리 미술관 투어 지도"));
    await user.click(screen.getByRole("button", { name: "마인드맵 크게 보기" }));

    const full = screen.getByRole("dialog", { name: "yesong님의 전체 마인드맵" });
    expect(within(full).getByText(`노드 ${MY_PROFILE_PAGE.fullMindmap.nodes.length}개`)).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "파리 미술관 투어 지도" })).not.toBeInTheDocument();

    await user.click(within(full).getByRole("button", { name: "닫기" }));

    expect(screen.queryByRole("dialog", { name: "yesong님의 전체 마인드맵" })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "파리 미술관 투어 지도" })).toBeInTheDocument();
  });

  it("프로필 수정 옆에 설정 버튼은 없다", () => {
    renderPersonal(<ProfileView data={MY_PROFILE_PAGE} />);

    expect(screen.getByRole("button", { name: "프로필 수정" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "설정" })).not.toBeInTheDocument();
  });

  it("프로필 수정을 누르면 수정 화면으로 바뀐다", async () => {
    const { user } = renderPersonal(<ProfileView data={MY_PROFILE_PAGE} />);

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

    it.each(["해시태그 묶음으로 저장", "미니 마인드맵으로 저장"])(
      "북마크 → %s 을 누르면 저장 토스트가 뜨고 선택이 풀린다",
      async (option) => {
        const { user } = renderOther();
        await pick(user);

        await user.click(screen.getByRole("button", { name: "북마크" }));
        const menu = screen.getByRole("menu");
        expect(within(menu).getAllByRole("menuitem")).toHaveLength(2);
        await user.click(within(menu).getByRole("menuitem", { name: new RegExp(option) }));

        expect(screen.getByText("북마크에 저장했어요.")).toBeInTheDocument();
        expect(screen.queryByRole("menu")).not.toBeInTheDocument();
        expect(screen.queryByText(/개 선택$/)).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "#카페투어" })).toHaveAttribute("aria-pressed", "false");
      },
    );

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

describe("프로필 데이터가 없거나 불러오는 중 · 실패", () => {
  it("내 프로필 데이터가 없으면 닉네임만 채운 빈 프로필이 보이고 각 탭은 빈 상태다", async () => {
    const { user } = renderPersonal(<ProfileView data={null} />);

    expect(screen.getByRole("heading", { level: 1, name: "yesong" })).toBeInTheDocument();
    expect(screen.getByText("@yesong")).toBeInTheDocument();
    expect(stat("노드")).toBe("0");
    expect(stat("공유 세션")).toBe("0");
    expect(stat("좋아요")).toBe("0");
    expect(tagRow()).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("공유한 마인드맵이 없어요.");

    await user.click(screen.getByRole("button", { name: "세션 (0)" }));
    expect(screen.getByRole("status")).toHaveTextContent("공유한 세션이 없어요.");
  });

  it("내 프로필 데이터가 없어도 프로필 수정은 열리고 핀고정할 세션이 없다고 알려준다", async () => {
    const { user } = renderPersonal(<ProfileView data={null} />);

    await user.click(screen.getByRole("button", { name: "프로필 수정" }));

    expect(screen.getByDisplayValue("yesong")).toBeInTheDocument();
    expect(screen.getByText("최대 10개까지 등록할 수 있어요. (0/10)")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("핀고정할 세션이 없어요.");
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
  });

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
