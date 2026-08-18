"use client";

import { MediaCard, MediaCardSkeleton } from "@/components/system/MediaCard";
import type { BrowseItem } from "./browse-item";

/**
 * The browse-side name for THE signature card. Aurora Theater unified every
 * poster in the app into `components/system/MediaCard` — artwork edge to edge,
 * an info shelf that carries the title, the role-colored access badge, the play
 * disc and the watchlist pin — so this file is now the thin browse entry point
 * onto that one card rather than a second implementation of it.
 *
 * Props and behaviour are unchanged: same `BrowseItem`, same hrefs, same
 * watchlist toggle, same play gating. Only the visual language moved.
 */
export function PosterCard({
  item,
  className,
  sizes,
  priority,
}: {
  item: BrowseItem;
  className?: string;
  /** Passed through to next/image for grids with unusual column counts. */
  sizes?: string;
  /** Above-the-fold cards (the first rail) can opt into eager loading. */
  priority?: boolean;
}) {
  return <MediaCard item={item} className={className} sizes={sizes} priority={priority} />;
}

export function PosterCardSkeleton({ className }: { className?: string }) {
  return <MediaCardSkeleton className={className} />;
}
