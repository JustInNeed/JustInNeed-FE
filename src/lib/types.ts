// 화면 전용 타입. (세션/그룹 도메인 타입은 API 스키마 lib/api/types.ts 가 원본)

export type ProviderId = "kakao" | "naver" | "google";

export interface Auth {
  provider: ProviderId;
  nickname: string;
  createdAt?: string;
  justSignedUp?: boolean;
  justLoggedIn?: boolean;
}

// Mindmap (force-directed graph) — 세션 상세에서 클라이언트가 생성
export type MindmapGroup = "core" | "city" | "logi" | "sub" | "meta";

export interface MindmapNode {
  id: string;
  label: string;
  x: number;
  y: number;
  size: number;
  group: MindmapGroup;
  vx?: number;
  vy?: number;
}

export type MindmapEdge = [string, string];
