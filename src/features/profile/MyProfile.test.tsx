// 실제 요청 경로로 내 프로필 → 탭 → 팝업 → 프로필 수정 → 저장까지 이어 본다. 응답 모양은 내 프로필 API 그대로.
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http } from "msw";
import { useState, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { MemberResponse } from "@/lib/api";
import { PersonalProvider } from "@/lib/app/PersonalContext";
import { MEMBER } from "@/test/fixtures/member";
import { API_MY_PROFILE, MY_SESSIONS, apiMyCard } from "@/test/fixtures/profile";
import { API, SERVER_ERROR, fail, ok, server } from "@/test/msw/server";
import { renderApp, renderPersonal } from "@/test/render";
import { MyProfile } from "./MyProfile";
import { MY_CARDS, serveMyProfile } from "./myProfileTestUtils";

vi.mock("@/components/mindmap/MindmapPreview", async () => {
  const { createElement } = await import("react");
  return { MindmapPreview: ({ children }: { children?: ReactNode }) => createElement("div", null, children) };
});

const ME = `${API}/community/me`;
const BAD_PROFILE = "관심 해시태그는 10개까지 저장할 수 있어요.";
const PUBLIC_ONLY = /publicOnly=true/;

const titleOf = (id: number) => MY_SESSIONS.find((s) => s.id === id)!.title;
const stat = (label: string) => screen.getByText(label, { selector: ".statL" }).previousElementSibling?.textContent;
const cardOf = (title: string) => screen.getByText(title).closest<HTMLElement>('[role="button"]')!;
const sessionTitles = () => screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
const openSessions = async (user: ReturnType<typeof renderPersonal>["user"]) => {
  await user.click(await screen.findByRole("button", { name: "세션" }));
};
const openEdit = async (user: ReturnType<typeof renderPersonal>["user"]) => {
  await user.click(await screen.findByRole("button", { name: "프로필 수정" }));
  return within(editCard("핀고정 세션"));
};
/** 프로필 수정의 카드 하나 */
function editCard(title: string) {
  return screen.getByRole("heading", { level: 3, name: new RegExp(title) }).parentElement!;
}
const saveButton = () => screen.getByRole("button", { name: "저장" });
const bioInput = () => document.querySelector("textarea")!;
const pinRow = (id: number) => screen.getByText(titleOf(id)).closest("label")!;
const pinTitles = () => [...document.querySelectorAll(".pinTitle")].map((el) => el.textContent);

describe("내 프로필 — 불러오기", () => {
  it("서버 값으로 통계 · 해시태그 · 카드 · 세션을 그린다", async () => {
    const fake = serveMyProfile();
    const { user } = renderPersonal(<MyProfile />);

    expect(await screen.findByRole("heading", { level: 1, name: "yesong" })).toBeInTheDocument();
    expect(stat("노드")).toBe("218");
    expect(stat("공유 세션")).toBe("5");
    expect(stat("좋아요")).toBe("87");
    expect(document.querySelector(".tagRow")).toHaveTextContent("#파리28");
    expect(await screen.findByText("고정한 카드")).toBeInTheDocument();

    await openSessions(user);
    expect(sessionTitles()).toEqual(MY_SESSIONS.map((s) => s.title));
    expect(fake.sessionQueries).toEqual(["?page=0&size=12&publicOnly=false"]);
  });

  it("핀 표시는 고정한 카드에만, 비공개 표시는 비공개 카드 · 세션에만 붙는다", async () => {
    serveMyProfile();
    const { user } = renderPersonal(<MyProfile />);
    await screen.findByText("고정한 카드");

    expect(within(cardOf("고정한 카드")).getByRole("img", { name: "핀고정됨" })).toBeInTheDocument();
    expect(within(cardOf("공개 카드")).queryByRole("img", { name: "핀고정됨" })).not.toBeInTheDocument();
    expect(within(cardOf("비공개 카드")).getByText("비공개").querySelector("svg")).not.toBeNull();
    expect(within(cardOf("공개 카드")).queryByText("비공개")).not.toBeInTheDocument();
    expect(screen.getAllByTitle("핀고정됨")).toHaveLength(1);

    await openSessions(user);
    expect(screen.getAllByText("비공개")).toHaveLength(2);
    expect(screen.getAllByTitle("핀고정됨")).toHaveLength(4);
  });

  it("마인드맵 탭은 더 보기로 다음 페이지를 이어 붙이고 끝나면 버튼이 사라진다", async () => {
    serveMyProfile({ perPage: 2 });
    const { user } = renderPersonal(<MyProfile />);

    await screen.findByText("공개 카드");
    expect(screen.queryByText("비공개 카드")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "더 보기" }));

    expect(await screen.findByText("비공개 카드")).toBeInTheDocument();
    expect(screen.getByText("고정한 카드")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "더 보기" })).not.toBeInTheDocument();
  });

  it("세션 탭은 마인드맵 탭과 따로 더 보기로 이어 붙인다", async () => {
    const fake = serveMyProfile({ perPage: 3 });
    const { user } = renderPersonal(<MyProfile />);
    await openSessions(user);
    expect(sessionTitles()).toEqual(MY_SESSIONS.slice(0, 3).map((s) => s.title));

    await user.click(screen.getByRole("button", { name: "더 보기" }));
    await screen.findByRole("heading", { level: 3, name: MY_SESSIONS[5].title });
    await user.click(screen.getByRole("button", { name: "더 보기" }));
    await screen.findByRole("heading", { level: 3, name: MY_SESSIONS[6].title });

    expect(sessionTitles()).toEqual(MY_SESSIONS.map((s) => s.title));
    expect(screen.queryByRole("button", { name: "더 보기" })).not.toBeInTheDocument();
    expect(fake.sessionQueries).toEqual([
      "?page=0&size=12&publicOnly=false",
      "?page=1&size=12&publicOnly=false",
      "?page=2&size=12&publicOnly=false",
    ]);
  });

  it("프로필을 못 받으면 오류가 보이고 다시 시도로 받는다", async () => {
    serveMyProfile();
    server.use(http.get(`${ME}/profile`, () => fail(500, SERVER_ERROR)));
    const { user } = renderPersonal(<MyProfile />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("프로필을 불러오지 못했어요.");

    serveMyProfile();
    await user.click(within(alert).getByRole("button", { name: "다시 시도" }));

    expect(await screen.findByRole("heading", { level: 1, name: "yesong" })).toBeInTheDocument();
  });

  it("마인드맵 · 세션을 못 받아도 프로필은 보이고 탭마다 따로 다시 시도한다", async () => {
    serveMyProfile();
    server.use(
      http.get(`${ME}/mindmaps`, () => fail(500, SERVER_ERROR)),
      http.get(`${ME}/sessions`, () => fail(500, SERVER_ERROR)),
    );
    const { user } = renderPersonal(<MyProfile />);

    const cardsAlert = await screen.findByRole("alert");
    expect(cardsAlert).toHaveTextContent("마인드맵을 불러오지 못했어요.");
    expect(screen.getByRole("heading", { level: 1, name: "yesong" })).toBeInTheDocument();

    await openSessions(user);
    const sessionsAlert = await screen.findByRole("alert");
    expect(sessionsAlert).toHaveTextContent("세션을 불러오지 못했어요.");

    serveMyProfile();
    await user.click(within(sessionsAlert).getByRole("button", { name: "다시 시도" }));
    expect(await screen.findByRole("heading", { level: 3, name: titleOf(9001) })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "마인드맵" }));
    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(await screen.findByText("고정한 카드")).toBeInTheDocument();
  });

  it("더 보기가 실패하면 받아 둔 항목은 두고 그 페이지만 다시 받는다", async () => {
    serveMyProfile({ perPage: 3 });
    const { user } = renderPersonal(<MyProfile />);
    await openSessions(user);
    server.use(http.get(`${ME}/sessions`, () => fail(500, SERVER_ERROR)));

    await user.click(screen.getByRole("button", { name: "더 보기" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("세션을 더 불러오지 못했어요.");
    expect(sessionTitles()).toHaveLength(3);

    serveMyProfile({ perPage: 3 });
    await user.click(within(alert).getByRole("button", { name: "다시 시도" }));

    await screen.findByRole("heading", { level: 3, name: MY_SESSIONS[5].title });
    expect(sessionTitles()).toEqual(MY_SESSIONS.slice(0, 6).map((s) => s.title));
  });

  it("아무것도 없는 프로필은 각 탭 빈 상태와 수정 화면의 공개 세션 안내를 보여준다", async () => {
    const empty = {
      ...API_MY_PROFILE,
      bio: null,
      totalNodeCount: 0,
      sharedSessionCount: 0,
      likeCount: 0,
      topHashtags: [],
      hashtags: [],
      interests: [],
      pinnedSessions: [],
    };
    serveMyProfile({ profile: empty, sessions: [], cards: [] });
    const { user } = renderPersonal(<MyProfile />);

    expect(await screen.findByRole("status")).toHaveTextContent("아직 마인드맵이 없어요.");
    expect(stat("노드")).toBe("0");
    expect(document.querySelector(".tagRow")).toBeNull();
    await openSessions(user);
    expect(await screen.findByRole("status")).toHaveTextContent("아직 세션이 없어요.");

    await user.click(screen.getByRole("button", { name: "프로필 수정" }));

    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent("공개한 세션이 없어요.");
    expect(status).toHaveTextContent("세션 상세에서 공개하면 여기서 고정할 수 있어요.");
    expect(screen.getByText("최대 10개까지 등록할 수 있어요. (0/10)")).toBeInTheDocument();
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
  });

  it("카드 팝업은 내 주소에서 관련 세션과 전체 마인드맵을 받는다", async () => {
    vi.spyOn(window, "requestAnimationFrame").mockReturnValue(0);
    serveMyProfile({ cards: MY_CARDS });
    const { user } = renderPersonal(<MyProfile />);

    await user.click(await screen.findByText("비공개 카드"));
    const dialog = screen.getByRole("dialog", { name: "비공개 카드" });
    expect(await within(dialog).findByText("· 2개")).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "마인드맵 크게 보기" }));

    expect(await screen.findByRole("dialog", { name: "yesong님의 전체 마인드맵" })).toBeInTheDocument();
  });
});

describe("프로필 수정 — 핀고정 후보", () => {
  it("공개 세션만 후보로 받고 비공개 세션은 보이지 않는다", async () => {
    const fake = serveMyProfile();
    const { user } = renderPersonal(<MyProfile />);

    const card = await openEdit(user);

    expect(await card.findByText(titleOf(9004))).toBeInTheDocument();
    expect(card.queryByText(titleOf(9006))).not.toBeInTheDocument();
    expect(card.queryByText(titleOf(9007))).not.toBeInTheDocument();
    expect(fake.sessionQueries.filter((q) => PUBLIC_ONLY.test(q))).toEqual(["?page=0&size=12&publicOnly=true"]);
  });

  it("고정 행은 프로필 응답에서 바로 보이고 후보는 그 카드의 더 보기로 이어 받는다", async () => {
    const onlyPublic = MY_SESSIONS.filter((s) => s.isPublic);
    const extra = [{ ...onlyPublic[4], id: 9100, title: "더 받은 공개 세션" }];
    serveMyProfile({ sessions: [...onlyPublic, ...extra], perPage: 4 });
    const { user } = renderPersonal(<MyProfile />);
    const card = await openEdit(user);

    expect(card.getByText(titleOf(9001))).toBeInTheDocument(); // 후보를 받기 전에도 고정 행은 있다
    await user.click(await card.findByRole("button", { name: "더 보기" }));
    expect(await card.findByText("더 받은 공개 세션")).toBeInTheDocument();
    expect(card.getByText(titleOf(9004))).toBeInTheDocument();
    expect(card.queryByRole("button", { name: "더 보기" })).not.toBeInTheDocument();
    expect(pinTitles().filter((t) => t === titleOf(9001))).toHaveLength(1); // 고정 행이 후보에 또 나오지 않는다
  });

  it("후보를 못 받아도 고정 행은 남고 저장할 수 있으며 그 카드에서 다시 시도한다", async () => {
    const fake = serveMyProfile();
    server.use(http.get(`${ME}/sessions`, () => fail(500, SERVER_ERROR)));
    const { user } = renderPersonal(<MyProfile />);
    await openSessions(user);
    const card = await openEdit(user);

    expect(await card.findByRole("alert")).toHaveTextContent("세션을 더 불러오지 못했어요.");
    expect(card.getByText(titleOf(9001))).toBeInTheDocument();
    expect(saveButton()).toBeEnabled();

    serveMyProfile();
    await user.click(card.getByRole("button", { name: "다시 시도" }));
    expect(await card.findByText(titleOf(9004))).toBeInTheDocument();
    expect(fake.puts).toEqual([]);
  });

  it("아직 안 받은 후보 페이지의 고정 세션을 풀어도 목록에 남아 다시 고정할 수 있다", async () => {
    // 후보 첫 페이지엔 없는 고정 세션 — 프로필 응답에만 있다
    const pinned = { ...MY_SESSIONS[0], id: 9200, title: "뒤 페이지의 고정 세션" };
    serveMyProfile({ profile: { ...API_MY_PROFILE, pinnedSessions: [pinned] }, sessions: MY_SESSIONS.slice(4, 5) });
    const { user } = renderPersonal(<MyProfile />);
    const card = await openEdit(user);
    await card.findByText(titleOf(9004));

    await user.click(within(card.getByText("뒤 페이지의 고정 세션").closest("label")!).getByRole("checkbox"));
    const dialog = screen.getByRole("dialog", { name: "고정을 해제할까요?" });
    expect(dialog).toHaveTextContent("맨 앞 고정만 풀려요. 세션은 공개 상태로 남아요.");
    await user.click(within(dialog).getByRole("button", { name: "해제" }));

    const row = card.getByText("뒤 페이지의 고정 세션").closest("label")!;
    expect(within(row).getByRole("checkbox")).not.toBeChecked();
  });
});

describe("프로필 저장", () => {
  it("정해진 모양의 PUT 본문 하나만 보낸다 — 끈 태그 id · 고정 순서 포함", async () => {
    const fake = serveMyProfile();
    const { user } = renderPersonal(<MyProfile />);
    await (await openEdit(user)).findByText(titleOf(9004));

    await user.clear(bioInput());
    await user.type(bioInput(), "새 소개");
    await user.type(screen.getByPlaceholderText("새 해시태그 추가"), "#기차여행{Enter}");
    await user.click(screen.getByRole("button", { name: /^#독서/ }));
    await user.click(screen.getByRole("radio", { name: /내용까지 공개/ }));
    await user.click(screen.getByRole("switch", { name: "#기차" })); // 상위 5개 밖
    await user.click(screen.getByRole("switch", { name: "#예산" })); // 비공개 → 공개
    await user.click(within(pinRow(9004)).getByRole("checkbox"));
    const dataTransfer = { effectAllowed: "none", dropEffect: "none" };
    fireEvent.dragStart(pinRow(9002), { dataTransfer });
    fireEvent.dragOver(pinRow(9001), { dataTransfer });
    fireEvent.drop(pinRow(9001), { dataTransfer });
    await user.click(saveButton());

    expect(await screen.findByText("프로필을 저장했어요.")).toBeInTheDocument();
    expect(fake.puts).toEqual([
      {
        bio: "새 소개",
        visibility: "CONTENT",
        interests: ["유럽여행", "HCI", "미술관", "프론트엔드", "기차여행"],
        hiddenHashtagIds: [6, 7],
        pinnedSessionIds: [9002, 9001, 9003, 9005, 9004],
      },
    ]);
  });

  it("아무것도 안 바꿔도 지금 값을 그대로 보낸다", async () => {
    const fake = serveMyProfile();
    const { user } = renderPersonal(<MyProfile />);
    await openEdit(user);

    await user.click(saveButton());

    await waitFor(() =>
      expect(fake.puts).toEqual([
        {
          bio: API_MY_PROFILE.bio,
          visibility: "URL_ONLY",
          interests: ["유럽여행", "HCI", "미술관", "프론트엔드", "독서"],
          hiddenHashtagIds: [5, 7],
          pinnedSessionIds: [9001, 9003, 9002, 9005],
        },
      ]),
    );
  });

  it("저장하면 입력값이 아니라 다시 받은 서버 값을 보여주고 카드 · 세션도 새로 받는다", async () => {
    const fake = serveMyProfile();
    const { user } = renderPersonal(<MyProfile />);
    await screen.findByText("고정한 카드");
    await openEdit(user);
    await user.clear(bioInput());
    await user.type(bioInput(), "입력한 소개");

    let cardCalls = 0;
    server.use(
      http.get(`${ME}/profile`, () => ok({ ...API_MY_PROFILE, bio: "서버가 다듬은 소개", sharedSessionCount: 9 })),
      http.get(`${ME}/mindmaps`, () => {
        cardCalls += 1;
        return ok({ mindmaps: [apiMyCard({ mindmapId: 50, title: "새로 받은 카드" })], hasNext: false });
      }),
    );
    const before = fake.sessionQueries.filter((q) => !PUBLIC_ONLY.test(q)).length;
    await user.click(saveButton());

    expect(await screen.findByText("서버가 다듬은 소개")).toBeInTheDocument();
    expect(screen.queryByText("입력한 소개")).not.toBeInTheDocument();
    expect(stat("공유 세션")).toBe("9");
    expect(await screen.findByText("새로 받은 카드")).toBeInTheDocument();
    expect(screen.queryByText("고정한 카드")).not.toBeInTheDocument(); // 예전 카드에 이어 붙이지 않는다
    expect(cardCalls).toBe(1);
    expect(fake.sessionQueries.filter((q) => !PUBLIC_ONLY.test(q))).toHaveLength(before + 1);
  });

  it("저장 뒤 다시 받기가 실패하면 저장은 알리고 오류와 다시 시도를 보여준다", async () => {
    const fake = serveMyProfile();
    const { user } = renderPersonal(<MyProfile />);
    await openEdit(user);
    server.use(http.get(`${ME}/profile`, () => fail(500, SERVER_ERROR)));

    await user.click(saveButton());

    expect(await screen.findByText("프로필을 저장했어요.")).toBeInTheDocument();
    expect(await screen.findByText("프로필을 불러오지 못했어요.")).toBeInTheDocument();
    expect(fake.puts).toHaveLength(1);
  });

  it("저장 중에는 저장 · 취소가 잠기고 다시 눌러도 요청은 하나다", async () => {
    let release!: () => void;
    let calls = 0;
    serveMyProfile();
    server.use(
      http.put(`${ME}/profile`, async () => {
        calls += 1;
        await new Promise<void>((r) => (release = r));
        return ok(null);
      }),
    );
    const { user } = renderPersonal(<MyProfile />);
    await openEdit(user);

    await user.click(saveButton());

    const saving = await screen.findByRole("button", { name: "저장 중…" });
    expect(saving).toBeDisabled();
    expect(screen.getByRole("button", { name: "취소" })).toBeDisabled();
    await user.click(saving);
    await waitFor(() => expect(calls).toBe(1));

    release();
    expect(await screen.findByText("프로필을 저장했어요.")).toBeInTheDocument();
    expect(calls).toBe(1);
  });

  it("거절되면 서버 메시지를 토스트로 알리고 수정 화면과 입력값이 그대로 남아 다시 저장할 수 있다", async () => {
    serveMyProfile();
    const { user } = renderPersonal(<MyProfile />);
    await (await openEdit(user)).findByText(titleOf(9004));
    server.use(http.put(`${ME}/profile`, () => fail(400, BAD_PROFILE)));

    await user.clear(bioInput());
    await user.type(bioInput(), "지키고 싶은 소개");
    await user.type(screen.getByPlaceholderText("새 해시태그 추가"), "기차여행{Enter}");
    await user.click(screen.getByRole("switch", { name: "#기차" }));
    await user.click(within(pinRow(9004)).getByRole("checkbox"));
    await user.click(saveButton());

    expect(await screen.findByText(BAD_PROFILE)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "프로필 수정" })).toBeInTheDocument();
    expect(screen.queryByText("프로필을 저장했어요.")).not.toBeInTheDocument();
    expect(bioInput()).toHaveValue("지키고 싶은 소개");
    expect(screen.getByRole("button", { name: /^#기차여행/ })).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "#기차" })).toHaveAttribute("aria-checked", "false");
    expect(within(pinRow(9004)).getByRole("checkbox")).toBeChecked();
    await waitFor(() => expect(saveButton()).toBeEnabled());

    const again = serveMyProfile();
    await user.click(saveButton());

    expect(await screen.findByText("프로필을 저장했어요.")).toBeInTheDocument();
    expect(again.puts[0]).toMatchObject({ bio: "지키고 싶은 소개", hiddenHashtagIds: [5, 6, 7] });
  });

  it("저장한 고정은 다시 열어도 고정 행으로 보인다", async () => {
    serveMyProfile();
    const { user } = renderPersonal(<MyProfile />);
    await (await openEdit(user)).findByText(titleOf(9004));
    await user.click(within(pinRow(9004)).getByRole("checkbox"));
    await user.click(saveButton());

    const card = await openEdit(user);

    expect(await card.findByText(titleOf(9004))).toBeInTheDocument();
    expect(within(pinRow(9004)).getByRole("checkbox")).toBeChecked();
    expect(pinRow(9004)).toHaveAttribute("draggable", "true");
  });

  describe("닉네임과 함께", () => {
    function MemberHost({ children, onChange }: { children: ReactNode; onChange: (m: MemberResponse) => void }) {
      const [member, setMember] = useState(MEMBER);
      const update = (m: MemberResponse) => {
        onChange(m);
        setMember(m);
      };
      return (
        <PersonalProvider member={member} updateMember={update} logout={() => {}}>
          {children}
        </PersonalProvider>
      );
    }

    const servePatch = () => {
      const bodies: unknown[] = [];
      server.use(
        http.patch(`${API}/members/me/nickname`, async ({ request }) => {
          bodies.push(await request.json());
          return ok({ ...MEMBER, nickname: "sprout" });
        }),
      );
      return bodies;
    };

    it("닉네임을 먼저 저장하고 그다음 프로필을 저장한다", async () => {
      const order: string[] = [];
      const fake = serveMyProfile();
      server.use(
        http.patch(`${API}/members/me/nickname`, () => {
          order.push("nickname");
          return ok({ ...MEMBER, nickname: "sprout" });
        }),
      );
      const onChange = vi.fn(() => order.push("member"));
      const { user } = renderApp(
        <MemberHost onChange={onChange}>
          <MyProfile />
        </MemberHost>,
      );
      await openEdit(user);
      const nickname = screen.getByDisplayValue("yesong");
      await user.clear(nickname);
      await user.type(nickname, "sprout");
      await user.click(saveButton());

      expect(await screen.findByRole("heading", { level: 1, name: "sprout" })).toBeInTheDocument();
      expect(onChange).toHaveBeenCalledWith({ ...MEMBER, nickname: "sprout" });
      expect(order).toEqual(["nickname", "member"]);
      expect(fake.puts).toHaveLength(1);
    });

    it("닉네임은 저장됐는데 프로필이 실패하면 토스트 후 입력값을 지키고, 다시 저장할 때 닉네임은 또 보내지 않는다", async () => {
      serveMyProfile();
      const bodies = servePatch();
      server.use(http.put(`${ME}/profile`, () => fail(400, BAD_PROFILE)));
      const onChange = vi.fn();
      const { user } = renderApp(
        <MemberHost onChange={onChange}>
          <MyProfile />
        </MemberHost>,
      );
      await openEdit(user);
      const nickname = screen.getByDisplayValue("yesong");
      await user.clear(nickname);
      await user.type(nickname, "sprout");
      await user.click(saveButton());

      expect(await screen.findByText(BAD_PROFILE)).toBeInTheDocument();
      expect(screen.getByRole("heading", { level: 1, name: "프로필 수정" })).toBeInTheDocument();
      expect(nickname).toHaveValue("sprout");
      expect(onChange).toHaveBeenCalledOnce();
      await waitFor(() => expect(saveButton()).toBeEnabled());

      const fake = serveMyProfile();
      await user.click(saveButton());

      expect(await screen.findByRole("heading", { level: 1, name: "sprout" })).toBeInTheDocument();
      expect(bodies).toEqual([{ nickname: "sprout" }]);
      expect(fake.puts).toHaveLength(1);
    });
  });
});
