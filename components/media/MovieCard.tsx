"use client";

import { MediaCard, MediaCardSkeleton } from "@/components/system/MediaCard";
import type { BrowseItem } from "@/components/browse/browse-item";

/**
 * The /media catalog's name for THE title card.
 *
 * This used to be a second, portrait implementation living alongside the wide
 * "dossier" card in components/system/MediaCard — which is why the catalog and
 * the rails looked like two different products. The portrait design won and
 * moved into the design system, so this file is now the thin entry point onto
 * that one card rather than a parallel copy of it.
 *
 * Props and behaviour are unchanged: same `BrowseItem`, same hrefs, same
 * watchlist toggle, same play gating.
 */
export function MovieCard({
  item,
  className,
  sizes,
  priority,
}: {
  item: BrowseItem;
  className?: string;
  /** Passed through to next/image for grids/rails with unusual column counts. */
  sizes?: string;
  /** Above-the-fold cards can opt into eager loading. */
  priority?: boolean;
}) {
  return <MediaCard item={item} className={className} sizes={sizes} priority={priority} />;
}

export function MovieCardSkeleton({ className }: { className?: string }) {
  return <MediaCardSkeleton className={className} />;
}
