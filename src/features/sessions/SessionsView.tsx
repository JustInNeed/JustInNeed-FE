"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, Button, PageHeader, InlineState } from "@/components/ui";
import {
  ApiError,
  createTagGroup,
  deleteTagGroup,
  getSessionHashtags,
  getSessions,
  getTagGroups,
  reorderTagGroups,
  updateSession,
  updateTagGroup,
  type SessionListItem,
  type TagGroup,
} from "@/lib/api";
import { useApi } from "@/lib/hooks/useApi";
import { useToast } from "@/lib/app/ToastContext";
import { SessionCard } from "./SessionCard";
import { GroupSectionList } from "./GroupSectionList";
import { GroupEditor, type GroupEditorPayload } from "./GroupEditor";
import styles from "./SessionsView.module.css";

type ViewMode = "list" | "group";

const PAGE_SIZE = 10;

export function SessionsView() {
  const router = useRouter();
  const toast = useToast();
  const groupsQuery = useApi<TagGroup[]>(getTagGroups, []);

  // 목록 — GET /sessions?page&size&favorite 로 10개씩 받아 이어 붙임
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [hasNext, setHasNext] = useState(false);
  const [counts, setCounts] = useState({ total: 0, favorite: 0 });
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [listReload, setListReload] = useState(0);
  const [groups, setGroups] = useState<TagGroup[]>([]);
  const [favOnly, setFavOnly] = useState(false);
  const [view, setView] = useState<ViewMode>("list");
  const [creating, setCreating] = useState(false);
  const [editingGroup, setEditingGroup] = useState<TagGroup | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  // 스크롤 이벤트가 연달아 와도 다음 페이지는 한 번만 — state 보다 먼저 ref 로 막는다
  const fetchingRef = useRef(false);
  const nextPageRef = useRef(0);
  // 즐겨찾기 보기에서 불러온 세션의 별을 끈 수 — 그만큼 서버 목록이 앞으로 당겨진다
  const shiftRef = useRef(0);
  // 보기 전환 · 다시 시도 때 올려서 이전 요청의 응답은 버린다
  const genRef = useRef(0);

  // 그룹 쿼리 결과를 로컬 상태로 미러링 (낙관적 업데이트용)
  useEffect(() => {
    if (groupsQuery.data) setGroups([...groupsQuery.data].sort((a, b) => a.position - b.position));
  }, [groupsQuery.data]);

  // 첫 페이지 — 처음 열 때 · 전체/즐겨찾기 전환 · 다시 시도 때 0페이지부터 다시
  useEffect(() => {
    const gen = ++genRef.current;
    fetchingRef.current = true;
    nextPageRef.current = 0;
    shiftRef.current = 0;
    setSessions([]);
    setHasNext(false);
    setListLoading(true);
    setListError(null);
    setLoadingMore(false);
    getSessions({ page: 0, size: PAGE_SIZE, favorite: favOnly })
      .then((p) => {
        if (gen !== genRef.current) return;
        nextPageRef.current = 1;
        setSessions(p.sessions);
        setHasNext(p.hasNext);
        // 개수는 필터 · 페이지와 상관없는 내 전체 기준 — 이후엔 별 토글로만 맞춘다
        setCounts({ total: p.totalCount, favorite: p.favoriteCount });
      })
      .catch((e) => {
        if (gen === genRef.current) setListError(e instanceof ApiError ? e.message : "알 수 없는 오류가 발생했습니다.");
      })
      .finally(() => {
        if (gen !== genRef.current) return;
        fetchingRef.current = false;
        setListLoading(false);
      });
    return () => {
      genRef.current += 1;
    };
  }, [favOnly, listReload]);

  // 다음 페이지 — 불러오는 중이면 무시. 실패하면 토스트, 다시 스크롤하면 다시 요청
  const loadMore = () => {
    if (fetchingRef.current || !hasNext) return;
    const gen = genRef.current;
    // 별을 꺼서 당겨진 만큼 앞 페이지부터 다시 받는다 (겹치는 세션은 id 로 거름)
    const shift = shiftRef.current;
    const page = Math.max(0, nextPageRef.current - Math.ceil(shift / PAGE_SIZE));
    fetchingRef.current = true;
    setLoadingMore(true);
    getSessions({ page, size: PAGE_SIZE, favorite: favOnly })
      .then((p) => {
        if (gen !== genRef.current) return;
        nextPageRef.current = page + 1;
        shiftRef.current -= shift;
        setSessions((ss) => {
          const seen = new Set(ss.map((s) => s.id));
          return [...ss, ...p.sessions.filter((s) => !seen.has(s.id))];
        });
        setHasNext(p.hasNext);
      })
      .catch((e) => {
        if (gen === genRef.current)
          toast.error(e instanceof ApiError ? e.message : "세션을 더 불러오지 못했습니다. 다시 시도해 주세요.");
      })
      .finally(() => {
        if (gen !== genRef.current) return;
        fetchingRef.current = false;
        setLoadingMore(false);
      });
  };

  const openSession = (id: number) => router.push(`/sessions/${id}`);

  // 목록 · 그룹 카드의 별을 같이 바꾼다
  const setFavorite = (id: number, isFavorite: boolean) => {
    const apply = (s: SessionListItem) => (s.id === id ? { ...s, isFavorite } : s);
    setSessions((ss) => ss.map(apply));
    setGroups((gs) => gs.map((g) => ({ ...g, sessions: g.sessions.map(apply) })));
  };

  const toggleFav = async (id: number) => {
    // 그룹 보기의 세션은 아직 목록 페이지로 안 불러왔을 수 있다
    const cur = sessions.find((s) => s.id === id) ?? groups.flatMap((g) => g.sessions).find((s) => s.id === id);
    if (!cur) return;
    const next = !cur.isFavorite;
    const delta = next ? 1 : -1;
    const shift = favOnly && sessions.some((s) => s.id === id) ? -delta : 0;
    const gen = genRef.current;
    setFavorite(id, next);
    setCounts((c) => ({ ...c, favorite: c.favorite + delta }));
    shiftRef.current += shift;
    try {
      await updateSession(id, { isFavorite: next });
      groupsQuery.refetch(); // 그룹 뷰의 즐겨찾기 표시 동기화
    } catch (e) {
      setFavorite(id, !next);
      // 그사이 목록을 다시 받았으면 개수 · 당김은 이미 새로 맞춰져 있다
      if (gen === genRef.current) {
        setCounts((c) => ({ ...c, favorite: c.favorite - delta }));
        shiftRef.current -= shift;
      }
      toast.error(e instanceof ApiError ? e.message : "즐겨찾기 변경에 실패했습니다. 다시 시도해 주세요.");
    }
  };

  // 그룹 편집기의 전체 해시태그 — 편집기를 열 때마다 내 세션 전체 해시태그를 받는다 (태그는 상세 화면에서 바뀜)
  const editorOpen = creating || editingGroup != null;
  const hashtagsQuery = useApi<string[]>(getSessionHashtags, [], { enabled: editorOpen });
  const allTags = hashtagsQuery.data ?? [];
  useEffect(() => {
    if (hashtagsQuery.error) toast.error("해시태그 목록을 불러오지 못했어요. 편집 창을 다시 열어 주세요.");
  }, [hashtagsQuery.error, toast]);

  // 즐겨찾기 보기에서 별을 끈 카드는 바로 뺀다 (실패하면 되살아남)
  const visible = favOnly ? sessions.filter((s) => s.isFavorite) : sessions;
  const displayGroups = favOnly
    ? groups.map((g) => ({ ...g, sessions: g.sessions.filter((s) => s.isFavorite) }))
    : groups;

  // --- 그룹 CRUD ---
  const saveGroup = async (payload: GroupEditorPayload) => {
    try {
      if (payload.id != null) {
        // 이름은 화면에서 쓰지 않으므로 hashtags만 수정 (name은 서버 기존값 유지)
        const updated = await updateTagGroup(payload.id, { hashtags: payload.hashtags });
        setGroups((gs) => gs.map((g) => (g.id === updated.id ? updated : g)));
      } else {
        // 백엔드 name은 필수(notnull) → 화면엔 없으므로 해시태그로 자동 생성
        const name = payload.hashtags.slice(0, 3).join(", ") || "새 그룹";
        const created = await createTagGroup({ name, hashtags: payload.hashtags });
        setGroups((gs) => [...gs, created].sort((a, b) => a.position - b.position));
      }
      setCreating(false);
      setEditingGroup(null);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "그룹 저장에 실패했습니다. 다시 시도해 주세요.");
    }
  };

  const removeGroup = async (id: number) => {
    const prev = groups;
    setGroups((gs) => gs.filter((g) => g.id !== id));
    try {
      await deleteTagGroup(id);
    } catch (e) {
      setGroups(prev);
      toast.error(e instanceof ApiError ? e.message : "그룹 삭제에 실패했습니다. 다시 시도해 주세요.");
    }
  };

  const reorderGroups = async (next: TagGroup[]) => {
    const prev = groups;
    setGroups(next);
    try {
      const result = await reorderTagGroups({ groupIds: next.map((g) => g.id) });
      setGroups([...result].sort((a, b) => a.position - b.position));
    } catch (e) {
      setGroups(prev);
      toast.error(e instanceof ApiError ? e.message : "순서 변경에 실패했습니다. 다시 시도해 주세요.");
    }
  };

  const loading = view === "list" ? listLoading : groupsQuery.loading;
  const error = view === "list" ? listError : groupsQuery.error;
  const refetch = view === "list" ? () => setListReload((n) => n + 1) : groupsQuery.refetch;

  // 무한 스크롤 (REC-10-1) — 스크롤 80% 지점에서 다음 10개를 서버에 요청
  const loadMoreIfNeeded = () => {
    const el = bodyRef.current;
    if (!el || view !== "list" || listLoading || !hasNext) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight * 0.8) loadMore();
  };
  // 불러온 카드가 화면을 다 못 채우면 스크롤이 생길 때까지 다음 페이지를 이어서 받음
  useEffect(() => {
    loadMoreIfNeeded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible.length, hasNext, view, listLoading]);

  return (
    <div className={styles.page}>
      <PageHeader
        title="세션 목록"
        subtitle={`전체 ${counts.total}개 세션 · ${counts.favorite}개 즐겨찾기 · ${groups.length}개 그룹`}
        right={
          <div className={styles.toolbar}>
            <Button
              variant="secondary"
              active={favOnly && view === "list"}
              onClick={() => {
                setView("list");
                setFavOnly((v) => !v);
              }}
            >
              <Icon name="star" size={12} /> 즐겨찾기
            </Button>
            <div className={styles.divider} />
            <Button
              variant="secondary"
              active={view === "group"}
              onClick={() => setView((v) => (v === "group" ? "list" : "group"))}
            >
              해시태그
            </Button>
          </div>
        }
      />

      <div ref={bodyRef} className={styles.body} onScroll={loadMoreIfNeeded}>
        {loading ? (
          <div className={styles.state}>불러오는 중…</div>
        ) : error ? (
          <InlineState kind="error" title={error} onRetry={refetch} />
        ) : view === "list" ? (
          visible.length === 0 && !hasNext ? (
            <InlineState
              kind="empty"
              title={favOnly ? "즐겨찾기한 세션이 없습니다" : "아직 세션이 없습니다"}
              description={
                favOnly
                  ? "세션 카드의 별을 눌러 즐겨찾기에 추가해보세요."
                  : "확장 프로그램으로 웹 탐색을 수집하면 세션이 여기에 쌓여요."
              }
            />
          ) : (
            <>
              <div className={styles.grid}>
                {visible.map((s) => (
                  <SessionCard
                    key={s.id}
                    session={s}
                    onClick={() => openSession(s.id)}
                    onToggleFavorite={toggleFav}
                  />
                ))}
              </div>
              {loadingMore ? (
                <p className={styles.end}>불러오는 중…</p>
              ) : (
                !hasNext && <p className={styles.end}>모든 기록을 확인했습니다.</p>
              )}
            </>
          )
        ) : (
          <GroupSectionList
            groups={displayGroups}
            onOpen={openSession}
            onToggleFavorite={toggleFav}
            onEdit={(g) => setEditingGroup(g)}
            onDelete={removeGroup}
            onReorder={reorderGroups}
            onCreate={() => setCreating(true)}
          />
        )}
      </div>

      {editorOpen && (
        <GroupEditor
          allTags={allTags}
          group={editingGroup}
          onCancel={() => {
            setCreating(false);
            setEditingGroup(null);
          }}
          onSave={saveGroup}
        />
      )}
    </div>
  );
}
