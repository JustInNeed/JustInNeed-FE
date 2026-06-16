"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, Button, PageHeader } from "@/components/ui";
import {
  ApiError,
  createTagGroup,
  deleteTagGroup,
  getSessions,
  getTagGroups,
  reorderTagGroups,
  updateSession,
  updateTagGroup,
  type SessionListItem,
  type TagGroup,
} from "@/lib/api";
import { useApi } from "@/lib/hooks/useApi";
import { SessionCard } from "./SessionCard";
import { GroupSectionList } from "./GroupSectionList";
import { GroupEditor, type GroupEditorPayload } from "./GroupEditor";
import styles from "./SessionsView.module.css";

type ViewMode = "list" | "group";

export function SessionsView() {
  const router = useRouter();
  const sessionsQuery = useApi<SessionListItem[]>(getSessions, []);
  const groupsQuery = useApi<TagGroup[]>(getTagGroups, []);

  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [groups, setGroups] = useState<TagGroup[]>([]);
  const [favOnly, setFavOnly] = useState(false);
  const [view, setView] = useState<ViewMode>("list");
  const [creating, setCreating] = useState(false);
  const [editingGroup, setEditingGroup] = useState<TagGroup | null>(null);

  // 쿼리 결과를 로컬 상태로 미러링 (낙관적 업데이트용)
  useEffect(() => {
    if (sessionsQuery.data) setSessions(sessionsQuery.data);
  }, [sessionsQuery.data]);
  useEffect(() => {
    if (groupsQuery.data) setGroups([...groupsQuery.data].sort((a, b) => a.position - b.position));
  }, [groupsQuery.data]);

  const openSession = (id: number) => router.push(`/sessions/${id}`);

  const toggleFav = async (id: number) => {
    const cur = sessions.find((s) => s.id === id);
    if (!cur) return;
    const next = !cur.isFavorite;
    setSessions((ss) => ss.map((s) => (s.id === id ? { ...s, isFavorite: next } : s)));
    try {
      await updateSession(id, { isFavorite: next });
      groupsQuery.refetch(); // 그룹 뷰의 즐겨찾기 표시 동기화
    } catch (e) {
      setSessions((ss) => ss.map((s) => (s.id === id ? { ...s, isFavorite: !next } : s)));
      alert(e instanceof ApiError ? e.message : "즐겨찾기 변경에 실패했습니다.");
    }
  };

  const allTags = useMemo(() => {
    const set = new Set<string>();
    sessions.forEach((s) => s.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [sessions]);

  const filtered = favOnly ? sessions.filter((s) => s.isFavorite) : sessions;
  const favCount = sessions.filter((s) => s.isFavorite).length;
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
      alert(e instanceof ApiError ? e.message : "그룹 저장에 실패했습니다.");
    }
  };

  const removeGroup = async (id: number) => {
    const prev = groups;
    setGroups((gs) => gs.filter((g) => g.id !== id));
    try {
      await deleteTagGroup(id);
    } catch (e) {
      setGroups(prev);
      alert(e instanceof ApiError ? e.message : "그룹 삭제에 실패했습니다.");
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
      alert(e instanceof ApiError ? e.message : "순서 변경에 실패했습니다.");
    }
  };

  const loading = view === "list" ? sessionsQuery.loading : groupsQuery.loading;
  const error = view === "list" ? sessionsQuery.error : groupsQuery.error;
  const refetch = view === "list" ? sessionsQuery.refetch : groupsQuery.refetch;

  return (
    <div className={styles.page}>
      <PageHeader
        title="세션 목록"
        subtitle={`전체 ${sessions.length}개 세션 · ${favCount}개 즐겨찾기 · ${groups.length}개 그룹`}
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

      <div className={styles.body}>
        {loading ? (
          <div className={styles.state}>불러오는 중…</div>
        ) : error ? (
          <div className={styles.state}>
            <p className={styles.stateError}>{error}</p>
            <Button variant="secondary" onClick={refetch}>
              다시 시도
            </Button>
          </div>
        ) : view === "list" ? (
          filtered.length === 0 ? (
            <div className={styles.state}>
              <div className={styles.stateEmoji}>🌱</div>
              <p className={styles.stateTitle}>
                {favOnly ? "즐겨찾기한 세션이 없습니다" : "아직 세션이 없습니다"}
              </p>
              <p className={styles.stateDesc}>
                {favOnly
                  ? "세션 카드의 별을 눌러 즐겨찾기에 추가해보세요."
                  : "확장 프로그램으로 웹 탐색을 수집하면 세션이 여기에 쌓여요."}
              </p>
            </div>
          ) : (
            <div className={styles.grid}>
              {filtered.map((s) => (
                <SessionCard
                  key={s.id}
                  session={s}
                  onClick={() => openSession(s.id)}
                  onToggleFavorite={toggleFav}
                />
              ))}
            </div>
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

      {(creating || editingGroup) && (
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
