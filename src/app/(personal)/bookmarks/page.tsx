"use client";

import { BookmarksView } from "@/features/community/BookmarksView";
import { toSavedBundle, toSavedMindmap } from "@/features/community/toBookmarks";
import { resaveBundle, resaveMindmap, useBookmarkTab } from "@/features/community/useBookmarkTab";
import type { FetchSearchPage } from "@/features/community/useSearchTab";
import { getBookmarkBundles, getBookmarkMindmaps } from "@/lib/api";
import type { SavedBundle, SavedMindmap } from "@/lib/viewTypes";

const fetchMindmaps: FetchSearchPage<SavedMindmap> = (_, page) =>
  getBookmarkMindmaps(page).then((res) => ({ items: res.mindmaps.map((item) => toSavedMindmap(item)), hasNext: res.hasNext }));

const fetchBundles: FetchSearchPage<SavedBundle> = (_, page) =>
  getBookmarkBundles(page).then((res) => ({ items: res.bundles.map(toSavedBundle), hasNext: res.hasNext }));

export default function BookmarksPage() {
  const mindmaps = useBookmarkTab(fetchMindmaps, resaveMindmap);
  const bundles = useBookmarkTab(fetchBundles, resaveBundle);

  return <BookmarksView mindmaps={mindmaps} bundles={bundles} />;
}
