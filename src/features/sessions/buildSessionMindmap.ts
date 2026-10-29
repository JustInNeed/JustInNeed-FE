import type { SessionDetail } from "@/lib/api";
import { hostFromUrl } from "@/lib/format";
import type { MindmapEdge, MindmapNode } from "@/lib/types";

/** 세션 제목(중심) & 출처로 작은 force-directed 그래프를 생성. */
export function buildSessionMindmap(session: SessionDetail): {
  nodes: MindmapNode[];
  edges: MindmapEdge[];
} {
  const sources = session.sources ?? [];

  const nodes: MindmapNode[] = [
    {
      id: "core",
      label: session.title.split(" ").slice(0, 2).join(" "),
      x: 500,
      y: 360,
      size: 22,
      group: "core",
    },
    ...sources.map((s, i): MindmapNode => {
      const angle = (i / Math.max(sources.length, 1)) * Math.PI * 2;
      return {
        id: "u" + i,
        label: hostFromUrl(s.url),
        x: 500 + Math.cos(angle) * 340,
        y: 360 + Math.sin(angle) * 260,
        size: 9,
        group: "sub",
      };
    }),
  ];

  const edges: MindmapEdge[] = sources.map((_, i): MindmapEdge => ["core", "u" + i]);

  return { nodes, edges };
}
