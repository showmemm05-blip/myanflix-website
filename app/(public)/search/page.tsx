import { Suspense } from "react";

import { BrowseSurface, BrowseSurfaceSkeleton } from "@/components/browse/BrowseSurface";

/**
 * SEARCH — a real destination, not a redirect.
 *
 * The nav promotes Search to a primary item, so it has to be somewhere the user
 * can actually BE: a route that redirects to /movies can never light its own
 * nav entry, and the back button lands on a page that immediately bounces
 * again. This renders the very same browse surface (same components, same
 * query hooks, same filters — no separate search stack) with the field open and
 * the editorial hero out of the way.
 */
export default function SearchPage() {
  return (
    <Suspense fallback={<BrowseSurfaceSkeleton />}>
      <BrowseSurface mode="search" />
    </Suspense>
  );
}
