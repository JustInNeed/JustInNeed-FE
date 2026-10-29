// 설정 화면 픽스처 — 디자인 시안 기준 수집 제외 URL · 외부 플랫폼 연동 목록.
import type { ExcludedUrl, Integration } from "@/lib/viewTypes";

/** 기본 제공 5개(twitter.com 은 꺼짐) + 직접 추가한 4개. tistory.com 은 3개가 한 묶음 */
export const EXCLUDED_URLS: ExcludedUrl[] = [
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

export const INTEGRATIONS: Integration[] = [
  { name: "Google Docs", connected: true },
  { name: "Notion", connected: true },
  { name: "카카오톡", connected: false },
];
