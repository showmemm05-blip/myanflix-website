"use client";

import Link from "next/link";
import { Crown, Heart, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty/EmptyState";
import { ErrorState } from "@/components/empty/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import { MediaCard, MediaCardSkeleton } from "@/components/system";
import { AccountShell } from "@/components/views/AccountShell";
import { movieToBrowseItem } from "@/components/browse/browse-item";
import { useLanguage } from "@/lib/context/language-context";
import { formatDuration } from "@/lib/format";
import type { Movie } from "@/types/movie";

export interface WatchlistViewProps {
  movies: Movie[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  isSubscribed: boolean;
  onRemove: (movieId: string) => void;
  onSubscribe: () => void;
}

function WatchlistCardSkeleton() {
  return (
    <div className="min-w-0">
      <MediaCardSkeleton />
      <Skeleton className="mt-3 h-10 w-full rounded-full" />
    </div>
  );
}

/**
 * Pure presentational watchlist page body — all data and callbacks arrive as
 * props so a harness can render it without auth or queries.
 *
 * The tile is the system <MediaCard>, unchanged, so a saved title looks exactly
 * like the same title on the browse grid: artwork, halo, access badge, rating,
 * info shelf. The two things only this page has are layered on top of it —
 * un-save in the artwork's bottom-right corner (where the browse card's
 * watchlist pin sits, same gesture, opposite direction; the card's own pin is
 * suppressed so there is never two of them), and the single primary action
 * docked below the poster where a thumb can reach it without covering the art:
 * Watch, or Subscribe when the title is locked.
 */
export function WatchlistView({
  movies,
  isLoading,
  isError,
  onRetry,
  isSubscribed,
  onRemove,
  onSubscribe,
}: WatchlistViewProps) {
  const { t } = useLanguage();

  return (
    <AccountShell>
      <PageHeader eyebrow={t.watchlist.eyebrow} title={t.watchlist.title} subtitle={t.watchlist.subtitle} />

      <div>
        {isLoading ? (
          <div className={gridClass}>
            {Array.from({ length: 8 }).map((_, i) => (
              <WatchlistCardSkeleton key={i} />
            ))}
          </div>
        ) : isError ? (
          <ErrorState onRetry={onRetry} />
        ) : movies.length === 0 ? (
          <EmptyState
            icon={Heart}
            title={t.watchlist.empty}
            description={t.watchlist.emptyDescription}
            action={
              <Button size="pill" render={<Link href="/movies?tab=movies" />} nativeButton={false}>
                {t.watchlist.browse}
              </Button>
            }
          />
        ) : (
          <div className={gridClass}>
            {movies.map((movie) => {
              const hasAccess = movie.accessType === "FREE" || isSubscribed;
              const item = {
                ...movieToBrowseItem(movie, formatDuration(movie.duration)),
                // An unrated title shows no rating badge here, as before.
                rating: movie.rating > 0 ? movie.rating : null,
                // Suppress MediaCard's watchlist pin — this page's own remove
                // control occupies that corner.
                watchlistId: null,
              };

              return (
                <div key={movie.id} className="relative isolate min-w-0">
                  <MediaCard
                    item={item}
                    sizes="(max-width: 640px) 92vw, (max-width: 1280px) 46vw, 380px"
                  />

                  {/* Un-save sits where the browse card's watchlist pin does —
                      the still's top-right corner, same gesture, opposite
                      direction — so the two never occupy the same spot. The
                      inset accounts for the card's own 8px plate padding. */}
                  <button
                    type="button"
                    aria-label={t.watchlist.remove}
                    onClick={() => onRemove(movie.id)}
                    className="absolute top-4 right-4 z-[3] flex size-9 items-center justify-center rounded-full bg-black/50 text-white shadow-md ring-1 ring-white/25 backdrop-blur-md transition-[background-color] duration-200 ease-out outline-none ring-inset hover:bg-destructive/80 focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <X className="size-4" />
                  </button>

                  {hasAccess ? (
                    <Button
                      variant="onArt"
                      size="pill-sm"
                      className="mt-3 w-full"
                      render={<Link href={`/player/${movie.id}`} />}
                      nativeButton={false}
                    >
                      <Play className="size-3.5 fill-current" />
                      {t.watchlist.watch}
                    </Button>
                  ) : (
                    <Button size="pill-sm" className="mt-3 w-full" onClick={onSubscribe}>
                      <Crown className="size-3.5" />
                      {t.watchlist.subscribeCta}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AccountShell>
  );
}

/** The landscape card's ladder — one per row on a phone, up to three at the account measure. */
const gridClass = "grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3";
