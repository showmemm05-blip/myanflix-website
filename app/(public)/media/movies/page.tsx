import { Suspense } from "react";

import { MediaPageTransition } from "@/components/media/MediaPageTransition";
import { BrowseSurface, CatalogSkeleton } from "@/components/browse/BrowseSurface";

/**
 * /media/movies — the dense poster catalog (Movies|Series tabs, grid-first).
 * It renders THE browse surface in media mode rather than a catalog of its
 * own: one filter system, one query path, shared with /search.
 */
export default function MediaMoviesPage() {
  return (
    <MediaPageTransition>
      <Suspense fallback={<CatalogSkeleton />}>
        <BrowseSurface mode="media" />
      </Suspense>
    </MediaPageTransition>
  );
}
