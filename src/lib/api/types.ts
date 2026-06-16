// 백엔드 REST API 스키마 (OpenAPI 기준). 화면 도메인 타입의 원본(source of truth).

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  message: string | null;
}

export type SessionStatus = "ANALYZING" | "COMPLETED" | "FAILED";

/** 목록용 — 본문 없음, 가벼움. */
export interface SessionListItem {
  id: number;
  title: string;
  startedAt: string; // ISO datetime (타임존 없음)
  endedAt: string | null;
  pageCount: number;
  status: SessionStatus;
  isFavorite: boolean;
  isPublic: boolean;
  tags: string[]; // '#' 없이 raw 문자열
}

export interface Source {
  title: string;
  url: string;
  excerpt: string;
}

export interface SessionSummary {
  heading: string;
  markdown: string;
  insights: string[];
}

/** 상세용 — 요약/출처 포함. */
export interface SessionDetail extends SessionListItem {
  summary: SessionSummary | null;
  sources: Source[];
}

/** 모든 필드 optional — 보낸 필드만 수정. */
export interface SessionUpdateRequest {
  title?: string;
  editedMarkdown?: string;
  isPublic?: boolean;
  isFavorite?: boolean;
  tags?: string[];
}

export interface TagGroup {
  id: number;
  name: string;
  hashtags: string[];
  position: number;
  sessions: SessionListItem[];
}

export interface TagGroupCreateRequest {
  name: string;
  hashtags?: string[];
  position?: number;
}

export interface TagGroupUpdateRequest {
  name?: string;
  hashtags?: string[];
}

export interface TagGroupOrderRequest {
  /** 내 그룹 전체를 원하는 순서대로 빠짐없이 한 번씩. */
  groupIds: number[];
}
