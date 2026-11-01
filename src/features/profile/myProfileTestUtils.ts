// 내 프로필 테스트 공통 — 저장한 값을 다시 돌려주는 가짜 서버. 저장 뒤 화면이 서버 값을 보여주는지 확인할 수 있다.
import { http } from "msw";
import type { MyProfileCard, MyProfileResponse, MySession, UpdateMyProfileRequest } from "@/lib/api";
import { API_MINDMAP, API_MY_PROFILE, MY_SESSIONS, apiMyCard } from "@/test/fixtures/profile";
import { API, ok, server } from "@/test/msw/server";

/** 핀고정 · 공개 · 비공개 카드 하나씩 */
export const MY_CARDS: MyProfileCard[] = [
  apiMyCard({ mindmapId: 41, title: "고정한 카드", isPinned: true }),
  apiMyCard({ mindmapId: 42, title: "공개 카드" }),
  apiMyCard({ mindmapId: 43, title: "비공개 카드", isPublic: false }),
];

interface ServeOptions {
  profile?: MyProfileResponse;
  sessions?: MySession[];
  cards?: MyProfileCard[];
  /** 서버가 한 페이지에 주는 수 */
  perPage?: number;
}

export function serveMyProfile({ profile = API_MY_PROFILE, sessions = MY_SESSIONS, cards = MY_CARDS, perPage = 12 }: ServeOptions = {}) {
  const state = { profile, sessions };
  const puts: UpdateMyProfileRequest[] = [];
  /** 세션 목록 요청의 쿼리 문자열 */
  const sessionQueries: string[] = [];

  const paged = <T,>(items: T[], url: URL) => {
    const page = Number(url.searchParams.get("page"));
    return { items: items.slice(page * perPage, (page + 1) * perPage), hasNext: items.length > (page + 1) * perPage };
  };

  const applyPut = (body: UpdateMyProfileRequest) => {
    const withVisibility = (t: MyProfileResponse["hashtags"][number]) => ({ ...t, isPublic: !body.hiddenHashtagIds.includes(t.hashtagId) });
    const pinned = body.pinnedSessionIds.map((id) => ({ ...state.sessions.find((s) => s.id === id)!, isPinned: true }));
    const rest = state.sessions.filter((s) => !body.pinnedSessionIds.includes(s.id)).map((s) => ({ ...s, isPinned: false }));
    state.sessions = [...pinned, ...rest];
    state.profile = {
      ...state.profile,
      bio: body.bio,
      visibility: body.visibility,
      interests: body.interests.map((hashtag, i) => ({ interestId: i + 1, hashtag })),
      topHashtags: state.profile.topHashtags.map(withVisibility),
      hashtags: state.profile.hashtags.map(withVisibility),
      pinnedSessions: pinned,
    };
  };

  server.use(
    http.get(`${API}/community/me/profile`, () => ok(state.profile)),
    http.put(`${API}/community/me/profile`, async ({ request }) => {
      const body = (await request.json()) as UpdateMyProfileRequest;
      puts.push(body);
      applyPut(body);
      return ok(null);
    }),
    http.get(`${API}/community/me/sessions`, ({ request }) => {
      const url = new URL(request.url);
      sessionQueries.push(url.search);
      const publicOnly = url.searchParams.get("publicOnly") === "true";
      const { items, hasNext } = paged(publicOnly ? state.sessions.filter((s) => s.isPublic) : state.sessions, url);
      return ok({ sessions: items, hasNext });
    }),
    http.get(`${API}/community/me/mindmaps`, ({ request }) => {
      const { items, hasNext } = paged(cards, new URL(request.url));
      return ok({ mindmaps: items, hasNext });
    }),
    http.get(`${API}/community/me/mindmaps/:id/sessions`, () => ok({ sessions: state.sessions.slice(0, 2) })),
    http.get(`${API}/community/me/mindmap`, () => ok(API_MINDMAP)),
  );
  return { puts, sessionQueries };
}
