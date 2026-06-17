"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, Card, Button, HashChip, Markdown } from "@/components/ui";
import { Mindmap } from "@/components/mindmap/Mindmap";
import {
  ApiError,
  deleteSession,
  getSession,
  updateSession,
  type SessionDetail as SessionDetailType,
  type SessionUpdateRequest,
} from "@/lib/api";
import { useApi } from "@/lib/hooks/useApi";
import { formatDateTime, formatDuration, formatTime, hostFromUrl, STATUS_LABEL, withHash } from "@/lib/format";
import { buildSessionMindmap } from "./buildSessionMindmap";
import { CitationPopup } from "./CitationPopup";
import { SessionEditor } from "./SessionEditor";
import { AddHashtagPopover } from "./AddHashtagPopover";
import styles from "./SessionDetail.module.css";

export interface SessionDetailProps {
  sessionId: number;
}

export function SessionDetail({ sessionId }: SessionDetailProps) {
  const router = useRouter();
  const validId = Number.isFinite(sessionId);
  const fetcher = useCallback(() => getSession(sessionId), [sessionId]);
  const { data, error, loading } = useApi<SessionDetailType>(fetcher, [sessionId]);

  const [detail, setDetail] = useState<SessionDetailType | null>(null);
  const [view, setView] = useState<"text" | "graph">("text");
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [showTagPicker, setShowTagPicker] = useState(false);

  // edit mode — 제목 + 본문(markdown) + 하이라이트(insights) 편집
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftMarkdown, setDraftMarkdown] = useState("");
  const [draftInsights, setDraftInsights] = useState<string[]>([]);

  useEffect(() => {
    if (data) setDetail(data);
  }, [data]);

  const { nodes, edges } = useMemo(
    () => (detail ? buildSessionMindmap(detail) : { nodes: [], edges: [] }),
    [detail],
  );

  if (!validId) return <div className={styles.state}>잘못된 세션 주소입니다.</div>;
  if (loading && !detail) return <div className={styles.state}>불러오는 중…</div>;
  if (error && !detail) {
    return (
      <div className={styles.state}>
        <p className={styles.stateError}>{error}</p>
        <Button variant="secondary" onClick={() => router.push("/sessions")}>
          세션 목록으로
        </Button>
      </div>
    );
  }
  if (!detail) return null;

  // 낙관적 업데이트 + 서버 동기화
  const persist = async (body: SessionUpdateRequest, optimistic: Partial<SessionDetailType>) => {
    const prev = detail;
    setDetail({ ...detail, ...optimistic });
    try {
      const updated = await updateSession(detail.id, body);
      setDetail(updated);
    } catch (e) {
      setDetail(prev);
      alert(e instanceof ApiError ? e.message : "수정에 실패했습니다.");
    }
  };

  const toggleFavorite = () => persist({ isFavorite: !detail.isFavorite }, { isFavorite: !detail.isFavorite });
  const togglePublic = () => persist({ isPublic: !detail.isPublic }, { isPublic: !detail.isPublic });
  const addTag = (raw: string) => {
    const next = [...detail.tags, raw];
    setShowTagPicker(false);
    persist({ tags: next }, { tags: next });
  };

  const onDelete = async () => {
    if (!confirm("이 세션을 삭제할까요?")) return;
    try {
      await deleteSession(detail.id);
      router.push("/sessions");
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "삭제에 실패했습니다.");
    }
  };

  const enterEdit = () => {
    setDraftTitle(detail.title);
    setDraftMarkdown(detail.summary?.markdown ?? "");
    setDraftInsights(detail.summary?.insights ?? []);
    setView("text");
    setEditing(true);
  };
  const saveEdit = async () => {
    await persist(
      { title: draftTitle, editedMarkdown: draftMarkdown, insights: draftInsights },
      {
        title: draftTitle,
        summary: detail.summary
          ? { ...detail.summary, markdown: draftMarkdown, insights: draftInsights }
          : { markdown: draftMarkdown, insights: draftInsights },
      },
    );
    setEditing(false);
  };

  const insights = detail.summary?.insights ?? [];
  const duration = formatDuration(detail.startedAt, detail.endedAt);

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
                  maxLength={100}
                  className={styles.titleInput}
                />
              ) : (
                <h1 className={styles.title}>{detail.title}</h1>
              )}
              {!editing && (
                <button
                  onClick={toggleFavorite}
                  className={styles.favBtn}
                  style={{ color: detail.isFavorite ? "var(--green-600)" : "var(--ink-300)" }}
                  aria-label="즐겨찾기"
                >
                  <Icon name={detail.isFavorite ? "starFilled" : "star"} size={18} />
                </button>
              )}
            </div>

            <div className={styles.meta}>
              <span>
                {formatDateTime(detail.startedAt)} → {detail.endedAt ? formatTime(detail.endedAt) : "진행 중"}
              </span>
              {duration && (
                <>
                  <span>·</span>
                  <span className={styles.metaItem}>
                    <Icon name="clock" size={12} /> {duration}
                  </span>
                </>
              )}
              <span>·</span>
              <span className={styles.metaItem}>
                <Icon name="link" size={12} /> {detail.pageCount}개 페이지
              </span>
              <span>·</span>
              <span
                className={styles.metaDone}
                style={{ color: detail.status === "FAILED" ? "#c44" : "var(--green-700)" }}
              >
                <Icon name="dot" size={10} /> {STATUS_LABEL[detail.status]}
              </span>
            </div>

            <div className={styles.tags}>
              {detail.tags.map((h) => (
                <HashChip key={h} label={withHash(h)} size="sm" />
              ))}
              <div className={styles.tagPickerWrap}>
                <button onClick={() => setShowTagPicker((v) => !v)} className={styles.addTag}>
                  <Icon name="plus" size={10} /> 추가
                </button>
                {showTagPicker && (
                  <AddHashtagPopover
                    existing={detail.tags}
                    onClose={() => setShowTagPicker(false)}
                    onAdd={addTag}
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
                <Button variant="primary" onClick={saveEdit}>
                  <Icon name="check" size={14} /> 저장
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="secondary"
                  active={detail.isPublic}
                  onClick={togglePublic}
                  title={detail.isPublic ? "공개 — 클릭하여 비공개로" : "비공개 — 클릭하여 공개로"}
                >
                  <Icon name={detail.isPublic ? "unlock" : "lock"} size={14} />
                  {detail.isPublic ? "공개" : "비공개"}
                </Button>
                <Button variant="secondary" onClick={enterEdit}>
                  <Icon name="edit" size={14} /> 편집
                </Button>
                <Button variant="secondary" onClick={onDelete} aria-label="삭제">
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
              value={draftMarkdown}
              onChange={setDraftMarkdown}
              insights={draftInsights}
              updateInsight={(idx, v) =>
                setDraftInsights((arr) => arr.map((x, i) => (i === idx ? v : x)))
              }
              removeInsight={(idx) => setDraftInsights((arr) => arr.filter((_, i) => i !== idx))}
            />
          ) : (
            <Card style={{ padding: 28, overflowY: "auto" }}>
              <div className={styles.sectionEyebrow}>본문</div>
              {detail.summary?.markdown ? (
                <Markdown>{detail.summary.markdown}</Markdown>
              ) : (
                <p className={styles.bodyMuted}>
                  {detail.status === "ANALYZING"
                    ? "아직 분석 중이에요. 잠시 후 다시 확인해주세요."
                    : "요약 본문이 없습니다."}
                </p>
              )}

              {insights.length > 0 && <div className={styles.bodyDivider} />}

              {insights.length > 0 && (
                <>
                  <div className={styles.sectionEyebrow}>하이라이트</div>
                  <ul className={styles.highlightList}>
                    {insights.map((ins, i) => {
                      const src = detail.sources[i % Math.max(detail.sources.length, 1)];
                      return (
                        <li key={i} className={styles.highlightItem}>
                          <span className={styles.highlightNum}>{String(i + 1).padStart(2, "0")}</span>
                          <span className={styles.highlightText}>{ins}</span>
                          {src && (
                            <a
                              href={src.url}
                              target="_blank"
                              rel="noreferrer"
                              title={`${hostFromUrl(src.url)} 원문 열기`}
                              className={styles.highlightLink}
                            >
                              <Icon name="link" size={14} />
                            </a>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
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
                session={detail}
                onClose={() => setSelectedNode(null)}
              />
            )}
          </Card>
        )}

        <div className={styles.sidebar}>
          <Card style={{ padding: 16 }}>
            <div className={styles.sourcesHead}>
              <h3 className={styles.sourcesTitle}>출처 ({detail.sources.length})</h3>
            </div>
            {detail.sources.length === 0 ? (
              <div className={styles.sourcesEmpty}>수집된 출처가 없습니다.</div>
            ) : (
              detail.sources.map((s, i) => (
                <div key={i} className={styles.source} style={{ borderTop: i ? "1px solid var(--line)" : "none" }}>
                  <div className={styles.favicon}>{hostFromUrl(s.url).slice(0, 2).toUpperCase()}</div>
                  <div className={styles.sourceMain}>
                    <div className={styles.sourceHost}>{s.title || hostFromUrl(s.url)}</div>
                    <div className={styles.sourceMeta}>{hostFromUrl(s.url)}</div>
                  </div>
                  <a href={s.url} target="_blank" rel="noreferrer">
                    <Button variant="ghost" style={{ width: 24, height: 24 }} aria-label="원문 열기">
                      <Icon name="link" size={11} />
                    </Button>
                  </a>
                </div>
              ))
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
