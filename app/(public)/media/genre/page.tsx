import { Suspense } from "react";

import { GenreView } from "@/components/media/GenreView";

/**
 * /media/genre — one genre or category opened (MediaGenre.dc.html):
 * `?type=movies|series&genre=…` or `?type=…&category=<id>&name=…`.
 */
export default function MediaGenrePage() {
  return (
    <Suspense fallback={<div className="min-h-[70vh]" aria-busy="true" />}>
      <GenreView />
    </Suspense>
  );
}
