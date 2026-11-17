// 정책 #25 화면 비교: 촬영할 때 BE 대신 Playwright 가 API 요청을 가로채 고정 응답을 준다.
// 응답 데이터는 FE 테스트가 쓰는 src/test/fixtures 를 그대로 쓴다. 매번 같은 데이터라 코드 차이만 화면에 남는다.
import type { Page } from "@playwright/test";
import {
  CATEGORIES,
  EXPLORATION,
  READING_BEHAVIOR,
  RECOMMENDATIONS,
  TIME_PATTERNS,
  WEEK_SESSIONS,
} from "../src/test/fixtures/analytics";
import { BOOKMARK_BUNDLES_PAGE, BOOKMARK_MINDMAPS_PAGE } from "../src/test/fixtures/bookmarksApi";
import {
  CARD_SESSIONS,
  INTERESTS,
  RECENT_BOOKMARKS,
  SEARCH_HASHTAGS,
  SEARCH_PAGE_MINDMAPS,
  SEARCH_PAGE_PROFILES,
  SIMILAR_PEOPLE,
  TRENDING_TODAY,
  TRENDING_WEEK,
} from "../src/test/fixtures/communityApi";
import { HOME_RESPONSE } from "../src/test/fixtures/home";
import { MEMBER } from "../src/test/fixtures/member";
import {
  API_MINDMAP,
  API_MY_PROFILE,
  API_PROFILE,
  API_SHARED_SESSIONS,
  apiCard,
  apiMyCard,
  MY_SESSIONS,
} from "../src/test/fixtures/profile";
import { ROME_DETAIL, ROME_MINDMAP, SESSION_HASHTAGS, SESSION_LIST, TAG_GROUPS } from "../src/test/fixtures/sessions";
import { EXCLUDED_URL_LIST_RESPONSE, EXTENSION_SETTINGS_RESPONSE } from "../src/test/fixtures/settings";

/** lib/api/client.ts 의 기본 BASE_URL. CI 빌드도 이 값으로 한다 */
export const API = "http://localhost:8080";
/** 로그인한 것처럼 보이게 넣는 가짜 토큰 (lib/auth/tokens.ts 의 키) */
export const TOKEN_KEY = "jin_access_token";

const MY_CARDS = [
  apiMyCard({ mindmapId: 41, title: "고정한 카드", isPinned: true }),
  apiMyCard({ mindmapId: 42, title: "공개 카드" }),
  apiMyCard({ mindmapId: 43, title: "비공개 카드", isPublic: false }),
];
const OTHER_CARDS = [apiCard({ mindmapId: 31, isPinned: true }), apiCard({ mindmapId: 32, title: "로마 3박 4일 동선" })];

/** [메서드 GET 경로(쿼리 제외) 정규식, 응답 data] — 위에서부터 먼저 맞는 것을 쓴다 */
const ROUTES: [RegExp, (url: URL) => unknown][] = [
  [/^\/members\/me$/, () => MEMBER],
  [/^\/home$/, () => HOME_RESPONSE],
  [/^\/sessions\/hashtags$/, () => SESSION_HASHTAGS],
  [/^\/sessions\/\d+\/mindmap$/, () => ROME_MINDMAP],
  [/^\/sessions\/\d+$/, () => ROME_DETAIL],
  [
    /^\/sessions$/,
    () => ({
      sessions: SESSION_LIST,
      hasNext: false,
      totalCount: SESSION_LIST.length,
      favoriteCount: SESSION_LIST.filter((s) => s.isFavorite).length,
    }),
  ],
  [/^\/tag-groups$/, () => TAG_GROUPS],
  [/^\/analytics\/week-sessions$/, () => WEEK_SESSIONS],
  [/^\/analytics\/exploration$/, () => EXPLORATION],
  [/^\/analytics\/reading-behavior$/, () => READING_BEHAVIOR],
  [/^\/analytics\/categories$/, () => CATEGORIES],
  [/^\/analytics\/time-patterns$/, () => TIME_PATTERNS],
  [/^\/analytics\/recommendations$/, () => RECOMMENDATIONS],
  [/^\/community\/recommendations\/mindmaps\/interests$/, () => INTERESTS],
  [/^\/community\/recommendations\/mindmaps\/recent-bookmarks$/, () => RECENT_BOOKMARKS],
  [/^\/community\/recommendations\/hashtags\/trending$/, (url) => (url.searchParams.get("period") === "WEEK" ? TRENDING_WEEK : TRENDING_TODAY)],
  [/^\/community\/recommendations\/profiles\/similar$/, () => SIMILAR_PEOPLE],
  [/^\/community\/search\/hashtags$/, () => SEARCH_HASHTAGS],
  [/^\/community\/search\/profiles$/, () => SEARCH_PAGE_PROFILES],
  [/^\/community\/search\/mindmaps$/, () => SEARCH_PAGE_MINDMAPS],
  [/^\/community\/mindmaps\/\d+\/sessions$/, () => CARD_SESSIONS],
  [/^\/community\/me\/bookmarks\/mindmaps$/, () => BOOKMARK_MINDMAPS_PAGE],
  [/^\/community\/me\/bookmarks\/hashtag-bundles$/, () => BOOKMARK_BUNDLES_PAGE],
  [/^\/community\/me\/profile$/, () => API_MY_PROFILE],
  [/^\/community\/me\/sessions$/, () => ({ sessions: MY_SESSIONS, hasNext: false, totalPages: 1 })],
  [/^\/community\/me\/mindmaps\/\d+\/sessions$/, () => CARD_SESSIONS],
  [/^\/community\/me\/mindmaps$/, () => ({ mindmaps: MY_CARDS, hasNext: false, totalPages: 1 })],
  [/^\/community\/me\/mindmap$/, () => API_MINDMAP],
  [/^\/community\/profiles\/\d+\/mindmaps$/, () => ({ mindmaps: OTHER_CARDS, hasNext: false, totalPages: 1 })],
  [/^\/community\/profiles\/\d+\/shared-sessions$/, () => ({ sessions: API_SHARED_SESSIONS, hasNext: false, totalPages: 1 })],
  [/^\/community\/profiles\/\d+\/mindmap$/, () => API_MINDMAP],
  [/^\/community\/profiles\/\d+$/, () => API_PROFILE],
  [/^\/settings\/collection\/excluded-urls$/, () => EXCLUDED_URL_LIST_RESPONSE],
  [/^\/settings\/extension$/, () => EXTENSION_SETTINGS_RESPONSE],
];

/** 모든 API 요청에 고정 응답. 표에 없는 GET 은 unmatched 에 모아 촬영 결과에 남긴다 (빠진 응답을 찾기 쉽게) */
export async function mockApi(page: Page, unmatched: Set<string>) {
  await page.route(`${API}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() !== "GET") {
      await route.fulfill({ json: { success: true, data: null, message: null } });
      return;
    }
    const found = ROUTES.find(([pattern]) => pattern.test(url.pathname));
    if (!found) {
      unmatched.add(`${request.method()} ${url.pathname}`);
      await route.fulfill({ status: 404, json: { success: false, data: null, message: "화면 비교용 고정 응답이 없습니다" } });
      return;
    }
    await route.fulfill({ json: { success: true, data: found[1](url), message: null } });
  });
}
