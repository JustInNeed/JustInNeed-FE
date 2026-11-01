// 프로필 화면 픽스처 — 디자인 시안 목 데이터(내 프로필 · 다른 사용자 wanderlust)를 ProfilePageData 로 묶은 값.
// 화면은 props 로만 받고, 테스트는 이 값을 넘겨 "이 데이터면 이렇게 보인다"를 검증한다.
import type {
  CommunityProfileCard,
  CommunityProfileMindmap,
  CommunityProfileResponse,
  CommunitySharedSession,
  MyProfileCard,
  MyProfileHashtag,
  MyProfileResponse,
  MySession,
  SessionListItem,
} from "@/lib/api";
import type { ProfileData, ProfileMindmap, ProfilePageData } from "@/lib/viewTypes";

/** 카드와 그 카드의 관련 세션 응답 — 화면은 세션을 팝업을 열 때 따로 받는다 */
type MindmapFixture = ProfileMindmap & { sessions: SessionListItem[] };

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
): MindmapFixture => ({ id, title, snippet: `${title} 정리`, hashtags, nodes, likes, bookmarks, exploring: 0, when: "2일 전", sessions });

// ---------- 내 프로필 ----------

const mine = (s: SessionListItem, isPublic: boolean, isPinned = false): MySession => ({ ...s, isPublic, isPinned });

/** 내 세션 — 응답 순서대로 핀고정이 먼저, 그다음 최신순. 9006 · 9007 은 비공개 */
export const MY_SESSIONS: MySession[] = [
  mine(session(9001, "로마 3박 4일 동선 짜기", "2026-04-26T21:14:00", "2026-04-26T22:48:00", 18, ["로마", "콜로세움", "바티칸", "먹거리"]), true, true),
  mine(session(9003, "파리 미술관 4곳 비교 (루브르/오르세/오랑주리/퐁피두)", "2026-04-24T10:05:00", "2026-04-24T11:30:00", 14, ["파리", "미술관", "루브르", "오르세"]), true, true),
  mine(session(9002, "유럽 항공권 비교 (인천→로마 IN, 프라하→인천 OUT)", "2026-04-25T14:02:00", "2026-04-25T15:21:00", 11, ["항공권", "스카이스캐너", "예산"]), true, true),
  mine(session(9005, "바르셀로나 가우디 투어", "2026-04-22T22:30:00", "2026-04-22T23:15:00", 9, ["바르셀로나", "가우디", "사그라다파밀리아"]), true, true),
  mine(session(9004, "유레일패스 vs 개별 구매", "2026-04-23T19:12:00", "2026-04-23T19:51:00", 7, ["유레일", "예산", "기차"]), true),
  mine(session(9006, "쉥겐 비자 & 입국 서류", "2026-04-21T09:40:00", "2026-04-21T10:08:00", 5, ["비자", "쉥겐", "ETIAS"]), false),
  mine(session(9007, "프라하 1박 일정 짜기", "2026-04-20T23:05:00", "2026-04-20T23:32:00", 6, ["프라하", "카를교", "체코"]), false),
];
const mySession = (id: number) => MY_SESSIONS.find((s) => s.id === id)!;

const apiHashtag = (hashtagId: number, hashtag: string, nodeCount: number, isPublic = true): MyProfileHashtag => ({
  hashtagId,
  hashtag,
  nodeCount,
  isPublic,
});
const MY_TOP_HASHTAGS = [
  apiHashtag(1, "파리", 28),
  apiHashtag(2, "로마", 24),
  apiHashtag(3, "항공권", 18),
  apiHashtag(4, "미술관", 15),
  apiHashtag(5, "예산", 11, false),
];

/** GET /community/me/profile — 해시태그 전체엔 상위 5개 밖의 #기차 · 비공개 #비자 가 더 있다 */
export const API_MY_PROFILE: MyProfileResponse = {
  userId: 6,
  nickname: "sprout.kr",
  bio: "HCI 연구하며 여행 다니는 사람. 요즘은 유럽.",
  visibility: "URL_ONLY",
  totalNodeCount: 218,
  sharedSessionCount: 5,
  likeCount: 87,
  topHashtags: MY_TOP_HASHTAGS,
  hashtags: [...MY_TOP_HASHTAGS, apiHashtag(6, "기차", 6), apiHashtag(7, "비자", 4, false)],
  interests: ["유럽여행", "HCI", "미술관", "프론트엔드", "독서"].map((hashtag, i) => ({ interestId: i + 1, hashtag })),
  pinnedSessions: [9001, 9003, 9002, 9005].map(mySession),
};

/** API_MY_PROFILE 을 화면 값으로 — 이름 · 핸들은 화면에서 로그인 회원 닉네임으로 바뀐다 */
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

/** 앞의 둘은 핀고정, 마지막은 비공개 */
export const MY_MINDMAPS: MindmapFixture[] = [
  { ...mindmap("901", "로마 3박 4일 동선", ["#로마", "#콜로세움", "#먹거리"], 64, 41, 12, [mySession(9001)]), isPublic: true, isPinned: true },
  { ...mindmap("902", "파리 미술관 투어 지도", ["#파리", "#미술관", "#루브르"], 52, 33, 18, [mySession(9003)]), isPublic: true, isPinned: true },
  { ...mindmap("903", "유럽 항공권 · 예산 정리", ["#예산", "#항공권"], 38, 20, 9, [mySession(9002), mySession(9004)]), isPublic: true, isPinned: false },
  { ...mindmap("904", "쉥겐 비자 서류", ["#비자", "#쉥겐"], 27, 12, 4, [mySession(9006)]), isPublic: false, isPinned: false },
];

export const MY_PROFILE_PAGE: ProfilePageData = {
  profile: MY_PROFILE,
  mindmaps: MY_MINDMAPS,
  sessions: API_MY_PROFILE.pinnedSessions,
  hashtags: API_MY_PROFILE.hashtags.map((t) => ({ id: t.hashtagId, tag: `#${t.hashtag}`, count: t.nodeCount, isPublic: t.isPublic })),
  sharedSessionCount: API_MY_PROFILE.sharedSessionCount,
};

// ---------- 다른 사용자 프로필 (@wanderlust) ----------

/** 공개 세션 — 응답 순서대로 핀고정 3개가 먼저. 9105 는 고정하지 않았다 */
export const OTHER_SESSIONS: MySession[] = [
  mine(session(9107, "프라하 구시가지 산책 코스", "2026-04-14T19:30:00", "2026-04-14T20:30:00", 10, ["프라하", "카를교"]), true, true),
  mine(session(9104, "비엔나 카페 지도", "2026-04-16T15:00:00", "2026-04-16T16:20:00", 12, ["비엔나", "자허토르테"]), true, true),
  mine(session(9102, "빈 → 부다페스트 야간열차 예약", "2026-04-18T20:10:00", "2026-04-18T20:55:00", 8, ["야간열차", "비엔나", "부다페스트"]), true, true),
  mine(session(9105, "체스키크룸로프 당일치기", "2026-04-15T09:00:00", "2026-04-15T09:40:00", 5, ["체코", "소도시"]), true),
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
  ],
  visibility: "url",
  pinnedSessionIds: [],
};

/** 첫 카드만 핀고정 */
export const OTHER_MINDMAPS: MindmapFixture[] = [
  { ...mindmap("101", "동유럽 3주 살이 전체 동선", ["#프라하", "#동유럽", "#야간열차"], 64, 284, 91, [otherSession(9102), otherSession(9107)]), isPinned: true },
  mindmap("102", "비엔나 카페 투어", ["#비엔나", "#자허토르테"], 41, 120, 40, [otherSession(9104)]),
  mindmap("103", "프라하 천천히 걷기", ["#프라하"], 33, 98, 27, [otherSession(9107)]),
  mindmap("104", "야간열차 노선 정리", ["#야간열차", "#나이트젯"], 29, 77, 30, [otherSession(9102)]),
  mindmap("105", "부다페스트 온천 비교", ["#부다페스트", "#온천"], 22, 54, 11, [otherSession(9102)]),
  mindmap("106", "체코 소도시 당일치기", ["#체코", "#소도시"], 18, 31, 8, [otherSession(9105)]),
];

export const OTHER_PROFILE_PAGE: ProfilePageData = {
  profile: OTHER_PROFILE,
  mindmaps: OTHER_MINDMAPS,
  sessions: [],
  sharedSessionCount: OTHER_SESSIONS.length,
  exploringCount: 12,
};

// ---------- 커뮤니티 프로필 API 응답 (실제 응답 모양) ----------
// API_PROFILE: URL_ONLY(기본값) 사용자. 공개 세션에 title 키가 없고 카드 title · snippet 이 null 이다.

const urlOnlySession = (id: number, tags: string[], isPinned = false): CommunitySharedSession => ({
  id,
  tags,
  urls: ["https://www.nightjet.com/en"],
  startedAt: "2026-10-20T20:10:00",
  endedAt: "2026-10-20T20:55:00",
  pageCount: 4,
  status: "COMPLETED",
  isPinned,
});

export const API_PROFILE: CommunityProfileResponse = {
  userId: 7,
  nickname: "냥집사",
  bio: "고양이와 사는 사람",
  visibility: "URL_ONLY",
  totalNodeCount: 22,
  sharedSessionCount: 2,
  topHashtags: [
    { hashtagId: 1, name: "놀이", nodeCount: 7 },
    { hashtagId: 2, name: "사료", nodeCount: 5 },
  ],
  interests: ["놀이", "동물병원"],
  likeCount: 2,
  likedByMe: true,
  following: true,
  exploringCount: 3,
};

/** API_PROFILE 의 공개 세션 — 앞의 하나만 핀고정 */
export const API_SHARED_SESSIONS = [urlOnlySession(31, ["놀이", "사료"], true), urlOnlySession(32, [])];

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
  isPinned: false,
  ...over,
});

export const apiMyCard = (over: Partial<MyProfileCard> = {}): MyProfileCard => ({
  ...apiCard({ owner: { userId: 6, nickname: "sprout.kr" }, title: "로마 3박 4일 동선", snippet: "로마 동선 정리" }),
  isPublic: true,
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
