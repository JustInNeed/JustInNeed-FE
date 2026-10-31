"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, PageHeader, InlineState } from "@/components/ui";
import { usePersonal } from "@/lib/app/PersonalContext";
import type { UseApiResult } from "@/lib/hooks/useApi";
import { FeedCard } from "./FeedCard";
import { SearchResultsPanel } from "./SearchResultsPanel";
import type { FeedPost, FeedRecommendation } from "./toCommunityData";
import { useCardReactions } from "./useCardReactions";
import { useCommunitySearch } from "./useCommunitySearch";
import styles from "./Community.module.css";

/** 프로필 주소는 회원 id. 검색 · 북마크 화면은 API 연결 전이라 아직 handle 문자열을 넘긴다 */
export function profilePath(id: number | string): string {
  return `/profile/${encodeURIComponent(String(id).replace(/^@/, ""))}`;
}

/** 섹션마다 따로 불러온다 — 한 곳이 실패해도 나머지는 그대로 보인다 */
export interface CommunitySections {
  interests: UseApiResult<FeedRecommendation>;
  recentBookmarks: UseApiResult<FeedRecommendation>;
}

export interface CommunityViewProps {
  sections: CommunitySections;
}

const settledEmpty = <T,>({ data, loading, error }: UseApiResult<T>, isEmpty: (data: T) => boolean) =>
  !loading && !error && (data === null || isEmpty(data));

export function CommunityView({ sections }: CommunityViewProps) {
  const { member } = usePersonal();
  const router = useRouter();
  const { withReaction, toggleLike, toggleBookmark, toggleExploring } = useCardReactions();

  const openProfile = (userId: number) => router.push(profilePath(userId));
  const openDetail = (_post: FeedPost) => {};

  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const search = useCommunitySearch(query);
  const hasResults = search.q.length > 0;

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const noPosts = (rec: FeedRecommendation) => rec.posts.length === 0;
  const allEmpty = settledEmpty(sections.interests, noPosts) && settledEmpty(sections.recentBookmarks, noPosts);

  const section = (label: string, state: UseApiResult<FeedRecommendation>) => (
    <section aria-label={label}>
      <div className={styles.secHead}>
        <h3 className={styles.secTitle}>{label}</h3>
        <div className={styles.secChips}>
          {state.data?.basisTags.map((c) => (
            <span key={c} className={styles.secChip}>{c}</span>
          ))}
        </div>
      </div>
      {state.error ? (
        <InlineState kind="error" title={state.error} onRetry={state.refetch} />
      ) : !state.data && state.loading ? (
        <div className={styles.sectionState}>불러오는 중…</div>
      ) : !state.data || state.data.posts.length === 0 ? (
        <InlineState kind="empty" title="추천할 마인드맵이 아직 없어요" />
      ) : (
        <div className={styles.feedList}>
          {state.data.posts.map((base) => {
            const post = withReaction(base);
            return (
              <FeedCard
                key={post.id}
                post={post}
                canLike={post.ownerId !== member.id}
                onToggleLike={() => toggleLike(post)}
                onToggleBookmark={() => toggleBookmark(post)}
                onToggleExploring={() => toggleExploring(post)}
                onOpen={() => openDetail(post)}
              />
            );
          })}
        </div>
      )}
    </section>
  );

  return (
    <div className={styles.page}>
      <PageHeader title="커뮤니티" subtitle="다른 사람의 웹서핑 흐름에서 다음 단서를 찾아요" />
      <div className={styles.body}>
        <div ref={searchRef} className={styles.searchWrap}>
          <div className={`${styles.searchBox} ${searchOpen && hasResults ? styles.searchBoxOn : ""}`}>
            <span className={styles.searchIcon}><Icon name="search" size={16} /></span>
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              placeholder="해시태그로 프로필·마인드맵 찾기 (예: #파리)"
              aria-label="해시태그 검색"
              className={styles.searchInput}
            />
            {query && (
              <button
                onClick={() => {
                  setQuery("");
                  setSearchOpen(false);
                }}
                className={styles.searchClear}
                aria-label="검색어 지우기"
              >
                <Icon name="x" size={12} />
              </button>
            )}
          </div>
          {searchOpen && hasResults && (
            <SearchResultsPanel
              results={search.results}
              onRetry={search.retry}
              onOpenProfile={openProfile}
              onPickTag={(t) => setQuery(t.replace(/^#/, ""))}
            />
          )}
        </div>

        {allEmpty ? (
          <div className={styles.pageEmpty}>
            <InlineState
              kind="empty"
              title="아직 볼 수 있는 커뮤니티 소식이 없어요"
              description="다른 사람들이 마인드맵을 공유하면 여기에서 추천해 드릴게요."
            />
          </div>
        ) : (
          <>
            <div>
              {section("관심 해시태그 기반 추천", sections.interests)}
              <div style={{ marginTop: 24 }}>{section("최근 저장한 해시태그 기반 추천", sections.recentBookmarks)}</div>
            </div>
            <div className={styles.rightCol} />
          </>
        )}
      </div>
    </div>
  );
}
