// 세션 목록 · 상세 · 해시태그 그룹 화면용 API 응답 픽스처.
// 디자인 시안 세션(design.ts 의 MOCK_SESSIONS)을 앞에 두고, 무한 스크롤 테스트용으로 세션을 더 붙인다.
// 모양은 백엔드 DTO 기준 — SessionListResponse · SessionDetailResponse · TagGroupResponse.
import type { SessionDetail, SessionListItem, SessionPage, SessionUpdateRequest, TagGroup } from "@/lib/api";
import { MOCK_SESSIONS } from "./design";

const pad = (n: number) => String(n).padStart(2, "0");

/** 2026-04-{day} {hh}:{mm} 에 시작해 {minutes}분 동안 이어진 세션 */
function extra(
  id: number,
  title: string,
  day: number,
  [hh, mm]: [number, number],
  minutes: number,
  pageCount: number,
  isFavorite: boolean,
  tags: string[],
): SessionListItem {
  const end = hh * 60 + mm + minutes;
  return {
    id,
    title,
    startedAt: `2026-04-${pad(day)}T${pad(hh)}:${pad(mm)}:00`,
    endedAt: `2026-04-${pad(day)}T${pad(Math.floor(end / 60))}:${pad(end % 60)}:00`,
    pageCount,
    status: "COMPLETED",
    isFavorite,
    isPublic: false,
    tags,
  };
}

/** 아직 분석 중인 세션 — 수집이 끝나 종료 시각은 있고, 페이지 수 · 해시태그는 분석이 끝나야 채워진다 */
export const ANALYZING_SESSION: SessionListItem = {
  id: 9009,
  title: "빈 클래식 공연 예매",
  startedAt: "2026-04-18T20:10:00",
  endedAt: "2026-04-18T20:55:00",
  pageCount: 0,
  status: "ANALYZING",
  isFavorite: false,
  isPublic: false,
  tags: [],
};

/** 해시태그가 6개인 세션 — 카드에는 앞의 4개만 보인다 */
export const MANY_TAGS_SESSION = extra(9008, "리스본 · 포르투 7일 루트", 19, [13, 0], 52, 12, true, [
  "리스본",
  "포르투",
  "에그타르트",
  "트램",
  "파두",
  "대서양",
]);

/** GET /sessions 의 세션 25개 (서버 정렬 순서). 즐겨찾기 11개 */
export const SESSION_LIST: SessionListItem[] = [
  ...MOCK_SESSIONS,
  MANY_TAGS_SESSION,
  ANALYZING_SESSION,
  extra(9010, "부다페스트 온천 비교", 17, [10, 30], 41, 8, true, ["부다페스트", "온천", "세체니"]),
  extra(9011, "스위스 융프라우 VIP패스", 16, [21, 5], 33, 6, false, ["스위스", "융프라우", "예산"]),
  extra(9012, "피렌체 우피치 예약", 15, [9, 20], 27, 5, true, ["피렌체", "우피치", "미술관"]),
  extra(9013, "베네치아 곤돌라 · 수상버스", 14, [18, 45], 36, 7, false, ["베네치아", "곤돌라", "교통"]),
  extra(9014, "런던 뮤지컬 할인 티켓", 13, [22, 0], 48, 9, true, ["런던", "뮤지컬", "예산"]),
  extra(9015, "암스테르담 운하 투어", 12, [11, 10], 25, 4, false, ["암스테르담", "운하", "자전거"]),
  extra(9016, "베를린 장벽 역사 탐방", 11, [15, 0], 64, 10, true, ["베를린", "역사", "장벽"]),
  extra(9017, "뮌헨 옥토버페스트 준비", 10, [20, 30], 29, 6, false, ["뮌헨", "맥주", "축제"]),
  extra(9018, "잘츠부르크 사운드오브뮤직 투어", 9, [8, 40], 31, 5, true, ["잘츠부르크", "투어", "영화"]),
  extra(9019, "크라쿠프 아우슈비츠 예약", 8, [19, 15], 22, 3, false, ["크라쿠프", "역사", "예약"]),
  extra(9020, "니스 · 모나코 당일치기", 7, [12, 0], 45, 8, true, ["니스", "모나코", "기차"]),
  extra(9021, "산토리니 숙소 비교", 6, [23, 0], 38, 11, false, ["산토리니", "숙소", "예산"]),
  extra(9022, "아테네 파르테논 동선", 5, [14, 25], 26, 5, true, ["아테네", "파르테논", "역사"]),
  extra(9023, "여행자 보험 비교", 4, [21, 40], 19, 4, false, ["보험", "예산", "준비물"]),
  extra(9024, "유럽 유심 · eSIM 비교", 3, [10, 0], 24, 6, true, ["유심", "eSIM", "통신"]),
  extra(9025, "환전 · 트래블카드 정리", 2, [16, 50], 35, 7, false, ["환전", "트래블카드", "예산"]),
];

/** GET /sessions/hashtags — SESSION_LIST 에 쓰인 해시태그 (중복 없이, 목록 순서대로 처음 나온 순) */
export const SESSION_HASHTAGS: string[] = [...new Set(SESSION_LIST.flatMap((s) => s.tags))];

export function sessionById(id: number): SessionListItem {
  const found = SESSION_LIST.find((s) => s.id === id);
  if (!found) throw new Error(`픽스처에 없는 세션: ${id}`);
  return found;
}

/**
 * 상태별 세션 + 분석 완료 로마 — 서버 정렬처럼 진행 중(수집 중 · 분석 대기 · 분석 중)이 먼저, 나머지는 끝난 시각 최근 순.
 * 분석이 끝나야 페이지 수 · 해시태그가 채워지므로 완료 전 · 실패 세션은 0개 · 없음. 종료 시각은 분석을 시작할 때 정해진다
 */
export const STATUS_SESSIONS: SessionListItem[] = [
  {
    id: 9101,
    title: "도쿄 라멘 맛집 찾기",
    startedAt: "2026-04-28T19:00:00",
    endedAt: null,
    pageCount: 0,
    status: "COLLECTING",
    isFavorite: false,
    isPublic: false,
    tags: [],
  },
  {
    id: 9102,
    title: "오사카 유니버설 입장권",
    startedAt: "2026-04-28T13:10:00",
    endedAt: null,
    pageCount: 0,
    status: "READY",
    isFavorite: false,
    isPublic: false,
    tags: [],
  },
  {
    id: 9103,
    title: "교토 료칸 비교",
    startedAt: "2026-04-27T22:00:00",
    endedAt: "2026-04-27T22:41:00",
    pageCount: 0,
    status: "ANALYZING",
    isFavorite: false,
    isPublic: false,
    tags: [],
  },
  {
    id: 9104,
    title: "후쿠오카 야타이 정리",
    startedAt: "2026-04-27T10:00:00",
    endedAt: "2026-04-27T10:35:00",
    pageCount: 0,
    status: "FAILED",
    isFavorite: true,
    isPublic: false,
    tags: [],
  },
  sessionById(9001),
];

/** GET /sessions?page&size&favorite 응답 — 백엔드처럼 즐겨찾기만 거르고 페이지를 자른다. 개수는 거르기 전 전체 기준 */
export function sessionPage(
  list: SessionListItem[],
  { page, size, favorite }: { page: number; size: number; favorite: boolean },
): SessionPage {
  const filtered = favorite ? list.filter((s) => s.isFavorite) : list;
  return {
    sessions: filtered.slice(page * size, (page + 1) * size),
    hasNext: (page + 1) * size < filtered.length,
    totalCount: list.length,
    favoriteCount: list.filter((s) => s.isFavorite).length,
  };
}

// ---------- 해시태그 그룹 (GET /tag-groups) ----------

/** 백엔드처럼 그룹 해시태그를 하나라도 가진 세션을 묶어 TagGroupResponse 를 만든다 */
export function tagGroup(
  id: number,
  name: string,
  hashtags: string[],
  position: number,
  sessions: SessionListItem[] = SESSION_LIST,
): TagGroup {
  return {
    id,
    name,
    hashtags,
    position,
    sessions: sessions.filter((s) => s.tags.some((t) => hashtags.includes(t))),
  };
}

/** 로마(1개 세션) · 항공권/예산(7개 세션) · 세션이 없는 React 그룹 */
export const TAG_GROUPS: TagGroup[] = [
  tagGroup(1, "로마, 콜로세움", ["로마", "콜로세움"], 0),
  tagGroup(2, "항공권, 예산", ["항공권", "예산"], 1),
  tagGroup(3, "React, TypeScript", ["React", "TypeScript"], 2),
];

// ---------- 세션 상세 (GET /sessions/{id}) ----------

/** 로마 세션 — 본문은 `##` 소제목부터, 출처 3개(방문 시각 오름차순, 하나는 제목 · 방문 시각 없음) */
export const ROME_DETAIL: SessionDetail = {
  ...sessionById(9001),
  isOwner: true,
  summary: {
    markdown: [
      "## 한눈에 보기",
      "로마 3박 4일 일정은 **고대 로마 → 바티칸 → 트라스테베레** 순으로 묶었다.",
      "",
      "## 1일차 · 고대 로마",
      "- 콜로세움 통합권은 24시간 동안 포로 로마노 · 팔라티노 언덕까지 들어갈 수 있다.",
      "- 오전 첫 타임 예약이 가장 덜 붐빈다.",
      "",
      "## 2일차 · 바티칸",
      "- 바티칸 박물관은 온라인 예약 필수.",
      "",
      "## 먹거리",
      "- 트라스테베레의 카초 에 페페, 젤라또는 산 크리스핀.",
    ].join("\n"),
  },
  sources: [
    {
      title: "콜로세움 통합권 예매 안내",
      url: "https://www.coopculture.it/en/colosseo-e-shop.cfm",
      excerpt: "통합권 하나로 콜로세움, 포로 로마노, 팔라티노 언덕을 24시간 안에 둘러볼 수 있습니다.",
      visitedAt: "2026-04-26T21:16:30.512",
    },
    {
      title: "바티칸 박물관 예약",
      url: "https://tickets.museivaticani.va/home",
      excerpt: "온라인으로 예약하면 tickets.museivaticani.va 에서 받은 QR 로 줄 없이 들어갑니다.",
      visitedAt: "2026-04-26T21:40:02.938",
    },
    {
      title: "",
      url: "https://blog.naver.com/romefood/223456",
      excerpt: "트라스테베레 골목의 카초 에 페페 맛집 다섯 곳을 정리했습니다.",
      visitedAt: null,
    },
  ],
};

/** 파리 세션 — 제목에 파일 이름으로 못 쓰는 '/' 가 있음, 공개 */
export const PARIS_DETAIL: SessionDetail = {
  ...sessionById(9003),
  isPublic: true,
  isOwner: true,
  summary: {
    markdown: [
      "## 루브르",
      "- 모나리자는 오전 9시 개장 직후가 한산하다.",
      "",
      "## 오르세",
      "- 목요일은 21시 45분까지 야간 개장.",
    ].join("\n"),
  },
  sources: [
    {
      title: "루브르 박물관",
      url: "https://www.louvre.fr/en/visit",
      excerpt: "루브르는 화요일에 휴관합니다.",
      visitedAt: "2026-04-24T10:06:12.104",
    },
    {
      title: "오르세 미술관",
      url: "https://www.musee-orsay.fr/en",
      excerpt: "목요일은 야간 개장합니다.",
      visitedAt: "2026-04-24T10:51:47.220",
    },
  ],
};

/** 다른 사람의 공개 세션 — 내 세션이 아니라 즐겨찾기는 항상 false */
export const FOREIGN_DETAIL: SessionDetail = { ...PARIS_DETAIL, isOwner: false, isFavorite: false };

/** 본문에서 제목을 빼기 전에 고쳐 저장한 세션 — 본문 맨 앞에 화면 제목과 다른 옛 `# 제목` 이 남아 있다 */
export const OLD_EDITED_DETAIL: SessionDetail = {
  ...sessionById(9004),
  isOwner: true,
  summary: { markdown: "# 유레일패스 비교 (옛 제목)\n\n## 결론\n\n- 일정이 짧으면 개별 구매가 낫다." },
  sources: [
    {
      title: "유레일패스 가격표",
      url: "https://www.eurail.com/en/eurail-passes",
      excerpt: "유럽 33개국을 오가는 통합 패스입니다.",
      visitedAt: "2026-04-23T19:15:00.000",
    },
  ],
};

/** 완료 전 · 실패 세션 상세 — 요약 · 출처 없음 */
const beforeAnalysis = (session: SessionListItem): SessionDetail => ({
  ...session,
  summary: null,
  sources: [],
  isOwner: true,
});

export const COLLECTING_DETAIL = beforeAnalysis(STATUS_SESSIONS[0]);
export const READY_DETAIL = beforeAnalysis(STATUS_SESSIONS[1]);
export const ANALYZING_DETAIL = beforeAnalysis(ANALYZING_SESSION);
export const FAILED_DETAIL = beforeAnalysis(STATUS_SESSIONS[3]);

/** PATCH /sessions/{id} 를 백엔드처럼 반영한 응답 (보낸 필드만 수정) */
export function applySessionUpdate(detail: SessionDetail, body: SessionUpdateRequest): SessionDetail {
  return {
    ...detail,
    ...(body.title !== undefined && { title: body.title }),
    ...(body.isPublic !== undefined && { isPublic: body.isPublic }),
    ...(body.isFavorite !== undefined && { isFavorite: body.isFavorite }),
    ...(body.tags !== undefined && { tags: body.tags }),
    ...(body.editedMarkdown !== undefined && { summary: { markdown: body.editedMarkdown } }),
  };
}
