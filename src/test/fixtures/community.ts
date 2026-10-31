// 전체 마인드맵 픽스처 — design.ts 의 시안 데이터를 화면이 받는 모양(viewTypes)으로 묶는다.
import type { FullMindmap } from "@/lib/viewTypes";
import { MINDMAP_EDGES, MINDMAP_NODES, MINDMAP_NODE_URLS } from "./design";

/** 작성자 전체 마인드맵 (시안은 모두 같은 유럽 여행 마인드맵) */
export const AUTHOR_MINDMAP: FullMindmap = {
  nodes: MINDMAP_NODES,
  edges: MINDMAP_EDGES,
  nodeUrls: MINDMAP_NODE_URLS,
};
