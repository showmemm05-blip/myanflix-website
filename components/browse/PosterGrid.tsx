"use client";

import type { ReactNode } from "react";

import { PosterCardSkeleton } from "@/components/cards/PosterCard";
import { CardGrid } from "@/components/system/Row";
import { MediaCard } from "@/components/system/MediaCard";
import { cn } from "@/lib/utils";
import type { BrowseItem } from "./browse-item";

export type GridDensity = "comfortable" | "compact";

const DENSITY_SIZES: Record<GridDensity, string> = {
  comfortable: "(max-width: 719px) 33vw, (max-width: 1440px) 15vw, 220px",
  compact: "(max-width: 719px) 33vw, (max-width: 1440px) 11vw, 170px",
};

/**
 * The poster grid (SearchResults board): auto-fill columns of 168px
 * (comfortable — 7 across at 1440) or 128px (compact), gaps 28/16, three
 * columns on phones. Movies and series share it through `MediaCard`.
 *
 * `isStale`: the grid is still showing the PREVIOUS query's cards while the
 * new one loads. They stay readable and clickable (they were true a moment
 * ago) but fade to 40%, so the heading above them isn't read as a label for
 * what's on screen.
 *
 * `footer` renders inside the grid after the cards — the infinite-scroll
 * tail of skeleton posters sits in the same columns.
 */
export function PosterGrid({
  items,
  isLoading,
  isStale = false,
  density = "comfortable",
  skeletonCount = 14,
  footer,
  className,
}: {
  items: BrowseItem[];
  isLoading?: boolean;
  isStale?: boolean;
  density?: GridDensity;
  skeletonCount?: number;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <CardGrid
      kind={density === "compact" ? "posters-compact" : "posters"}
      aria-busy={isLoading || isStale}
      className={cn("transition-opacity duration-200 ease-out", isStale && "opacity-40", className)}
    >
      {isLoading
        ? Array.from({ length: skeletonCount }, (_, i) => <PosterCardSkeleton key={i} />)
        : items.map((item, index) => (
            <MediaCard key={item.id} item={item} sizes={DENSITY_SIZES[density]} priority={index < 7} />
          ))}
      {footer}
    </CardGrid>
  );
}
