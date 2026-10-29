"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, Card, PageHeader, InlineState } from "@/components/ui";
import { MindmapDetailModal } from "@/components/mindmap/MindmapDetailModal";
import type { CommunityData, CommunityPost, CommunityRecommendation } from "@/lib/viewTypes";
import { FeedCard } from "./FeedCard";
import { SearchResultsPanel, type ProfileResult, type SearchResults } from "./SearchResultsPanel";
import styles from "./Community.module.css";

export function profilePath(handle: string): string {
  return `/profile/${encodeURIComponent(handle.replace(/^@/, ""))}`;
}

export interface CommunityViewProps {
  /** 없으면(null) 빈 상태 — 커뮤니티 API 가 생기기 전까지 */
  data: CommunityData | null;
  loading?: boolean;
  /** 불러오기 실패 메시지 */
  error?: string | null;
  onRetry?: () => void;
}

export function CommunityView({ data, loading = false, error, onRetry }: CommunityViewProps) {
  return (
    <div className={styles.page}>
      <PageHeader title="커뮤니티" subtitle="다른 사람의 웹서핑 흐름에서 다음 단서를 찾아요" />
      {loading ? (
        <div className={styles.state}>불러오는 중…</div>
      ) : error ? (
        <div className={styles.searchBody}>
          <InlineState kind="error" title={error} onRetry={onRetry} />
        </div>
      ) : !data ? (
        <div className={styles.searchBody}>
          <InlineState
            kind="empty"
            title="아직 볼 수 있는 커뮤니티 소식이 없어요"
            description="다른 사람들이 마인드맵을 공유하면 여기에서 추천해 드릴게요."
          />
        </div>
      ) : (
        <CommunityBody data={data} />
      )}
    </div>
  );
}

const toggled = (set: ReadonlySet<string>, id: string) => {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
};

function CommunityBody({ data }: { data: CommunityData }) {
  const router = useRouter();
  const openProfile = (handle: string) => router.push(profilePath(handle));

  const [trendRange, setTrendRange] = useState<"today" | "week">("today");
  const trending = data.trending[trendRange];
  // 좋아요 · 북마크 · 팔로우 (API 연결 전: 로컬 상태). 처음 상태는 받은 데이터 기준
  const [liked, setLiked] = useState<ReadonlySet<string>>(() => new Set(data.likedPostIds));
  const [bookmarked, setBookmarked] = useState<ReadonlySet<string>>(() => new Set(data.bookmarkedPostIds));
  const [following, setFollowing] = useState<ReadonlySet<string>>(
    () => new Set(data.similarPeople.filter((u) => u.following).map((u) => u.name)),
  );
  const initialLiked = useMemo(() => new Set(data.likedPostIds), [data.likedPostIds]);
  const initialBookmarked = useMemo(() => new Set(data.bookmarkedPostIds), [data.bookmarkedPostIds]);
  // 받은 수에는 내 반응이 이미 들어 있으므로 처음 상태와 달라진 만큼만 더하고 뺀다
  const countOf = (base: number, initial: ReadonlySet<string>, now: ReadonlySet<string>, id: string) =>
    base + (now.has(id) ? 1 : 0) - (initial.has(id) ? 1 : 0);

  const [detail, setDetail] = useState<CommunityPost | null>(null);
  const closeDetail = useCallback(() => setDetail(null), []);

  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const { posts: searchPosts, tags: searchTags } = data.searchIndex;
  const searchResults = useMemo<SearchResults>(() => {
    const q = query.trim().replace(/^#+/, "").toLowerCase();
    if (!q) return { profiles: [], maps: [], tags: [] };
    const tags = searchTags.filter((t) => t.tag.toLowerCase().includes(q)).slice(0, 5);
    const profilesMap = new Map<string, ProfileResult>();
    searchPosts.forEach((post) => {
      const matchTag = post.hashtags.some((h) => h.toLowerCase().includes(q));
      const matchName = post.user.name.toLowerCase().includes(q) || post.user.handle.toLowerCase().includes(q);
      if (matchTag || matchName) {
        const cur = profilesMap.get(post.user.handle);
        if (!cur) profilesMap.set(post.user.handle, { ...post.user, tags: post.hashtags, mapCount: 1 });
        else cur.mapCount += 1;
      }
    });
    const profiles = Array.from(profilesMap.values()).slice(0, 4);
    const maps = searchPosts
      .filter((post) => post.hashtags.some((h) => h.toLowerCase().includes(q)) || post.title.toLowerCase().includes(q))
      .slice(0, 4);
    return { profiles, maps, tags };
  }, [query, searchPosts, searchTags]);

  const hasResults = query.trim().length > 0;

  const section = (label: string, rec: CommunityRecommendation) => (
    <section aria-label={label}>
      <div className={styles.secHead}>
        <h3 className={styles.secTitle}>{label}</h3>
        <div className={styles.secChips}>
          {rec.basisTags.map((c) => (
            <span key={c} className={styles.secChip}>{c}</span>
          ))}
        </div>
      </div>
      {rec.posts.length === 0 ? (
        <InlineState kind="empty" title="추천할 마인드맵이 아직 없어요" />
      ) : (
        <div className={styles.feedList}>
          {rec.posts.map((post) => (
            <FeedCard
              key={post.id}
              post={post}
              liked={liked.has(post.id)}
              bookmarked={bookmarked.has(post.id)}
              likes={countOf(post.likes, initialLiked, liked, post.id)}
              bookmarks={countOf(post.bookmarks, initialBookmarked, bookmarked, post.id)}
              onToggleLike={() => setLiked((cur) => toggled(cur, post.id))}
              onToggleBookmark={() => setBookmarked((cur) => toggled(cur, post.id))}
              onOpen={() => setDetail(post)}
              relatedUrls={data.relatedUrls[post.id]}
            />
          ))}
        </div>
      )}
    </section>
  );

  return (
    <>
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
            <SearchResultsPanel results={searchResults} onOpenProfile={openProfile} onPickTag={(t) => setQuery(t.replace(/^#/, ""))} />
          )}
        </div>

        <div>
          <Card style={{ padding: 20, marginBottom: 16 }}>
            <div className={styles.trendHead}>
              <h3 className={styles.secTitleInk}>{trendRange === "today" ? "오늘의" : "이번 주"} 떠오르는 해시태그</h3>
              <div className={styles.miniTabs}>
                <button className={`${styles.miniTab} ${trendRange === "today" ? styles.miniTabOn : ""}`} onClick={() => setTrendRange("today")}>오늘</button>
                <button className={`${styles.miniTab} ${trendRange === "week" ? styles.miniTabOn : ""}`} onClick={() => setTrendRange("week")}>이번 주</button>
              </div>
            </div>
            {trending.length === 0 ? (
              <div className={styles.dropdownEmpty}>아직 떠오르는 해시태그가 없어요.</div>
            ) : (
              <div className={styles.trendTags}>
                {trending.map((t) => (
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
                    <span className={styles.trendDelta} style={{ color: t.trend > 0 ? "var(--green-600)" : "var(--ink-400)" }}>
                      {t.trend > 0 ? "↑" : "↓"}{Math.abs(t.trend)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </Card>

          {section("관심 해시태그 기반 추천", data.interestBased)}
          <div style={{ marginTop: 24 }}>{section("최근 저장한 해시태그 기반 추천", data.recentBookmarkBased)}</div>
        </div>

        <div className={styles.rightCol}>
          <Card style={{ padding: 16 }}>
            <h3 className={styles.sideTitle} style={{ marginBottom: 10 }}>관심사가 비슷한 사람</h3>
            {data.similarPeople.length === 0 && <div className={styles.personTags}>아직 비슷한 사람을 찾지 못했어요.</div>}
            {data.similarPeople.map((u) => (
              <div key={u.name} className={styles.personRow}>
                <div className={styles.personAvatar}>🌱</div>
                <div className={styles.personMain}>
                  <div className={styles.personName}>{u.name}</div>
                  <div className={styles.personTags}>{u.tags}</div>
                </div>
                <button
                  onClick={() => setFollowing((cur) => toggled(cur, u.name))}
                  className={`${styles.followBtn} ${following.has(u.name) ? styles.followBtnOn : ""}`}
                  aria-pressed={following.has(u.name)}
                >
                  {following.has(u.name) ? "팔로잉" : "팔로우"}
                </button>
              </div>
            ))}
          </Card>
        </div>
      </div>

      {detail && (
        <MindmapDetailModal
          post={detail}
          sessions={data.relatedSessions[detail.id] ?? []}
          onClose={closeDetail}
          onOpenProfile={openProfile}
        />
      )}
    </>
  );
}
