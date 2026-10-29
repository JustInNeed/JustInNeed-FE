import { screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { ProfilePageData } from "@/lib/viewTypes";
import {
  MY_MINDMAPS,
  MY_PROFILE,
  MY_PROFILE_PAGE,
  OTHER_MINDMAPS,
  OTHER_PROFILE,
  OTHER_PROFILE_PAGE,
} from "@/test/fixtures/profile";
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

  it("설정 버튼을 누르면 설정 화면으로 이동한다", async () => {
    const { user } = renderPersonal(<ProfileView data={MY_PROFILE_PAGE} />);

    await user.click(screen.getByRole("button", { name: "설정" }));

    expect(mockRouter.push).toHaveBeenCalledWith("/settings");
  });

  it("프로필 수정을 누르면 수정 화면으로 바뀐다", async () => {
    const { user } = renderPersonal(<ProfileView data={MY_PROFILE_PAGE} />);

    await user.click(screen.getByRole("button", { name: "프로필 수정" }));

    expect(screen.getByRole("heading", { level: 1, name: "프로필 수정" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "설정" })).not.toBeInTheDocument();
  });
});

describe("다른 사용자 프로필", () => {
  const renderOther = (data: ProfilePageData = OTHER_PROFILE_PAGE) =>
    renderPersonal(<ProfileView handle="wanderlust" data={data} />);
  const otherTitle = (id: number) => OTHER_PROFILE_PAGE.sessions.find((s) => s.id === id)!.title;
  const cardOf = (title: string) => screen.getByText(title).closest<HTMLElement>('[role="button"]')!;
  const cardTags = (title: string) => within(cardOf(title)).queryAllByText(/^#/).map((el) => el.textContent);
  const HIDDEN = ["#카페", "#슬로우트래블"];
  const expectNoHiddenTags = () => HIDDEN.forEach((t) => expect(screen.queryByText(t)).not.toBeInTheDocument());

  it("그 사람의 이름 · 핸들 · 소개와 좋아요 · 팔로우 버튼이 보이고 프로필 수정 · 설정은 없다", () => {
    renderOther();

    expect(screen.getByRole("heading", { level: 1, name: "wanderlust" })).toBeInTheDocument();
    expect(screen.getByText("@wanderlust")).toBeInTheDocument();
    expect(screen.getByText(OTHER_PROFILE.bio)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "좋아요" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "팔로우" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "프로필 수정" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "설정" })).not.toBeInTheDocument();
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
    expect(within(dialog).getByText(otherTitle(9104))).toBeInTheDocument();
    expect(within(dialog).queryByText("#카페")).not.toBeInTheDocument();
    expect(within(dialog).getAllByText("#자허토르테")).toHaveLength(2); // 팝업 태그 + 관련 세션 태그
  });

  it("좋아요를 누르면 좋아요 수가 1 늘고 다시 누르면 원래대로 돌아온다", async () => {
    const { user } = renderOther();
    const like = screen.getByRole("button", { name: "좋아요" });

    await user.click(like);
    expect(stat("좋아요")).toBe("285");
    expect(like).toHaveClass("active");

    await user.click(like);
    expect(stat("좋아요")).toBe("284");
    expect(like).not.toHaveClass("active");
  });

  it("팔로우를 누르면 팔로잉으로 바뀌고 다시 누르면 팔로우로 돌아온다", async () => {
    const { user } = renderOther();

    await user.click(screen.getByRole("button", { name: "팔로우" }));
    expect(screen.getByRole("button", { name: "팔로잉" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "팔로우" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "팔로잉" }));
    expect(screen.getByRole("button", { name: "팔로우" })).toBeInTheDocument();
  });

  it("마인드맵 카드가 모두 보이고 내 프로필과 달리 핀 표시는 없다", () => {
    renderOther();

    for (const m of OTHER_MINDMAPS) expect(screen.getByText(m.title)).toBeInTheDocument();
    expect(screen.queryAllByTitle("핀고정됨")).toHaveLength(0);
    expect(screen.getAllByRole("button", { name: "+ 나도 탐색" })).toHaveLength(OTHER_MINDMAPS.length);
  });

  it("카드의 + 나도 탐색을 누르면 그 카드만 탐색중으로 바뀌고 상세 팝업은 열리지 않는다", async () => {
    const { user } = renderOther();
    const card = cardOf("동유럽 3주 살이 전체 동선");

    await user.click(within(card).getByRole("button", { name: "+ 나도 탐색" }));

    expect(within(card).getByRole("button", { name: "✓ 탐색중" })).toHaveClass("exploreBtnOn");
    expect(screen.getAllByRole("button", { name: "+ 나도 탐색" })).toHaveLength(OTHER_MINDMAPS.length - 1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(within(card).getByRole("button", { name: "✓ 탐색중" }));
    expect(screen.getAllByRole("button", { name: "+ 나도 탐색" })).toHaveLength(OTHER_MINDMAPS.length);
  });

  it("카드를 누르면 이 사람이 작성자인 상세 팝업이 뜨고 크게 보기에서 그 사람의 전체 마인드맵을 본다", async () => {
    const { user } = renderOther();

    await user.click(screen.getByText("동유럽 3주 살이 전체 동선"));
    const dialog = screen.getByRole("dialog", { name: "동유럽 3주 살이 전체 동선" });
    expect(within(dialog).getByRole("button", { name: "🌿 wanderlust" })).toBeInTheDocument();
    expect(within(dialog).getByText("· 2개")).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "마인드맵 크게 보기" }));
    const full = screen.getByRole("dialog", { name: "wanderlust님의 전체 마인드맵" });
    expect(within(full).getByText(`노드 ${OTHER_PROFILE_PAGE.fullMindmap.nodes.length}개`)).toBeInTheDocument();
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

  it("다른 사용자 데이터가 없으면 그 사용자 핸들과 함께 빈 상태가 보인다", () => {
    renderPersonal(<ProfileView handle="wanderlust" data={null} />);

    const empty = screen.getByRole("status");
    expect(empty).toHaveTextContent("아직 볼 수 있는 프로필 정보가 없어요.");
    expect(empty).toHaveTextContent("@wanderlust 님이 공유한 내용이 생기면 여기에 보여요.");
    expect(screen.queryByRole("button", { name: /좋아요/ })).not.toBeInTheDocument();
  });

  it.each([
    ["내 프로필", undefined],
    ["다른 사용자 프로필", "wanderlust"],
  ])("%s을 불러오는 중이면 불러오는 중… 만 보인다", (_, handle) => {
    renderPersonal(<ProfileView handle={handle} data={null} loading />);

    expect(screen.getByText("불러오는 중…")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it.each([
    ["내 프로필", undefined],
    ["다른 사용자 프로필", "wanderlust"],
  ])("%s을 불러오지 못하면 오류와 다시 시도가 보이고 누르면 onRetry 가 불린다", async (_, handle) => {
    const onRetry = vi.fn();
    const { user } = renderPersonal(
      <ProfileView handle={handle} data={MY_PROFILE_PAGE} error="서버에 연결할 수 없습니다." onRetry={onRetry} />,
    );

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("프로필을 불러오지 못했어요.");
    expect(alert).toHaveTextContent("서버에 연결할 수 없습니다.");
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();

    await user.click(within(alert).getByRole("button", { name: "다시 시도" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
