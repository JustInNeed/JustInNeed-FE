"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, Button, PageHeader } from "@/components/ui";
import type { HashtagGroup, Session } from "@/lib/types";
import { SESSIONS } from "@/lib/data";
import { readGroups, writeGroups } from "@/lib/storage";
import { SessionCard } from "./SessionCard";
import { GroupSectionList } from "./GroupSectionList";
import { GroupEditor } from "./GroupEditor";
import styles from "./SessionsView.module.css";

type ViewMode = "list" | "group";

export function SessionsView() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>(SESSIONS);
  const [favOnly, setFavOnly] = useState(false);
  const [view, setView] = useState<ViewMode>("list");
  const [groups, setGroups] = useState<HashtagGroup[]>(() => readGroups());
  const [creating, setCreating] = useState(false);
  const [editingGroup, setEditingGroup] = useState<HashtagGroup | null>(null);

  const persistGroups = (next: HashtagGroup[]) => {
    setGroups(next);
    writeGroups(next);
  };

  const openSession = (id: string) => router.push(`/sessions/${id}`);
  const toggleFav = (id: string) =>
    setSessions((ss) => ss.map((x) => (x.id === id ? { ...x, favorite: !x.favorite } : x)));

  const filtered = favOnly ? sessions.filter((s) => s.favorite) : sessions;
  const favCount = sessions.filter((s) => s.favorite).length;

  const allTags = useMemo(() => {
    const set = new Set<string>();
    sessions.forEach((s) => s.hashtags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [sessions]);

  const sessionsForGroup = (g: HashtagGroup) =>
    filtered.filter((s) => s.hashtags.some((t) => g.tags.includes(t)));

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
        {view === "list" && (
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
        )}
        {view === "group" && (
          <GroupSectionList
            groups={groups}
            sessionsForGroup={sessionsForGroup}
            onOpen={openSession}
            onToggleFavorite={toggleFav}
            onEdit={(g) => setEditingGroup(g)}
            onDelete={(id) => persistGroups(groups.filter((g) => g.id !== id))}
            onReorder={persistGroups}
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
          onSave={(g) => {
            if (editingGroup) {
              persistGroups(groups.map((x) => (x.id === g.id ? ({ ...g, id: x.id } as HashtagGroup) : x)));
            } else {
              persistGroups([...groups, { ...g, id: "g" + Date.now() } as HashtagGroup]);
            }
            setCreating(false);
            setEditingGroup(null);
          }}
        />
      )}
    </div>
  );
}
