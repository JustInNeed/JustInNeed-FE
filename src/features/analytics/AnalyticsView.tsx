"use client";

import { Fragment, useEffect, useState, type ReactNode } from "react";
import { Icon, Card, PageHeader } from "@/components/ui";
import {
  ACTION_RECOMMENDATIONS,
  CATEGORY_RATIO,
  EXPLORATION_STATS,
  READING_BEHAVIOR,
  SURFING_TIPS,
  WEEKLY_SESSIONS,
} from "@/lib/mock/designData";
import { formatDate, formatDuration, withHash } from "@/lib/format";
import styles from "./AnalyticsView.module.css";

export function AnalyticsView() {
  return (
    <div className={styles.page}>
      <PageHeader title="분석 및 추천" subtitle="당신의 웹 탐색 패턴을 진단합니다" />
      <div className={styles.grid}>
        <RollingBanner />

        <Card className={styles.card}>
          <div className={styles.cardHead}>
            <h3 className={styles.cardTitle}>탐색 성향</h3>
            <span className={styles.cardSub}>매일 업데이트</span>
          </div>
          <div>
            {EXPLORATION_STATS.map((s, i) => (
              <div key={s.label} className={styles.statRow} style={{ borderBottom: i < EXPLORATION_STATS.length - 1 ? "1px solid var(--line)" : "none" }}>
                <span className={styles.statLabel}>{s.label}</span>
                <span className={styles.statValue}>{s.value}</span>
              </div>
            ))}
          </div>
          <AnalysisRecBox
            analysis="여러 페이지를 빠르게 오가며 탐색하는 경향이 있습니다."
            recommendation="지금 가장 중요한 문서 딱 하나만 남기고 나머지 탭은 잠시 닫아두세요. 15분만 타이머를 맞추고 하나의 글에만 온전히 몰입해 보는 걸 추천합니다."
          />
        </Card>

        <Card className={styles.card}>
          <div className={styles.cardHead}>
            <h3 className={styles.cardTitle}>읽기 행동 분포</h3>
            <span className={styles.cardSub}>최근 7일 · 세션별 집중도</span>
          </div>
          <ReadingBehaviorBar />
          <AnalysisRecBox
            analysis={
              <>
                한 번 읽기 시작하면 끝까지 깊이 있게 이해하는 편입니다.{" "}
                <strong className={styles.em}>Deep Reading 비중 42%</strong>로 탭을 자주 전환하지 않고 한 글에 머무는 시간이 길어요.
              </>
            }
          />
        </Card>

        <Card className={styles.card}>
          <h3 className={styles.cardTitle} style={{ marginBottom: 16 }}>카테고리별 방문 비율</h3>
          {CATEGORY_RATIO.map((c) => (
            <div key={c.name} className={styles.catRow}>
              <div className={styles.catHead}>
                <span className={styles.catName}>{c.name}</span>
                <span className={styles.catMeta}>{c.pct}% · {c.n}회</span>
              </div>
              <div className={styles.catTrack}>
                <div className={styles.catBar} style={{ width: `${c.pct}%` }} />
              </div>
            </div>
          ))}
          <AnalysisRecBox
            analysis={
              <>
                현재 탐색은 <strong className={styles.em}>블로그와 커뮤니티</strong> 중심으로 이루어지고 있습니다.{" "}
                <span className={styles.muted}>(전체의 60%)</span>
              </>
            }
            recommendation="지금 공부하시는 주제에 대해 공식 문서나 원문을 한 번쯤 정독하며 기초를 다져보는 건 어떨까요? 핵심 개념은 공식 문서나 원문을 통해 한 번 정리해보세요."
          />
        </Card>

        <Card className={styles.card}>
          <div className={styles.cardHead}>
            <h3 className={styles.cardTitle}>시간대별 탐색 패턴</h3>
            <span className={styles.cardSub}>최근 7일</span>
          </div>
          <DualHeatmap />
          <AnalysisRecBox
            analysis={
              <>
                활발한 웹서핑 시간은 <strong className={styles.emInk}>낮 1–3시</strong>이지만, 실제{" "}
                <strong className={styles.em}>집중도가 가장 높은 시간은 오전 9–11시</strong>입니다. 중요한 학습은 이 시간대를 활용해보세요.
              </>
            }
          />
        </Card>
      </div>
    </div>
  );
}

function AnalysisRecBox({ analysis, recommendation }: { analysis: ReactNode; recommendation?: ReactNode }) {
  return (
    <div className={styles.recBox}>
      <div>
        <div className={styles.recEyebrow}>분석</div>
        <p className={styles.recText}>{analysis}</p>
      </div>
      {recommendation && (
        <div className={styles.recSecond}>
          <div className={styles.recEyebrow}>추천</div>
          <p className={styles.recTextMuted}>{recommendation}</p>
        </div>
      )}
    </div>
  );
}

function RollingBanner() {
  const [i, setI] = useState(0);
  // 이번 주 세션 · 웹 서핑 팁 · 추천 행동을 각각 랜덤 1개 — 서버 렌더와 어긋나지 않게 마운트 후에 고른다
  const [pick, setPick] = useState({ session: 0, tip: 0, rec: 0 });
  useEffect(() => {
    const rand = (n: number) => Math.floor(Math.random() * n);
    setPick({ session: rand(WEEKLY_SESSIONS.length), tip: rand(SURFING_TIPS.length), rec: rand(ACTION_RECOMMENDATIONS.length) });
  }, []);
  const session = WEEKLY_SESSIONS[pick.session];
  const slides = [
    {
      eyebrow: "이번 주 인사이트",
      icon: "sparkle" as const,
      title: session.title,
      body: [formatDate(session.startedAt), formatDuration(session.startedAt, session.endedAt), session.tags.slice(0, 3).map(withHash).join(" ")]
        .filter(Boolean)
        .join(" · "),
    },
    { eyebrow: "오늘의 웹 서핑 팁", icon: "sprout" as const, ...SURFING_TIPS[pick.tip] },
    { eyebrow: "오늘의 추천 행동", icon: "compass" as const, ...ACTION_RECOMMENDATIONS[pick.rec] },
  ];
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, [slides.length]);
  const s = slides[i];
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
            style={{ width: idx === i ? 20 : 6, background: idx === i ? "var(--green-600)" : "var(--green-200)" }}
          />
        ))}
      </div>
    </Card>
  );
}

function ReadingBehaviorBar() {
  return (
    <div>
      <div className={styles.stacked}>
        {READING_BEHAVIOR.map((it) => (
          <div key={it.label} title={`${it.label} ${it.pct}%`} style={{ width: `${it.pct}%`, background: it.color, transition: "width 0.4s" }} />
        ))}
      </div>
      <div className={styles.legend}>
        {READING_BEHAVIOR.map((it) => (
          <div key={it.label} className={styles.legendRow}>
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

function DualHeatmap() {
  const surfing = DAYS.map((_, di) =>
    HOURS.map((_, hi) => {
      if (hi >= 5 && hi <= 7 && di < 5) return 0.8;
      if (hi === 0 && di >= 5) return 0.7;
      if (hi === 4) return 0.4;
      return 0.1 + ((di * 5 + hi * 11) % 5) / 14;
    }),
  );
  const focus = DAYS.map((_, di) =>
    HOURS.map((_, hi) => {
      if (hi === 3 && di < 5) return 0.95;
      if (hi === 4 && di < 5) return 0.6;
      if (hi === 7 && di >= 5) return 0.55;
      if (hi === 1) return 0.05;
      return 0.1 + ((di * 3 + hi * 7) % 5) / 18;
    }),
  );
  return (
    <div className={styles.heatmaps}>
      <HeatBlock data={surfing} label="웹서핑 다빈도" sub="접속 활동 양" rgb="100,116,139" />
      <HeatBlock data={focus} label="집중 시간 (Deep + Reading)" sub="정독 비율" rgb="95,207,62" />
    </div>
  );
}

function HeatBlock({ data, label, sub, rgb }: { data: number[][]; label: string; sub: string; rgb: string }) {
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
            {data[di].map((v, hi) => (
              <div
                key={hi}
                className={styles.heatCell}
                title={`${d} ${HOURS[hi]}시 — ${Math.round(v * 100)}%`}
                style={{ background: `rgba(${rgb},${0.08 + v * 0.85})`, borderColor: `rgba(${rgb},0.08)` }}
              />
            ))}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
