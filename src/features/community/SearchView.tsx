"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, Button } from "@/components/ui";
import { MindmapPreview } from "@/components/mindmap/MindmapPreview";
import { COMMUNITY_FEED, MOCK_SESSIONS } from "@/lib/mock/designData";
import type { SessionListItem } from "@/lib/api";
import { formatDuration } from "@/lib/format";
import { profilePath } from "./CommunityView";
import styles from "./Community.module.css";

export function SearchView() {
  const router = useRouter();
  const openProfile = (handle: string) => router.push(profilePath(handle));
  const [q, setQ] = useState("파리");
  const [filter, setFilter] = useState<"mindmap" | "profile">("mindmap");

  // 마인드맵별 관련 세션 (해시태그 교집합, 없으면 시드 기반 폴백)
  const sessionsFor = useMemo(() => {
    const map: Record<string, SessionListItem[]> = {};
    COMMUNITY_FEED.forEach((post, idx) => {
      const tagSet = new Set(post.hashtags.map((h) => h.replace(/^#/, "").toLowerCase()));
      const matched = MOCK_SESSIONS.filter((s) => s.tags.some((t) => tagSet.has(t.toLowerCase())));
      const start = idx % MOCK_SESSIONS.length;
      const fallback = MOCK_SESSIONS.slice(start, start + 2);
      map[post.id] = (matched.length ? matched : fallback).slice(0, 3);
    });
    return map;
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.searchPageHead}>
        <div className={styles.searchBoxPlain}>
          <span className={styles.searchIcon}><Icon name="search" size={16} /></span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="해시태그를 검색해보세요 (예: #파리)"
            className={styles.searchInputPlain}
          />
        </div>
        <div className={styles.filterRow}>
          <Button variant="secondary" active={filter === "mindmap"} onClick={() => setFilter("mindmap")}>
            마인드맵 ({COMMUNITY_FEED.length})
          </Button>
          <Button variant="secondary" active={filter === "profile"} onClick={() => setFilter("profile")}>
            사용자 (12)
          </Button>
        </div>
        <div className={styles.resultCount}>
          <strong className={styles.resultQuery}>&quot;{q}&quot;</strong> 관련 결과 {filter === "mindmap" ? COMMUNITY_FEED.length : 12}개
        </div>
      </div>

      <div className={styles.searchBody}>
        {filter === "mindmap" && (
          <div className={styles.mapGrid}>
            {COMMUNITY_FEED.map((post) => {
              const sessions = sessionsFor[post.id] ?? [];
              return (
                <div key={post.id} className={styles.mapCard}>
                  <div onClick={() => openProfile(post.user.handle)} className={styles.mapPreview} role="button">
                    <MindmapPreview seed={post.id} nodes={post.nodes} height={150}>
                      <div className={styles.mapShade} />
                      <div className={styles.mapCaption}>
                        <div className={styles.mapTitle}>{post.title}</div>
                        <div className={styles.mapMeta}>by {post.user.name} · 노드 {post.nodes}</div>
                      </div>
                      <span className={styles.mapBadge}>
                        <Icon name="network" size={10} stroke={2} />
                        마인드맵
                      </span>
                    </MindmapPreview>
                  </div>
                  <div className={styles.relList}>
                    <div className={styles.relHead}><span>관련 세션 · {sessions.length}</span></div>
                    {sessions.map((s) => (
                      <button key={s.id} onClick={() => openProfile(post.user.handle)} className={styles.relRow}>
                        <span className={styles.relIcon}><Icon name="search" size={11} stroke={2} /></span>
                        <span className={styles.relMain}>
                          <span className={styles.relTitle}>{s.title}</span>
                          <span className={styles.relMeta}>{formatDuration(s.startedAt, s.endedAt)} · 출처 {s.pageCount}개</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {filter === "profile" && (
          <div className={styles.profileGrid}>
            {COMMUNITY_FEED.map((p) => (
              <div key={p.id} onClick={() => openProfile(p.user.handle)} className={styles.profileCard} role="button">
                <div className={styles.profileAvatar}>{p.user.avatar}</div>
                <div className={styles.profileName}>{p.user.name}</div>
                <div className={styles.profileHandle}>{p.user.handle}</div>
                <div className={styles.profileStats}>노드 {p.nodes} · 좋아요 {p.likes}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
