"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, Button, HashChip, Icon, InlineState } from "@/components/ui";
import { MindmapCard } from "@/components/mindmap/MindmapCard";
import { MindmapDetailModal } from "@/components/mindmap/MindmapDetailModal";
import { MindmapFullView } from "@/components/mindmap/MindmapFullView";
import { getBookmarkOriginal, getCardSessions } from "@/lib/api";
import { useApi } from "@/lib/hooks/useApi";
import type { SavedBundle, SavedMindmap } from "@/lib/viewTypes";
import { profilePath } from "./CommunityView";
import { MoreResults, tabLabel } from "./SearchView";
import { toOriginalView } from "./toBookmarks";
import { toDetailSession } from "./toCommunityData";
import type { BookmarkTab } from "./useBookmarkTab";
import type { SearchTab } from "./useSearchTab";
import styles from "./Community.module.css";

/** 카드 위 북마크 해제 버튼 — 카드 클릭(팝업)으로 번지지 않는다 */
function UnbookmarkButton({ onClick, dark = false }: { onClick: () => void; dark?: boolean }) {
  return (
    <button
      className={`${styles.unbookmark} ${dark ? styles.unbookmarkDark : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label="북마크 해제"
      title="북마크 해제"
    >
      <Icon name="bookmark" size={dark ? 12 : 14} stroke={0} fill="currentColor" />
    </button>
  );
}

export interface BookmarksViewProps {
  mindmaps: BookmarkTab<SavedMindmap>;
  bundles: BookmarkTab<SavedBundle>;
}

export function BookmarksView({ mindmaps, bundles }: BookmarksViewProps) {
  const [filter, setFilter] = useState<"mindmap" | "tags">("mindmap");
  const [detail, setDetail] = useState<SavedMindmap | null>(null);
  const closeDetail = useCallback(() => setDetail(null), []);

  return (
    <div className={styles.page}>
      <PageHeader title="북마크" subtitle="저장한 마인드맵·해시태그 묶음" />
      <div className={styles.bmTabs}>
        <Button variant="secondary" active={filter === "mindmap"} onClick={() => setFilter("mindmap")}>
          {tabLabel("마인드맵", mindmaps)}
        </Button>
        <Button variant="secondary" active={filter === "tags"} onClick={() => setFilter("tags")}>
          {tabLabel("해시태그 묶음", bundles)}
        </Button>
      </div>
      <div className={styles.searchBody}>
        {filter === "mindmap" ? (
          <TabBody tab={mindmaps}>
            <div className={styles.bmGrid}>
              {mindmaps.items.map((m) => (
                <MindmapCard
                  key={m.bookmarkId}
                  seed={m.post.id}
                  nodes={m.post.nodes}
                  height={210}
                  title={m.post.title}
                  meta={`by ${m.post.user.name} · 저장 ${m.savedAgo}`}
                  tags={m.post.hashtags.slice(0, 2)}
                  topLeft={<UnbookmarkButton dark onClick={() => mindmaps.remove(m)} />}
                  topRight={`노드 ${m.post.nodes}`}
                  onClick={() => setDetail(m)}
                />
              ))}
            </div>
          </TabBody>
        ) : (
          <TabBody tab={bundles}>
            <div className={styles.bundleGrid}>
              {bundles.items.map((g) => (
                <div key={g.bookmarkId} className={styles.bundleCard}>
                  <div className={styles.bundleHead}>
                    {/* 이름 없이 저장한 묶음은 태그가 제목 자리로 간다 */}
                    <h4 className={styles.bundleTitle}>{g.name ?? g.tags.join(" ")}</h4>
                    <UnbookmarkButton onClick={() => bundles.remove(g)} />
                  </div>
                  {g.name !== null && (
                    <div className={styles.feedTags} style={{ marginBottom: 0 }}>
                      {g.tags.map((t) => (
                        <HashChip key={t} label={t} size="sm" />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TabBody>
        )}
      </div>

      {detail && <SavedMindmapDetail saved={detail} onClose={closeDetail} />}
    </div>
  );
}

/** 탭 하나의 로딩 · 실패 · 빈 상태 · 더 보기. 앞에서 다 해제했어도 더 있으면 빈 안내 대신 더 보기가 남는다 */
function TabBody({ tab, children }: { tab: SearchTab<unknown>; children: ReactNode }) {
  if (tab.status === "error") return <InlineState kind="error" title={tab.error ?? "북마크를 불러오지 못했어요."} onRetry={tab.retry} />;
  if (tab.status !== "ready") return <div className={styles.state}>불러오는 중…</div>;
  const empty = tab.items.length === 0;
  return (
    <>
      {empty && !tab.hasNext ? (
        <InlineState
          kind="empty"
          title="아직 북마크한 항목이 없어요"
          description="커뮤니티에서 마음에 드는 마인드맵이나 해시태그를 북마크해 보세요."
        />
      ) : (
        !empty && children
      )}
      <MoreResults tab={tab} />
    </>
  );
}

/** 카드 상세 팝업 — 열 때 관련 세션을 불러온다. 여러 세션에서 고른 저장은 세션 목록이 없다 */
function SavedMindmapDetail({ saved, onClose }: { saved: SavedMindmap; onClose: () => void }) {
  const router = useRouter();
  const { bookmarkId, sessionId, ownerId, post } = saved;
  const sessions = useApi(
    () => getCardSessions(sessionId as number).then((r) => r.sessions.map(toDetailSession)),
    [sessionId],
    { enabled: sessionId !== null },
  );

  // 원래 마인드맵은 누를 때 불러온다. 전체 보기를 닫았다 다시 열면 받은 값을 그대로 쓴다
  const [originalRequested, setOriginalRequested] = useState(false);
  const [originalOpen, setOriginalOpen] = useState(false);
  const closeOriginal = useCallback(() => setOriginalOpen(false), []);
  const original = useApi(() => getBookmarkOriginal(bookmarkId), [bookmarkId], { enabled: originalRequested });
  const view = useMemo(() => (original.data ? toOriginalView(original.data) : null), [original.data]);

  if (originalOpen && view) {
    return (
      <MindmapFullView
        title={`${post.user.name}님의 전체 마인드맵`}
        mindmap={view.mindmap}
        highlightIds={view.highlightIds}
        onClose={closeOriginal}
      />
    );
  }

  return (
    <MindmapDetailModal
      post={post}
      sessions={sessionId === null ? null : (sessions.data ?? [])}
      sessionsStatus={
        sessions.error ? (
          <InlineState kind="error" title={sessions.error} onRetry={sessions.refetch} />
        ) : sessions.loading ? (
          <div className={styles.sectionState}>불러오는 중…</div>
        ) : undefined
      }
      onClose={onClose}
      onOpenProfile={() => router.push(profilePath(ownerId))}
      onSessionClick={(id) => router.push(`/sessions/${id}`)}
      actions={
        original.error ? (
          <InlineState kind="error" title="원래 마인드맵을 불러오지 못했어요." description={original.error} onRetry={original.refetch} />
        ) : original.data && !view ? (
          <InlineState kind="empty" title="원래 마인드맵을 볼 수 없어요" description="작성자가 공개 범위를 바꿨거나 삭제했을 수 있어요." />
        ) : (
          <Button
            variant="primary"
            disabled={originalRequested && !original.data}
            onClick={() => {
              setOriginalRequested(true);
              setOriginalOpen(true);
            }}
          >
            <Icon name="network" size={13} />
            {originalRequested && !original.data ? "불러오는 중…" : "원래 마인드맵에서 보기"}
          </Button>
        )
      }
    />
  );
}
