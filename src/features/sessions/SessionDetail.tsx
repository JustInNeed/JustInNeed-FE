"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, Card, Button, Markdown, InlineState } from "@/components/ui";
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
import { useToast } from "@/lib/app/ToastContext";
import { formatDateTime, formatDuration, formatTime, hostFromUrl, STATUS_LABEL, withHash } from "@/lib/format";
import { buildSessionMindmap } from "./buildSessionMindmap";
import { CitationPopup } from "./CitationPopup";
import { SessionEditor } from "./SessionEditor";
import { AddHashtagPopover } from "./AddHashtagPopover";
import { LeaveConfirmModal } from "./LeaveConfirmModal";
import styles from "./SessionDetail.module.css";

const AUTO_SAVE_MS = 30_000;

type AutoSaveState = { status: "idle" | "saving" | "saved"; at: number | null };
type LeaveTarget = { kind: "cancel" } | { kind: "list" } | { kind: "href"; href: string };
type MapLayout = "radial" | "tree";

const MAP_LAYOUTS: [MapLayout, string][] = [
  ["radial", "방사형"],
  ["tree", "계층형"],
];

function savedAgo(at: number, now: number): string {
  const min = Math.floor((now - at) / 60_000);
  if (min < 1) return "방금 전";
  if (min < 60) return `${min}분 전`;
  return `${Math.floor(min / 60)}시간 전`;
}

/** LLM 줄글이 이미 `# 제목` 으로 시작하면 내보낼 때 제목을 또 붙이지 않는다. */
function startsWithHeading(markdown: string): boolean {
  return /^#\s/.test(markdown.trimStart());
}

export interface SessionDetailProps {
  sessionId: number;
}

export function SessionDetail({ sessionId }: SessionDetailProps) {
  const router = useRouter();
  const toast = useToast();
  // 주소의 id 가 양의 정수가 아니면 요청 없이 404
  const validId = Number.isInteger(sessionId) && sessionId > 0;
  // useApi 는 메시지만 돌려주므로 404 · 403 구분용 상태 코드는 따로 보관
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const fetcher = useCallback(
    () =>
      getSession(sessionId).catch((e: unknown) => {
        setErrorStatus(e instanceof ApiError ? e.status : null);
        throw e;
      }),
    [sessionId],
  );
  const { data, error, loading } = useApi<SessionDetailType>(fetcher, [sessionId], { enabled: validId });

  const [detail, setDetail] = useState<SessionDetailType | null>(null);
  const [view, setView] = useState<"text" | "graph">("text");
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [showTagPicker, setShowTagPicker] = useState(false);
  // 마인드맵 정렬 — 배치 변경 · 자동 정렬(옮긴 위치 초기화) 모두 key 로 다시 마운트
  const [mapLayout, setMapLayout] = useState<MapLayout>("radial");
  const [mapResetKey, setMapResetKey] = useState(0);

  // edit mode — 제목 + 본문(markdown) 편집
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftMarkdown, setDraftMarkdown] = useState("");

  // 30초 자동 저장 — 변경이 있을 때만 저장. 저장 / 취소 버튼 옆 회색 상태 문구, 실패는 토스트로만
  const [baseline, setBaseline] = useState("");
  const [autoSave, setAutoSave] = useState<AutoSaveState>({ status: "idle", at: null });
  const [now, setNow] = useState(() => Date.now());
  const savingRef = useRef(false);
  const autoSaveTick = useRef<() => void>(() => {});

  // 저장 안 하고 나가기 경고
  const [leaveTarget, setLeaveTarget] = useState<LeaveTarget | null>(null);
  const [leaving, setLeaving] = useState(false);

  // 줄글 복사용 본문 렌더 영역, 해시태그 드래그 순서 변경
  const bodyRef = useRef<HTMLDivElement>(null);
  const [tagDragIdx, setTagDragIdx] = useState<number | null>(null);
  const [tagOverIdx, setTagOverIdx] = useState<number | null>(null);

  const draftKey = JSON.stringify([draftTitle, draftMarkdown]);
  const dirty = editing && draftKey !== baseline;

  useEffect(() => {
    if (!editing) return;
    const t = setInterval(() => autoSaveTick.current(), AUTO_SAVE_MS);
    return () => clearInterval(t);
  }, [editing]);

  // "저장됨 · N분 전" 갱신
  useEffect(() => {
    if (autoSave.status !== "saved") return;
    const t = setInterval(() => setNow(Date.now()), 20_000);
    return () => clearInterval(t);
  }, [autoSave.status]);

  // 새로고침 · 탭 닫기 → 브라우저 기본 확인창
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  // 사이드바 등 앱 안 링크로 이동 → Link 가 처리하기 전에 가로채서 경고 모달
  useEffect(() => {
    if (!dirty) return;
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]");
      if (!(a instanceof HTMLAnchorElement) || a.target === "_blank") return;
      const url = new URL(a.href);
      if (url.origin !== window.location.origin) return;
      e.preventDefault();
      e.stopPropagation();
      setLeaveTarget({ kind: "href", href: url.pathname + url.search });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [dirty]);

  useEffect(() => {
    if (data) setDetail(data);
  }, [data]);

  const { nodes, edges } = useMemo(
    () => (detail ? buildSessionMindmap(detail) : { nodes: [], edges: [] }),
    [detail],
  );

  const blocked = !validId
    ? 404
    : error && !detail && (errorStatus === 404 || errorStatus === 403)
      ? errorStatus
      : null;
  if (blocked) {
    return (
      <div className={styles.state}>
        <div className={styles.stateBox}>
          {blocked === 404 ? (
            <InlineState kind="empty" title="세션을 찾을 수 없어요" description="삭제됐거나 주소가 잘못됐어요." />
          ) : (
            <InlineState kind="empty" title="볼 수 없는 세션이에요" description="비공개 세션이라 볼 수 없어요." />
          )}
        </div>
        <Button variant="secondary" onClick={() => router.push("/sessions")}>
          세션 목록으로
        </Button>
      </div>
    );
  }
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

  // 낙관적 업데이트 + 서버 동기화. 실패하면 되돌리고 false
  const persist = async (body: SessionUpdateRequest, optimistic: Partial<SessionDetailType>): Promise<boolean> => {
    const prev = detail;
    setDetail({ ...detail, ...optimistic });
    try {
      const updated = await updateSession(detail.id, body);
      setDetail(updated);
      return true;
    } catch (e) {
      setDetail(prev);
      toast.error(e instanceof ApiError ? e.message : "저장에 실패했습니다. 다시 시도해 주세요.");
      return false;
    }
  };

  const toggleFavorite = () => persist({ isFavorite: !detail.isFavorite }, { isFavorite: !detail.isFavorite });
  const togglePublic = () => persist({ isPublic: !detail.isPublic }, { isPublic: !detail.isPublic });
  const addTag = (raw: string) => {
    const next = [...detail.tags, raw];
    setShowTagPicker(false);
    persist({ tags: next }, { tags: next });
  };
  const removeTag = (tag: string) => {
    const next = detail.tags.filter((t) => t !== tag);
    persist({ tags: next }, { tags: next });
  };

  const onDelete = async () => {
    if (!confirm("이 세션을 삭제할까요?")) return;
    try {
      await deleteSession(detail.id);
      router.push("/sessions");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "삭제에 실패했습니다. 다시 시도해 주세요.");
    }
  };

  const onTagDrop = (i: number) => {
    if (tagDragIdx !== null && tagDragIdx !== i) {
      const next = [...detail.tags];
      const [moved] = next.splice(tagDragIdx, 1);
      next.splice(i, 0, moved);
      persist({ tags: next }, { tags: next });
    }
    setTagDragIdx(null);
    setTagOverIdx(null);
  };

  const enterEdit = () => {
    const title = detail.title;
    const markdown = detail.summary?.markdown ?? "";
    setDraftTitle(title);
    setDraftMarkdown(markdown);
    setBaseline(JSON.stringify([title, markdown]));
    setAutoSave({ status: "idle", at: null });
    setView("text");
    setEditing(true);
  };

  // 편집 모드는 유지한 채 초안만 저장 (자동 저장 · 저장하고 나가기)
  const saveDraft = async (failMessage: string): Promise<boolean> => {
    if (savingRef.current) return false;
    savingRef.current = true;
    const key = draftKey;
    setAutoSave((s) => ({ ...s, status: "saving" }));
    try {
      const updated = await updateSession(detail.id, { title: draftTitle, editedMarkdown: draftMarkdown });
      setDetail(updated);
      setBaseline(key);
      const t = Date.now();
      setNow(t);
      setAutoSave({ status: "saved", at: t });
      return true;
    } catch {
      setAutoSave((s) => ({ ...s, status: s.at ? "saved" : "idle" }));
      toast.info(failMessage, { icon: "exclaim" });
      return false;
    } finally {
      savingRef.current = false;
    }
  };
  autoSaveTick.current = () => {
    if (dirty) void saveDraft("자동 저장에 실패했어요. 저장 버튼을 눌러 저장해 주세요.");
  };

  const proceedLeave = (target: LeaveTarget) => {
    setLeaveTarget(null);
    setEditing(false);
    if (target.kind === "list") router.push("/sessions");
    else if (target.kind === "href") router.push(target.href);
  };
  const requestLeave = (target: LeaveTarget) => (dirty ? setLeaveTarget(target) : proceedLeave(target));
  const saveAndLeave = async () => {
    if (!leaveTarget) return;
    setLeaving(true);
    const ok = await saveDraft("저장에 실패했어요. 다시 시도해 주세요.");
    setLeaving(false);
    if (ok) proceedLeave(leaveTarget);
  };

  const copyText = async () => {
    const md = detail.summary?.markdown ?? "";
    const body = bodyRef.current?.innerText.trim() ?? md;
    try {
      await navigator.clipboard.writeText(startsWithHeading(md) ? body : `${detail.title}\n\n${body}`);
      toast.success("줄글을 복사했어요.");
    } catch {
      toast.error("복사하지 못했어요. 다시 시도해 주세요.");
    }
  };
  const downloadMarkdown = () => {
    const md = detail.summary?.markdown ?? "";
    const content = startsWithHeading(md) ? `${md}\n` : `# ${detail.title}\n\n${md}\n`;
    const url = URL.createObjectURL(new Blob([content], { type: "text/markdown;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${detail.title.replace(/[\\/:*?"<>|]+/g, "_").trim() || "session"}.md`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  // 실패하면 편집 모드 · 초안을 그대로 둔다. 자동 저장과 같은 잠금으로 중복 저장 방지
  const saveEdit = async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    try {
      const ok = await persist(
        { title: draftTitle, editedMarkdown: draftMarkdown },
        {
          title: draftTitle,
          summary: detail.summary ? { ...detail.summary, markdown: draftMarkdown } : { markdown: draftMarkdown },
        },
      );
      if (ok) setEditing(false);
    } finally {
      savingRef.current = false;
    }
  };

  const duration = formatDuration(detail.startedAt, detail.endedAt);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button onClick={() => requestLeave({ kind: "list" })} className={styles.back}>
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
              {detail.tags.map((h, i) => (
                <span
                  key={h}
                  draggable
                  onDragStart={(e) => {
                    setTagDragIdx(i);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (tagDragIdx !== null && tagDragIdx !== i) setTagOverIdx(i);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    onTagDrop(i);
                  }}
                  onDragEnd={() => {
                    setTagDragIdx(null);
                    setTagOverIdx(null);
                  }}
                  className={styles.tagDrag}
                  style={{
                    opacity: tagDragIdx === i ? 0.4 : 1,
                    outline: tagOverIdx === i && tagDragIdx !== i ? "2px solid var(--green-700)" : "none",
                  }}
                  title="드래그로 순서 변경"
                >
                  {withHash(h)}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeTag(h);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    draggable={false}
                    className={styles.tagRemove}
                    aria-label={`${withHash(h)} 삭제`}
                    title="삭제"
                  >
                    <Icon name="x" size={10} />
                  </button>
                </span>
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
                {autoSave.status !== "idle" && (
                  <span className={styles.autoSave} role="status">
                    <Icon name={autoSave.status === "saving" ? "refresh" : "check"} size={13} stroke={2.2} />
                    {autoSave.status === "saving" || autoSave.at === null
                      ? "저장 중…"
                      : `저장됨 · ${savedAgo(autoSave.at, now)}`}
                  </span>
                )}
                <Button variant="secondary" onClick={() => requestLeave({ kind: "cancel" })}>
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
            <SessionEditor value={draftMarkdown} onChange={setDraftMarkdown} />
          ) : (
            <Card style={{ padding: 28, overflowY: "auto" }}>
              <div className={styles.bodyHead}>
                <div className={styles.sectionEyebrow}>본문</div>
                {detail.summary?.markdown && (
                  <div className={styles.bodyTools}>
                    <Button variant="ghost" onClick={copyText} aria-label="줄글 복사" title="줄글 복사">
                      <Icon name="copy" size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={downloadMarkdown}
                      aria-label=".md 파일 다운로드"
                      title=".md 파일 다운로드"
                    >
                      <Icon name="download" size={14} />
                    </Button>
                  </div>
                )}
              </div>
              {detail.summary?.markdown ? (
                <div ref={bodyRef}>
                  <Markdown>{detail.summary.markdown}</Markdown>
                </div>
              ) : (
                <p className={styles.bodyMuted}>
                  {detail.status === "ANALYZING"
                    ? "아직 분석 중이에요. 잠시 후 다시 확인해주세요."
                    : "요약 본문이 없습니다."}
                </p>
              )}
            </Card>
          )
        ) : (
          <Card style={{ padding: 0, overflow: "hidden", position: "relative" }}>
            <div className={styles.mapToolbar}>
              <div className={styles.segment} role="group" aria-label="마인드맵 배치">
                {MAP_LAYOUTS.map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setMapLayout(value)}
                    aria-pressed={mapLayout === value}
                    className={`${styles.segBtn} ${mapLayout === value ? styles.segBtnActive : ""}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <Button variant="secondary" onClick={() => setMapResetKey((k) => k + 1)} title="옮긴 노드를 처음 배치로">
                <Icon name="refresh" size={13} /> 자동 정렬
              </Button>
            </div>
            <Mindmap
              key={`${mapLayout}-${mapResetKey}`}
              layout={mapLayout}
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

      {leaveTarget && (
        <LeaveConfirmModal
          saving={leaving}
          onDiscard={() => proceedLeave(leaveTarget)}
          onStay={() => setLeaveTarget(null)}
          onSaveAndLeave={saveAndLeave}
        />
      )}
    </div>
  );
}
