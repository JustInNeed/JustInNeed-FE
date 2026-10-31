// 세션 상세 테스트 공통 — GET/PATCH /sessions/{id} · GET /sessions/{id}/mindmap 을 픽스처로 응답하고 요청을 모은다.
import { screen } from "@testing-library/react";
import { http } from "msw";
import type { SessionDetail as SessionDetailData, SessionMindmap, SessionUpdateRequest } from "@/lib/api";
import { ROME_DETAIL, ROME_MINDMAP, applySessionUpdate } from "@/test/fixtures/sessions";
import { API, fail, ok, server } from "@/test/msw/server";
import { renderPersonal } from "@/test/render";
import { SessionDetail } from "./SessionDetail";

/** PATCH 에 다르게 응답하고 싶을 때 — undefined 를 돌려주면 백엔드처럼 반영해서 응답 */
export type PatchReply = (body: SessionUpdateRequest) => Response | undefined | Promise<Response | undefined>;

export function serveSession(
  detail: SessionDetailData = ROME_DETAIL,
  reply?: PatchReply,
  mindmap: SessionMindmap = ROME_MINDMAP,
) {
  let current = detail;
  const patches: SessionUpdateRequest[] = [];
  const mapRequests: string[] = [];
  server.use(
    http.get(`${API}/sessions/:id/mindmap`, ({ params }) => {
      mapRequests.push(String(params.id));
      return ok(mindmap);
    }),
    http.get(`${API}/sessions/:id`, ({ params }) =>
      Number(params.id) === current.id ? ok(current) : fail(404, "세션을 찾을 수 없습니다."),
    ),
    http.patch(`${API}/sessions/:id`, async ({ request }) => {
      const body = (await request.json()) as SessionUpdateRequest;
      patches.push(body);
      const custom = await reply?.(body);
      if (custom) return custom;
      current = applySessionUpdate(current, body);
      return ok(current);
    }),
  );
  return { patches, mapRequests };
}

/** 세션 상세를 그리고 제목이 보일 때까지 기다린다 */
export async function renderDetail(
  detail: SessionDetailData = ROME_DETAIL,
  reply?: PatchReply,
  mindmap?: SessionMindmap,
) {
  const api = serveSession(detail, reply, mindmap);
  const view = renderPersonal(<SessionDetail sessionId={detail.id} />);
  await screen.findByRole("heading", { level: 1, name: detail.title || "원문 링크만 공개된 세션" });
  return { ...view, ...api };
}

/** 응답을 원하는 때에 돌려주도록 잡아 두는 문 */
export function gate() {
  let open!: () => void;
  const opened = new Promise<void>((r) => (open = r));
  return { open, opened };
}
