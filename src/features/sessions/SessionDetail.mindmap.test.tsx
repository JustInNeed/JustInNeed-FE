import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionDetail as SessionDetailData, SessionMindmap } from "@/lib/api";
import {
  EMPTY_MINDMAP,
  FOREIGN_DETAIL,
  PARIS_DETAIL,
  PARIS_MINDMAP,
  ROME_DETAIL,
  ROME_MINDMAP,
} from "@/test/fixtures/sessions";
import { API, SERVER_ERROR, fail, ok, server } from "@/test/msw/server";
import { gate, renderDetail } from "./sessionDetailTestUtils";

// 방사형 배치는 requestAnimationFrame 으로 계속 움직여서, 테스트에서는 멈춰 두고 처음 위치로 확인한다
beforeEach(() => {
  vi.spyOn(window, "requestAnimationFrame").mockReturnValue(0);
});

const button = (name: string) => screen.getByRole("button", { name });
const mapTab = () => button("마인드맵 보기");

async function openMindmap(detail: SessionDetailData = ROME_DETAIL, mindmap: SessionMindmap = ROME_MINDMAP) {
  const view = await renderDetail(detail, undefined, mindmap);
  await view.user.click(mapTab());
  await waitFor(() => expect(map()).toBeInTheDocument());
  return view;
}

const map = () => document.querySelector<SVGSVGElement>('svg[viewBox="0 0 1000 680"]')!;
/** 라벨로 찾은 노드 그룹 (<g>) — 라벨 글자는 pointer-events: none 이라 그룹을 누른다 */
const nodeOf = (label: string) => within(map() as unknown as HTMLElement).getByText(label).closest("g")!;
/** 노드 라벨 (svg > 확대·이동 g > 노드 g > text) — 좌하단 조작 안내 글자는 빼고 */
const nodeLabels = () => Array.from(map().querySelectorAll("svg > g > g > text")).map((t) => t.textContent);
/** 노드 위치 [x, y] — 반올림 */
const where = (label: string) =>
  nodeOf(label)
    .getAttribute("transform")!
    .match(/-?[\d.]+/g)!
    .map((v) => Math.round(Number(v)));
const toolbar = () => document.querySelector<HTMLElement>(".mapToolbar");
const toolbarButton = (name: string) => within(toolbar()!).getByRole("button", { name });

describe("세션 상세 — 줄글 / 마인드맵 탭", () => {
  it("처음엔 줄글 보기가 선택돼 있고, 마인드맵 보기를 누르면 본문 대신 마인드맵이 보인다", async () => {
    const { user } = await renderDetail();
    expect(button("줄글 보기")).toHaveClass("tabActive");
    expect(map()).toBeNull();

    await user.click(mapTab());
    expect(mapTab()).toHaveClass("tabActive");
    expect(button("줄글 보기")).not.toHaveClass("tabActive");
    await waitFor(() => expect(map()).toBeInTheDocument());
    expect(screen.queryByRole("heading", { level: 2, name: "한눈에 보기" })).not.toBeInTheDocument();

    await user.click(button("줄글 보기"));
    expect(map()).toBeNull();
    expect(screen.getByRole("heading", { level: 2, name: "한눈에 보기" })).toBeInTheDocument();
  });

  it("응답의 키워드로 노드를 그리고 연결선을 잇는다, 출처 목록은 옆에 그대로 있다", async () => {
    await openMindmap();
    expect(nodeLabels()).toEqual(ROME_MINDMAP.nodes.map((n) => n.keyword));
    expect(map().querySelectorAll("line")).toHaveLength(ROME_MINDMAP.edges.length);
    expect(screen.getByText("드래그로 이동 · 휠로 줌 · 노드 클릭으로 선택")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "출처 (3)" })).toBeInTheDocument();
  });

  it("루트가 여럿이면 세션 제목 노드를 가운데 두고, related · 지름길 연결선은 쌍마다 하나만 그린다", async () => {
    await openMindmap(PARIS_DETAIL, PARIS_MINDMAP);
    expect(nodeLabels()).toEqual([PARIS_DETAIL.title, ...PARIS_MINDMAP.nodes.map((n) => n.keyword)]);
    expect(where(PARIS_DETAIL.title)).toEqual([500, 340]);
    // 중심 → 루트 2개 + 부모 → 자식 4개 + 지름길 1개 + related 1개 (방향만 다른 related 는 합침)
    expect(map().querySelectorAll("line")).toHaveLength(8);
  });

  it("중심 노드는 세션 제목을 고치면 다시 그리지 않아도 같이 바뀐다", async () => {
    const { user } = await openMindmap(PARIS_DETAIL, PARIS_MINDMAP);
    await user.click(button("편집"));
    await user.clear(screen.getByPlaceholderText("세션 제목"));
    await user.type(screen.getByPlaceholderText("세션 제목"), "파리 미술관 최종");
    await user.click(button("저장"));
    await screen.findByRole("heading", { level: 1, name: "파리 미술관 최종" });

    await user.click(mapTab());
    expect(nodeLabels()[0]).toBe("파리 미술관 최종");
  });

  it("다른 사람의 공개 세션도 마인드맵을 볼 수 있다", async () => {
    await openMindmap(FOREIGN_DETAIL, PARIS_MINDMAP);
    expect(nodeLabels()).toContain("모나리자");
  });
});

describe("세션 상세 — 마인드맵 불러오기", () => {
  const onMindmap = (respond: () => Response | Promise<Response>, options?: { once: boolean }) =>
    server.use(http.get(`${API}/sessions/:id/mindmap`, respond, options));

  it("탭을 열기 전에는 요청하지 않는다", async () => {
    const { mapRequests } = await renderDetail();
    await new Promise((r) => setTimeout(r, 30));
    expect(mapRequests).toEqual([]);
  });

  it("탭을 열면 받는 동안 안내를 보여 주고, 받으면 마인드맵을 그린다", async () => {
    const { user } = await renderDetail();
    const g = gate();
    onMindmap(async () => {
      await g.opened;
      return ok(ROME_MINDMAP);
    });
    await user.click(mapTab());
    expect(screen.getByText("불러오는 중…")).toBeInTheDocument();
    expect(toolbar()).toBeNull();
    expect(map()).toBeNull();

    g.open();
    await waitFor(() => expect(map()).toBeInTheDocument());
    expect(screen.queryByText("불러오는 중…")).not.toBeInTheDocument();
    expect(toolbar()).toBeInTheDocument();
  });

  it("탭을 오가도 다시 받지 않는다", async () => {
    const { user, mapRequests } = await openMindmap();
    await user.click(button("줄글 보기"));
    await user.click(mapTab());
    expect(map()).toBeInTheDocument();
    expect(mapRequests).toEqual(["9001"]);
  });

  it("받지 못하면 서버 문구와 다시 시도가 보이고, 누르면 다시 받아 그린다", async () => {
    const { user, mapRequests } = await renderDetail();
    onMindmap(() => fail(500, SERVER_ERROR), { once: true });
    await user.click(mapTab());

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(SERVER_ERROR);
    expect(map()).toBeNull();
    expect(toolbar()).toBeNull();

    await user.click(within(alert).getByRole("button", { name: "다시 시도" }));
    await waitFor(() => expect(map()).toBeInTheDocument());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(mapRequests).toEqual(["9001"]); // 기본 응답은 두 번째 요청에서 처음 쓰였다
  });

  it("마인드맵이 비어 있으면 안내만 보이고 배치 도구는 없다", async () => {
    const { user } = await renderDetail(ROME_DETAIL, undefined, EMPTY_MINDMAP);
    await user.click(mapTab());
    expect(await screen.findByText("아직 마인드맵이 없어요")).toBeInTheDocument();
    expect(screen.getByText("분석 결과에 마인드맵이 없는 세션이에요.")).toBeInTheDocument();
    expect(map()).toBeNull();
    expect(toolbar()).toBeNull();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  describe("자동 저장", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("자동 저장 · 저장을 해도 마인드맵을 다시 받지 않는다", async () => {
      vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"], now: new Date("2026-04-27T10:00:00") });
      const { user, patches, mapRequests } = await openMindmap();
      await user.click(button("편집"));
      await user.clear(screen.getByPlaceholderText("세션 제목"));
      await user.type(screen.getByPlaceholderText("세션 제목"), "로마 4박 5일");

      await act(() => vi.advanceTimersByTimeAsync(30_000));
      await waitFor(() => expect(patches).toHaveLength(1));
      await user.click(button("저장"));
      await screen.findByRole("heading", { level: 1, name: "로마 4박 5일" });
      await user.click(mapTab());

      expect(map()).toBeInTheDocument();
      expect(mapRequests).toEqual(["9001"]);
    });
  });
});

describe("세션 상세 — 마인드맵 배치", () => {
  it("처음엔 방사형이고, 계층형을 누르면 깊이마다 왼쪽에서 오른쪽 열로 늘어놓는다", async () => {
    const { user } = await openMindmap();
    expect(toolbarButton("방사형")).toHaveAttribute("aria-pressed", "true");
    expect(where("로마 여행")).toEqual([500, 340]);
    expect(where("콜로세움")).toEqual([500, 205]);
    expect(where("통합권")).toEqual([500, 70]);

    await user.click(toolbarButton("계층형"));
    expect(toolbarButton("계층형")).toHaveAttribute("aria-pressed", "true");
    expect(toolbarButton("방사형")).toHaveAttribute("aria-pressed", "false");
    expect(where("로마 여행")).toEqual([220, 340]);
    expect([where("콜로세움"), where("바티칸"), where("먹거리")]).toEqual([
      [500, 284],
      [500, 340],
      [500, 396],
    ]);
    expect(where("통합권")).toEqual([780, 284]);

    await user.click(toolbarButton("방사형"));
    expect(where("로마 여행")).toEqual([500, 340]);
  });

  it("계층형 깊이는 primary 계층만 따른다 — 루트에서 바로 가는 지름길이 있어도 유닛은 주제 다음 열이다", async () => {
    const { user } = await openMindmap(PARIS_DETAIL, PARIS_MINDMAP);
    await user.click(toolbarButton("계층형"));
    const [topicX] = where("모나리자");
    const [shortcutUnitX] = where("화요일");
    const [plainUnitX] = where("목요일");
    expect(shortcutUnitX).toBe(plainUnitX);
    expect(shortcutUnitX).toBeGreaterThan(topicX);
  });

  it("노드를 끌어 옮긴 뒤 자동 정렬을 누르면 처음 배치로 돌아간다", async () => {
    const { user } = await openMindmap();
    fireEvent.mouseDown(nodeOf("콜로세움"));
    fireEvent.mouseMove(map(), { clientX: 100, clientY: 120 });
    fireEvent.mouseUp(map());
    expect(where("콜로세움")).toEqual([100, 120]);

    await user.click(toolbarButton("자동 정렬"));
    expect(where("콜로세움")).toEqual([500, 205]);
  });

  it("툴바에는 배치 · 자동 정렬만 있고, 노드를 더블클릭해도 이름을 고치는 입력칸이 열리지 않는다", async () => {
    const { user } = await openMindmap();
    const buttons = within(toolbar()!).getAllByRole("button");
    expect(buttons.map((b) => b.textContent?.trim())).toEqual(["방사형", "계층형", "자동 정렬"]);

    await user.dblClick(nodeOf("로마 여행"));
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(nodeLabels()[0]).toBe("로마 여행");
  });
});
