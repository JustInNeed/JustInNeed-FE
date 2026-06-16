// Sample data (유럽 여행 계획) — placeholder until the API is wired up.
import type { HashtagGroup, Session } from "./types";

export const SESSIONS: Session[] = [
  {
    id: "s1",
    title: "로마 3박 4일 동선 짜기",
    start: "2026-04-26 21:14",
    end: "2026-04-26 22:48",
    duration: "1시간 34분",
    urls: 18,
    favorite: true,
    hashtags: ["#로마", "#콜로세움", "#바티칸", "#먹거리"],
    summary:
      "로마 시내 주요 명소 동선을 검토했고, 콜로세움-포로 로마노-팔라티노 통합권을 사전 예매하는 것이 합리적임을 확인. 바티칸은 수요일 오전 일찍 입장하는 것이 인파를 피하기 좋음. 트라스테베레 지구의 현지 식당 3곳 (Da Enzo, Tonnarello, Roma Sparita) 후보로 정함.",
    insights: [
      "콜로세움 통합권: 18€ / 24시간 내 1회 입장",
      "바티칸 박물관 수요일 오전 9시 = 가장 한산",
      "카르보나라 정통 레시피는 판체타·페코리노 로마노 사용",
    ],
    sources: [
      { url: "tripadvisor.com/Rome-Tours", host: "tripadvisor.com", time: "21:18", deepRead: true },
      { url: "reddit.com/r/rome/itinerary", host: "reddit.com", time: "21:32", deepRead: true },
      { url: "theculturetrip.com/europe/rome", host: "theculturetrip.com", time: "21:55", deepRead: false },
      { url: "youtube.com/watch?roma", host: "youtube.com", time: "22:14", deepRead: false },
      { url: "naver.com/blog/iamtravel", host: "blog.naver.com", time: "22:31", deepRead: true },
    ],
  },
  {
    id: "s2",
    title: "유럽 항공권 비교 (인천→로마 IN, 프라하→인천 OUT)",
    start: "2026-04-25 14:02",
    end: "2026-04-25 15:21",
    duration: "1시간 19분",
    urls: 11,
    favorite: false,
    hashtags: ["#항공권", "#스카이스캐너", "#예산"],
    summary:
      "오픈조 항공권 비교. 7월 출발 기준 KE/OZ는 180만원대, 경유편(에티하드, 카타르)은 130만원대. 카타르 도하 경유 8시간 레이오버 활용 시 도하 무료 시티투어 가능.",
    insights: [
      "오픈조 vs 왕복: 가격 차이 평균 8% 이내",
      "7월 셋째 주가 가격 변곡점 (휴가 시즌 직전)",
      "카타르 도하 8h 레이오버 = 무료 시티투어 자격",
    ],
    sources: [
      { url: "skyscanner.co.kr/flights", host: "skyscanner.co.kr", time: "14:05", deepRead: true },
      { url: "kayak.com/flights", host: "kayak.com", time: "14:22", deepRead: true },
      { url: "qatarairways.com/stopover", host: "qatarairways.com", time: "15:01", deepRead: true },
    ],
  },
  {
    id: "s3",
    title: "파리 미술관 4곳 비교 (루브르/오르세/오랑주리/퐁피두)",
    start: "2026-04-24 10:05",
    end: "2026-04-24 11:30",
    duration: "1시간 25분",
    urls: 14,
    favorite: true,
    hashtags: ["#파리", "#미술관", "#루브르", "#오르세"],
    summary:
      "파리 박물관 패스(2일권 55€)가 4곳 합산 가격(67€)보다 저렴. 단, 첫째 주 일요일은 일부 무료. 오르세 vs 루브르: 인상주의 → 오르세, 르네상스 → 루브르.",
    insights: [
      "파리 박물관 패스 2일권 55€ = 4곳 단품 67€보다 저렴",
      "매월 첫 일요일: 오랑주리 무료",
      "루브르 야간 개장: 수·금 21:45까지",
    ],
    sources: [
      { url: "parismuseumpass.fr", host: "parismuseumpass.fr", time: "10:08", deepRead: true },
      { url: "louvre.fr/en/visit", host: "louvre.fr", time: "10:30", deepRead: true },
      { url: "musee-orsay.fr", host: "musee-orsay.fr", time: "10:55", deepRead: true },
    ],
  },
  {
    id: "s4",
    title: "유레일패스 vs 개별 구매",
    start: "2026-04-23 19:12",
    end: "2026-04-23 19:51",
    duration: "39분",
    urls: 7,
    favorite: false,
    hashtags: ["#유레일", "#예산", "#기차"],
    summary:
      "4개국 5회 이용 기준, 유레일 글로벌 패스(7일 연속) 410€. 개별 구매(트랜이탈리아·SNCF·렌페·CD) 합산 약 380€. 큰 차이 없으나 시간 절약 시 패스 유리.",
    insights: ["유럽 야간열차 부활 트렌드 (Nightjet)", "7일 연속 vs 1개월 내 5일권: 일정 유연성 중요"],
    sources: [
      { url: "eurail.com/en/eurail-passes", host: "eurail.com", time: "19:14", deepRead: true },
      { url: "seat61.com/europe", host: "seat61.com", time: "19:30", deepRead: true },
    ],
  },
  {
    id: "s5",
    title: "바르셀로나 가우디 투어",
    start: "2026-04-22 22:30",
    end: "2026-04-22 23:15",
    duration: "45분",
    urls: 9,
    favorite: false,
    hashtags: ["#바르셀로나", "#가우디", "#사그라다파밀리아"],
    summary:
      "사그라다 파밀리아 + 타워 입장권은 6개월 전 예약 권장. 구엘공원은 시간대 지정 입장. 카사 바트요 야간 투어가 인기 상승.",
    insights: ["사그라다 입장권 + 타워: 36€", "구엘공원: 조기 시간대(8시)가 인파 적음"],
    sources: [
      { url: "sagradafamilia.org", host: "sagradafamilia.org", time: "22:33", deepRead: true },
      { url: "parkguell.barcelona", host: "parkguell.barcelona", time: "22:55", deepRead: true },
    ],
  },
  {
    id: "s6",
    title: "쉥겐 비자 & 입국 서류",
    start: "2026-04-21 09:40",
    end: "2026-04-21 10:08",
    duration: "28분",
    urls: 5,
    favorite: false,
    hashtags: ["#비자", "#쉥겐", "#ETIAS"],
    summary:
      "한국인은 쉥겐 무비자 90일. 단 2026년부터 ETIAS 사전 등록 필수 (7€, 3년 유효). 여권 잔여 유효기간 6개월 이상.",
    insights: ["ETIAS 2026.5월부터 의무화", "여권 유효기간 6개월 룰"],
    sources: [
      { url: "etias.com", host: "etias.com", time: "09:42", deepRead: true },
      { url: "mofa.go.kr", host: "mofa.go.kr", time: "09:58", deepRead: true },
    ],
  },
  {
    id: "s7",
    title: "프라하 1박 일정 짜기",
    start: "2026-04-20 23:05",
    end: "2026-04-20 23:32",
    duration: "27분",
    urls: 6,
    favorite: false,
    hashtags: ["#프라하", "#카를교", "#체코"],
    summary: "프라하성 + 카를교 + 구시가지 광장은 도보 동선 가능. 1박이면 구시가지 호텔이 효율적.",
    insights: ["프라하성 입장료: 350 CZK", "구시가 천문시계 정시 종소리"],
    sources: [{ url: "prague.eu", host: "prague.eu", time: "23:10", deepRead: true }],
  },
];

export const DEFAULT_GROUPS: HashtagGroup[] = [
  {
    id: "g1",
    name: "유럽 여행 준비",
    emoji: "✈️",
    tags: ["#파리", "#로마", "#베네치아", "#콜로세움", "#항공권", "#숙소"],
  },
  { id: "g2", name: "React 학습", emoji: "⚛️", tags: ["#React", "#TypeScript", "#훅", "#상태관리"] },
];
