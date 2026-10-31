// 오늘의 웹 서핑 팁 (ANA-5). 사용자 데이터와 상관없는 고정 문구라 FE 에 둔다.
import type { BannerTip } from "@/lib/api";

export const SURFING_TIPS: BannerTip[] = [
  { title: '검색어에 큰따옴표("")를 씌워 "키워드" 형태로 검색하면 정확한 결과를 찾을 수 있어요.', body: "검색 방식만 바꿔도 정보의 질이 크게 달라져요." },
  { title: '검색 결과가 너무 많다면 "키워드 -제외어" 형태로 불필요한 단어를 빼보세요.', body: "예) computer science -java · 원하지 않는 정보가 줄어 더 정확한 결과를 찾을 수 있어요." },
  { title: '신뢰하는 사이트에서만 찾고 싶다면 "site:github.com 키워드"처럼 범위를 좁혀보세요.', body: "출처를 제한하면 원하는 정보를 더 빠르게 찾을 수 있어요." },
];
