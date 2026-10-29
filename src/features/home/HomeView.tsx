"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, Card, PageHeader, StatCard, HashChip } from "@/components/ui";
import { Mindmap } from "@/components/mindmap/Mindmap";
import {
  HOME_TIMELINE,
  HOME_TOP_TAGS,
  HOME_WEEK_ACTIVITY,
  HOME_WEEK_SESSIONS,
  MINDMAP_EDGES,
  MINDMAP_NODES,
} from "@/lib/mock/designData";
import { GraphFilterPopover } from "./GraphFilterPopover";
import { GraphSearch } from "./GraphSearch";
import { DEFAULT_GRAPH_FILTER, countApplied, dimmedNodeIds, type GraphFilter } from "./graphFilter";
import { buildWeekTimeline } from "./weekTimeline";
import styles from "./HomeView.module.css";

export function HomeView() {
  const router = useRouter();
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [range, setRange] = useState<"today" | "week">("today");

  // 그래프 필터 · 검색 (디자인 A-1 · A-2)
  const [filterOpen, setFilterOpen] = useState(false);
  const [filter, setFilter] = useState<GraphFilter>(DEFAULT_GRAPH_FILTER);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const toolsRef = useRef<HTMLDivElement>(null);

  const dimmedIds = useMemo(() => dimmedNodeIds(MINDMAP_NODES, filter), [filter]);
  const matchIds = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!searchOpen || !q) return undefined;
    return new Set(MINDMAP_NODES.filter((n) => n.label.toLowerCase().includes(q)).map((n) => n.id));
  }, [searchOpen, query]);
  const filterActive = filterOpen || countApplied(filter) > 0;

  const closeSearch = () => {
    setSearchOpen(false);
    setQuery("");
  };

  // 바깥을 누르면 필터 팝오버 · 검색을 닫는다
  useEffect(() => {
    if (!filterOpen && !searchOpen) return;
    const onDown = (e: MouseEvent) => {
      if (toolsRef.current?.contains(e.target as Node)) return;
      setFilterOpen(false);
      setSearchOpen(false);
      setQuery("");
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [filterOpen, searchOpen]);

  const focusId = selected || hovered;
  const focusNode = focusId ? MINDMAP_NODES.find((n) => n.id === focusId) : undefined;
  const connected = focusNode
    ? MINDMAP_EDGES.filter(([a, b]) => a === focusNode.id || b === focusNode.id).length
    : 0;

  return (
    <div className={styles.page}>
      <PageHeader title="홈" subtitle="당신이 탐색해 온 모든 흐름을 한눈에" />
      <div className={styles.body}>
        <div className={styles.graphBox}>
          <div className={styles.graphTools} ref={toolsRef}>
            <button
              className={`${styles.iconBtn} ${filterActive ? styles.iconBtnOn : ""}`}
              aria-label="필터"
              aria-expanded={filterOpen}
              onClick={() => {
                setFilterOpen((v) => !v);
                closeSearch();
              }}
            >
              <Icon name="filter" size={14} />
            </button>
            {searchOpen ? (
              <GraphSearch
                nodes={MINDMAP_NODES}
                edges={MINDMAP_EDGES}
                query={query}
                onQueryChange={setQuery}
                onSelectNode={(id) => {
                  setSelected(id);
                  closeSearch();
                }}
                onSelectSession={(id) => router.push(`/sessions/${id}`)}
                onClose={closeSearch}
              />
            ) : (
              <button
                className={styles.iconBtn}
                aria-label="검색"
                onClick={() => {
                  setSearchOpen(true);
                  setFilterOpen(false);
                }}
              >
                <Icon name="search" size={14} />
              </button>
            )}
            {filterOpen && (
              <GraphFilterPopover
                applied={filter}
                nodes={MINDMAP_NODES}
                onApply={(f) => {
                  setFilter(f);
                  setFilterOpen(false);
                }}
              />
            )}
          </div>
          <Mindmap
            nodes={MINDMAP_NODES}
            edges={MINDMAP_EDGES}
            width={1100}
            height={700}
            selectedId={selected}
            onSelect={(id) => setSelected((cur) => (cur === id ? null : id))}
            hoveredId={hovered}
            onHover={setHovered}
            dimmedIds={dimmedIds}
            matchIds={matchIds}
            showHint={false}
          />
          {focusNode && (
            <div className={styles.popover}>
              <div className={styles.popEyebrow}>선택됨</div>
              <div className={styles.popTitle}>{focusNode.label}</div>
              <div className={styles.popMeta}>연결된 노드 {connected}개 · 출처 5개</div>
              <button className={styles.popBtn} onClick={() => router.push("/sessions")}>
                관련 세션 보기 <Icon name="chevronRight" size={12} />
              </button>
            </div>
          )}
        </div>

        <div className={styles.stats}>
          <StatCard label="누적 노드" value="218" accent="+12" sub="해시태그 47개" />
          <StatCard label="이번 주 세션" value="14" accent="+3" sub="평균 42분 / 세션" />
          <StatCard label="Deep Reading" value="68%" accent="↑ 8%" sub="지난주 대비" />
        </div>

        <div className={styles.grid}>
          <div className={styles.leftCol}>
            <Card className={styles.colCard}>
              <div className={styles.cardHead}>
                <h3 className={styles.cardTitle}>이번 주 활동</h3>
                <span className={styles.cardSub}>4.20 — 4.26</span>
              </div>
              <div className={styles.barsWrap}>
                <ActivityBars />
              </div>
            </Card>
            <Card className={styles.colCard}>
              <h3 className={styles.cardTitle} style={{ marginBottom: 12 }}>상위 해시태그</h3>
              <div className={styles.topTags}>
                {HOME_TOP_TAGS.map((r) => (
                  <div key={r.tag} className={styles.topTagRow}>
                    <span className={styles.topTagName}>{r.tag}</span>
                    <span className={styles.topTagCount}>{r.n}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card style={{ padding: 22 }}>
            <div className={styles.cardHead}>
              <div>
                <h3 className={styles.cardTitle}>{range === "today" ? "오늘의 탐색 타임라인" : "이번 주 탐색 타임라인"}</h3>
                <p className={styles.cardDesc}>
                  {range === "today" ? "시간대별 수집 해시태그 · 방문 사이트" : "요일별 대표 해시태그 · 방문 사이트"}
                </p>
              </div>
              <div className={styles.rangeBtns}>
                <button
                  className={`${styles.rangeBtn} ${range === "today" ? styles.rangeBtnOn : ""}`}
                  onClick={() => setRange("today")}
                >
                  오늘
                </button>
                <button
                  className={`${styles.rangeBtn} ${range === "week" ? styles.rangeBtnOn : ""}`}
                  onClick={() => setRange("week")}
                >
                  이번 주
                </button>
              </div>
            </div>
            {range === "today" ? <BrowsingTimeline /> : <WeekTimeline />}
          </Card>
        </div>
      </div>
    </div>
  );
}

function ActivityBars() {
  const max = Math.max(...HOME_WEEK_ACTIVITY.map((d) => d.mins));
  const fmt = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`);
  return (
    <div className={styles.bars}>
      {HOME_WEEK_ACTIVITY.map((d) => (
        <div key={d.d} className={styles.barCol}>
          <div className={styles.barValue}>{fmt(d.mins)}</div>
          <div className={styles.barTrack}>
            <div className={styles.bar} style={{ height: `${(d.mins / max) * 100}%` }} />
          </div>
          <div className={styles.barDay}>{d.d}</div>
        </div>
      ))}
    </div>
  );
}

function BrowsingTimeline() {
  return (
    <div className={styles.timeline}>
      <div className={styles.spine} />
      <div className={styles.slots}>
        {HOME_TIMELINE.map((s, i) => (
          <div key={i} className={styles.slot}>
            <div className={styles.slotDot} />
            <div className={styles.slotRow}>
              <div className={styles.slotTime}>{s.time}</div>
              <div className={styles.slotMain}>
                <div className={styles.slotTags}>
                  {s.tags.map((t) => (
                    <HashChip key={t} label={t} size="sm" />
                  ))}
                </div>
                <div className={styles.slotSites}>
                  {s.sites.map((site) => (
                    <div key={site.name} className={styles.site}>
                      <span className={styles.siteIcon} style={{ background: site.color }}>{site.favicon}</span>
                      {site.name}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 이번 주: 오늘 타임라인과 같은 틀, 시간대 자리에 날짜 · 요일. 기록 없는 날은 "기록 없음".
function WeekTimeline() {
  const days = useMemo(() => buildWeekTimeline(HOME_WEEK_SESSIONS), []);
  return (
    <div className={styles.timeline}>
      <div className={styles.spine} />
      <div className={styles.slots}>
        {days.map((d) => {
          const empty = d.tags.length === 0 && d.sites.length === 0;
          return (
            <div key={d.key} className={styles.slot}>
              <div className={`${styles.slotDot} ${empty ? styles.slotDotEmpty : ""}`} />
              <div className={styles.slotRow}>
                <div className={`${styles.slotTime} ${empty ? styles.slotTimeEmpty : ""}`}>
                  {d.label}
                  {d.isToday && <span className={styles.slotToday}>오늘</span>}
                </div>
                <div className={styles.slotMain}>
                  {empty ? (
                    <span className={styles.slotEmpty}>기록 없음</span>
                  ) : (
                    <>
                      <div className={styles.slotTags}>
                        {d.tags.map((t) => (
                          <HashChip key={t} label={t} size="sm" />
                        ))}
                      </div>
                      <div className={styles.slotSites}>
                        {d.sites.map((site) => (
                          <div key={site.name} className={styles.site}>
                            <span className={styles.siteIcon} style={{ background: site.color }}>{site.favicon}</span>
                            {site.name}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
