"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, Button, HashChip, Icon } from "@/components/ui";
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
import { profilePath } from "./CommunityView";
import styles from "./Community.module.css";

type SavedMap = BookmarkedMindmap & { post: CommunityPost };

const SAVED_MAPS: SavedMap[] = BOOKMARKED_MINDMAPS.flatMap((b) => {
  const post = COMMUNITY_FEED.find((p) => p.id === b.postId);
  return post ? [{ ...b, post }] : [];
});

export function BookmarksView() {
  const router = useRouter();
  const [tab, setTab] = useState<"mindmap" | "sessions" | "tags">("mindmap");
  const maps = SAVED_MAPS;

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
        <Button variant="secondary" active={tab === "sessions"} onClick={() => setTab("sessions")}>세션 ({MOCK_SESSIONS.length})</Button>
        <Button variant="secondary" active={tab === "tags"} onClick={() => setTab("tags")}>해시태그 묶음 ({BOOKMARK_TAG_BUNDLES.length})</Button>
      </div>
      <div className={styles.searchBody}>
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
                topRight={`노드 ${m.post.nodes}`}
                onClick={() => setDetail(m)}
              />
            ))}
          </div>
        )}
        {tab === "sessions" && (
          <div className={styles.bmGrid}>
            {MOCK_SESSIONS.map((s) => (
              <SessionCard key={s.id} session={s} onClick={() => router.push(`/sessions/${s.id}`)} />
            ))}
          </div>
        )}
        {tab === "tags" && (
          <div className={styles.bundleGrid}>
            {BOOKMARK_TAG_BUNDLES.map((g) => (
              <div key={g.name} className={styles.bundleCard}>
                <h4 className={styles.bundleTitle}>{g.name}</h4>
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
