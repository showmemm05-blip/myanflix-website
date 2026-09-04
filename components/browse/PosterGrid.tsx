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
/**
 * Column counts for a PORTRAIT card. The old ladder (1 -> 2 -> 3 -> 4) was
 * built for the wide dossier plate; at 2:3 those same counts would blow each
 * poster up to the height of a phone screen. `comfortable` now matches the
 * /media catalog's grid exactly, and `compact` steps one column further at
 * each stop — so the two surfaces finally read as one product.
 */
const DENSITY_CLASS: Record<GridDensity, string> = {
  comfortable:
    "grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 sm:gap-x-4 sm:gap-y-6 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7",
  compact:
    "grid-cols-3 gap-x-3 gap-y-4 sm:grid-cols-4 sm:gap-x-4 sm:gap-y-5 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8",
};

const DENSITY_SIZES: Record<GridDensity, string> = {
  comfortable:
    "(max-width: 640px) 46vw, (max-width: 1024px) 23vw, (max-width: 1536px) 16vw, 220px",
  compact:
    "(max-width: 640px) 31vw, (max-width: 1024px) 19vw, (max-width: 1536px) 13vw, 180px",
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
