import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
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

const DOT = "#FFFFFF";
const TINT = "#87D448";
const LINE = "rgba(166,226,107,0.35)";
const GLOW = "rgba(196,238,156,0.65)";

type Kind = "core" | "hub" | "burst" | "leaf" | "orphan";
interface GNode { x: number; y: number; kind: Kind; tint: boolean }

/**
 * 그래프 뷰 스타일 — 전체가 하나의 큰 원.
 * 중심 코어 + 허브 + 허브별 잎 + 외곽 방사형 덩어리 + 중간 띠 채움 + 바깥 고아 노드 링.
 * 거리 상수는 반지름 192px 기준 값을 R 에 맞춰 스케일한다.
 */
function buildGraph(seed: string, W: number, H: number, density: number) {
  const rnd = mkRng(seed);
  const R = Math.min(H * 0.457, W * 0.36);
  const cx = W * 0.625;
  const cy = H * 0.49;
  const u = R / 192;
  const nodes: GNode[] = [];
  const edges: [number, number][] = [];
  const add = (x: number, y: number, kind: Kind) => {
    nodes.push({ x, y, kind, tint: rnd() < 0.14 });
    return nodes.length - 1;
  };
  const polar = (ox: number, oy: number, ang: number, d: number): [number, number] => [ox + Math.cos(ang) * d, oy + Math.sin(ang) * d];
  const n = (base: number) => Math.round(base * density);

  const core = add(cx, cy, "core");

  const hubs: number[] = [];
  const hubCount = 9;
  for (let i = 0; i < hubCount; i++) {
    const [x, y] = polar(cx, cy, (i / hubCount) * Math.PI * 2 + rnd() * 0.5, R * (0.26 + rnd() * 0.36));
    const h = add(x, y, "hub");
    hubs.push(h);
    edges.push([core, h]);
  }

  for (let i = 0; i < n(72); i++) {
    const [x, y] = polar(cx, cy, rnd() * Math.PI * 2, R * (0.07 + Math.sqrt(rnd()) * 0.5));
    edges.push([core, add(x, y, "leaf")]);
  }

  hubs.forEach((h) => {
    const cnt = Math.round((8 + rnd() * 16) * density);
    for (let i = 0; i < cnt; i++) {
      const [x, y] = polar(nodes[h].x, nodes[h].y, rnd() * Math.PI * 2, (10 + rnd() * 42) * u);
      const leaf = add(x, y, "leaf");
      edges.push([h, leaf]);
      if (rnd() < 0.15) {
        const [gx, gy] = polar(x, y, rnd() * Math.PI * 2, (8 + rnd() * 10) * u);
        edges.push([leaf, add(gx, gy, "leaf")]);
      }
    }
  });

  // 위쪽 외곽에 촘촘한 방사형 덩어리 2개
  for (let b = 0; b < 2; b++) {
    const ang = -Math.PI / 2 + (b === 0 ? -0.75 : 0.45) + (rnd() - 0.5) * 0.3;
    const [bx, by] = polar(cx, cy, ang, R * 0.76);
    const burst = add(bx, by, "burst");
    let nearest = hubs[0];
    let best = Infinity;
    hubs.forEach((h) => {
      const dd = Math.hypot(nodes[h].x - bx, nodes[h].y - by);
      if (dd < best) { best = dd; nearest = h; }
    });
    edges.push([nearest, burst]);
    const cnt = n(22);
    for (let i = 0; i < cnt; i++) {
      const [x, y] = polar(bx, by, (i / cnt) * Math.PI * 2 + rnd() * 0.2, (12 + rnd() * 13) * u);
      edges.push([burst, add(x, y, "leaf")]);
    }
  }

  // 잎끼리 느슨한 교차 연결
  const leafIds = nodes.map((p, i) => (p.kind === "leaf" ? i : -1)).filter((i) => i >= 0);
  for (let k = 0; k < n(160); k++) {
    const a = leafIds[Math.floor(rnd() * leafIds.length)];
    const b = leafIds[Math.floor(rnd() * leafIds.length)];
    if (a !== b && Math.hypot(nodes[a].x - nodes[b].x, nodes[a].y - nodes[b].y) < 60 * u) edges.push([a, b]);
  }

  // 테두리 쪽 작은 가지 묶음
  const rim = n(8);
  for (let c = 0; c < rim; c++) {
    const [mx, my] = polar(cx, cy, (c / rim) * Math.PI * 2 + rnd() * 0.6, R * (0.72 + rnd() * 0.14));
    const m = add(mx, my, "leaf");
    const cnt = 3 + Math.floor(rnd() * 4);
    for (let i = 0; i < cnt; i++) {
      const [x, y] = polar(mx, my, rnd() * Math.PI * 2, (8 + rnd() * 10) * u);
      edges.push([m, add(x, y, "leaf")]);
    }
  }

  // 안쪽 덩어리와 바깥 고리 사이 빈 띠 채우기: 가까운 노드가 있으면 잇고, 없으면 떠 있는 점
  for (let i = 0; i < n(75); i++) {
    const [x, y] = polar(cx, cy, rnd() * Math.PI * 2, R * (0.6 + rnd() * 0.26));
    let near = -1;
    let best = 42 * u;
    nodes.forEach((p, j) => {
      const dd = Math.hypot(p.x - x, p.y - y);
      if (dd < best) { best = dd; near = j; }
    });
    const f = add(x, y, "leaf");
    if (near >= 0 && rnd() < 0.75) edges.push([near, f]);
  }

  for (let i = 0; i < n(115); i++) {
    const [x, y] = polar(cx, cy, rnd() * Math.PI * 2, R * (0.86 + rnd() * 0.18));
    const o = add(x, y, "orphan");
    if (rnd() < 0.3) {
      const [px, py] = polar(x, y, rnd() * Math.PI * 2, (10 + rnd() * 8) * u);
      edges.push([o, add(px, py, "orphan")]);
    }
  }

  // 서버/브라우저 부동소수 끝자리 차이로 hydration 불일치가 나지 않도록 소수 둘째 자리로 자른다
  const r2 = (v: number) => Math.round(v * 100) / 100;
  // 작은 카드에서도 점이 보이도록 점 크기는 하한을 둔다
  const sz = Math.max(u, 0.55);
  const dots = nodes.map((p) => {
    let d: number;
    if (p.kind === "core") d = 15;
    else if (p.kind === "hub") d = 7 + rnd() * 3;
    else if (p.kind === "burst") d = 9;
    else if (p.kind === "orphan") d = 3.6;
    else d = 4 + rnd();
    const glow = p.kind === "core" || p.kind === "hub" || p.kind === "burst";
    return { x: r2(p.x), y: r2(p.y), r: r2((d * sz) / 2), color: p.kind === "leaf" && p.tint ? TINT : DOT, glow };
  });
  const lines = edges.map(([a, b]) => ({ x1: r2(nodes[a].x), y1: r2(nodes[a].y), x2: r2(nodes[b].x), y2: r2(nodes[b].y) }));

  return { dots, lines, lineWidth: r2(Math.max(0.5, u)) };
}

/** 커뮤니티/프로필/북마크 카드용 그래프 뷰 마인드맵 미리보기 (어두운 배경 + 하나의 원). */
export function MindmapPreview({ seed, nodes = 80, height = 140, density = 1, children }: MindmapPreviewProps) {
  const H = height;
  const wrapRef = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(320);
  const filterId = `mmglow${useId().replace(/:/g, "")}`;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width);
      if (w > 0) setW(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 노드 수가 많은 카드일수록 조금 더 빽빽하게
  const fill = Math.min(0.85, Math.max(0.55, 0.55 + nodes / 600)) * density;
  const { dots, lines, lineWidth } = useMemo(() => buildGraph(seed, W, H, fill), [seed, W, H, fill]);

  return (
    <div ref={wrapRef} className={styles.wrap} style={{ height: H }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} className={styles.svg} aria-hidden="true">
        <defs>
          <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.1" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g stroke={LINE} strokeWidth={lineWidth}>
          {lines.map((l, i) => (
            <line key={`l${i}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />
          ))}
        </g>
        <g fill={GLOW}>
          {dots.filter((d) => d.glow).map((d, i) => (
            <circle key={`h${i}`} cx={d.x} cy={d.y} r={d.r * 2} opacity={0.25} />
          ))}
        </g>
        <g filter={`url(#${filterId})`} opacity={0.9}>
          {dots.map((d, i) => (
            <circle key={`d${i}`} cx={d.x} cy={d.y} r={d.r} fill={d.color} />
          ))}
        </g>
      </svg>
      {children}
    </div>
  );
}
