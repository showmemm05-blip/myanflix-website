import { Suspense } from "react";

import { BrowseSurface, BrowseSurfaceSkeleton } from "@/components/browse/BrowseSurface";

/**
 * SEARCH — a real destination, not a redirect (Search + SearchResults boards).
 *
 * Before a search runs it is the Search page: the big field, the scope tabs
 * (Movies · Series · Books · Music SOON), recent and trending searches,
 * genre chips and a few rows. Once a term settles or a filter is on, the
 * same surface turns into the results view: compact field with Back,
 * counted tabs, sort, grid density, Sort & filter, pills and an endless grid.
 * It is the very same browse surface /media/movies uses (same components,
 * same query hooks, same filters — no separate search stack). The top bar is
 * glass from the start: there is no artwork hero here.
 */
export default function SearchPage() {
  return (
    <Suspense fallback={<BrowseSurfaceSkeleton />}>
      <BrowseSurface />
    </Suspense>
  );
}
