"use client";

import { Fragment, useEffect, useState, type ReactNode } from "react";
import { Icon, Card, PageHeader, InlineState, type IconName } from "@/components/ui";
import type {
  AnalysisNote,
  AnalyticsCategories,
  AnalyticsExploration,
  AnalyticsReadingBehavior,
  AnalyticsRecommendations,
  AnalyticsTimePatterns,
  AnalyticsWeekSessions,
  BannerTip,
  ReadingLevel,
  SessionListItem,
  WeekHourGrid,
} from "@/lib/api";
import { formatDate, formatDuration, withHash } from "@/lib/format";
import type { UseApiResult } from "@/lib/hooks/useApi";
import { SURFING_TIPS } from "./surfingTips";
import styles from "./AnalyticsView.module.css";

/** 카드마다 따로 불러온 결과. 데이터가 없으면 data 가 null 이다 */
export interface AnalyticsCards {
  weekSessions: UseApiResult<AnalyticsWeekSessions>;
  exploration: UseApiResult<AnalyticsExploration>;
  readingBehavior: UseApiResult<AnalyticsReadingBehavior>;
  categories: UseApiResult<AnalyticsCategories>;
  timePatterns: UseApiResult<AnalyticsTimePatterns>;
  recommendations: UseApiResult<AnalyticsRecommendations>;
}

export interface AnalyticsViewProps {
  cards: AnalyticsCards;
  /** "오늘의 웹 서핑 팁" 후보 */
  tips?: BannerTip[];
  /** 배너 랜덤 선택에 쓰는 0~1 난수 (테스트에서 고정값 주입) */
  random?: () => number;
}

const NO_SESSIONS: SessionListItem[] = [];
const NO_RECOMMENDATIONS: BannerTip[] = [];

/** 모든 카드에 보여줄 데이터가 없는지 — 팁은 데이터가 아니라 세지 않는다 */
function hasNoData({ weekSessions, exploration, readingBehavior, categories, timePatterns, recommendations }: AnalyticsCards) {
  return (
    !weekSessions.data?.sessions.length &&
    !exploration.data &&
    !readingBehavior.data &&
    !categories.data &&
    !timePatterns.data &&
    !recommendations.data?.recommendations.length
  );
}

export function AnalyticsView({ cards, tips = SURFING_TIPS, random = Math.random }: AnalyticsViewProps) {
  const states = Object.values(cards) as UseApiResult<unknown>[];
  const firstLoad = states.every((card) => card.loading && !card.data);
  const nothingToShow = states.every((card) => !card.loading && !card.error) && hasNoData(cards);
  return (
    <div className={styles.page}>
      <PageHeader title="분석 및 추천" subtitle="당신의 웹 탐색 패턴을 진단합니다" />
      {firstLoad ? (
        <div className={styles.state}>불러오는 중…</div>
      ) : nothingToShow ? (
        <div className={styles.stateWrap}>
          <InlineState
            kind="empty"
            title="아직 분석할 탐색 기록이 없어요."
            description="확장 프로그램이 탐색 세션을 모으면 탐색 패턴 분석과 추천이 여기에 보여요."
          />
        </div>
      ) : (
        <AnalyticsBody cards={cards} tips={tips} random={random} />
      )}
    </div>
  );
}

/** 카드 내용 — 불러오는 중 · 실패 · 데이터 없음을 카드마다 따로 보여준다 */
function CardContent<T>({ card, children }: { card: UseApiResult<T>; children: (data: T) => ReactNode }) {
  if (card.error) return <InlineState kind="error" title={card.error} onRetry={card.refetch} />;
  if (card.data) return <>{children(card.data)}</>;
  return <div className={styles.cardState}>{card.loading ? "불러오는 중…" : "아직 보여줄 데이터가 없어요."}</div>;
}

function AnalyticsBody({ cards, tips, random }: { cards: AnalyticsCards; tips: BannerTip[]; random: () => number }) {
  return (
    <div className={styles.grid}>
      <RollingBanner
        sessions={cards.weekSessions.data?.sessions ?? NO_SESSIONS}
        tips={tips}
        recs={cards.recommendations.data?.recommendations ?? NO_RECOMMENDATIONS}
        random={random}
      />

      <Card className={styles.card}>
        <div className={styles.cardHead}>
          <h3 className={styles.cardTitle}>탐색 성향</h3>
          <span className={styles.cardSub}>매일 업데이트</span>
        </div>
        <CardContent card={cards.exploration}>
          {(exploration) => (
            <>
              <ExplorationStats exploration={exploration} />
              <AnalysisRecBox note={exploration.note} />
            </>
          )}
        </CardContent>
      </Card>

      <Card className={styles.card}>
        <div className={styles.cardHead}>
          <h3 className={styles.cardTitle}>읽기 행동 분포</h3>
          <span className={styles.cardSub}>최근 7일 · 세션별 집중도</span>
        </div>
        <CardContent card={cards.readingBehavior}>
          {({ shares, note }) => (
            <>
              <ReadingBehaviorBar shares={shares} />
              <AnalysisRecBox note={note} />
            </>
          )}
        </CardContent>
      </Card>

      <Card className={styles.card}>
        <h3 className={styles.cardTitle} style={{ marginBottom: 16 }}>카테고리별 방문 비율</h3>
        <CardContent card={cards.categories}>
          {({ categories, note }) => (
            <>
              {categories.map((c) => (
                <div key={c.name} className={styles.catRow}>
                  <div className={styles.catHead}>
                    <span className={styles.catName}>{c.name}</span>
                    <span className={styles.catMeta}>{c.pct}% · {c.count}회</span>
                  </div>
                  <div className={styles.catTrack}>
                    <div className={styles.catBar} style={{ width: `${c.pct}%` }} />
                  </div>
                </div>
              ))}
              <AnalysisRecBox note={note} />
            </>
          )}
        </CardContent>
      </Card>

      <Card className={styles.card}>
        <div className={styles.cardHead}>
          <h3 className={styles.cardTitle}>시간대별 탐색 패턴</h3>
          <span className={styles.cardSub}>최근 7일</span>
        </div>
        <CardContent card={cards.timePatterns}>
          {({ surfing, focus, note }) => (
            <>
              <div className={styles.heatmaps}>
                <HeatBlock data={surfing} label="웹서핑 다빈도" sub="접속 활동 양" rgb="100,116,139" />
                <HeatBlock data={focus} label="집중 시간 (Deep + Reading)" sub="정독 비율" rgb="95,207,62" />
              </div>
              <AnalysisRecBox note={note} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ExplorationStats({ exploration }: { exploration: AnalyticsExploration }) {
  const stats = [
    { label: "세션 평균 URL", value: `${exploration.avgUrlsPerSession}개` },
    { label: "평균 페이지 체류", value: formatSeconds(exploration.avgDwellSec) },
    { label: "평균 세션 길이", value: formatMinutes(exploration.avgSessionMinutes) },
  ];
  return (
    <div>
      {stats.map((s, i) => (
        <div key={s.label} className={styles.statRow} style={{ borderBottom: i < stats.length - 1 ? "1px solid var(--line)" : "none" }}>
          <span className={styles.statLabel}>{s.label}</span>
          <span className={styles.statValue}>{s.value}</span>
        </div>
      ))}
    </div>
  );
}

/** 42 → "42초", 90 → "1분 30초" */
function formatSeconds(sec: number): string {
  if (sec < 60) return `${sec}초`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s > 0 ? `${m}분 ${s}초` : `${m}분`;
}

/** 74 → "1시간 14분", 39 → "39분" */
function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}시간 ${m}분` : `${m}분`;
}

/** "**강조**" 로 감싼 부분을 강조 글씨로 */
function Emphasized({ text }: { text: string }) {
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className={styles.em}>{part}</strong>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

function AnalysisRecBox({ note }: { note: AnalysisNote }) {
  return (
    <div className={styles.recBox}>
      <div>
        <div className={styles.recEyebrow}>분석</div>
        <p className={styles.recText}>
          <Emphasized text={note.analysis} />
        </p>
      </div>
      {note.recommendation && (
        <div className={styles.recSecond}>
          <div className={styles.recEyebrow}>추천</div>
          <p className={styles.recTextMuted}>
            <Emphasized text={note.recommendation} />
          </p>
        </div>
      )}
    </div>
  );
}

interface Slide {
  eyebrow: string;
  icon: IconName;
  title: string;
  body: string;
}

interface RollingBannerProps {
  sessions: SessionListItem[];
  tips: BannerTip[];
  recs: BannerTip[];
  random: () => number;
}

function RollingBanner({ sessions, tips, recs, random }: RollingBannerProps) {
  const [i, setI] = useState(0);
  // 이번 주 세션 · 웹 서핑 팁 · 추천 행동을 각각 랜덤 1개 — 서버 렌더와 어긋나지 않게 마운트 후에 고른다
  const [pick, setPick] = useState({ session: 0, tip: 0, rec: 0 });
  useEffect(() => {
    const rand = (n: number) => Math.min(Math.floor(random() * n), Math.max(n - 1, 0));
    setPick({ session: rand(sessions.length), tip: rand(tips.length), rec: rand(recs.length) });
  }, [sessions, tips, recs, random]);

  // 후보가 없는 슬라이드는 뺀다
  const session = sessions[pick.session];
  const tip = tips[pick.tip];
  const rec = recs[pick.rec];
  const slides: Slide[] = [];
  if (session) {
    slides.push({
      eyebrow: "이번 주 인사이트",
      icon: "sparkle",
      title: session.title,
      body: [formatDate(session.startedAt), formatDuration(session.startedAt, session.endedAt), session.tags.slice(0, 3).map(withHash).join(" ")]
        .filter(Boolean)
        .join(" · "),
    });
  }
  if (tip) slides.push({ eyebrow: "오늘의 웹 서핑 팁", icon: "sprout", ...tip });
  if (rec) slides.push({ eyebrow: "오늘의 추천 행동", icon: "compass", ...rec });

  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setI((v) => (v + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, [slides.length]);

  if (slides.length === 0) return null;
  const current = i % slides.length;
  const s = slides[current];
  return (
    <Card className={styles.banner}>
      <div className={styles.bannerRow}>
        <div className={styles.bannerIcon}>
          <Icon name={s.icon} size={18} />
        </div>
        <div className={styles.bannerBody}>
          <div className={styles.recEyebrow}>{s.eyebrow}</div>
          <h3 className={styles.bannerTitle}>{s.title}</h3>
          <p className={styles.bannerText}>{s.body}</p>
        </div>
      </div>
      <div className={styles.dots}>
        {slides.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setI(idx)}
            className={styles.dot}
            aria-label={`슬라이드 ${idx + 1}`}
            aria-current={idx === current}
            style={{ width: idx === current ? 20 : 6, background: idx === current ? "var(--green-600)" : "var(--green-200)" }}
          />
        ))}
      </div>
    </Card>
  );
}

const READING_LEVELS: { level: ReadingLevel; label: string; color: string }[] = [
  { level: "DEEP_READING", label: "Deep Reading", color: "var(--green-700)" },
  { level: "READING", label: "Reading", color: "var(--green-500)" },
  { level: "SCANNING", label: "Scanning", color: "var(--green-300)" },
  { level: "IDLE", label: "Idle", color: "var(--green-100)" },
];

function ReadingBehaviorBar({ shares }: { shares: Record<ReadingLevel, number> }) {
  const items = READING_LEVELS.map((it) => ({ ...it, pct: shares[it.level] ?? 0 }));
  return (
    <div>
      <div className={styles.stacked}>
        {items.map((it) => (
          <div key={it.level} title={`${it.label} ${it.pct}%`} style={{ width: `${it.pct}%`, background: it.color, transition: "width 0.4s" }} />
        ))}
      </div>
      <div className={styles.legend}>
        {items.map((it) => (
          <div key={it.level} className={styles.legendRow}>
            <span className={styles.legendName}>
              <span className={styles.legendSwatch} style={{ background: it.color }} />
              {it.label}
            </span>
            <span className={styles.legendPct}>{it.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const DAYS = ["월", "화", "수", "목", "금", "토", "일"];
const HOURS = ["00", "03", "06", "09", "12", "15", "18", "21"];

function HeatBlock({ data, label, sub, rgb }: { data: WeekHourGrid; label: string; sub: string; rgb: string }) {
  return (
    <div>
      <div className={styles.heatHead}>
        <div className={styles.heatLabel}>
          <span className={styles.legendSwatch} style={{ background: `rgb(${rgb})` }} />
          <span className={styles.heatLabelText}>{label}</span>
        </div>
        <span className={styles.cardSub}>{sub}</span>
      </div>
      <div className={styles.heatGrid}>
        <div />
        {HOURS.map((h) => (
          <div key={h} className={styles.heatAxis} style={{ textAlign: "center" }}>{h}</div>
        ))}
        {DAYS.map((d, di) => (
          <Fragment key={d}>
            <div className={styles.heatAxis} style={{ display: "flex", alignItems: "center" }}>{d}</div>
            {HOURS.map((h, hi) => {
              const v = data[di]?.[hi] ?? 0;
              return (
                <div
                  key={h}
                  className={styles.heatCell}
                  title={`${d} ${h}시 — ${Math.round(v * 100)}%`}
                  style={{ background: `rgba(${rgb},${0.08 + v * 0.85})`, borderColor: `rgba(${rgb},0.08)` }}
                />
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
