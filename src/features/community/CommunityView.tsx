"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Icon, PageHeader, InlineState } from "@/components/ui";
import { MindmapDetailModal } from "@/components/mindmap/MindmapDetailModal";
import { getCardSessions } from "@/lib/api";
import { usePersonal } from "@/lib/app/PersonalContext";
import { useApi, type UseApiResult } from "@/lib/hooks/useApi";
import type { TrendingHashtag } from "@/lib/viewTypes";
import { FeedCard } from "./FeedCard";
import { SearchResultsPanel } from "./SearchResultsPanel";
import { DEFAULT_AVATAR, toDetailSession, type FeedPost, type FeedRecommendation, type SimilarPersonRow } from "./toCommunityData";
import { useCardReactions } from "./useCardReactions";
import { useCommunitySearch } from "./useCommunitySearch";
import { useFollow } from "./useFollow";
import styles from "./Community.module.css";

/** 프로필 주소는 회원 id. 검색 · 북마크 화면은 API 연결 전이라 아직 handle 문자열을 넘긴다 */
export function profilePath(id: number | string): string {
  return `/profile/${encodeURIComponent(String(id).replace(/^@/, ""))}`;
}

/** 섹션마다 따로 불러온다 — 한 곳이 실패해도 나머지는 그대로 보인다 */
export interface CommunitySections {
  interests: UseApiResult<FeedRecommendation>;
  recentBookmarks: UseApiResult<FeedRecommendation>;
  trendingToday: UseApiResult<TrendingHashtag[]>;
  trendingWeek: UseApiResult<TrendingHashtag[]>;
  similarPeople: UseApiResult<SimilarPersonRow[]>;
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
  const [detail, setDetail] = useState<FeedPost | null>(null);
  const closeDetail = useCallback(() => setDetail(null), []);

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
  const noItems = <T,>(list: T[]) => list.length === 0;
  const allEmpty =
    settledEmpty(sections.interests, noPosts) &&
    settledEmpty(sections.recentBookmarks, noPosts) &&
    settledEmpty(sections.trendingToday, noItems) &&
    settledEmpty(sections.trendingWeek, noItems) &&
    settledEmpty(sections.similarPeople, noItems);

  const [trendRange, setTrendRange] = useState<"today" | "week">("today");
  const trending = trendRange === "today" ? sections.trendingToday : sections.trendingWeek;
  const { withFollow, toggleFollow } = useFollow();

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
                onOpen={() => setDetail(base)}
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
              <Card style={{ padding: 20, marginBottom: 16 }}>
                <div className={styles.trendHead}>
                  <h3 className={styles.secTitleInk}>{trendRange === "today" ? "오늘의" : "이번 주"} 떠오르는 해시태그</h3>
                  <div className={styles.miniTabs}>
                    <button className={`${styles.miniTab} ${trendRange === "today" ? styles.miniTabOn : ""}`} onClick={() => setTrendRange("today")}>오늘</button>
                    <button className={`${styles.miniTab} ${trendRange === "week" ? styles.miniTabOn : ""}`} onClick={() => setTrendRange("week")}>이번 주</button>
                  </div>
                </div>
                {trending.error ? (
                  <InlineState kind="error" title={trending.error} onRetry={trending.refetch} />
                ) : !trending.data && trending.loading ? (
                  <div className={styles.sectionState}>불러오는 중…</div>
                ) : !trending.data || trending.data.length === 0 ? (
                  <div className={styles.dropdownEmpty}>아직 떠오르는 해시태그가 없어요.</div>
                ) : (
                  <div className={styles.trendTags}>
                    {trending.data.map((t) => (
                      <button
                        key={t.tag}
                        onClick={() => {
                          setQuery(t.tag.replace(/^#/, ""));
                          setSearchOpen(true);
                        }}
                        className={styles.trendTag}
                      >
                        <span>{t.tag}</span>
                        <span className={styles.trendCount}>{t.count}</span>
                        {t.trend !== 0 && (
                          <span className={styles.trendDelta} style={{ color: t.trend > 0 ? "var(--green-600)" : "var(--ink-400)" }}>
                            {t.trend > 0 ? "↑" : "↓"}{Math.abs(t.trend)}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </Card>

              {section("관심 해시태그 기반 추천", sections.interests)}
              <div style={{ marginTop: 24 }}>{section("최근 저장한 해시태그 기반 추천", sections.recentBookmarks)}</div>
            </div>
            <div className={styles.rightCol}>
              <Card style={{ padding: 16 }}>
                <h3 className={styles.sideTitle} style={{ marginBottom: 10 }}>관심사가 비슷한 사람</h3>
                {sections.similarPeople.error ? (
                  <InlineState kind="error" title={sections.similarPeople.error} onRetry={sections.similarPeople.refetch} />
                ) : !sections.similarPeople.data && sections.similarPeople.loading ? (
                  <div className={styles.sectionState}>불러오는 중…</div>
                ) : !sections.similarPeople.data || sections.similarPeople.data.length === 0 ? (
                  <div className={styles.personTags}>아직 비슷한 사람을 찾지 못했어요.</div>
                ) : (
                  sections.similarPeople.data.map((row) => {
                    const person = withFollow(row);
                    return (
                      <div key={person.userId} className={styles.personRow}>
                        <div className={styles.personAvatar}>{DEFAULT_AVATAR}</div>
                        <div className={styles.personMain}>
                          <div className={styles.personName}>{person.name}</div>
                          <div className={styles.personTags}>{person.tags}</div>
                        </div>
                        <button
                          onClick={() => toggleFollow(person)}
                          className={`${styles.followBtn} ${person.following ? styles.followBtnOn : ""}`}
                          aria-pressed={person.following}
                        >
                          {person.following ? "팔로잉" : "팔로우"}
                        </button>
                      </div>
                    );
                  })
                )}
              </Card>
            </div>
          </>
        )}
      </div>

      {detail && <CardDetail post={withReaction(detail)} onClose={closeDetail} onOpenProfile={openProfile} />}
    </div>
  );
}

/** 카드 상세 팝업 — 열 때 관련 세션을 불러온다 */
function CardDetail({ post, onClose, onOpenProfile }: { post: FeedPost; onClose: () => void; onOpenProfile: (userId: number) => void }) {
  const router = useRouter();
  const sessions = useApi(() => getCardSessions(post.mindmapId).then((r) => r.sessions.map(toDetailSession)), [post.mindmapId]);

  return (
    <MindmapDetailModal
      post={post}
      sessions={sessions.data ?? []}
      sessionsStatus={
        sessions.error ? (
          <InlineState kind="error" title={sessions.error} onRetry={sessions.refetch} />
        ) : sessions.loading ? (
          <div className={styles.sectionState}>불러오는 중…</div>
        ) : undefined
      }
      onClose={onClose}
      onOpenProfile={() => onOpenProfile(post.ownerId)}
      onSessionClick={(id) => router.push(`/sessions/${id}`)}
    />
  );
}
