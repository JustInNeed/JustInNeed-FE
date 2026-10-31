"use client";

import { useState } from "react";
import { SearchView } from "@/features/community/SearchView";
import { toFeedPost, toSearchedProfile, type FeedPost, type SearchedProfile } from "@/features/community/toCommunityData";
import { normalizeSearchQuery, SEARCH_DEBOUNCE_MS } from "@/features/community/useCommunitySearch";
import { useSearchTab, type FetchSearchPage } from "@/features/community/useSearchTab";
import { SEARCH_PAGE_SIZE, searchCommunityMindmaps, searchCommunityProfiles } from "@/lib/api";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";

const fetchMindmaps: FetchSearchPage<FeedPost> = (q, page) =>
  searchCommunityMindmaps(q, page, SEARCH_PAGE_SIZE).then((res) => ({ items: res.mindmaps.map(toFeedPost), hasNext: res.hasNext }));

const fetchProfiles: FetchSearchPage<SearchedProfile> = (q, page) =>
  searchCommunityProfiles(q, page, SEARCH_PAGE_SIZE).then((res) => ({ items: res.profiles.map(toSearchedProfile), hasNext: res.hasNext }));

export default function SearchPage() {
  const [input, setInput] = useState("");
  const q = normalizeSearchQuery(input);
  const requestQ = useDebouncedValue(q, SEARCH_DEBOUNCE_MS);
  const mindmaps = useSearchTab(q, requestQ, fetchMindmaps);
  const profiles = useSearchTab(q, requestQ, fetchProfiles);

  return <SearchView input={input} onInputChange={setInput} q={q} mindmaps={mindmaps} profiles={profiles} />;
}
