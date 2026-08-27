"use client";

import { MovieCard, MovieCardSkeleton } from "./MovieCard";
import { cn } from "@/lib/utils";
import type { BrowseItem } from "@/components/browse/browse-item";

/**
 * THE DENSE CATALOG GRID — the streaming-shelf ladder the compact MovieCard
 * was built for: two posters across on a phone, up to seven on a wide desktop,
 * with gaps tight enough that the screen is artwork rather than gutter.
 *
 * Counts step with the breakpoint (never auto-fit) so a poster always lands at
 * a size the title line below it can survive.
 */
const GRID_CLASS =
  "grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 sm:gap-x-4 sm:gap-y-6 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7";

const GRID_SIZES =
  "(max-width: 640px) 46vw, (max-width: 768px) 30vw, (max-width: 1024px) 23vw, (max-width: 1280px) 18vw, (max-width: 1536px) 15vw, 210px";

export function MovieGrid({
  items,
  isLoading,
  isStale = false,
  skeletonCount = 21,
}: {
  items: BrowseItem[];
  isLoading?: boolean;
  /** Previous query's results held over while the next loads — visibly recede. */
  isStale?: boolean;
  skeletonCount?: number;
}) {
  return (
    <div
      aria-busy={isLoading || isStale}
      className={cn(
        GRID_CLASS,
        "transition-opacity duration-200 ease-out",
        isStale && "opacity-45",
      )}
    >
      {isLoading
        ? Array.from({ length: skeletonCount }).map((_, i) => <MovieCardSkeleton key={i} />)
        : items.map((item) => <MovieCard key={item.id} item={item} sizes={GRID_SIZES} />)}
    </div>
  );
}
