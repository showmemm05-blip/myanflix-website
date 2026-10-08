import { Suspense } from "react";

import { BooksView } from "@/components/media/BooksView";
import { HubSkeleton } from "@/components/media/CatalogParts";

/**
 * /media/books — the Books hub (MediaBooks.dc.html). Members only; guests see
 * the sign-in screen. `?category=<id>` opens it with that category picked.
 * The address is read on the client, hence the Suspense boundary.
 */
export default function MediaBooksPage() {
  return (
    <Suspense fallback={<HubSkeleton rows={["book", "book"]} />}>
      <BooksView />
    </Suspense>
  );
}
