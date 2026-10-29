"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, Card, PageHeader } from "@/components/ui";
import { COMMUNITY_FEED, SIMILAR_PEOPLE, TRENDING_HASHTAGS, type CommunityPost } from "@/lib/mock/designData";
import { FeedCard } from "./FeedCard";
import { SearchResultsPanel, type ProfileResult, type SearchResults } from "./SearchResultsPanel";
import styles from "./Community.module.css";

export function profilePath(handle: string): string {
  return `/profile/${encodeURIComponent(handle.replace(/^@/, ""))}`;
}

export function CommunityView() {
  const router = useRouter();
  const openProfile = (handle: string) => router.push(profilePath(handle));

  const [tab, setTab] = useState<"feed" | "week">("feed");
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set(["c2"]));
  const [following, setFollowing] = useState<Set<string>>(new Set());

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

  const searchResults = useMemo<SearchResults>(() => {
    const q = query.trim().replace(/^#+/, "").toLowerCase();
    if (!q) return { profiles: [], maps: [], tags: [] };
    const tags = TRENDING_HASHTAGS.filter((t) => t.tag.toLowerCase().includes(q)).slice(0, 5);
    const profilesMap = new Map<string, ProfileResult>();
    COMMUNITY_FEED.forEach((post) => {
      const matchTag = post.hashtags.some((h) => h.toLowerCase().includes(q));
      const matchName = post.user.name.toLowerCase().includes(q) || post.user.handle.toLowerCase().includes(q);
      if (matchTag || matchName) {
        const cur = profilesMap.get(post.user.handle);
        if (!cur) profilesMap.set(post.user.handle, { ...post.user, tags: post.hashtags, mapCount: 1 });
        else cur.mapCount += 1;
      }
    });
    const profiles = Array.from(profilesMap.values()).slice(0, 4);
    const maps = COMMUNITY_FEED.filter(
      (post) => post.hashtags.some((h) => h.toLowerCase().includes(q)) || post.title.toLowerCase().includes(q),
    ).slice(0, 4);
    return { profiles, maps, tags };
  }, [query]);

  const hasResults = query.trim().length > 0;

  const toggleSet = (set: Set<string>, setter: (s: Set<string>) => void, id: string) => {
    const ns = new Set(set);
    if (ns.has(id)) ns.delete(id);
    else ns.add(id);
    setter(ns);
  };

  const section = (label: string, chips: string[], posts: CommunityPost[]) => (
    <div>
      <div className={styles.secHead}>
        <h3 className={styles.secTitle}>{label}</h3>
        <div className={styles.secChips}>
          {chips.map((c) => (
            <span key={c} className={styles.secChip}>{c}</span>
          ))}
        </div>
      </div>
      <div className={styles.feedList}>
        {posts.map((post) => (
          <FeedCard
            key={post.id}
            post={post}
            liked={liked.has(post.id)}
            bookmarked={bookmarked.has(post.id)}
            onToggleLike={() => toggleSet(liked, setLiked, post.id)}
            onToggleBookmark={() => toggleSet(bookmarked, setBookmarked, post.id)}
            onOpenProfile={openProfile}
          />
        ))}
      </div>
    </div>
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
              <h3 className={styles.secTitleInk}>오늘의 떠오르는 해시태그</h3>
              <div className={styles.miniTabs}>
                <button className={`${styles.miniTab} ${tab === "feed" ? styles.miniTabOn : ""}`} onClick={() => setTab("feed")}>오늘</button>
                <button className={`${styles.miniTab} ${tab === "week" ? styles.miniTabOn : ""}`} onClick={() => setTab("week")}>이번 주</button>
              </div>
            </div>
            <div className={styles.trendTags}>
              {TRENDING_HASHTAGS.map((t) => (
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
          </Card>

          {section("관심 해시태그 기반 추천", ["#파리", "#로마", "#유레일"], COMMUNITY_FEED.slice(0, 3))}
          <div style={{ marginTop: 24 }}>
            {section("최근 저장한 해시태그 기반 추천", ["#야간열차", "#소도시", "#호스텔"], COMMUNITY_FEED.slice(3, 6))}
          </div>
        </div>

        <div className={styles.rightCol}>
          <Card style={{ padding: 16 }}>
            <h3 className={styles.sideTitle} style={{ marginBottom: 10 }}>관심사가 비슷한 사람</h3>
            {SIMILAR_PEOPLE.map((u) => (
              <div key={u.name} className={styles.personRow}>
                <div className={styles.personAvatar}>🌱</div>
                <div className={styles.personMain}>
                  <div className={styles.personName}>{u.name}</div>
                  <div className={styles.personTags}>{u.tags}</div>
                </div>
                <button
                  onClick={() => toggleSet(following, setFollowing, u.name)}
                  className={`${styles.followBtn} ${following.has(u.name) ? styles.followBtnOn : ""}`}
                >
                  {following.has(u.name) ? "팔로잉" : "팔로우"}
                </button>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
