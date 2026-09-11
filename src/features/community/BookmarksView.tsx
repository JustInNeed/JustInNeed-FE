"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, Button, HashChip } from "@/components/ui";
import { MindmapCard } from "@/components/mindmap/MindmapCard";
import { SessionCard } from "@/features/sessions";
import { BOOKMARK_TAG_BUNDLES, COMMUNITY_FEED, MOCK_SESSIONS } from "@/lib/mock/designData";
import { profilePath } from "./CommunityView";
import styles from "./Community.module.css";

export function BookmarksView() {
  const router = useRouter();
  const [tab, setTab] = useState<"mindmap" | "sessions" | "tags">("mindmap");
  const maps = COMMUNITY_FEED.slice(0, 4).concat(COMMUNITY_FEED.slice(0, 4));

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
            {maps.map((p, i) => (
              <MindmapCard
                key={`${p.id}-${i}`}
                seed={`${p.id}-${i}`}
                nodes={p.nodes}
                height={210}
                title={p.title}
                meta={`by ${p.user.name} · 저장 ${((i * 7 + 3) % 5) + 1}일 전`}
                tags={p.hashtags.slice(0, 2)}
                topRight={`노드 ${p.nodes}`}
                onClick={() => router.push(profilePath(p.user.handle))}
              />
            ))}
          </div>
        )}
        {tab === "sessions" && (
          <div className={styles.bmGrid}>
            {MOCK_SESSIONS.map((s) => (
              <SessionCard key={s.id} session={s} />
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
    </div>
  );
}
