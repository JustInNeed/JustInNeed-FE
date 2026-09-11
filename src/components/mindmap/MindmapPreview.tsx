import { useMemo, type ReactNode } from "react";
import styles from "./MindmapPreview.module.css";

export interface MindmapPreviewProps {
  /** 같은 seed 면 항상 같은 배치 (deterministic) */
  seed: string;
  nodes?: number;
  height?: number;
  density?: number;
  children?: ReactNode;
}

// FNV-1a + mulberry32 — 시드 기반 결정적 난수
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mkRng(seed: string) {
  let a = hashStr(seed) || 1;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PALETTES = [
  ["#E45757", "#9CC5FF", "#7BD46A"],
  ["#FF8E5E", "#A09DFF", "#5DD0B0"],
  ["#FF6B9D", "#7BB7FF", "#A5DD5D"],
  ["#E45757", "#7BB7FF", "#FFD15E"],
];

/** 커뮤니티/프로필/북마크 카드용 "갤럭시" 마인드맵 미리보기 (어두운 배경 + 산점 노드). */
export function MindmapPreview({ seed, nodes = 80, height = 140, density = 1, children }: MindmapPreviewProps) {
  const W = 320;
  const H = height;

  const { lines, bgPts, clusterPts } = useMemo(() => {
    const rng = mkRng(seed);
    const palette = PALETTES[Math.floor(rng() * PALETTES.length)];
    const clusters = [
      { cx: W * (0.25 + rng() * 0.15), cy: H * (0.25 + rng() * 0.2), color: palette[0], spread: 28 + rng() * 10 },
      { cx: W * (0.55 + rng() * 0.2), cy: H * (0.3 + rng() * 0.25), color: palette[1], spread: 24 + rng() * 12 },
      { cx: W * (0.4 + rng() * 0.3), cy: H * (0.65 + rng() * 0.2), color: palette[2], spread: 26 + rng() * 12 },
    ];

    const bgCount = Math.round(nodes * 1.2 * density);
    const ocx = W / 2;
    const ocy = H / 2;
    const orx = W * 0.46;
    const ory = H * 0.46;
    const bg: { x: number; y: number; s: number; o: number }[] = [];
    for (let i = 0; i < bgCount; i++) {
      const t = rng() * Math.PI * 2;
      const r = Math.sqrt(rng());
      bg.push({ x: ocx + Math.cos(t) * orx * r, y: ocy + Math.sin(t) * ory * r, s: 0.6 + rng() * 1.2, o: 0.35 + rng() * 0.4 });
    }

    const cl: { x: number; y: number; s: number; o: number; color: string }[] = [];
    clusters.forEach((c) => {
      const n = 12 + Math.floor(rng() * 10);
      for (let i = 0; i < n; i++) {
        const t = rng() * Math.PI * 2;
        const r = rng() * c.spread;
        cl.push({ x: c.cx + Math.cos(t) * r, y: c.cy + Math.sin(t) * r * 0.85, s: 1.4 + rng() * 2.6, o: 0.7 + rng() * 0.3, color: c.color });
      }
    });

    const ln: { x1: number; y1: number; x2: number; y2: number; color: string; faint?: boolean }[] = [];
    clusters.forEach((c, ci) => {
      cl.filter((p) => p.color === c.color).slice(0, 4).forEach((p) => ln.push({ x1: c.cx, y1: c.cy, x2: p.x, y2: p.y, color: c.color }));
      const next = clusters[(ci + 1) % clusters.length];
      ln.push({ x1: c.cx, y1: c.cy, x2: next.cx, y2: next.cy, color: "#FFFFFF", faint: true });
    });
    return { lines: ln, bgPts: bg, clusterPts: cl };
  }, [seed, nodes, density, H]);

  return (
    <div className={styles.wrap} style={{ height: H }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className={styles.svg}>
        {lines.map((l, i) => (
          <line key={`l${i}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={l.color} strokeOpacity={l.faint ? 0.06 : 0.18} strokeWidth={l.faint ? 0.5 : 0.7} />
        ))}
        {bgPts.map((p, i) => (
          <circle key={`b${i}`} cx={p.x} cy={p.y} r={p.s} fill="#E6EAF2" opacity={p.o} />
        ))}
        {clusterPts.map((p, i) => (
          <circle key={`c${i}`} cx={p.x} cy={p.y} r={p.s} fill={p.color} opacity={p.o} />
        ))}
      </svg>
      {children}
    </div>
  );
}
