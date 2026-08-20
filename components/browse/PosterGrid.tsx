"use client";

import { MediaCard, MediaCardSkeleton } from "@/components/system/MediaCard";
import { cn } from "@/lib/utils";
import type { BrowseItem } from "./browse-item";

export type GridDensity = "comfortable" | "compact";

/**
 * The catalog grid. The card is a landscape plate carrying its own title line,
 * so the ladder is built for wide entries, not tall spines: one per row on a
 * phone (a 16:9 still shrunk to half a phone's width is unreadable), then two,
 * three and four as the viewport earns them.
 *
 * Two densities on the same ladder: `comfortable` gives each title real estate,
 * `compact` steps one column further at every stop for people scanning a large
 * catalog. Counts step with the breakpoint rather than auto-fitting so a card
 * never lands at an awkward in-between size on a tablet.
 */
const DENSITY_CLASS: Record<GridDensity, string> = {
  comfortable: "grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3 2xl:grid-cols-4",
  compact: "grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5",
};

const DENSITY_SIZES: Record<GridDensity, string> = {
  comfortable: "(max-width: 640px) 92vw, (max-width: 1280px) 46vw, (max-width: 1536px) 31vw, 380px",
  compact: "(max-width: 640px) 92vw, (max-width: 1024px) 46vw, (max-width: 1536px) 24vw, 300px",
};

export function PosterGrid({
  items,
  isLoading,
  isStale = false,
  density = "comfortable",
  skeletonCount = 18,
}: {
  items: BrowseItem[];
  isLoading?: boolean;
  /**
   * These cards answer a question the page is no longer asking — the query is
   * fetching a new key and these are the previous one's results, held over so
   * the grid doesn't flash empty. They stay readable and clickable (they were
   * true a moment ago) but visibly recede, so the heading above them isn't
   * read as a label for what's on screen.
   */
  isStale?: boolean;
  density?: GridDensity;
  skeletonCount?: number;
}) {
  return (
    <div
      aria-busy={isLoading || isStale}
      className={cn(
        "grid transition-opacity duration-200 ease-out",
        DENSITY_CLASS[density],
        isStale && "opacity-45",
      )}
    >
      {isLoading
        ? Array.from({ length: skeletonCount }).map((_, i) => <MediaCardSkeleton key={i} />)
        : items.map((item) => <MediaCard key={item.id} item={item} sizes={DENSITY_SIZES[density]} />)}
    </div>
  );
}
