"use client";

import { memo } from "react";

import { PosterCard } from "@/components/cards/PosterCard";
import type { BrowseItem } from "@/components/browse/browse-item";
import { useLibrary } from "@/lib/context/library-context";
import { useSubscription } from "@/lib/context/subscription-context";

/**
 * THE TITLE CARD for a BrowseItem (movie or series) — now a thin adapter
 * over the Marquee <PosterCard>. Same props as before, so every grid and
 * rail that renders MediaCard gets the new card unchanged:
 * gold crown on Premium, hover Play (movies only, and only when the viewer
 * can actually watch: a free title, or a subscriber — anyone else goes to the
 * detail page, never straight into the player's paywall) and My List (movies
 * only — the watchlist is keyed by movie id), full-card link to the detail page.
 * No poster → the fallback scene with the title set in the art.
 */
function MediaCardImpl({
  item,
  className,
  sizes,
  priority = false,
  layout = "grid",
}: {
  item: BrowseItem;
  className?: string;
  sizes?: string;
  priority?: boolean;
  layout?: "rail" | "grid";
}) {
  const { isInWatchlist, toggleWatchlist } = useLibrary();
  const { isSubscribed } = useSubscription();
  const canPlay = item.playHref !== null && (item.accessType === "FREE" || isSubscribed);
  const watchlistId = item.watchlistId;
  const meta = item.meta ? `${item.releaseYear} · ${item.meta}` : String(item.releaseYear);

  return (
    <PosterCard
      title={item.title}
      href={item.href}
      imageUrl={item.posterUrl}
      meta={meta}
      rating={item.rating}
      premium={item.accessType === "SUBSCRIPTION"}
      playHref={canPlay ? item.playHref : null}
      onToggleList={watchlistId ? () => toggleWatchlist(watchlistId) : undefined}
      listSaved={watchlistId ? isInWatchlist(watchlistId) : false}
      a11yLabel={item.title}
      layout={layout}
      priority={priority}
      sizes={sizes}
      className={className}
    />
  );
}

export const MediaCard = memo(MediaCardImpl);

