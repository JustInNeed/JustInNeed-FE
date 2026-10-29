"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, Button, HashChip, Icon, InlineState } from "@/components/ui";
import { MindmapCard } from "@/components/mindmap/MindmapCard";
import { MindmapDetailModal } from "@/components/mindmap/MindmapDetailModal";
import { MindmapFullView } from "@/components/mindmap/MindmapFullView";
import { SessionCard } from "@/features/sessions";
import {
  BOOKMARK_TAG_BUNDLES,
  BOOKMARKED_MINDMAPS,
  COMMUNITY_FEED,
  MOCK_SESSIONS,
  relatedSessionsFor,
  type BookmarkedMindmap,
  type CommunityPost,
} from "@/lib/mock/designData";
import { useToast } from "@/lib/app/ToastContext";
import { profilePath } from "./CommunityView";
import styles from "./Community.module.css";

type SavedMap = BookmarkedMindmap & { post: CommunityPost };

const SAVED_MAPS: SavedMap[] = BOOKMARKED_MINDMAPS.flatMap((b) => {
  const post = COMMUNITY_FEED.find((p) => p.id === b.postId);
  return post ? [{ ...b, post }] : [];
});

/** 카드 위 북마크 해제 버튼 — 카드 클릭(팝업 · 이동)으로 번지지 않는다 */
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

export function BookmarksView() {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<"mindmap" | "sessions" | "tags">("mindmap");

  // 북마크 해제 (목: 로컬 상태). 원본 순서에서 걸러내므로 되돌리면 같은 자리로 돌아온다.
  const [removed, setRemoved] = useState<ReadonlySet<string>>(new Set());
  const unbookmark = (key: string) => {
    setRemoved((cur) => new Set(cur).add(key));
    toast.success("북마크를 해제했어요.", {
      action: {
        label: "되돌리기",
        onClick: () =>
          setRemoved((cur) => {
            const next = new Set(cur);
            next.delete(key);
            return next;
          }),
      },
    });
  };
  const maps = SAVED_MAPS.filter((m) => !removed.has(`map:${m.postId}`));
  const sessions = MOCK_SESSIONS.filter((s) => !removed.has(`session:${s.id}`));
  const bundles = BOOKMARK_TAG_BUNDLES.filter((g) => !removed.has(`tag:${g.name}`));

  // 상세 팝업 → 원래 마인드맵에서 보기. 전체 보기를 닫으면 팝업으로 돌아간다.
  const [detail, setDetail] = useState<SavedMap | null>(null);
  const [fullView, setFullView] = useState(false);
  const closeDetail = useCallback(() => setDetail(null), []);
  const closeFullView = useCallback(() => setFullView(false), []);

  return (
    <div className={styles.page}>
      <PageHeader title="북마크" subtitle="저장한 마인드맵·세션·해시태그 묶음" />
      <div className={styles.bmTabs}>
        <Button variant="secondary" active={tab === "mindmap"} onClick={() => setTab("mindmap")}>마인드맵 ({maps.length})</Button>
        <Button variant="secondary" active={tab === "sessions"} onClick={() => setTab("sessions")}>세션 ({sessions.length})</Button>
        <Button variant="secondary" active={tab === "tags"} onClick={() => setTab("tags")}>해시태그 묶음 ({bundles.length})</Button>
      </div>
      <div className={styles.searchBody}>
        {((tab === "mindmap" && maps.length === 0) ||
          (tab === "sessions" && sessions.length === 0) ||
          (tab === "tags" && bundles.length === 0)) && <InlineState kind="empty" title="북마크한 항목이 없어요" />}
        {tab === "mindmap" && (
          <div className={styles.bmGrid}>
            {maps.map((m) => (
              <MindmapCard
                key={m.postId}
                seed={m.postId}
                nodes={m.post.nodes}
                height={210}
                title={m.post.title}
                meta={`by ${m.post.user.name} · 저장 ${m.savedAgo}`}
                tags={m.post.hashtags.slice(0, 2)}
                topLeft={<UnbookmarkButton dark onClick={() => unbookmark(`map:${m.postId}`)} />}
                topRight={`노드 ${m.post.nodes}`}
                onClick={() => setDetail(m)}
              />
            ))}
          </div>
        )}
        {tab === "sessions" && (
          <div className={styles.bmGrid}>
            {sessions.map((s) => (
              <div key={s.id} className={styles.bmSession}>
                <SessionCard session={s} onClick={() => router.push(`/sessions/${s.id}`)} />
                <div className={styles.bmSessionFoot}>
                  <UnbookmarkButton onClick={() => unbookmark(`session:${s.id}`)} />
                </div>
              </div>
            ))}
          </div>
        )}
        {tab === "tags" && (
          <div className={styles.bundleGrid}>
            {bundles.map((g) => (
              <div key={g.name} className={styles.bundleCard}>
                <div className={styles.bundleHead}>
                  <h4 className={styles.bundleTitle}>{g.name}</h4>
                  <UnbookmarkButton onClick={() => unbookmark(`tag:${g.name}`)} />
                </div>
                <div className={styles.feedTags} style={{ marginBottom: 0 }}>
                  {g.tags.map((t) => (
                    <HashChip key={t} label={t} size="sm" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {detail && !fullView && (
        <MindmapDetailModal
          post={detail.post}
          sessions={relatedSessionsFor(detail.post)}
          onClose={closeDetail}
          onOpenProfile={(handle) => router.push(profilePath(handle))}
          actions={
            <Button variant="primary" onClick={() => setFullView(true)}>
              <Icon name="network" size={13} />
              원래 마인드맵에서 보기
            </Button>
          }
        />
      )}
      {detail && fullView && (
        <MindmapFullView
          title={`${detail.post.user.name}님의 전체 마인드맵`}
          highlightIds={detail.savedNodeIds}
          onClose={closeFullView}
        />
      )}
    </div>
  );
}
