"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon, Button, InlineState } from "@/components/ui";
import { MindmapPreview } from "@/components/mindmap/MindmapPreview";
import { profilePath } from "./CommunityView";
import type { FeedPost, SearchedProfile } from "./toCommunityData";
import type { SearchTab } from "./useSearchTab";
import styles from "./Community.module.css";

export interface SearchViewProps {
  /** 검색창에 보이는 값 */
  input: string;
  onInputChange: (value: string) => void;
  /** input 을 정리한 검색어 — 비면 검색하지 않는다 */
  q: string;
  mindmaps: SearchTab<FeedPost>;
  profiles: SearchTab<SearchedProfile>;
}

/** 전체 개수는 API 에 없어서 불러온 수만 쓰고, 더 있으면 + 를 붙인다 */
export function tabLabel(label: string, tab: SearchTab<unknown>) {
  return tab.status === "ready" ? `${label} (${tab.items.length}${tab.hasNext ? "+" : ""})` : label;
}

export function SearchView({ input, onInputChange, q, mindmaps, profiles }: SearchViewProps) {
  const [filter, setFilter] = useState<"mindmap" | "profile">("mindmap");
  const tab: SearchTab<unknown> = filter === "mindmap" ? mindmaps : profiles;

  return (
    <div className={styles.page}>
      <div className={styles.searchPageHead}>
        <div className={styles.searchBoxPlain}>
          <span className={styles.searchIcon}><Icon name="search" size={16} /></span>
          <input
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder="해시태그로 프로필·마인드맵 찾기 (예: #파리)"
            aria-label="해시태그 검색"
            className={styles.searchInputPlain}
          />
        </div>
        <div className={styles.filterRow}>
          <Button variant="secondary" active={filter === "mindmap"} onClick={() => setFilter("mindmap")}>
            {tabLabel("마인드맵", mindmaps)}
          </Button>
          <Button variant="secondary" active={filter === "profile"} onClick={() => setFilter("profile")}>
            {tabLabel("사용자", profiles)}
          </Button>
        </div>
        {q && (
          <div className={styles.resultHead}>
            <strong className={styles.resultQuery}>&quot;{q}&quot;</strong> 검색 결과
          </div>
        )}
      </div>

      <div className={styles.searchBody}>
        {tab.status === "idle" ? (
          <InlineState kind="empty" title="검색어를 입력해 주세요" />
        ) : tab.status === "loading" ? (
          <div className={styles.state}>불러오는 중…</div>
        ) : tab.status === "error" ? (
          <InlineState kind="error" title={tab.error ?? "검색 결과를 불러오지 못했어요."} onRetry={tab.retry} />
        ) : tab.items.length === 0 ? (
          <InlineState kind="empty" title="검색 결과가 없어요" description="다른 해시태그로 검색해 보세요." />
        ) : filter === "mindmap" ? (
          <div className={styles.mapGrid}>
            {mindmaps.items.map((post) => (
              <article key={post.id} className={styles.mapCard}>
                <Link href={`/sessions/${post.mindmapId}`} className={styles.mapPreview}>
                  <MindmapPreview seed={post.id} nodes={post.nodes} height={150}>
                    <div className={styles.mapShade} />
                    <div className={styles.mapCaption}>
                      <div className={styles.mapTitle}>{post.title}</div>
                      <div className={styles.mapMeta}>노드 {post.nodes}</div>
                    </div>
                    <span className={styles.mapBadge}>
                      <Icon name="network" size={10} stroke={2} />
                      마인드맵
                    </span>
                  </MindmapPreview>
                </Link>
                <div className={styles.mapFoot}>
                  by <Link href={profilePath(post.ownerId)} className={styles.mapOwner}>{post.user.name}</Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.profileGrid}>
            {profiles.items.map((p) => (
              <Link key={p.userId} href={profilePath(p.userId)} className={styles.profileCard}>
                <div className={styles.profileAvatar}>{p.avatar}</div>
                <div className={styles.profileName}>{p.name}</div>
                <div className={styles.profileMeta}>마인드맵 {p.mapCount}개</div>
                {p.tags.length > 0 && <div className={styles.profileTags}>{p.tags.slice(0, 3).join(" ")}</div>}
              </Link>
            ))}
          </div>
        )}
        {tab.status === "ready" && <MoreResults tab={tab} />}
      </div>
    </div>
  );
}

export function MoreResults({ tab }: { tab: SearchTab<unknown> }) {
  if (tab.moreError) return <InlineState kind="error" title={tab.moreError} onRetry={tab.loadMore} />;
  if (!tab.hasNext) return null;
  return (
    <div className={styles.searchMore}>
      <Button variant="secondary" disabled={tab.loadingMore} onClick={tab.loadMore}>
        {tab.loadingMore ? "불러오는 중…" : "더 보기"}
      </Button>
    </div>
  );
}
