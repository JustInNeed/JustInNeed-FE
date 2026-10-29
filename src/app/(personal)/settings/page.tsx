import { SettingsView } from "@/features/settings/SettingsView";
import type { ExcludedUrl } from "@/lib/viewTypes";

// 수집 제외 URL API 연결 전 — 빈 목록으로 시작한다
const EXCLUDED_URLS: ExcludedUrl[] = [];

export default function SettingsPage() {
  return <SettingsView excludedUrls={EXCLUDED_URLS} />;
}
