"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, Card, Button, HashChip } from "@/components/ui";
import { Mindmap } from "@/components/mindmap/Mindmap";
import type { Session } from "@/lib/types";
import { buildSessionMindmap } from "./buildSessionMindmap";
import { CitationPopup } from "./CitationPopup";
import { SessionEditor } from "./SessionEditor";
import { AddHashtagPopover } from "./AddHashtagPopover";
import styles from "./SessionDetail.module.css";

const DEFAULT_HEADING = "오늘 어디까지 정리됐을까요?";

export interface SessionDetailProps {
  session: Session;
}

export function SessionDetail({ session }: SessionDetailProps) {
  const router = useRouter();
  const [view, setView] = useState<"text" | "graph">("text");
  const [favorite, setFavorite] = useState(session.favorite);
  const [isPublic, setIsPublic] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [hashtags, setHashtags] = useState(session.hashtags);

  // edit mode
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(session.title);
  const [draftSummary, setDraftSummary] = useState(session.summary);
  const [draftHeading, setDraftHeading] = useState(DEFAULT_HEADING);
  const [draftInsights, setDraftInsights] = useState(session.insights);

  const { nodes, edges } = useMemo(() => buildSessionMindmap(session), [session]);

  const enterEdit = () => {
    setDraftTitle(session.title);
    setDraftSummary(session.summary);
    setDraftHeading(DEFAULT_HEADING);
    setDraftInsights(session.insights);
    setView("text");
    setEditing(true);
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button onClick={() => router.push("/sessions")} className={styles.back}>
          ← 세션 목록
        </button>
        <div className={styles.headerRow}>
          <div className={styles.headerMain}>
            <div className={styles.titleRow}>
              {editing ? (
                <input
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  placeholder="세션 제목"
                  className={styles.titleInput}
                />
              ) : (
                <h1 className={styles.title}>{session.title}</h1>
              )}
              {!editing && (
                <button
                  onClick={() => setFavorite((v) => !v)}
                  className={styles.favBtn}
                  style={{ color: favorite ? "var(--green-600)" : "var(--ink-300)" }}
                  aria-label="즐겨찾기"
                >
                  <Icon name={favorite ? "starFilled" : "star"} size={18} />
                </button>
              )}
            </div>

            <div className={styles.meta}>
              <span>
                {session.start} → {session.end.split(" ")[1]}
              </span>
              <span>·</span>
              <span className={styles.metaItem}>
                <Icon name="clock" size={12} /> {session.duration}
              </span>
              <span>·</span>
              <span className={styles.metaItem}>
                <Icon name="link" size={12} /> {session.urls}개 페이지
              </span>
              <span>·</span>
              <span className={styles.metaDone}>
                <Icon name="dot" size={10} /> 분석 완료
              </span>
            </div>

            <div className={styles.tags}>
              {hashtags.map((h) => (
                <HashChip key={h} label={h} size="sm" />
              ))}
              <div className={styles.tagPickerWrap}>
                <button onClick={() => setShowTagPicker((v) => !v)} className={styles.addTag}>
                  <Icon name="plus" size={10} /> 추가
                </button>
                {showTagPicker && (
                  <AddHashtagPopover
                    existing={hashtags}
                    onClose={() => setShowTagPicker(false)}
                    onAdd={(t) => {
                      setHashtags((prev) => [...prev, t]);
                      setShowTagPicker(false);
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          <div className={styles.actions}>
            {editing ? (
              <>
                <Button variant="secondary" onClick={() => setEditing(false)}>
                  취소
                </Button>
                <Button variant="primary" onClick={() => setEditing(false)}>
                  <Icon name="check" size={14} /> 저장
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="secondary"
                  active={isPublic}
                  onClick={() => setIsPublic((v) => !v)}
                  title={isPublic ? "공개 — 클릭하여 비공개로" : "비공개 — 클릭하여 공개로"}
                >
                  <Icon name={isPublic ? "unlock" : "lock"} size={14} />
                  {isPublic ? "공개" : "비공개"}
                </Button>
                <Button variant="secondary" onClick={enterEdit}>
                  <Icon name="edit" size={14} /> 편집
                </Button>
                <Button variant="secondary" aria-label="삭제">
                  <Icon name="trash" size={14} />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className={styles.tabs}>
        <button
          onClick={() => setView("text")}
          className={`${styles.tab} ${view === "text" ? styles.tabActive : ""}`}
        >
          <Icon name="text" size={14} /> 줄글 보기
        </button>
        <button
          onClick={() => setView("graph")}
          className={`${styles.tab} ${view === "graph" ? styles.tabActive : ""}`}
        >
          <Icon name="network" size={14} /> 마인드맵 보기
        </button>
      </div>

      <div className={styles.content}>
        {view === "text" ? (
          editing ? (
            <SessionEditor
              heading={draftHeading}
              setHeading={setDraftHeading}
              summary={draftSummary}
              setSummary={setDraftSummary}
              insights={draftInsights}
              updateInsight={(idx, value) =>
                setDraftInsights((arr) => arr.map((v, i) => (i === idx ? value : v)))
              }
              removeInsight={(idx) => setDraftInsights((arr) => arr.filter((_, i) => i !== idx))}
            />
          ) : (
            <Card style={{ padding: 28, overflowY: "auto" }}>
              <div className={styles.sectionEyebrow}>본문</div>
              <h2 className={styles.bodyHeading}>{DEFAULT_HEADING}</h2>
              <p className={styles.bodyText}>{session.summary}</p>

              <div className={styles.sectionEyebrow}>하이라이트</div>
              <ul className={styles.highlightList}>
                {session.insights.map((ins, i) => {
                  const src = session.sources[i % session.sources.length];
                  return (
                    <li key={i} className={styles.highlightItem}>
                      <span className={styles.highlightNum}>{String(i + 1).padStart(2, "0")}</span>
                      <span className={styles.highlightText}>{ins}</span>
                      {src && (
                        <a
                          href={`https://${src.url}`}
                          target="_blank"
                          rel="noreferrer"
                          title={`${src.host} 원문 열기`}
                          className={styles.highlightLink}
                        >
                          <Icon name="link" size={14} />
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Card>
          )
        ) : (
          <Card style={{ padding: 0, overflow: "hidden", position: "relative" }}>
            <Mindmap
              nodes={nodes}
              edges={edges}
              width={1000}
              height={680}
              selectedId={selectedNode}
              onSelect={(id) => setSelectedNode((cur) => (id === cur ? null : id))}
            />
            {selectedNode && (
              <CitationPopup
                node={nodes.find((n) => n.id === selectedNode)}
                session={session}
                onClose={() => setSelectedNode(null)}
              />
            )}
          </Card>
        )}

        <div className={styles.sidebar}>
          <Card style={{ padding: 16 }}>
            <div className={styles.sourcesHead}>
              <h3 className={styles.sourcesTitle}>출처 ({session.sources.length})</h3>
              <span className={styles.sourcesSub}>시간순</span>
            </div>
            {session.sources.map((s, i) => (
              <div key={i} className={styles.source} style={{ borderTop: i ? "1px solid var(--line)" : "none" }}>
                <div className={styles.favicon}>{s.host.slice(0, 2).toUpperCase()}</div>
                <div className={styles.sourceMain}>
                  <div className={styles.sourceHost}>{s.host}</div>
                  <div className={styles.sourceMeta}>
                    <span>{s.time}</span>
                    {s.deepRead && (
                      <span className={styles.deep}>
                        <Icon name="dot" size={6} /> Deep
                      </span>
                    )}
                  </div>
                </div>
                <Button variant="ghost" style={{ width: 24, height: 24 }} aria-label="원문 열기">
                  <Icon name="link" size={11} />
                </Button>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
