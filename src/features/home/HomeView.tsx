"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon, Card, PageHeader, StatCard, HashChip, InlineState } from "@/components/ui";
import { Mindmap, type MindmapHandle } from "@/components/mindmap/Mindmap";
import type { DayActivity, HomeData, HomeStats, TimelineSlot, WeekSession } from "@/lib/viewTypes";
import { GraphFilterPopover } from "./GraphFilterPopover";
import { GraphSearch } from "./GraphSearch";
import { DEFAULT_GRAPH_FILTER, countApplied, dimmedNodeIds, relatedSession, type GraphFilter } from "./graphFilter";
import { sessionNodeIds } from "./toHomeData";
import { buildWeekTimeline } from "./weekTimeline";
import styles from "./HomeView.module.css";

export interface HomeViewProps {
  /** 홈 집계 데이터. 아직 모인 게 없으면 null → 빈 상태 */
  data: HomeData | null;
  loading?: boolean;
  /** 불러오기 실패 메시지 */
  error?: string | null;
  onRetry?: () => void;
}

export function HomeView({ data, loading = false, error = null, onRetry }: HomeViewProps) {
  return (
    <div className={styles.page}>
      <PageHeader title="홈" />
      {loading && !data ? (
        <div className={styles.state}>불러오는 중…</div>
      ) : error ? (
        <div className={styles.body}>
          <InlineState kind="error" title={error} onRetry={onRetry} />
        </div>
      ) : !data ? (
        <div className={styles.body}>
          <InlineState
            kind="empty"
            title="아직 모인 탐색 기록이 없어요."
            description="확장 프로그램이 탐색 세션을 모으면 마인드맵과 통계가 여기에 보여요."
          />
        </div>
      ) : (
        <HomeDashboard data={data} />
      )}
    </div>
  );
}

const GRAPH_INITIAL_ZOOM = 1.1;
const GRAPH_ZOOM_STEP = 1.2;

const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? String(n) : undefined);
const trend = (n: number) => (n > 0 ? `↑ ${n}%` : n < 0 ? `↓ ${-n}%` : undefined);

function HomeDashboard({ data }: { data: HomeData }) {
  const { graph, sessions } = data;
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
  const mindmapRef = useRef<MindmapHandle>(null);

  const dimmedIds = useMemo(() => dimmedNodeIds(graph, filter), [graph, filter]);
  // 세션 노드는 처음 놓인 방향으로 약하게 붙잡아 둔다
  const sessionIds = useMemo(() => new Set(sessionNodeIds(graph.nodes, graph.edges)), [graph]);
  const coreId = graph.nodes.find((n) => n.group === "core")?.id;
  const matchIds = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!searchOpen || !q) return undefined;
    return new Set(graph.nodes.filter((n) => n.label.toLowerCase().includes(q)).map((n) => n.id));
  }, [graph, searchOpen, query]);
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

  // 선택한 노드를 다시 누르면 선택을 푼다. 마우스가 아직 그 노드 위라 호버로 다시 강조되지 않게,
  // 그 노드에서 마우스가 나갈 때까지 호버를 무시한다 (QA-008)
  // 검색에서 세션을 고르면 이동이 끝날 때까지 그 행에 "여는 중…"을 띄우고 다시 누르기를 막는다 (QA-009)
  const [opening, startOpening] = useTransition();
  const [openingSession, setOpeningSession] = useState<number | null>(null);
  const openSession = (id: number) => {
    setOpeningSession(id);
    startOpening(() => router.push(`/sessions/${id}`));
  };
  const hoverMutedRef = useRef<string | null>(null);
  const toggleSelect = (id: string) => {
    if (selected === id) {
      setSelected(null);
      setHovered(null);
      hoverMutedRef.current = id;
    } else {
      setSelected(id);
    }
  };
  const onHoverNode = (id: string | null) => {
    if (id === null) hoverMutedRef.current = null;
    else if (id === hoverMutedRef.current) return;
    setHovered(id);
  };
  const focusId = selected || hovered;
  const focusNode = focusId ? graph.nodes.find((n) => n.id === focusId) : undefined;
  const focusSession = focusNode ? relatedSession(focusNode, graph.nodeMeta, sessions) : undefined;

  return (
    <div className={styles.body}>
      <div className={styles.graphBox}>
        {graph.nodes.length === 0 ? (
          <div className={styles.graphEmpty}>
            <InlineState kind="empty" title="아직 그래프로 그릴 노드가 없어요." />
          </div>
        ) : (
          <>
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
                  nodes={graph.nodes}
                  edges={graph.edges}
                  sessions={sessions}
                  query={query}
                  onQueryChange={setQuery}
                  onSelectNode={(id) => {
                    setSelected(id);
                    closeSearch();
                  }}
                  onSelectSession={openSession}
                  onPrefetchSession={(id) => router.prefetch(`/sessions/${id}`)}
                  openingSessionId={opening ? openingSession : null}
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
                  graph={graph}
                  onApply={(f) => {
                    setFilter(f);
                    setFilterOpen(false);
                  }}
                />
              )}
            </div>
            <div className={styles.zoomTools}>
              <button
                className={styles.iconBtn}
                aria-label="확대"
                onClick={() => mindmapRef.current?.zoomBy(GRAPH_ZOOM_STEP)}
              >
                <Icon name="plus" size={14} />
              </button>
              <button
                className={styles.iconBtn}
                aria-label="축소"
                onClick={() => mindmapRef.current?.zoomBy(1 / GRAPH_ZOOM_STEP)}
              >
                <Icon name="minus" size={14} />
              </button>
            </div>
            <Mindmap
              ref={mindmapRef}
              anchorIds={sessionIds}
              centerId={coreId}
              nodes={graph.nodes}
              edges={graph.edges}
              width={1100}
              height={700}
              initialZoom={GRAPH_INITIAL_ZOOM}
              selectedId={selected}
              onSelect={toggleSelect}
              hoveredId={hovered}
              onHover={onHoverNode}
              wheelZoomOverGraphOnly
              dimmedIds={dimmedIds}
              matchIds={matchIds}
              showHint={false}
            />
          </>
        )}
        {focusNode && (
          <div className={styles.popover}>
            <div className={styles.popTitle}>{focusNode.label}</div>
            {/* 가장 잘 맞는 세션 상세로, 없으면 세션 목록으로 */}
            <button
              className={styles.popBtn}
              onClick={() => router.push(focusSession ? `/sessions/${focusSession.id}` : "/sessions")}
              aria-label="관련 세션 보기"
              title="관련 세션 보기"
            >
              <Icon name="arrowRight" size={14} />
            </button>
          </div>
        )}
      </div>

      <StatCards stats={data.stats} />

      <div className={styles.grid}>
        <div className={styles.leftCol}>
          <Card className={styles.colCard}>
            <div className={styles.cardHead}>
              <h3 className={styles.cardTitle}>이번 주 활동</h3>
              <span className={styles.cardSub}>{data.weekActivity.range}</span>
            </div>
            <div className={styles.barsWrap}>
              <ActivityBars days={data.weekActivity.days} />
            </div>
          </Card>
          <Card className={styles.colCard}>
            <h3 className={styles.cardTitle} style={{ marginBottom: 12 }}>상위 해시태그</h3>
            {data.topTags.length === 0 ? (
              <p className={styles.emptyLine}>아직 모인 해시태그가 없어요.</p>
            ) : (
              <div className={styles.topTags}>
                {data.topTags.map((r) => (
                  <div key={r.tag} className={styles.topTagRow}>
                    <span className={styles.topTagName} title={r.tag}>
                      {r.tag}
                    </span>
                    <span className={styles.topTagCount}>{r.count}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <Card style={{ padding: 22 }}>
          <div className={styles.cardHead}>
            <div>
              <h3 className={styles.cardTitle}>{range === "today" ? "오늘의 탐색 타임라인" : "이번 주 탐색 타임라인"}</h3>
            </div>
            <div className={styles.rangeBtns}>
              <button
                className={`${styles.rangeBtn} ${range === "today" ? styles.rangeBtnOn : ""}`}
                aria-pressed={range === "today"}
                onClick={() => setRange("today")}
              >
                오늘
              </button>
              <button
                className={`${styles.rangeBtn} ${range === "week" ? styles.rangeBtnOn : ""}`}
                aria-pressed={range === "week"}
                onClick={() => setRange("week")}
              >
                이번 주
              </button>
            </div>
          </div>
          {range === "today" ? (
            <BrowsingTimeline slots={data.todayTimeline} />
          ) : (
            <WeekTimeline sessions={data.weekSessions} />
          )}
        </Card>
      </div>
    </div>
  );
}

function StatCards({ stats }: { stats: HomeStats }) {
  return (
    <div className={styles.stats}>
      <StatCard
        label="누적 노드"
        value={stats.totalNodes}
        accent={signed(stats.nodeDelta)}
        sub={`해시태그 ${stats.hashtagCount}개`}
      />
      <StatCard
        label="이번 주 세션"
        value={stats.weekSessions}
        accent={signed(stats.sessionDelta)}
        sub={`평균 ${stats.avgSessionMinutes}분 / 세션`}
      />
      <StatCard
        label="Deep Reading"
        value={`${stats.deepReadingPct}%`}
        accent={trend(stats.deepReadingDelta)}
      />
    </div>
  );
}

function ActivityBars({ days }: { days: DayActivity[] }) {
  const max = Math.max(0, ...days.map((d) => d.minutes));
  const fmt = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`);
  return (
    <div className={styles.bars}>
      {days.map((d) => (
        <div key={d.day} className={styles.barCol}>
          <div className={styles.barValue}>{fmt(d.minutes)}</div>
          <div className={styles.barTrack}>
            <div className={styles.bar} style={{ height: `${max > 0 ? (d.minutes / max) * 100 : 0}%` }} />
          </div>
          <div className={styles.barDay}>{d.day}</div>
        </div>
      ))}
    </div>
  );
}

function BrowsingTimeline({ slots }: { slots: TimelineSlot[] }) {
  if (slots.length === 0) return <p className={styles.emptyLine}>오늘은 아직 수집된 기록이 없어요.</p>;
  return (
    <div className={styles.timeline}>
      <div className={styles.spine} />
      <div className={styles.slots}>
        {slots.map((s, i) => (
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
function WeekTimeline({ sessions }: { sessions: WeekSession[] }) {
  const days = useMemo(() => buildWeekTimeline(sessions), [sessions]);
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
