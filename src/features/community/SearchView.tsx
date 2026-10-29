"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, Button, InlineState } from "@/components/ui";
import { MindmapPreview } from "@/components/mindmap/MindmapPreview";
import type { SearchData } from "@/lib/viewTypes";
import { formatDuration } from "@/lib/format";
import { profilePath } from "./CommunityView";
import styles from "./Community.module.css";

export interface SearchViewProps {
  /** 없으면(null) 빈 상태 — 검색 API 가 생기기 전까지 (화면 보류) */
  data: SearchData | null;
  /** 처음 검색창에 들어가 있을 검색어 */
  initialQuery?: string;
  loading?: boolean;
  /** 불러오기 실패 메시지 */
  error?: string | null;
  onRetry?: () => void;
}

export function SearchView({ data, initialQuery = "", loading = false, error, onRetry }: SearchViewProps) {
  const router = useRouter();
  const openProfile = (handle: string) => router.push(profilePath(handle));
  const [q, setQ] = useState(initialQuery);
  const [filter, setFilter] = useState<"mindmap" | "profile">("mindmap");
  const mindmaps = data?.mindmaps ?? [];
  const profiles = data?.profiles ?? [];
  const count = filter === "mindmap" ? mindmaps.length : profiles.length;

  return (
    <div className={styles.page}>
      <div className={styles.searchPageHead}>
        <div className={styles.searchBoxPlain}>
          <span className={styles.searchIcon}><Icon name="search" size={16} /></span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="해시태그를 검색해보세요 (예: #파리)"
            aria-label="해시태그 검색"
            className={styles.searchInputPlain}
          />
        </div>
        <div className={styles.filterRow}>
          <Button variant="secondary" active={filter === "mindmap"} onClick={() => setFilter("mindmap")}>
            마인드맵 ({mindmaps.length})
          </Button>
          <Button variant="secondary" active={filter === "profile"} onClick={() => setFilter("profile")}>
            사용자 ({profiles.length})
          </Button>
        </div>
        <div className={styles.resultCount}>
          <strong className={styles.resultQuery}>&quot;{q}&quot;</strong> 관련 결과 {count}개
        </div>
      </div>

      <div className={styles.searchBody}>
        {loading ? (
          <div className={styles.state}>불러오는 중…</div>
        ) : error ? (
          <InlineState kind="error" title={error} onRetry={onRetry} />
        ) : count === 0 ? (
          <InlineState kind="empty" title="검색 결과가 없어요" description="다른 해시태그로 검색해 보세요." />
        ) : filter === "mindmap" ? (
          <div className={styles.mapGrid}>
            {mindmaps.map((post) => {
              const sessions = data?.relatedSessions[post.id] ?? [];
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
        ) : (
          <div className={styles.profileGrid}>
            {profiles.map((p) => (
              <div key={p.handle} onClick={() => openProfile(p.handle)} className={styles.profileCard} role="button">
                <div className={styles.profileAvatar}>{p.avatar}</div>
                <div className={styles.profileName}>{p.name}</div>
                <div className={styles.profileHandle}>{p.handle}</div>
                <div className={styles.profileStats}>노드 {p.nodes} · 좋아요 {p.likes}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
