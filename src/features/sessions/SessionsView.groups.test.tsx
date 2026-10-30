import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TagGroup, TagGroupCreateRequest, TagGroupOrderRequest, TagGroupUpdateRequest } from "@/lib/api";
import {
  SESSION_HASHTAGS,
  SESSION_LIST,
  STATUS_SESSIONS,
  TAG_GROUPS,
  sessionById,
  tagGroup,
} from "@/test/fixtures/sessions";
import { API, fail, ok, server } from "@/test/msw/server";
import { mockRouter } from "@/test/router";
import { renderSessions, serveSessions } from "./sessionsViewTestUtils";

let groups: TagGroup[];
let hashtagCalls: number;

beforeEach(() => {
  groups = TAG_GROUPS;
  hashtagCalls = 0;
  serveSessions(SESSION_LIST);
  server.use(
    http.get(`${API}/tag-groups`, () => ok(groups)),
    http.get(`${API}/sessions/hashtags`, () => {
      hashtagCalls += 1;
      return ok(SESSION_HASHTAGS);
    }),
  );
});

/** 해시태그(그룹) 보기로 바꾼 뒤 그룹이 그려질 때까지 기다린다 */
async function renderGroups() {
  const view = renderSessions();
  await screen.findByRole("heading", { level: 3, name: sessionById(9001).title });
  await view.user.click(screen.getByRole("button", { name: "해시태그" }));
  return view;
}

const sections = () => Array.from(document.querySelectorAll<HTMLElement>(".group"));
const headTags = (section: HTMLElement) =>
  within(section.querySelector<HTMLElement>(".groupTags")!)
    .getAllByRole("button")
    .map((b) => b.textContent);
const sectionHeads = () => sections().map(headTags);
const sectionOf = (tag: string) => sections().find((s) => headTags(s).includes(`#${tag}`))!;

/** 열린 편집기 (새 그룹 만들기 / 그룹 수정) */
const editor = () => document.querySelector<HTMLElement>(".modal")!;
const editorTags = () => editor().querySelector<HTMLElement>(".tagList")!;
const editorTag = (tag: string) => within(editorTags()).getByRole("button", { name: `#${tag}` });
/** 편집기에 GET /sessions/hashtags 로 받은 해시태그가 다 들어올 때까지 기다린다 */
const serverTagsLoaded = () => within(editor()).findByText(`전체 해시태그 (${SESSION_HASHTAGS.length})`);

describe("해시태그 그룹 보기", () => {
  it("그룹마다 해시태그 칩과 세션 개수, 그 그룹 세션 카드가 보인다", async () => {
    await renderGroups();
    expect(sectionHeads()).toEqual([["#로마", "#콜로세움"], ["#항공권", "#예산"], ["#React", "#TypeScript"]]);

    const flights = within(sectionOf("항공권"));
    expect(flights.getByText("7개 세션")).toBeInTheDocument();
    expect(flights.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual(
      TAG_GROUPS[1].sessions.map((s) => s.title),
    );
    expect(within(sectionOf("로마")).getByText("1개 세션")).toBeInTheDocument();
  });

  it("해시태그를 가진 세션이 없는 그룹은 비어 있다고 안내한다", async () => {
    await renderGroups();
    const react = within(sectionOf("React"));
    expect(react.getByText("0개 세션")).toBeInTheDocument();
    expect(react.getByText("이 그룹의 해시태그를 가진 세션이 없습니다.")).toBeInTheDocument();
  });

  it("서버가 순서를 섞어 보내도 position 순으로 보인다", async () => {
    groups = [TAG_GROUPS[2], TAG_GROUPS[0], TAG_GROUPS[1]];
    await renderGroups();
    expect(sectionHeads()).toEqual([["#로마", "#콜로세움"], ["#항공권", "#예산"], ["#React", "#TypeScript"]]);
  });

  it("그룹 안 카드를 누르면 그 세션 상세로 이동한다", async () => {
    const { user } = await renderGroups();
    const rome = within(sectionOf("로마")).getByRole("heading", { level: 3, name: sessionById(9001).title });
    await user.click(rome);
    expect(mockRouter.push).toHaveBeenCalledWith("/sessions/9001");
  });

  it("그룹 안의 수집 중 · 분석 대기 · 분석 중 · 분석 실패 카드는 상태만 보이고 눌러도 상세로 이동하지 않는다", async () => {
    groups = [tagGroup(4, "일본", ["일본"], 0, STATUS_SESSIONS)];
    const { user } = await renderGroups();
    const japan = within(sectionOf("일본"));
    expect(japan.getByText("4개 세션")).toBeInTheDocument();

    const labels = ["수집 중", "분석 대기", "분석 중", "분석 실패"];
    for (const [i, s] of STATUS_SESSIONS.slice(0, 4).entries()) {
      const c = japan.getByRole("heading", { level: 3, name: s.title }).closest<HTMLElement>(".card")!;
      expect(within(c).getByText(labels[i])).toBeInTheDocument();
      expect(within(c).queryByText(`${s.pageCount}개 URL`)).not.toBeInTheDocument();
      expect(c).toHaveAttribute("aria-disabled", "true");
      await user.click(c);
    }
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it("그룹 안 카드의 별을 누르면 PATCH { isFavorite } 를 보낸다", async () => {
    const bodies: unknown[] = [];
    server.use(
      http.patch(`${API}/sessions/:id`, async ({ request, params }) => {
        bodies.push([params.id, await request.json()]);
        return ok(null);
      }),
    );
    const { user } = await renderGroups();
    const card = within(sectionOf("항공권")).getByRole("heading", { level: 3, name: sessionById(9002).title });
    await user.click(within(card.closest<HTMLElement>('[role="button"]')!).getByRole("button", { name: "즐겨찾기" }));
    await waitFor(() => expect(bodies).toEqual([["9002", { isFavorite: true }]]));
  });

  it("그룹이 없으면 빈 상태 안내와 '새 그룹 만들기' 버튼이 보이고, 누르면 편집기가 열린다", async () => {
    groups = [];
    const { user } = await renderGroups();
    expect(screen.getByRole("heading", { level: 3, name: "아직 만든 그룹이 없습니다" })).toBeInTheDocument();
    expect(screen.getByText("여러 해시태그를 묶어 관련 세션들을 한 번에 관리해보세요.")).toBeInTheDocument();
    expect(screen.getByText("전체 25개 세션 · 11개 즐겨찾기 · 0개 그룹")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "새 그룹 만들기" }));
    expect(screen.getByRole("heading", { level: 2, name: "새 그룹 만들기" })).toBeInTheDocument();
    await serverTagsLoaded();
  });

  it("그룹 목록을 못 불러오면 해시태그 보기에서 오류와 다시 시도가 보인다", async () => {
    let attempt = 0;
    server.use(
      http.get(`${API}/tag-groups`, () => {
        attempt += 1;
        return attempt === 1 ? fail(500, "그룹을 불러오지 못했어요.") : ok(TAG_GROUPS);
      }),
    );
    const { user } = await renderGroups();
    expect(screen.getByRole("alert")).toHaveTextContent("그룹을 불러오지 못했어요.");

    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    await waitFor(() => expect(sections()).toHaveLength(3));
  });
});

describe("해시태그 그룹 만들기", () => {
  function onCreate(respond: (body: TagGroupCreateRequest) => Response) {
    const bodies: TagGroupCreateRequest[] = [];
    server.use(
      http.post(`${API}/tag-groups`, async ({ request }) => {
        const body = (await request.json()) as TagGroupCreateRequest;
        bodies.push(body);
        return respond(body);
      }),
    );
    return bodies;
  }

  it("전체 해시태그는 편집기를 열 때 GET /sessions/hashtags 로 받은 내 세션 전체 해시태그를 서버 순서대로 보여 준다", async () => {
    const { user } = await renderGroups();
    expect(hashtagCalls).toBe(0); // 편집기를 열기 전엔 받지 않는다
    await user.click(screen.getByRole("button", { name: "새 그룹 만들기" }));

    await serverTagsLoaded();
    const shown = within(editorTags())
      .getAllByRole("button")
      .map((b) => b.textContent?.trim());
    expect(shown).toEqual(SESSION_HASHTAGS.map((t) => `#${t}`));
    // 목록은 0페이지(10개)만 받았지만 뒤 페이지 세션의 태그도 있다
    expect(editorTag("파르테논")).toBeInTheDocument();
    expect(hashtagCalls).toBe(1);
  });

  it("편집기를 다시 열면 해시태그를 다시 받는다", async () => {
    const { user } = await renderGroups();
    await user.click(screen.getByRole("button", { name: "새 그룹 만들기" }));
    await serverTagsLoaded();
    await user.click(within(editor()).getByRole("button", { name: "취소" }));

    await user.click(within(sectionOf("로마")).getByRole("button", { name: "수정" }));
    await waitFor(() => expect(hashtagCalls).toBe(2));
    await serverTagsLoaded();
  });

  it("GET /sessions/hashtags 가 실패하면 후보 없이 열리고 다시 열어 달라는 안내 토스트가 뜬다", async () => {
    server.use(http.get(`${API}/sessions/hashtags`, () => fail(500, "서버 오류가 발생했습니다.")));
    const { user } = await renderGroups();
    await user.click(screen.getByRole("button", { name: "새 그룹 만들기" }));

    expect(await screen.findByText("해시태그 목록을 불러오지 못했어요. 편집 창을 다시 열어 주세요.")).toBeInTheDocument();
    expect(within(editor()).getByText("전체 해시태그 (0)")).toBeInTheDocument();
  });

  it("태그를 고르고 순서를 바꿔 만들면 POST /tag-groups 에 앞 3개로 지은 이름과 태그를 보내고 새 그룹이 맨 뒤에 붙는다", async () => {
    const bodies = onCreate((body) => ok(tagGroup(4, body.name, body.hashtags ?? [], 3)));
    const { user } = await renderGroups();
    await user.click(screen.getByRole("button", { name: "새 그룹 만들기" }));
    await serverTagsLoaded();

    // #파르테논 은 아직 안 불러온 목록 뒤 페이지 세션에만 있다
    await user.type(screen.getByPlaceholderText("해시태그 검색"), "파");
    await user.click(editorTag("파리"));
    await user.click(editorTag("파르테논"));
    await user.clear(screen.getByPlaceholderText("해시태그 검색"));
    await user.click(editorTag("미술관"));
    await user.click(editorTag("루브르"));
    expect(within(editor()).getByText("(4/10)")).toBeInTheDocument();

    // 맨 뒤 #루브르 를 맨 앞으로 끌어 놓기
    const chips = within(editor()).getAllByTitle("드래그로 순서 변경");
    const dataTransfer = { effectAllowed: "" };
    fireEvent.dragStart(chips[3], { dataTransfer });
    fireEvent.dragOver(chips[0], { dataTransfer });
    fireEvent.drop(chips[0], { dataTransfer });

    await user.click(within(editor()).getByRole("button", { name: "그룹 만들기" }));
    await waitFor(() =>
      expect(bodies).toEqual([{ name: "루브르, 파리, 파르테논", hashtags: ["루브르", "파리", "파르테논", "미술관"] }]),
    );
    await waitFor(() => expect(document.querySelector(".modal")).not.toBeInTheDocument());
    expect(sectionHeads().at(-1)).toEqual(["#루브르", "#파리", "#파르테논", "#미술관"]);
    expect(screen.getByText("전체 25개 세션 · 11개 즐겨찾기 · 4개 그룹")).toBeInTheDocument();
  });

  it("만들기에 실패하면 서버 메시지를 토스트로 띄우고 편집기는 열어 둔다", async () => {
    onCreate(() => fail(400, "해시태그는 최대 10개까지 입력할 수 있습니다."));
    const { user } = await renderGroups();
    await user.click(screen.getByRole("button", { name: "새 그룹 만들기" }));
    await serverTagsLoaded();
    await user.click(editorTag("로마"));
    await user.click(within(editor()).getByRole("button", { name: "그룹 만들기" }));

    expect(await screen.findByText("해시태그는 최대 10개까지 입력할 수 있습니다.")).toBeInTheDocument();
    expect(editor()).toBeInTheDocument();
    expect(sections()).toHaveLength(3);
  });

  it("취소하면 아무 요청 없이 편집기가 닫힌다", async () => {
    const bodies = onCreate(() => ok(null));
    const { user } = await renderGroups();
    await user.click(screen.getByRole("button", { name: "새 그룹 만들기" }));
    await serverTagsLoaded();
    await user.click(editorTag("로마"));
    await user.click(within(editor()).getByRole("button", { name: "취소" }));
    expect(document.querySelector(".modal")).not.toBeInTheDocument();
    expect(bodies).toEqual([]);
  });
});

describe("해시태그 그룹 수정", () => {
  function onUpdate(respond: (id: number, body: TagGroupUpdateRequest) => Response) {
    const requests: { id: number; body: TagGroupUpdateRequest }[] = [];
    server.use(
      http.patch(`${API}/tag-groups/:id`, async ({ request, params }) => {
        const id = Number(params.id);
        const body = (await request.json()) as TagGroupUpdateRequest;
        requests.push({ id, body });
        return respond(id, body);
      }),
    );
    return requests;
  }

  it("수정을 누르면 그 그룹 태그가 골라진 채 열리고, 수정 완료하면 PATCH /tag-groups/{id} 에 hashtags 만 보낸다", async () => {
    const requests = onUpdate((id, body) => {
      const cur = TAG_GROUPS.find((g) => g.id === id)!;
      return ok(tagGroup(id, cur.name, body.hashtags ?? cur.hashtags, cur.position));
    });
    const { user } = await renderGroups();
    await user.click(within(sectionOf("항공권")).getByRole("button", { name: "수정" }));
    expect(within(editor()).getByRole("heading", { name: "그룹 수정" })).toBeInTheDocument();
    await serverTagsLoaded();
    expect(within(editor()).getAllByTitle("드래그로 순서 변경").map((c) => c.textContent)).toEqual(["#항공권", "#예산"]);

    await user.click(within(editor()).getAllByRole("button", { name: "해제" })[0]); // #항공권 빼기
    await user.click(editorTag("기차"));
    await user.click(within(editor()).getByRole("button", { name: "수정 완료" }));

    await waitFor(() => expect(requests).toEqual([{ id: 2, body: { hashtags: ["예산", "기차"] } }]));
    await waitFor(() => expect(document.querySelector(".modal")).not.toBeInTheDocument());
    expect(sectionHeads()[1]).toEqual(["#예산", "#기차"]);
    const expected = tagGroup(2, "", ["예산", "기차"], 1).sessions.length;
    expect(within(sections()[1]).getByText(`${expected}개 세션`)).toBeInTheDocument();
  });

  it("수정에 실패하면 토스트를 띄우고 그룹은 그대로 둔다", async () => {
    onUpdate(() => fail(404, "해시태그 그룹을 찾을 수 없습니다."));
    const { user } = await renderGroups();
    await user.click(within(sectionOf("로마")).getByRole("button", { name: "수정" }));
    await serverTagsLoaded();
    await user.click(editorTag("바티칸"));
    await user.click(within(editor()).getByRole("button", { name: "수정 완료" }));

    expect(await screen.findByText("해시태그 그룹을 찾을 수 없습니다.")).toBeInTheDocument();
    expect(sectionHeads()[0]).toEqual(["#로마", "#콜로세움"]);
  });
});

describe("해시태그 그룹 삭제", () => {
  function onDelete(respond: () => Response) {
    const ids: number[] = [];
    server.use(
      http.delete(`${API}/tag-groups/:id`, ({ params }) => {
        ids.push(Number(params.id));
        return respond();
      }),
    );
    return ids;
  }

  it("확인창에서 확인하면 DELETE /tag-groups/{id} 를 보내고 그 그룹이 사라진다", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const ids = onDelete(() => ok(null));
    const { user } = await renderGroups();
    await user.click(within(sectionOf("항공권")).getByRole("button", { name: "삭제" }));

    expect(confirm).toHaveBeenCalledWith("이 그룹을 삭제할까요?");
    expect(sectionHeads()).toEqual([["#로마", "#콜로세움"], ["#React", "#TypeScript"]]);
    await waitFor(() => expect(ids).toEqual([2]));
    expect(screen.getByText("전체 25개 세션 · 11개 즐겨찾기 · 2개 그룹")).toBeInTheDocument();
  });

  it("확인창에서 취소하면 아무 요청도 보내지 않는다", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const ids = onDelete(() => ok(null));
    const { user } = await renderGroups();
    await user.click(within(sectionOf("항공권")).getByRole("button", { name: "삭제" }));
    expect(sections()).toHaveLength(3);
    expect(ids).toEqual([]);
  });

  it("삭제에 실패하면 그룹을 되살리고 토스트를 띄운다", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    onDelete(() => fail(404, "해시태그 그룹을 찾을 수 없습니다."));
    const { user } = await renderGroups();
    await user.click(within(sectionOf("항공권")).getByRole("button", { name: "삭제" }));

    expect(await screen.findByText("해시태그 그룹을 찾을 수 없습니다.")).toBeInTheDocument();
    expect(sectionHeads()).toEqual([["#로마", "#콜로세움"], ["#항공권", "#예산"], ["#React", "#TypeScript"]]);
  });
});

describe("해시태그 그룹 순서", () => {
  function onReorder(respond: (body: TagGroupOrderRequest) => Response) {
    const bodies: TagGroupOrderRequest[] = [];
    server.use(
      http.patch(`${API}/tag-groups/order`, async ({ request }) => {
        const body = (await request.json()) as TagGroupOrderRequest;
        bodies.push(body);
        return respond(body);
      }),
    );
    return bodies;
  }

  it("첫 그룹은 위로 이동할 수 없다", async () => {
    await renderGroups();
    expect(within(sections()[0]).getByRole("button", { name: "위로 이동" })).toBeDisabled();
    expect(within(sections()[1]).getByRole("button", { name: "위로 이동" })).toBeEnabled();
  });

  it("위로 이동하면 PATCH /tag-groups/order 에 내 그룹 전체를 바뀐 순서로 보내고 서버 순서대로 보인다", async () => {
    const bodies = onReorder(({ groupIds }) =>
      ok(groupIds.map((id, position) => ({ ...TAG_GROUPS.find((g) => g.id === id)!, position }))),
    );
    const { user } = await renderGroups();
    await user.click(within(sectionOf("React")).getByRole("button", { name: "위로 이동" }));

    expect(sectionHeads()).toEqual([["#로마", "#콜로세움"], ["#React", "#TypeScript"], ["#항공권", "#예산"]]);
    await waitFor(() => expect(bodies).toEqual([{ groupIds: [1, 3, 2] }]));
    expect(sectionHeads()).toEqual([["#로마", "#콜로세움"], ["#React", "#TypeScript"], ["#항공권", "#예산"]]);
  });

  it("순서 변경에 실패하면 원래 순서로 되돌리고 토스트를 띄운다", async () => {
    onReorder(() => fail(400, "정렬할 그룹 목록이 올바르지 않습니다."));
    const { user } = await renderGroups();
    await user.click(within(sectionOf("항공권")).getByRole("button", { name: "위로 이동" }));

    expect(await screen.findByText("정렬할 그룹 목록이 올바르지 않습니다.")).toBeInTheDocument();
    expect(sectionHeads()).toEqual([["#로마", "#콜로세움"], ["#항공권", "#예산"], ["#React", "#TypeScript"]]);
  });
});
