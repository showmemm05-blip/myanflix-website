import { Suspense } from "react";

import { MediaPageTransition } from "@/components/media/MediaPageTransition";
import { MoviesCatalog, MoviesCatalogSkeleton } from "@/components/media/MoviesCatalog";

/** /media/movies — the dense poster catalog (with the Movies/Series switch). */
export default function MediaMoviesPage() {
  return (
    <MediaPageTransition>
      <Suspense fallback={<MoviesCatalogSkeleton />}>
        <MoviesCatalog />
      </Suspense>
    </MediaPageTransition>
  );
}
