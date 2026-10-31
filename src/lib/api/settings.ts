import { api } from "./client";
import type {
  ExcludedUrlCreateResponse,
  ExcludedUrlListResponse,
  ExtensionSettingKey,
  ExtensionSettingsResponse,
} from "./types";

const EXCLUDED_URLS = "/settings/collection/excluded-urls";

const EXTENSION_PATHS: Record<ExtensionSettingKey, string> = {
  popupVisible: "popup-visible",
  autoEndNotificationEnabled: "auto-end-notification",
  manualScrapEnabled: "manual-scrap",
};

/** 수집 제외 URL 전체 목록. 처음 조회 때 서버가 기본 URL 을 채운다 */
export const getExcludedUrls = () => api.get<ExcludedUrlListResponse>(EXCLUDED_URLS);

/** 같은 표시형이 있으면 409, 100개가 차 있으면 400 */
export const addExcludedUrl = (url: string) => api.post<ExcludedUrlCreateResponse>(EXCLUDED_URLS, { url });

export const updateExcludedUrlSelection = (excludedUrlIds: number[], isExcluded: boolean) =>
  api.patch<unknown>(`${EXCLUDED_URLS}/selections`, { excludedUrlIds, isExcluded });

/** 기본 URL 은 지워지지 않고 체크만 해제된다 */
export const deleteExcludedUrls = (excludedUrlIds: number[]) => api.del<unknown>(EXCLUDED_URLS, { excludedUrlIds });

export const getExtensionSettings = () => api.get<ExtensionSettingsResponse>("/settings/extension");

export const updateExtensionSetting = (key: ExtensionSettingKey, enabled: boolean) =>
  api.patch<unknown>(`/settings/extension/${EXTENSION_PATHS[key]}`, { enabled });
