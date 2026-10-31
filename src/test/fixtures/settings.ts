// 설정 화면 픽스처 — 디자인 시안 기준 수집 제외 URL · 외부 플랫폼 연동 목록.
import type { ExcludedUrlListResponse, ExtensionSettingsResponse } from "@/lib/api";
import type { ExcludedUrl, Integration } from "@/lib/viewTypes";

/** 기본 제공 5개(twitter.com 은 꺼짐) + 직접 추가한 4개. tistory.com 은 3개가 한 묶음 */
export const EXCLUDED_URLS: ExcludedUrl[] = [
  { id: 1, url: "instagram.com", on: true, isDefault: true },
  { id: 2, url: "mail.google.com", on: true, isDefault: true },
  { id: 3, url: "youtube.com/shorts", on: true, isDefault: true },
  { id: 4, url: "twitter.com", on: false, isDefault: true },
  { id: 5, url: "tiktok.com", on: true, isDefault: true },
  { id: 6, url: "tistory.com/feed", on: true, isDefault: false },
  { id: 7, url: "tistory.com/skin", on: true, isDefault: false },
  { id: 8, url: "tistory.com", on: true, isDefault: false },
  { id: 9, url: "naver.com/blog", on: true, isDefault: false },
];

/** 실제 GET /settings/collection/excluded-urls 응답 (dev 스키마 Postgres 에서 받은 모양) */
export const EXCLUDED_URL_LIST_RESPONSE: ExcludedUrlListResponse = {
  code: 200,
  excludedUrls: [
    { excludedUrlId: 1, url: "instagram.com", domain: "instagram.com", isDefault: true, isExcluded: true },
    { excludedUrlId: 2, url: "mail.google.com", domain: "mail.google.com", isDefault: true, isExcluded: true },
    { excludedUrlId: 6, url: "tistory.com/feed", domain: "tistory.com", isDefault: false, isExcluded: true },
    { excludedUrlId: 4, url: "twitter.com", domain: "twitter.com", isDefault: true, isExcluded: false },
  ],
};

/** 실제 GET /settings/extension 응답 — 저장한 적이 없으면 updatedAt 이 없다 */
export const EXTENSION_SETTINGS_RESPONSE: ExtensionSettingsResponse = {
  code: 200,
  userId: 27,
  popupVisible: false,
  autoEndNotificationEnabled: true,
  manualScrapEnabled: true,
  updatedAt: "2026-10-31T18:26:04.466036",
};

export const INTEGRATIONS: Integration[] = [
  { name: "Google Docs", connected: true },
  { name: "Notion", connected: true },
  { name: "카카오톡", connected: false },
];
