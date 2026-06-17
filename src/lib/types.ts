// 화면 전용 타입. (세션/그룹 도메인 타입은 API 스키마 lib/api/types.ts 가 원본)

/** 소셜 로그인 시작 URL(`/oauth2/authorization/{id}`)에 쓰이는 프로바이더 식별자. */
export type ProviderId = "kakao" | "naver" | "google";

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
