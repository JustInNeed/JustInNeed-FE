"use client";

import { Fragment, useEffect, useState } from "react";
import { Icon, Card, PageHeader, InlineState, type IconName } from "@/components/ui";
import type { SessionListItem } from "@/lib/api";
import type { AnalysisNote, AnalyticsData, BannerTip, ReadingLevel, WeekHourGrid } from "@/lib/viewTypes";
import { formatDate, formatDuration, withHash } from "@/lib/format";
import styles from "./AnalyticsView.module.css";

export interface AnalyticsViewProps {
  /** 분석 데이터. 아직 모인 게 없으면 null → 빈 상태 */
  data: AnalyticsData | null;
  loading?: boolean;
  /** 불러오기 실패 메시지 */
  error?: string | null;
  onRetry?: () => void;
  /** 배너 랜덤 선택에 쓰는 0~1 난수 (테스트에서 고정값 주입) */
  random?: () => number;
}

export function AnalyticsView({ data, loading = false, error = null, onRetry, random = Math.random }: AnalyticsViewProps) {
  return (
    <div className={styles.page}>
      <PageHeader title="분석 및 추천" subtitle="당신의 웹 탐색 패턴을 진단합니다" />
      {loading && !data ? (
        <div className={styles.state}>불러오는 중…</div>
      ) : error ? (
        <div className={styles.stateWrap}>
          <InlineState kind="error" title={error} onRetry={onRetry} />
        </div>
      ) : !data ? (
        <div className={styles.stateWrap}>
          <InlineState
            kind="empty"
            title="아직 분석할 탐색 기록이 없어요."
            description="확장 프로그램이 탐색 세션을 모으면 탐색 패턴 분석과 추천이 여기에 보여요."
          />
        </div>
      ) : (
        <AnalyticsBody data={data} random={random} />
      )}
    </div>
  );
}

function AnalyticsBody({ data, random }: { data: AnalyticsData; random: () => number }) {
  const { exploration, notes } = data;
  const stats = [
    { label: "세션 평균 URL", value: `${exploration.avgUrlsPerSession}개` },
    { label: "평균 페이지 체류", value: formatSeconds(exploration.avgDwellSec) },
    { label: "평균 세션 길이", value: formatMinutes(exploration.avgSessionMinutes) },
  ];
  return (
    <div className={styles.grid}>
      <RollingBanner
        sessions={data.weekSessions}
        tips={data.surfingTips}
        recs={data.actionRecommendations}
        random={random}
      />

      <Card className={styles.card}>
        <div className={styles.cardHead}>
          <h3 className={styles.cardTitle}>탐색 성향</h3>
          <span className={styles.cardSub}>매일 업데이트</span>
        </div>
        <div>
          {stats.map((s, i) => (
            <div key={s.label} className={styles.statRow} style={{ borderBottom: i < stats.length - 1 ? "1px solid var(--line)" : "none" }}>
              <span className={styles.statLabel}>{s.label}</span>
              <span className={styles.statValue}>{s.value}</span>
            </div>
          ))}
        </div>
        <AnalysisRecBox note={notes.exploration} />
      </Card>

      <Card className={styles.card}>
        <div className={styles.cardHead}>
          <h3 className={styles.cardTitle}>읽기 행동 분포</h3>
          <span className={styles.cardSub}>최근 7일 · 세션별 집중도</span>
        </div>
        <ReadingBehaviorBar shares={data.readingBehavior} />
        <AnalysisRecBox note={notes.reading} />
      </Card>

      <Card className={styles.card}>
        <h3 className={styles.cardTitle} style={{ marginBottom: 16 }}>카테고리별 방문 비율</h3>
        {data.categoryRatio.map((c) => (
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
        <AnalysisRecBox note={notes.category} />
      </Card>

      <Card className={styles.card}>
        <div className={styles.cardHead}>
          <h3 className={styles.cardTitle}>시간대별 탐색 패턴</h3>
          <span className={styles.cardSub}>최근 7일</span>
        </div>
        <div className={styles.heatmaps}>
          <HeatBlock data={data.heatmap.surfing} label="웹서핑 다빈도" sub="접속 활동 양" rgb="100,116,139" />
          <HeatBlock data={data.heatmap.focus} label="집중 시간 (Deep + Reading)" sub="정독 비율" rgb="95,207,62" />
        </div>
        <AnalysisRecBox note={notes.timePattern} />
      </Card>
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
