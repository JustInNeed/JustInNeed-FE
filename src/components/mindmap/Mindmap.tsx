"use client";

import { useEffect, useRef, useState } from "react";
import type { MindmapEdge, MindmapNode } from "@/lib/types";

interface SimNode extends MindmapNode {
  vx: number;
  vy: number;
}

export interface MindmapProps {
  nodes: MindmapNode[];
  edges: MindmapEdge[];
  width?: number;
  height?: number;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  hoveredId?: string | null;
  onHover?: (id: string | null) => void;
  showLabels?: boolean;
}

export function Mindmap({
  nodes: initialNodes,
  edges,
  width = 1200,
  height = 760,
  selectedId,
  onSelect,
  hoveredId,
  onHover,
  showLabels = true,
}: MindmapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [nodes, setNodes] = useState<SimNode[]>(() =>
    initialNodes.map((n) => ({ ...n, vx: 0, vy: 0 })),
  );
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [drag, setDrag] = useState<{ id: string } | null>(null);
  const [pan, setPan] = useState<{ sx: number; sy: number; ox: number; oy: number } | null>(null);
  const animRef = useRef<number>(0);
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const dragRef = useRef(drag);
  dragRef.current = drag;

  // Force simulation (lightweight)
  useEffect(() => {
    let alpha = 0.6;
    const cx = width / 2;
    const cy = height / 2;
    const maxR = Math.min(width, height) / 2 - 60;

    const tick = () => {
      const ns = nodesRef.current.map((n) => ({ ...n }));

      for (const n of ns) {
        // center gravity (weak)
        n.vx += (cx - n.x) * 0.0008 * alpha;
        n.vy += (cy - n.y) * 0.0008 * alpha;
        // circular boundary — soft push back when outside the ball
        const dx0 = n.x - cx;
        const dy0 = n.y - cy;
        const dist0 = Math.sqrt(dx0 * dx0 + dy0 * dy0);
        if (dist0 > maxR) {
          const over = dist0 - maxR;
          n.vx -= (dx0 / dist0) * over * 0.06;
          n.vy -= (dy0 / dist0) * over * 0.06;
        }
      }

      // repulsion
      for (let i = 0; i < ns.length; i++) {
        for (let j = i + 1; j < ns.length; j++) {
          const a = ns[i];
          const b = ns[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const d2 = dx * dx + dy * dy + 0.01;
          const d = Math.sqrt(d2);
          const f = (800 * alpha) / d2;
          const fx = (dx / d) * f;
          const fy = (dy / d) * f;
          a.vx -= fx;
          a.vy -= fy;
          b.vx += fx;
          b.vy += fy;
        }
      }

      // edge spring
      for (const [aId, bId] of edges) {
        const a = ns.find((n) => n.id === aId);
        const b = ns.find((n) => n.id === bId);
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.sqrt(dx * dx + dy * dy) + 0.01;
        const target = 90 + (a.size + b.size) * 1.2;
        const f = (d - target) * 0.012 * alpha;
        const fx = (dx / d) * f;
        const fy = (dy / d) * f;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      }

      // integrate
      for (const n of ns) {
        if (dragRef.current && dragRef.current.id === n.id) {
          n.vx = 0;
          n.vy = 0;
          continue;
        }
        n.x += n.vx;
        n.y += n.vy;
        n.vx *= 0.78;
        n.vy *= 0.78;
      }

      alpha *= 0.992;
      if (alpha < 0.005) alpha = 0.05; // gentle continuous jitter
      nodesRef.current = ns;
      setNodes(ns);
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // pan + zoom
  const onWheel = (e: React.WheelEvent) => {
    const delta = -e.deltaY * 0.001;
    const k = Math.max(0.4, Math.min(2.5, transform.k * (1 + delta)));
    const rect = svgRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const nx = mx - (mx - transform.x) * (k / transform.k);
    const ny = my - (my - transform.y) * (k / transform.k);
    setTransform({ x: nx, y: ny, k });
  };

  const onMouseDown = (e: React.MouseEvent) => {
    const target = e.target as Element;
    if (target === svgRef.current || target.tagName === "rect") {
      setPan({ sx: e.clientX, sy: e.clientY, ox: transform.x, oy: transform.y });
    }
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (pan) {
      setTransform((t) => ({ ...t, x: pan.ox + (e.clientX - pan.sx), y: pan.oy + (e.clientY - pan.sy) }));
    }
    if (drag) {
      const rect = svgRef.current!.getBoundingClientRect();
      const x = (e.clientX - rect.left - transform.x) / transform.k;
      const y = (e.clientY - rect.top - transform.y) / transform.k;
      const ns = nodesRef.current.map((n) => (n.id === drag.id ? { ...n, x, y } : n));
      nodesRef.current = ns;
      setNodes(ns);
    }
  };
  const onMouseUp = () => {
    setPan(null);
    setDrag(null);
  };

  // Connected node ids for highlight
  const connectedIds = new Set<string>();
  const focusId = selectedId || hoveredId;
  if (focusId) {
    connectedIds.add(focusId);
    edges.forEach(([a, b]) => {
      if (a === focusId) connectedIds.add(b);
      if (b === focusId) connectedIds.add(a);
    });
  }
  const isFocused = (id: string) => connectedIds.size === 0 || connectedIds.has(id);

  return (
    <svg
      ref={svgRef}
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      style={{ background: "transparent", cursor: pan ? "grabbing" : "grab", userSelect: "none" }}
      onWheel={onWheel}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      <defs>
        <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#5FCF3E" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#5FCF3E" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width={width} height={height} fill="transparent" />
      <g transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}>
        {/* Edges */}
        {edges.map(([aId, bId], i) => {
          const a = nodes.find((n) => n.id === aId);
          const b = nodes.find((n) => n.id === bId);
          if (!a || !b) return null;
          const focused = isFocused(aId) && isFocused(bId);
          const op = 0.35 * (focused ? 1 : 0.3);
          return (
            <line
              key={i}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="#4DB02E"
              strokeWidth={1.2}
              strokeOpacity={op}
            />
          );
        })}
        {/* Nodes */}
        {nodes.map((n) => {
          const focused = isFocused(n.id);
          const opacity = focused ? 1 : 0.35;
          const isCore = n.group === "core";
          const isCity = n.group === "city";
          const isLogi = n.group === "logi";
          const fill = isCore ? "#3D8B25" : isCity ? "#5FCF3E" : isLogi ? "#87D448" : "#A6E26B";
          const stroke = isCore ? "#2D6A1B" : "#4DB02E";
          const isActive = selectedId === n.id || hoveredId === n.id;

          return (
            <g
              key={n.id}
              transform={`translate(${n.x},${n.y})`}
              style={{ cursor: "pointer", opacity }}
              onMouseDown={(e) => {
                e.stopPropagation();
                setDrag({ id: n.id });
              }}
              onMouseEnter={() => onHover && onHover(n.id)}
              onMouseLeave={() => onHover && onHover(null)}
              onClick={(e) => {
                e.stopPropagation();
                onSelect && onSelect(n.id);
              }}
            >
              {isActive && <circle r={n.size + 14} fill="url(#nodeGlow)" />}
              <circle
                r={n.size}
                fill={fill}
                stroke={isActive ? "#2D6A1B" : stroke}
                strokeWidth={isActive ? 3 : 1.5}
              />
              {showLabels && (
                <text
                  textAnchor="middle"
                  y={n.size + 14}
                  fontSize={isCore ? 14 : isCity ? 12 : 10}
                  fontWeight={isCore ? 700 : isCity ? 600 : 500}
                  fill="#1A1F17"
                  style={{ pointerEvents: "none" }}
                >
                  {n.label}
                </text>
              )}
            </g>
          );
        })}
      </g>

      {/* Mini control hint */}
      <g transform={`translate(16, ${height - 36})`} style={{ pointerEvents: "none" }}>
        <rect width="220" height="22" rx="11" fill="#FFFFFF" fillOpacity="0.85" stroke="#E8EDE2" />
        <text x="12" y="15" fontSize="10" fill="#6B7563" fontFamily="Pretendard">
          드래그로 이동 · 휠로 줌 · 노드 클릭으로 선택
        </text>
      </g>
    </svg>
  );
}
