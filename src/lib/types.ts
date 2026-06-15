// Domain types — shared across features. API layer will produce these later.

export interface Source {
  url: string;
  host: string;
  time: string;
  deepRead: boolean;
}

export interface Session {
  id: string;
  title: string;
  start: string;
  end: string;
  duration: string;
  urls: number;
  favorite: boolean;
  hashtags: string[];
  summary: string;
  insights: string[];
  sources: Source[];
}

export interface HashtagGroup {
  id: string;
  name: string;
  emoji: string;
  tags: string[];
}

export type ProviderId = "kakao" | "naver" | "google";

export interface Auth {
  provider: ProviderId;
  nickname: string;
  createdAt?: string;
  justSignedUp?: boolean;
  justLoggedIn?: boolean;
}

// Mindmap (force-directed graph)
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
