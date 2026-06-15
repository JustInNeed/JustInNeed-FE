import type { MindmapEdge, MindmapNode, Session } from "@/lib/types";

/** Build a small force-directed graph from a session's insights & sources. */
export function buildSessionMindmap(session: Session): {
  nodes: MindmapNode[];
  edges: MindmapEdge[];
} {
  const nodes: MindmapNode[] = [
    {
      id: "core",
      label: session.title.split(" ").slice(0, 2).join(" "),
      x: 500,
      y: 360,
      size: 22,
      group: "core",
    },
    ...session.insights.map((it, i): MindmapNode => {
      const angle = (i / session.insights.length) * Math.PI * 2 - Math.PI / 2;
      return {
        id: "i" + i,
        label: it.split(":")[0].slice(0, 16),
        x: 500 + Math.cos(angle) * 200,
        y: 360 + Math.sin(angle) * 160,
        size: 14,
        group: "city",
      };
    }),
    ...session.sources.map((s, i): MindmapNode => {
      const angle = (i / session.sources.length) * Math.PI * 2;
      return {
        id: "u" + i,
        label: s.host,
        x: 500 + Math.cos(angle) * 340,
        y: 360 + Math.sin(angle) * 260,
        size: 9,
        group: "sub",
      };
    }),
  ];

  const edges: MindmapEdge[] = [
    ...session.insights.map((_, i): MindmapEdge => ["core", "i" + i]),
    ...session.sources.map((_, i): MindmapEdge => ["core", "u" + i]),
  ];

  return { nodes, edges };
}
