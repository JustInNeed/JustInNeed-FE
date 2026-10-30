// 세션 목록 화면 테스트 공통 — 페이징 GET /sessions 응답 · 스크롤 영역 크기
import { fireEvent } from "@testing-library/react";
import { http } from "msw";
import type { SessionListItem } from "@/lib/api";
import { sessionPage } from "@/test/fixtures/sessions";
import { API, ok, server } from "@/test/msw/server";
import { renderPersonal } from "@/test/render";
import { SessionsView } from "./SessionsView";

/** GET /sessions 쿼리 문자열 — "page=0&size=10&favorite=false" */
export const sessionsQuery = (page: number, favorite = false) => `page=${page}&size=10&favorite=${favorite}`;

/**
 * GET /sessions?page&size&favorite 를 백엔드처럼 응답하고, 받은 쿼리를 차례로 남긴다.
 * list 를 함수로 넘기면 요청마다 다시 읽는다 (PATCH 를 반영한 서버 상태 흉내).
 */
export function serveSessions(list: SessionListItem[] | (() => SessionListItem[])) {
  const requests: string[] = [];
  server.use(
    http.get(`${API}/sessions`, ({ request }) => {
      const q = new URL(request.url).searchParams;
      requests.push(q.toString());
      const page = { page: Number(q.get("page")), size: Number(q.get("size")), favorite: q.get("favorite") === "true" };
      return ok(sessionPage(typeof list === "function" ? list() : list, page));
    }),
  );
  return requests;
}

/**
 * jsdom 은 레이아웃이 없어 스크롤 영역 크기를 직접 정한다.
 * 카드 한 장 100px, 보이는 높이 500px, scrollTop 은 브라우저처럼 끝을 넘지 않는다.
 * 데이터가 오기 전에 붙여야 "불러온 카드가 화면을 못 채우면 더 받음" 로직이 jsdom 의 0 크기에 속지 않는다.
 */
export function fakeScrollBox(container: HTMLElement) {
  const body = container.querySelector<HTMLElement>(".body")!;
  const height = () => body.querySelectorAll(".grid > .card").length * 100;
  let top = 0;
  Object.defineProperties(body, {
    clientHeight: { configurable: true, get: () => 500 },
    scrollHeight: { configurable: true, get: height },
    scrollTop: {
      configurable: true,
      get: () => Math.min(top, Math.max(0, height() - 500)),
      set: (v: number) => {
        top = v;
      },
    },
  });
  const scrollTo = (v: number) => {
    body.scrollTop = v;
    fireEvent.scroll(body);
  };
  return {
    body,
    toBottom: () => scrollTo(height()),
    toTop: () => scrollTo(0),
  };
}

/** 세션 목록을 렌더하고 스크롤 영역 크기를 붙인다 */
export function renderSessions() {
  const view = renderPersonal(<SessionsView />);
  const scroll = fakeScrollBox(view.container);
  return { ...view, scroll };
}
