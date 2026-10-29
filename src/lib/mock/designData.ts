// 디자인 시안(Claude Design "JustInNeed") 의 샘플 데이터.
// ⚠️ 백엔드 API가 없는 화면(홈·분석·커뮤니티·검색·북마크·프로필·설정)에서만 사용한다.
//    세션 목록/상세는 실제 API(lib/api)를 쓰며 이 파일을 참조하지 않는다.
import type { SessionListItem } from "@/lib/api";
import type { MindmapEdge, MindmapNode } from "@/lib/types";

// ---------- 개인 홈 마인드맵 (force-directed) ----------
export const MINDMAP_NODES: MindmapNode[] = [
  { id: "eu", label: "유럽 여행", x: 600, y: 380, size: 28, group: "core" },
  { id: "rome", label: "로마", x: 380, y: 220, size: 20, group: "city" },
  { id: "paris", label: "파리", x: 820, y: 200, size: 22, group: "city" },
  { id: "barca", label: "바르셀로나", x: 320, y: 540, size: 18, group: "city" },
  { id: "prague", label: "프라하", x: 880, y: 540, size: 16, group: "city" },
  { id: "flight", label: "항공권", x: 600, y: 130, size: 16, group: "logi" },
  { id: "visa", label: "비자/입국", x: 760, y: 100, size: 12, group: "logi" },
  { id: "rail", label: "유레일패스", x: 600, y: 600, size: 16, group: "logi" },
  { id: "budget", label: "예산", x: 440, y: 620, size: 14, group: "logi" },
  { id: "packing", label: "짐싸기", x: 760, y: 620, size: 12, group: "logi" },
  { id: "colos", label: "콜로세움", x: 220, y: 130, size: 9, group: "sub" },
  { id: "vatic", label: "바티칸", x: 250, y: 280, size: 10, group: "sub" },
  { id: "tras", label: "트라스테베레", x: 180, y: 360, size: 8, group: "sub" },
  { id: "pasta", label: "카르보나라", x: 130, y: 200, size: 9, group: "sub" },
  { id: "eiffel", label: "에펠탑", x: 980, y: 150, size: 10, group: "sub" },
  { id: "louvre", label: "루브르", x: 1020, y: 280, size: 11, group: "sub" },
  { id: "orsay", label: "오르세", x: 920, y: 320, size: 9, group: "sub" },
  { id: "mont", label: "몽마르뜨", x: 1050, y: 200, size: 8, group: "sub" },
  { id: "sagrada", label: "사그라다 파밀리아", x: 200, y: 600, size: 10, group: "sub" },
  { id: "park", label: "구엘공원", x: 180, y: 480, size: 9, group: "sub" },
  { id: "tapas", label: "타파스", x: 220, y: 700, size: 8, group: "sub" },
  { id: "castle", label: "프라하성", x: 1000, y: 600, size: 9, group: "sub" },
  { id: "bridge", label: "카를교", x: 1010, y: 500, size: 9, group: "sub" },
  { id: "skyscan", label: "스카이스캐너", x: 480, y: 60, size: 7, group: "sub" },
  { id: "kayak", label: "Kayak", x: 720, y: 50, size: 7, group: "sub" },
  { id: "booking", label: "Booking.com", x: 600, y: 700, size: 7, group: "sub" },
  { id: "travel-blog", label: "여행블로그", x: 100, y: 380, size: 7, group: "meta" },
  { id: "reddit", label: "r/travel", x: 1100, y: 380, size: 8, group: "meta" },
];

export const MINDMAP_EDGES: MindmapEdge[] = [
  ["eu", "rome"], ["eu", "paris"], ["eu", "barca"], ["eu", "prague"],
  ["eu", "flight"], ["eu", "rail"], ["eu", "budget"], ["eu", "packing"],
  ["flight", "visa"],
  ["rome", "colos"], ["rome", "vatic"], ["rome", "tras"], ["rome", "pasta"],
  ["paris", "eiffel"], ["paris", "louvre"], ["paris", "orsay"], ["paris", "mont"],
  ["barca", "sagrada"], ["barca", "park"], ["barca", "tapas"],
  ["prague", "castle"], ["prague", "bridge"],
  ["flight", "skyscan"], ["flight", "kayak"], ["rail", "booking"],
  ["rome", "travel-blog"], ["paris", "travel-blog"], ["eu", "reddit"],
];

/** 리프 노드(연결 1개)의 원문 URL — 전체 마인드맵 보기에서 누르면 새 탭으로 연다 */
export const MINDMAP_NODE_URLS: Record<string, string> = {
  budget: "https://wise.com/kr/currency-converter/eur-to-krw-rate",
  packing: "https://www.ricksteves.com/travel-tips/packing-light",
  visa: "https://travel-europe.europa.eu/etias_en",
  colos: "https://www.colosseo.it/en/",
  vatic: "https://www.museivaticani.va/",
  tras: "https://www.turismoroma.it/en/places/trastevere",
  pasta: "https://www.tripadvisor.co.kr/Restaurants-g187791-Rome_Lazio.html",
  eiffel: "https://www.toureiffel.paris/en",
  louvre: "https://www.louvre.fr/en",
  orsay: "https://www.musee-orsay.fr/en",
  mont: "https://www.parisinfo.com/",
  sagrada: "https://sagradafamilia.org/en/",
  park: "https://parkguell.barcelona/en",
  tapas: "https://www.barcelonaturisme.com/",
  castle: "https://www.hrad.cz/en/prague-castle-for-visitors",
  bridge: "https://www.prague.eu/en",
  skyscan: "https://www.skyscanner.co.kr/",
  kayak: "https://www.kayak.co.kr/",
  booking: "https://www.booking.com/",
  reddit: "https://www.reddit.com/r/travel/",
};

// ---------- 홈 마인드맵 필터 · 검색 (목: 홈 집계 API 생기면 교체) ----------
export type GraphPeriod = "today" | "week" | "month" | "all";

/** 노드를 마지막으로 본 시점과 연결된 해시태그 (# 없는 raw) */
export const MINDMAP_NODE_META: Record<string, { seen: Exclude<GraphPeriod, "all">; tags: string[] }> = {
  eu: { seen: "week", tags: ["유럽여행"] },
  rome: { seen: "today", tags: ["로마"] },
  colos: { seen: "today", tags: ["로마", "콜로세움"] },
  vatic: { seen: "today", tags: ["로마"] },
  tras: { seen: "today", tags: ["로마"] },
  pasta: { seen: "today", tags: ["로마"] },
  paris: { seen: "week", tags: ["파리"] },
  eiffel: { seen: "week", tags: ["파리"] },
  louvre: { seen: "week", tags: ["파리"] },
  orsay: { seen: "week", tags: ["파리"] },
  mont: { seen: "week", tags: ["파리"] },
  barca: { seen: "month", tags: ["바르셀로나"] },
  sagrada: { seen: "month", tags: ["바르셀로나"] },
  park: { seen: "month", tags: ["바르셀로나"] },
  tapas: { seen: "month", tags: ["바르셀로나"] },
  prague: { seen: "month", tags: ["프라하"] },
  castle: { seen: "month", tags: ["프라하"] },
  bridge: { seen: "month", tags: ["프라하"] },
  flight: { seen: "today", tags: ["항공권"] },
  visa: { seen: "week", tags: ["항공권"] },
  skyscan: { seen: "today", tags: ["항공권"] },
  kayak: { seen: "week", tags: ["항공권"] },
  rail: { seen: "month", tags: ["유레일"] },
  booking: { seen: "month", tags: ["유레일"] },
  budget: { seen: "week", tags: ["예산"] },
  packing: { seen: "month", tags: ["짐싸기"] },
  "travel-blog": { seen: "week", tags: ["로마", "파리"] },
  reddit: { seen: "month", tags: ["유럽여행"] },
};

export const GRAPH_TAG_GROUPS: { id: number; name: string; tags: string[] }[] = [
  { id: 1, name: "유럽 여행 준비", tags: ["로마", "파리", "콜로세움", "항공권", "숙소"] },
  { id: 2, name: "React 학습", tags: ["React", "TypeScript", "훅", "상태관리"] },
];

export const GRAPH_FILTER_TAGS = ["로마", "파리", "항공권", "예산", "바르셀로나", "프라하"];

// ---------- 세션 (API SessionListItem 형태, 프로필/북마크/검색 화면용) ----------
const s = (
  id: number,
  title: string,
  start: string,
  end: string,
  pageCount: number,
  isFavorite: boolean,
  tags: string[],
): SessionListItem => ({
  id,
  title,
  startedAt: start,
  endedAt: end,
  pageCount,
  status: "COMPLETED",
  isFavorite,
  isPublic: false,
  tags,
});

export const MOCK_SESSIONS: SessionListItem[] = [
  s(9001, "로마 3박 4일 동선 짜기", "2026-04-26T21:14:00", "2026-04-26T22:48:00", 18, true, ["로마", "콜로세움", "바티칸", "먹거리"]),
  s(9002, "유럽 항공권 비교 (인천→로마 IN, 프라하→인천 OUT)", "2026-04-25T14:02:00", "2026-04-25T15:21:00", 11, false, ["항공권", "스카이스캐너", "예산"]),
  s(9003, "파리 미술관 4곳 비교 (루브르/오르세/오랑주리/퐁피두)", "2026-04-24T10:05:00", "2026-04-24T11:30:00", 14, true, ["파리", "미술관", "루브르", "오르세"]),
  s(9004, "유레일패스 vs 개별 구매", "2026-04-23T19:12:00", "2026-04-23T19:51:00", 7, false, ["유레일", "예산", "기차"]),
  s(9005, "바르셀로나 가우디 투어", "2026-04-22T22:30:00", "2026-04-22T23:15:00", 9, false, ["바르셀로나", "가우디", "사그라다파밀리아"]),
  s(9006, "쉥겐 비자 & 입국 서류", "2026-04-21T09:40:00", "2026-04-21T10:08:00", 5, false, ["비자", "쉥겐", "ETIAS"]),
  s(9007, "프라하 1박 일정 짜기", "2026-04-20T23:05:00", "2026-04-20T23:32:00", 6, false, ["프라하", "카를교", "체코"]),
];

// ---------- 커뮤니티 ----------
export interface CommunityUser {
  name: string;
  avatar: string;
  handle: string; // '@' 포함
}
export interface CommunityPost {
  id: string;
  user: CommunityUser;
  title: string;
  snippet: string;
  hashtags: string[]; // '#' 포함 (표시용)
  nodes: number;
  likes: number;
  bookmarks: number;
  exploring: number;
  when: string;
}

export const COMMUNITY_FEED: CommunityPost[] = [
  { id: "c1", user: { name: "wanderlust", avatar: "🌿", handle: "@wanderlust" }, title: "동유럽 3주 살이 전체 동선", snippet: "프라하 → 비엔나 → 부다페스트 → 크라쿠프 → 베를린. 각 도시 4~5일씩 잡고 야간열차로 이동.", hashtags: ["#프라하", "#동유럽", "#야간열차"], nodes: 142, likes: 284, bookmarks: 91, exploring: 12, when: "3시간 전" },
  { id: "c2", user: { name: "foodtrip", avatar: "🥖", handle: "@foodtrip" }, title: "파리 미식 지도 — 1구부터 20구까지", snippet: "미슐랭 빕그루망 + 로컬 비스트로 위주. 마레 지구가 가성비 최고.", hashtags: ["#파리", "#먹거리", "#미슐랭"], nodes: 88, likes: 412, bookmarks: 188, exploring: 34, when: "6시간 전" },
  { id: "c3", user: { name: "budgetnomad", avatar: "🪙", handle: "@budgetnomad" }, title: "유럽 한 달 200만원으로 살기", snippet: "호스텔 + 슈퍼마켓 + 무료 워킹투어. 알베르고 디푸소 활용 팁 공유.", hashtags: ["#예산", "#배낭여행", "#호스텔"], nodes: 56, likes: 198, bookmarks: 142, exploring: 28, when: "1일 전" },
  { id: "c4", user: { name: "artwalk", avatar: "🎨", handle: "@artwalk" }, title: "유럽 미술관 30곳 우선순위", snippet: "루브르 / 우피치 / 프라도 / 리이크스. 각 미술관 머스트씨 작품 정리.", hashtags: ["#미술관", "#파리", "#피렌체"], nodes: 73, likes: 256, bookmarks: 198, exploring: 19, when: "2일 전" },
  { id: "c5", user: { name: "slowtravel", avatar: "🌅", handle: "@slowtravel" }, title: "이탈리아 시골 마을 7곳", snippet: "알베로벨로, 오르비에토, 칼라브리아... 관광지 말고 진짜 이탈리아.", hashtags: ["#이탈리아", "#소도시", "#슬로우트래블"], nodes: 64, likes: 312, bookmarks: 224, exploring: 41, when: "3일 전" },
  { id: "c6", user: { name: "rail.kr", avatar: "🚆", handle: "@rail.kr" }, title: "유레일 vs 저가항공 — 실비 비교", snippet: "4개국 이상이면 패스. 2~3개국이면 라이언에어가 더 싸다.", hashtags: ["#유레일", "#항공권", "#예산"], nodes: 41, likes: 178, bookmarks: 88, exploring: 7, when: "4일 전" },
];

/** 마인드맵 상세 팝업의 관련 세션 — 해시태그가 겹치는 세션 최대 3개, 없으면 앞의 3개 */
export function relatedSessionsFor(post: CommunityPost): SessionListItem[] {
  const tagSet = new Set(post.hashtags.map((h) => h.replace(/^#/, "").toLowerCase()));
  const matched = MOCK_SESSIONS.filter((ss) => ss.tags.some((t) => tagSet.has(t.toLowerCase())));
  return (matched.length ? matched : MOCK_SESSIONS).slice(0, 3);
}

export interface TrendingHashtag {
  tag: string;
  count: number;
  trend: number;
}
export const TRENDING_HASHTAGS: TrendingHashtag[] = [
  { tag: "#쉥겐비자", count: 1284, trend: 18 },
  { tag: "#유레일패스", count: 982, trend: 12 },
  { tag: "#파리", count: 854, trend: 8 },
  { tag: "#오로라", count: 612, trend: 42 },
  { tag: "#포르투", count: 488, trend: 28 },
  { tag: "#야간열차", count: 401, trend: 15 },
  { tag: "#아이슬란드", count: 388, trend: -4 },
  { tag: "#알프스", count: 322, trend: 6 },
];

// ---------- 프로필 ----------
/** 노드 공개 범위 — url: 원문 URL만 공개 (기본값), full: 내용까지 공개 */
export type NodeVisibility = "url" | "full";

/** 내 노드에서 모은 해시태그. 비공개면 다른 사용자 프로필 보기에서 태그와 그 노드가 빠짐 */
export interface ProfileHashtag {
  tag: string; // '#' 포함
  count: number;
  isPublic: boolean;
}

export interface MockProfile {
  name: string;
  handle: string;
  avatar: string;
  bio: string;
  nodes: number;
  likes: number;
  interests: string[];
  topTags: ProfileHashtag[];
  visibility: NodeVisibility;
  /** 핀고정(공유)한 세션 id — 프로필 세션 탭 표시 순서 */
  pinnedSessionIds: number[];
}

export const MY_PROFILE: MockProfile = {
  name: "sprout.kr",
  handle: "@sprout.kr",
  avatar: "🌱",
  bio: "HCI 연구하며 여행 다니는 사람. 요즘은 유럽.",
  nodes: 218,
  likes: 87,
  interests: ["#유럽여행", "#HCI", "#미술관", "#프론트엔드", "#독서"],
  topTags: [
    { tag: "#파리", count: 28, isPublic: true },
    { tag: "#로마", count: 24, isPublic: true },
    { tag: "#항공권", count: 18, isPublic: true },
    { tag: "#미술관", count: 15, isPublic: true },
    { tag: "#예산", count: 11, isPublic: false },
  ],
  visibility: "url",
  pinnedSessionIds: [9001, 9003, 9002, 9005],
};

export function otherProfile(handle: string): MockProfile {
  const h = handle.startsWith("@") ? handle : `@${handle}`;
  const post = COMMUNITY_FEED.find((p) => p.user.handle === h);
  return {
    name: h.replace("@", "") || "wanderlust",
    handle: h || "@wanderlust",
    avatar: post?.user.avatar ?? "🌿",
    bio: "동유럽 한 달 살이 중. 천천히 깊게 다니기.",
    nodes: 142,
    likes: 284,
    interests: ["#프라하", "#비엔나", "#야간열차", "#카페투어"],
    topTags: [
      { tag: "#프라하", count: 32, isPublic: true },
      { tag: "#비엔나", count: 28, isPublic: true },
      { tag: "#야간열차", count: 16, isPublic: true },
      // 비공개 예시 — 다른 사용자 프로필 보기에서 태그와 그 노드가 빠짐
      { tag: "#카페", count: 14, isPublic: false },
      { tag: "#슬로우트래블", count: 12, isPublic: false },
    ],
    visibility: "url",
    pinnedSessionIds: [9007, 9004, 9002, 9006],
  };
}

// ---------- 홈 대시보드 ----------
export const HOME_TOP_TAGS = [
  { tag: "#파리", n: 28 }, { tag: "#로마", n: 24 }, { tag: "#항공권", n: 18 }, { tag: "#미술관", n: 15 },
  { tag: "#예산", n: 11 }, { tag: "#일정", n: 9 }, { tag: "#식당예약", n: 8 }, { tag: "#교통권", n: 7 },
  { tag: "#환전", n: 6 }, { tag: "#숨겨진명소", n: 5 },
];

export const HOME_WEEK_ACTIVITY = [
  { d: "월", mins: 38 }, { d: "화", mins: 94 }, { d: "수", mins: 67 }, { d: "목", mins: 110 },
  { d: "금", mins: 77 }, { d: "토", mins: 120 }, { d: "일", mins: 58 },
];

export interface TimelineSite {
  name: string;
  favicon: string;
  color: string;
}
export interface TimelineSlot {
  time: string;
  tags: string[];
  sites: TimelineSite[];
}
export const HOME_TIMELINE: TimelineSlot[] = [
  { time: "09:00 — 10:30", tags: ["#아침루틴", "#커피"], sites: [{ name: "velog.io", favicon: "V", color: "#20c997" }, { name: "medium.com", favicon: "M", color: "#000" }] },
  { time: "10:30 — 12:00", tags: ["#자바", "#스프링", "#JPA"], sites: [{ name: "docs.spring.io", favicon: "S", color: "#6db33f" }, { name: "baeldung.com", favicon: "B", color: "#5d2f86" }, { name: "stackoverflow", favicon: "SO", color: "#f48024" }] },
  { time: "13:00 — 14:30", tags: ["#파리", "#항공권", "#일정"], sites: [{ name: "skyscanner.net", favicon: "SK", color: "#0770e3" }, { name: "parisinfo.com", favicon: "P", color: "#d6336c" }] },
  { time: "15:00 — 16:30", tags: ["#로마", "#콜로세움", "#먹거리"], sites: [{ name: "tripadvisor.co.kr", favicon: "T", color: "#00aa6c" }, { name: "naver.com/blog", favicon: "N", color: "#03c75a" }] },
  { time: "17:00 — 18:00", tags: ["#예산", "#환전"], sites: [{ name: "kbstar.com", favicon: "K", color: "#fac810" }, { name: "wise.com", favicon: "W", color: "#163300" }] },
];

// "이번 주" 타임라인용 세션 목록. dayOffset 0 = 오늘, -6 = 6일 전.
// 화면에서는 날짜별로 묶어 대표 해시태그 · 사이트만 뽑아 보여준다 (weekTimeline.ts).
export interface WeekSessionVisit {
  site: TimelineSite;
  dwellSec: number;
}
export interface WeekSession {
  dayOffset: number;
  startedAt: string;
  tags: string[];
  visits: WeekSessionVisit[];
}
const SITE = {
  velog: { name: "velog.io", favicon: "V", color: "#20c997" },
  medium: { name: "medium.com", favicon: "M", color: "#000" },
  spring: { name: "docs.spring.io", favicon: "S", color: "#6db33f" },
  baeldung: { name: "baeldung.com", favicon: "B", color: "#5d2f86" },
  so: { name: "stackoverflow", favicon: "SO", color: "#f48024" },
  sky: { name: "skyscanner.net", favicon: "SK", color: "#0770e3" },
  paris: { name: "parisinfo.com", favicon: "P", color: "#d6336c" },
  trip: { name: "tripadvisor.co.kr", favicon: "T", color: "#00aa6c" },
  naver: { name: "naver.com/blog", favicon: "N", color: "#03c75a" },
  kb: { name: "kbstar.com", favicon: "K", color: "#fac810" },
  wise: { name: "wise.com", favicon: "W", color: "#163300" },
} satisfies Record<string, TimelineSite>;
const v = (site: TimelineSite, dwellSec: number): WeekSessionVisit => ({ site, dwellSec });

export const HOME_WEEK_SESSIONS: WeekSession[] = [
  { dayOffset: -6, startedAt: "10:10", tags: ["#파리", "#항공권"], visits: [v(SITE.sky, 420), v(SITE.sky, 180), v(SITE.paris, 300)] },
  { dayOffset: -6, startedAt: "21:40", tags: ["#파리", "#일정"], visits: [v(SITE.paris, 520), v(SITE.naver, 90)] },
  { dayOffset: -4, startedAt: "09:30", tags: ["#자바", "#스프링", "#JPA"], visits: [v(SITE.spring, 600), v(SITE.baeldung, 240), v(SITE.so, 60)] },
  { dayOffset: -4, startedAt: "14:00", tags: ["#JPA", "#스프링"], visits: [v(SITE.baeldung, 300), v(SITE.so, 120), v(SITE.so, 45)] },
  { dayOffset: -3, startedAt: "20:15", tags: ["#JPA", "#연관관계"], visits: [v(SITE.velog, 380), v(SITE.baeldung, 200)] },
  { dayOffset: -2, startedAt: "13:20", tags: ["#로마", "#콜로세움"], visits: [v(SITE.trip, 260), v(SITE.naver, 310)] },
  { dayOffset: -2, startedAt: "22:05", tags: ["#로마", "#먹거리"], visits: [v(SITE.naver, 180), v(SITE.naver, 140)] },
  { dayOffset: -1, startedAt: "18:30", tags: ["#예산", "#환전"], visits: [v(SITE.kb, 150), v(SITE.wise, 200)] },
  { dayOffset: 0, startedAt: "09:00", tags: ["#아침루틴", "#커피"], visits: [v(SITE.velog, 240), v(SITE.medium, 300)] },
  { dayOffset: 0, startedAt: "10:30", tags: ["#자바", "#스프링", "#JPA"], visits: [v(SITE.spring, 500), v(SITE.velog, 120)] },
];

// ---------- 분석/추천 ----------
// "이번 주 인사이트" 슬라이드는 이번 주 세션 중 하나를 랜덤으로 보여준다 (AnalyticsView).
// 목: MOCK_SESSIONS 를 이번 주 세션으로 사용 — BE API 생기면 교체
export const WEEKLY_SESSIONS = MOCK_SESSIONS;

// "오늘의 웹 서핑 팁" · "오늘의 추천 행동" 슬라이드는 각 목록에서 하나를 랜덤으로 보여준다 (AnalyticsView).
export interface BannerTip {
  title: string;
  body: string;
}

export const SURFING_TIPS: BannerTip[] = [
  { title: '검색어에 큰따옴표("")를 씌워 "키워드" 형태로 검색하면 정확한 결과를 찾을 수 있어요.', body: "검색 방식만 바꿔도 정보의 질이 크게 달라져요." },
  { title: '검색 결과가 너무 많다면 "키워드 -제외어" 형태로 불필요한 단어를 빼보세요.', body: "예) computer science -java · 원하지 않는 정보가 줄어 더 정확한 결과를 찾을 수 있어요." },
  { title: '신뢰하는 사이트에서만 찾고 싶다면 "site:github.com 키워드"처럼 범위를 좁혀보세요.', body: "출처를 제한하면 원하는 정보를 더 빠르게 찾을 수 있어요." },
];

export const ACTION_RECOMMENDATIONS: BannerTip[] = [
  { title: "공식 문서도 한 번 정독해보세요.", body: "지금 공부하는 주제의 공식 문서나 원문을 한 번쯤 읽으며 핵심 개념을 정리해보는 건 어떨까요?" },
  { title: "커뮤니티 탐색 비중이 18%로 높은 편이에요. 문제 해결엔 좋지만 전체 구조를 잡는 데는 한계가 있어요.", body: "공식 문서를 한 번쯤 정독하며 기초를 다져보는 건 어떨까요?" },
  { title: "특정 사이트에 정보 탐색이 몰려 있어요.", body: "다양한 출처를 함께 참고하면 같은 주제도 더 넓고 깊게 이해할 수 있어요." },
];

export const READING_BEHAVIOR = [
  { label: "Deep Reading", pct: 42, color: "var(--green-700)" },
  { label: "Reading", pct: 26, color: "var(--green-500)" },
  { label: "Scanning", pct: 22, color: "var(--green-300)" },
  { label: "Idle", pct: 10, color: "var(--green-100)" },
];

export const CATEGORY_RATIO = [
  { name: "블로그", pct: 42, n: 89 },
  { name: "공식문서", pct: 28, n: 60 },
  { name: "커뮤니티", pct: 18, n: 38 },
  { name: "뉴스", pct: 8, n: 17 },
  { name: "기타", pct: 4, n: 9 },
];

export const EXPLORATION_STATS = [
  { label: "세션 평균 URL", value: "12개" },
  { label: "평균 페이지 체류", value: "42초" },
  { label: "평균 세션 길이", value: "1시간 14분" },
];

// ---------- 설정 ----------
/** 닉네임 중복 확인 시뮬레이션용 "이미 사용 중" 목록 (소문자) — 중복 확인 API 생기면 교체 */
export const TAKEN_NICKNAMES: string[] = ["admin", "test"];

export interface ExcludedUrl {
  url: string;
  on: boolean;
  isDefault: boolean;
}
export const DEFAULT_EXCLUDED: ExcludedUrl[] = [
  { url: "instagram.com", on: true, isDefault: true },
  { url: "mail.google.com", on: true, isDefault: true },
  { url: "youtube.com/shorts", on: true, isDefault: true },
  { url: "twitter.com", on: false, isDefault: true },
  { url: "tiktok.com", on: true, isDefault: true },
  { url: "tistory.com/feed", on: true, isDefault: false },
  { url: "tistory.com/skin", on: true, isDefault: false },
  { url: "tistory.com", on: true, isDefault: false },
  { url: "naver.com/blog", on: true, isDefault: false },
];

export const INTEGRATIONS = [
  { l: "Google Docs", s: "연결됨", on: true },
  { l: "Notion", s: "연결됨", on: true },
  { l: "카카오톡", s: "미연결", on: false },
];

// ---------- 북마크 ----------
export const BOOKMARK_TAG_BUNDLES = [
  { name: "동유럽 자료", tags: ["#프라하", "#비엔나", "#부다페스트", "#야간열차"] },
  { name: "미술관 모음", tags: ["#루브르", "#오르세", "#프라도", "#리이크스"] },
  { name: "예산 짜기", tags: ["#호스텔", "#슈퍼마켓", "#무료투어"] },
  { name: "항공권 비교", tags: ["#스카이스캐너", "#카타르항공", "#오픈조"] },
];

export const SIMILAR_PEOPLE = [
  { name: "foodtrip", tags: "#파리 #먹거리" },
  { name: "artwalk", tags: "#미술관 #파리" },
  { name: "rail.kr", tags: "#유레일 #예산" },
];
