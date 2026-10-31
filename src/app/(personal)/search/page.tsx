"use client";

import { Suspense } from "react";
import { SearchView } from "@/features/community/SearchView";
import { toFeedPost, toSearchedProfile, type FeedPost, type SearchedProfile } from "@/features/community/toCommunityData";
import { useSearchQuery } from "@/features/community/useSearchQuery";
import { useSearchTab, type FetchSearchPage } from "@/features/community/useSearchTab";
import { SEARCH_PAGE_SIZE, searchCommunityMindmaps, searchCommunityProfiles } from "@/lib/api";

const fetchMindmaps: FetchSearchPage<FeedPost> = (q, page) =>
  searchCommunityMindmaps(q, page, SEARCH_PAGE_SIZE).then((res) => ({ items: res.mindmaps.map(toFeedPost), hasNext: res.hasNext }));

const fetchProfiles: FetchSearchPage<SearchedProfile> = (q, page) =>
  searchCommunityProfiles(q, page, SEARCH_PAGE_SIZE).then((res) => ({ items: res.profiles.map(toSearchedProfile), hasNext: res.hasNext }));

const mindmapIdOf = (post: FeedPost) => post.mindmapId;
const userIdOf = (profile: SearchedProfile) => profile.userId;

function SearchResults() {
  const { input, setInput, q, requestQ } = useSearchQuery();
  const mindmaps = useSearchTab(q, requestQ, fetchMindmaps, mindmapIdOf);
  const profiles = useSearchTab(q, requestQ, fetchProfiles, userIdOf);

  return <SearchView input={input} onInputChange={setInput} q={q} mindmaps={mindmaps} profiles={profiles} />;
}

// Next 규칙 — useSearchParams 를 쓰는 화면은 Suspense 안에 둔다 (지금은 레이아웃이 회원을 받은 뒤 그려서 빌드 때 실행되지 않는다)
export default function SearchPage() {
  return (
    <Suspense>
      <SearchResults />
    </Suspense>
  );
}
