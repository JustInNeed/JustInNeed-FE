// 프로필 화면 픽스처 — 디자인 시안 목 데이터(내 프로필 · 다른 사용자 wanderlust)를 ProfilePageData 로 묶은 값.
// 화면은 props 로만 받고, 테스트는 이 값을 넘겨 "이 데이터면 이렇게 보인다"를 검증한다.
import type {
  CommunityProfileCard,
  CommunityProfileMindmap,
  CommunityProfileResponse,
  CommunitySharedSession,
  SessionListItem,
} from "@/lib/api";
import type { FullMindmap, ProfileData, ProfileMindmap, ProfilePageData } from "@/lib/viewTypes";

const session = (
  id: number,
  title: string,
  startedAt: string,
  endedAt: string,
  pageCount: number,
  tags: string[],
): SessionListItem => ({ id, title, startedAt, endedAt, pageCount, status: "COMPLETED", isFavorite: false, isPublic: false, tags });

const mindmap = (
  id: string,
  title: string,
  hashtags: string[],
  nodes: number,
  likes: number,
  bookmarks: number,
  sessions: SessionListItem[],
): ProfileMindmap => ({ id, title, snippet: `${title} 정리`, hashtags, nodes, likes, bookmarks, exploring: 0, when: "2일 전", sessions });

// ---------- 내 프로필 ----------

/** 내 세션 — 프로필 수정의 핀고정 후보 */
export const MY_SESSIONS: SessionListItem[] = [
  session(9001, "로마 3박 4일 동선 짜기", "2026-04-26T21:14:00", "2026-04-26T22:48:00", 18, ["로마", "콜로세움", "바티칸", "먹거리"]),
  session(9002, "유럽 항공권 비교 (인천→로마 IN, 프라하→인천 OUT)", "2026-04-25T14:02:00", "2026-04-25T15:21:00", 11, ["항공권", "스카이스캐너", "예산"]),
  session(9003, "파리 미술관 4곳 비교 (루브르/오르세/오랑주리/퐁피두)", "2026-04-24T10:05:00", "2026-04-24T11:30:00", 14, ["파리", "미술관", "루브르", "오르세"]),
  session(9004, "유레일패스 vs 개별 구매", "2026-04-23T19:12:00", "2026-04-23T19:51:00", 7, ["유레일", "예산", "기차"]),
  session(9005, "바르셀로나 가우디 투어", "2026-04-22T22:30:00", "2026-04-22T23:15:00", 9, ["바르셀로나", "가우디", "사그라다파밀리아"]),
  session(9006, "쉥겐 비자 & 입국 서류", "2026-04-21T09:40:00", "2026-04-21T10:08:00", 5, ["비자", "쉥겐", "ETIAS"]),
  session(9007, "프라하 1박 일정 짜기", "2026-04-20T23:05:00", "2026-04-20T23:32:00", 6, ["프라하", "카를교", "체코"]),
];
const mySession = (id: number) => MY_SESSIONS.find((s) => s.id === id)!;

/** 이름 · 핸들은 화면에서 로그인 회원 닉네임으로 바뀐다 */
export const MY_PROFILE: ProfileData = {
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

export const MY_MINDMAPS: ProfileMindmap[] = [
  mindmap("m1", "로마 3박 4일 동선", ["#로마", "#콜로세움", "#먹거리"], 64, 41, 12, [mySession(9001)]),
  mindmap("m2", "파리 미술관 투어 지도", ["#파리", "#미술관", "#루브르"], 52, 33, 18, [mySession(9003)]),
  mindmap("m3", "유럽 항공권 · 예산 정리", ["#예산", "#항공권"], 38, 20, 9, [mySession(9002), mySession(9004)]),
  mindmap("m4", "바르셀로나 가우디 건축", ["#바르셀로나", "#가우디"], 27, 12, 4, [mySession(9005)]),
];

export const MY_FULL_MINDMAP: FullMindmap = {
  nodes: [
    { id: "eu", label: "유럽 여행", x: 600, y: 380, size: 28, group: "core" },
    { id: "rome", label: "로마", x: 380, y: 220, size: 20, group: "city" },
    { id: "paris", label: "파리", x: 820, y: 200, size: 22, group: "city" },
    { id: "budget", label: "예산", x: 440, y: 620, size: 14, group: "logi" },
    { id: "colos", label: "콜로세움", x: 220, y: 130, size: 9, group: "sub" },
    { id: "louvre", label: "루브르", x: 1020, y: 280, size: 11, group: "sub" },
  ],
  edges: [["eu", "rome"], ["eu", "paris"], ["eu", "budget"], ["rome", "colos"], ["paris", "louvre"]],
  nodeUrls: {
    budget: "https://wise.com/kr/currency-converter/eur-to-krw-rate",
    colos: "https://www.colosseo.it/en/",
    louvre: "https://www.louvre.fr/en",
  },
};

export const MY_PROFILE_PAGE: ProfilePageData = {
  profile: MY_PROFILE,
  mindmaps: MY_MINDMAPS,
  fullMindmap: MY_FULL_MINDMAP,
  sessions: MY_SESSIONS,
};

// ---------- 다른 사용자 프로필 (@wanderlust) ----------
// #카페 · #슬로우트래블 은 비공개 — 태그 줄 · 카드 태그 · 세션 태그 어디에도 보이지 않고 노드 수에서도 빠진다

export const OTHER_SESSIONS: SessionListItem[] = [
  session(9102, "빈 → 부다페스트 야간열차 예약", "2026-04-18T20:10:00", "2026-04-18T20:55:00", 8, ["야간열차", "비엔나", "부다페스트"]),
  session(9104, "비엔나 카페 지도", "2026-04-16T15:00:00", "2026-04-16T16:20:00", 12, ["비엔나", "카페", "자허토르테"]),
  session(9105, "체스키크룸로프 당일치기", "2026-04-15T09:00:00", "2026-04-15T09:40:00", 5, ["체코", "소도시"]),
  session(9107, "프라하 구시가지 산책 코스", "2026-04-14T19:30:00", "2026-04-14T20:30:00", 10, ["프라하", "카를교", "슬로우트래블"]),
];
const otherSession = (id: number) => OTHER_SESSIONS.find((s) => s.id === id)!;

export const OTHER_PROFILE: ProfileData = {
  name: "wanderlust",
  handle: "@wanderlust",
  avatar: "🌿",
  bio: "동유럽 한 달 살이 중. 천천히 깊게 다니기.",
  nodes: 142,
  likes: 284,
  interests: ["#프라하", "#비엔나", "#야간열차", "#카페투어"],
  topTags: [
    { tag: "#프라하", count: 32, isPublic: true },
    { tag: "#비엔나", count: 28, isPublic: true },
    { tag: "#야간열차", count: 16, isPublic: true },
    { tag: "#카페", count: 14, isPublic: false },
    { tag: "#슬로우트래블", count: 12, isPublic: false },
  ],
  visibility: "url",
  pinnedSessionIds: [9107, 9104, 9102],
};

export const OTHER_MINDMAPS: ProfileMindmap[] = [
  mindmap("o1", "동유럽 3주 살이 전체 동선", ["#프라하", "#동유럽", "#야간열차"], 64, 284, 91, [otherSession(9102), otherSession(9107)]),
  mindmap("o2", "비엔나 카페 투어", ["#카페", "#비엔나", "#자허토르테"], 41, 120, 40, [otherSession(9104)]),
  mindmap("o3", "프라하 천천히 걷기", ["#슬로우트래블", "#프라하"], 33, 98, 27, [otherSession(9107)]),
  mindmap("o4", "야간열차 노선 정리", ["#야간열차", "#나이트젯"], 29, 77, 30, [otherSession(9102)]),
  mindmap("o5", "부다페스트 온천 비교", ["#부다페스트", "#온천"], 22, 54, 11, [otherSession(9102)]),
  mindmap("o6", "체코 소도시 당일치기", ["#체코", "#소도시"], 18, 31, 8, [otherSession(9105)]),
];

export const OTHER_FULL_MINDMAP: FullMindmap = {
  nodes: [
    { id: "east", label: "동유럽", x: 600, y: 380, size: 28, group: "core" },
    { id: "prague", label: "프라하", x: 380, y: 220, size: 20, group: "city" },
    { id: "vienna", label: "비엔나", x: 820, y: 200, size: 20, group: "city" },
    { id: "night", label: "야간열차", x: 600, y: 600, size: 16, group: "logi" },
    { id: "bridge", label: "카를교", x: 220, y: 130, size: 9, group: "sub" },
  ],
  edges: [["east", "prague"], ["east", "vienna"], ["east", "night"], ["prague", "bridge"]],
  nodeUrls: { bridge: "https://www.prague.eu/en", night: "https://www.nightjet.com/en" },
};

export const OTHER_PROFILE_PAGE: ProfilePageData = {
  profile: OTHER_PROFILE,
  mindmaps: OTHER_MINDMAPS,
  fullMindmap: OTHER_FULL_MINDMAP,
  sessions: OTHER_SESSIONS,
  exploringCount: 12,
};

/** 프로필 이동(핸들 변경) 확인용 두 번째 사용자 (@foodtrip) */
export const ANOTHER_PROFILE_PAGE: ProfilePageData = {
  ...OTHER_PROFILE_PAGE,
  profile: { ...OTHER_PROFILE, name: "foodtrip", handle: "@foodtrip", avatar: "🥖", likes: 412 },
  exploringCount: 34,
};

// ---------- 커뮤니티 프로필 API 응답 (실제 응답 모양) ----------
// API_PROFILE: URL_ONLY(기본값) 사용자. 공유 세션에 title 키가 없고 카드 title · snippet 이 null 이다.

const urlOnlySession = (id: number, tags: string[]): CommunitySharedSession => ({
  id,
  tags,
  urls: ["https://www.nightjet.com/en"],
  startedAt: "2026-10-20T20:10:00",
  endedAt: "2026-10-20T20:55:00",
  pageCount: 4,
  status: "COMPLETED",
});

export const API_PROFILE: CommunityProfileResponse = {
  userId: 7,
  nickname: "냥집사",
  bio: "고양이와 사는 사람",
  visibility: "URL_ONLY",
  totalNodeCount: 22,
  topHashtags: [
    { hashtagId: 1, name: "놀이", nodeCount: 7 },
    { hashtagId: 2, name: "사료", nodeCount: 5 },
  ],
  interests: ["놀이", "동물병원"],
  likeCount: 2,
  likedByMe: true,
  following: true,
  exploringCount: 3,
  pinnedSessions: [urlOnlySession(31, ["놀이", "사료"]), urlOnlySession(32, [])],
};

/** CONTENT 공개 사용자의 공유 세션 — title 이 온다 */
export const API_CONTENT_SESSION: CommunitySharedSession = { ...urlOnlySession(33, ["로마"]), title: "로마 3박 4일 동선" };

export const apiCard = (over: Partial<CommunityProfileCard> = {}): CommunityProfileCard => ({
  mindmapId: 31,
  owner: { userId: 7, nickname: "냥집사" },
  title: null,
  snippet: null,
  hashtags: ["놀이", "사료"],
  nodeCount: 9,
  likeCount: 2,
  likedByMe: false,
  bookmarkCount: 1,
  bookmarkId: null,
  exploringCount: 3,
  exploringByMe: false,
  lastActivityAt: "2026-10-31T10:00:00",
  relatedUrls: [{ title: null, url: "https://www.nightjet.com/en" }],
  ...over,
});

const apiNode = (nodeId: number, sourceUrl: string | null, label = sourceUrl ?? "") => ({
  nodeId,
  label,
  sourceUrl,
  content: null,
  visibilityScope: "URL_ONLY" as const,
});

/** node:1 은 태그 둘에, node:2 는 한 태그에 이어지고, node:3 · tag:3(관심 해시태그) 은 연결이 없다 */
export const API_MINDMAP: CommunityProfileMindmap = {
  mindmapId: 7,
  ownerId: 7,
  nickname: "냥집사",
  title: "Community mindmap",
  hashtags: [
    { hashtagId: 1, ownerId: 7, name: "놀이" },
    { hashtagId: 2, ownerId: 7, name: "사료" },
    { hashtagId: 3, ownerId: 7, name: "동물병원" },
  ],
  nodes: [
    apiNode(1, "https://www.nightjet.com/en"),
    apiNode(2, "https://www.cd.cz/en/"),
    apiNode(3, "https://example.com/no-tags"),
  ],
  edges: [
    { from: "tag:1", to: "node:1" },
    { from: "tag:2", to: "node:1" },
    { from: "tag:2", to: "node:2" },
  ],
  topHashtags: [],
};
