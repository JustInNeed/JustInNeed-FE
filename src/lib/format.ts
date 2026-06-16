// 표시용 포맷 헬퍼 — API의 ISO 날짜/URL을 화면 텍스트로 변환.
import type { SessionStatus } from "./api/types";

export function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").split("/")[0];
  }
}

/** "2026-06-16T23:22:30" → "2026-06-16" */
export function formatDate(iso: string): string {
  return iso.slice(0, 10);
}

/** "2026-06-16T23:22:30" → "23:22" */
export function formatTime(iso: string): string {
  const t = iso.split("T")[1] ?? "";
  return t.slice(0, 5);
}

/** "2026-06-16T23:22:30" → "2026-06-16 23:22" */
export function formatDateTime(iso: string): string {
  return `${formatDate(iso)} ${formatTime(iso)}`;
}

/** 시작/종료 시각으로 소요 시간 계산 → "1시간 34분" / "39분". 종료 전이면 null. */
export function formatDuration(startedAt: string, endedAt: string | null): string | null {
  if (!endedAt) return null;
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  if (Number.isNaN(ms) || ms < 0) return null;
  const min = Math.round(ms / 60000);
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}시간 ${m}분` : `${m}분`;
}

export const STATUS_LABEL: Record<SessionStatus, string> = {
  ANALYZING: "분석 중",
  COMPLETED: "분석 완료",
  FAILED: "분석 실패",
};

/** 해시태그 표시용 — raw 태그에 '#' 접두사. */
export function withHash(tag: string): string {
  return tag.startsWith("#") ? tag : `#${tag}`;
}
