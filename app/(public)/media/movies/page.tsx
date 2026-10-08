import { Suspense } from "react";

import { CatalogHubRoute } from "@/components/media/CatalogHub";
import { HubSkeleton } from "@/components/media/CatalogParts";

/**
 * /media/movies — the catalogue address every older link uses
 * (`?tab=movies|series`, `?type=series`, `?q=`, and the shared filter
 * parameters). It renders the same hubs as /media: `?tab=series` (or the old
 * `?type=series`) is the Series hub (MediaSeries.dc.html), anything else the
 * Movies hub, with the link's filters applied to its "All" grid.
 */
export default function MediaMoviesPage() {
  return (
    <Suspense fallback={<HubSkeleton rows={["poster", "poster"]} />}>
      <CatalogHubRoute />
    </Suspense>
  );
}
