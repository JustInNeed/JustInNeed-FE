"use client";

import { useEffect, useRef, useState } from "react";
import type { MindmapEdge, MindmapNode } from "@/lib/types";
import { treeLayout } from "./treeLayout";

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
  /** 필터에서 걸러진 노드 — 흐리게 표시 */
  dimmedIds?: ReadonlySet<string>;
  /** 검색어와 일치하는 노드 — 테두리 강조, 이웃 노드와 연결선까지 강조하고 나머지는 흐리게 */
  matchIds?: ReadonlySet<string>;
  /** 좌하단 조작 안내 표시 여부 */
  showHint?: boolean;
  /** radial: 기존 force 배치(기본) · tree: 루트에서 왼쪽→오른쪽 계층 배치(고정). 마운트 시점 기준이라 바꿀 땐 key 로 다시 마운트 */
  layout?: "radial" | "tree";
  /** 편집 모드 — 노드 더블클릭으로 라벨을 바로 고친다. 확정된 값은 onLabelChange 로 전달 */
  editable?: boolean;
  onLabelChange?: (id: string, label: string) => void;
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
  dimmedIds,
  matchIds,
  showHint = true,
  layout = "radial",
  editable = false,
  onLabelChange,
}: MindmapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [nodes, setNodes] = useState<SimNode[]>(() => {
    const ns = initialNodes.map((n) => ({ ...n, vx: 0, vy: 0 }));
    return layout === "tree" ? treeLayout(ns, edges, width, height) : ns;
  });
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [drag, setDrag] = useState<{ id: string } | null>(null);
  const [pan, setPan] = useState<{ sx: number; sy: number; ox: number; oy: number } | null>(null);
  const animRef = useRef<number>(0);
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const dragRef = useRef(drag);
  dragRef.current = drag;
  // 위치는 내부 상태, 라벨은 항상 props 기준 (편집 결과 반영)
  const labelById = new Map(initialNodes.map((n) => [n.id, n.label]));
  // 라벨 인라인 편집 — Enter · 포커스 해제로 확정, Esc 로 취소 (ref 로 중복 확정 방지)
  const [labelEdit, setLabelEdit] = useState<{ id: string; value: string } | null>(null);
  const labelEditRef = useRef(labelEdit);
  labelEditRef.current = labelEdit;
  const finishLabelEdit = (save: boolean) => {
    const cur = labelEditRef.current;
    if (!cur) return;
    labelEditRef.current = null;
    setLabelEdit(null);
    const value = cur.value.trim();
    if (save && value && value !== labelById.get(cur.id)) onLabelChange?.(cur.id, value);
  };

  // Force simulation (lightweight) — 계층형은 시뮬레이션 없이 고정
  useEffect(() => {
    if (layout === "tree") return;
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
  // 휠 확대 중 페이지가 스크롤되지 않게 — React onWheel 은 passive 라 preventDefault 가 안 먹어서 네이티브로 붙인다
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = -e.deltaY * 0.001;
      const rect = svg.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      setTransform((t) => {
        const k = Math.max(0.4, Math.min(2.5, t.k * (1 + delta)));
        const nx = mx - (mx - t.x) * (k / t.k);
        const ny = my - (my - t.y) * (k / t.k);
        return { x: nx, y: ny, k };
      });
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, []);

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

  // Connected node ids for highlight (선택/호버 우선, 없으면 검색 일치 노드 기준)
  const connectedIds = new Set<string>();
  const focusId = selectedId || hoveredId;
  const focusRoots = focusId ? [focusId] : matchIds ? Array.from(matchIds) : [];
  focusRoots.forEach((root) => {
    connectedIds.add(root);
    edges.forEach(([a, b]) => {
      if (a === root) connectedIds.add(b);
      if (b === root) connectedIds.add(a);
    });
  });
  const isFocused = (id: string) => connectedIds.size === 0 || connectedIds.has(id);
  const isDimmed = (id: string) => dimmedIds?.has(id) ?? false;
  const isMatch = (id: string) => !focusId && (matchIds?.has(id) ?? false);

  return (
    <svg
      ref={svgRef}
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      style={{ background: "transparent", cursor: pan ? "grabbing" : "grab", userSelect: "none" }}
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
          const dimmed = isDimmed(aId) || isDimmed(bId);
          const hot = focused && (isMatch(aId) || isMatch(bId));
          const op = hot ? 0.9 : 0.35 * (focused && !dimmed ? 1 : 0.3);
          return (
            <line
              key={i}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={hot ? "#2D6A1B" : "#4DB02E"}
              strokeWidth={hot ? 2.2 : 1.2}
              strokeOpacity={op}
            />
          );
        })}
        {/* Nodes */}
        {nodes.map((n) => {
          const focused = isFocused(n.id);
          const opacity = isDimmed(n.id) ? 0.25 : focused ? 1 : 0.35;
          const isCore = n.group === "core";
          const isCity = n.group === "city";
          const isLogi = n.group === "logi";
          const fill = isCore ? "#3D8B25" : isCity ? "#5FCF3E" : isLogi ? "#87D448" : "#A6E26B";
          const isActive = selectedId === n.id || hoveredId === n.id || isMatch(n.id);
          // 계층형은 행 간격이 좁아 루트 외 라벨을 노드 오른쪽에
          const labelRight = layout === "tree" && !isCore;
          const label = labelById.get(n.id) ?? n.label;
          const editingLabel = editable && labelEdit?.id === n.id;

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
              onDoubleClick={() => editable && setLabelEdit({ id: n.id, value: label })}
            >
              {isActive && <circle r={n.size + 14} fill="url(#nodeGlow)" />}
              {/* 노드는 채움만, 선택 · 호버는 노드에서 떨어진 링으로 표시 */}
              <circle r={n.size} fill={fill} />
              {isActive && <circle r={n.size + 4} fill="none" stroke="#2D6A1B" strokeWidth={2} />}
              {editingLabel ? (
                <foreignObject x={-80} y={n.size + 2} width={160} height={26}>
                  <input
                    autoFocus
                    value={labelEdit.value}
                    maxLength={30}
                    aria-label="노드 이름"
                    onChange={(e) => setLabelEdit({ id: n.id, value: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.nativeEvent.isComposing) return;
                      if (e.key === "Enter") finishLabelEdit(true);
                      if (e.key === "Escape") finishLabelEdit(false);
                    }}
                    onBlur={() => finishLabelEdit(true)}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    onDoubleClick={(e) => e.stopPropagation()}
                    style={{
                      width: "100%",
                      height: "100%",
                      boxSizing: "border-box",
                      padding: "0 6px",
                      fontSize: 12,
                      fontFamily: "inherit",
                      textAlign: "center",
                      color: "#1A1F17",
                      background: "#FFFFFF",
                      border: "1px solid #87D448",
                      borderRadius: 6,
                      outline: "none",
                    }}
                  />
                </foreignObject>
              ) : (
                showLabels && (
                  <text
                    textAnchor={labelRight ? "start" : "middle"}
                    x={labelRight ? n.size + 6 : 0}
                    y={labelRight ? 4 : n.size + 14}
                    fontSize={isCore ? 14 : isCity ? 12 : 10}
                    fontWeight={isCore ? 700 : isCity ? 600 : 500}
                    fill="#1A1F17"
                    style={{ pointerEvents: "none" }}
                  >
                    {label}
                  </text>
                )
              )}
            </g>
          );
        })}
      </g>

      {/* Mini control hint */}
      {showHint && (
        <g transform={`translate(16, ${height - 36})`} style={{ pointerEvents: "none" }}>
          <rect width="220" height="22" rx="11" fill="#FFFFFF" fillOpacity="0.85" stroke="#E8EDE2" />
          <text x="12" y="15" fontSize="10" fill="#6B7563" fontFamily="Pretendard">
            드래그로 이동 · 휠로 줌 · 노드 클릭으로 선택
          </text>
        </g>
      )}
    </svg>
  );
}
