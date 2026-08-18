import { Suspense } from "react";

import { BrowseSurface, BrowseSurfaceSkeleton } from "@/components/browse/BrowseSurface";

/** The catalog: editorial hero, rails, grid, search and filters. */
export default function MoviesPage() {
  return (
    <Suspense fallback={<BrowseSurfaceSkeleton />}>
      <BrowseSurface mode="media" />
    </Suspense>
  );
}
