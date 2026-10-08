import { Suspense } from "react";

import { CatalogHubRoute } from "@/components/media/CatalogHub";
import { HubSkeleton } from "@/components/media/CatalogParts";

/**
 * /media — the Movies hub (Media.dc.html): featured hero, rows, and the
 * "All movies" catalogue with sort, filters and infinite scroll.
 * `?tab=series` shows the Series hub; `?categories=movies|series|books` opens
 * the Categories overlay on that list (`?categories=1` = this hub's own
 * type). The address is read on the client, hence the Suspense boundary.
 */
export default function MediaPage() {
  return (
    <Suspense fallback={<HubSkeleton rows={["poster", "poster"]} />}>
      <CatalogHubRoute />
    </Suspense>
  );
}
