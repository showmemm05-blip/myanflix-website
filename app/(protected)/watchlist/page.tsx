"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { Heart, Play, ShoppingBag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty/EmptyState";
import { PurchaseDialog } from "@/components/dialogs/PurchaseDialog";
import { useLibrary } from "@/lib/context/library-context";
import { watchlistService } from "@/services/api/watchlistService";
import { formatKyat } from "@/lib/currency";
import { FALLBACK_POSTER_URL } from "@/lib/placeholder";
import type { Movie } from "@/types/movie";

export default function WatchlistPage() {
  const { isPurchased, watchlistCount, toggleWatchlist } = useLibrary();
  const [purchaseTarget, setPurchaseTarget] = useState<Movie | null>(null);

  const { data: watchlistMovies = [], isLoading } = useQuery({
    queryKey: ["watchlist", watchlistCount],
    queryFn: () => watchlistService.getWatchlist(),
  });

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold sm:text-3xl">Watchlist</h1>
        <p className="mt-1 text-sm text-muted-foreground">Movies you&rsquo;ve saved to watch later.</p>
      </div>

      {!isLoading && watchlistMovies.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Your watchlist is empty"
          description="Tap the + icon on any movie to save it here."
          action={
            <Button render={<Link href="/movies" />} nativeButton={false}>
              Browse Movies
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {watchlistMovies.map((movie) => {
            const owned = isPurchased(movie.id);
            return (
              <div key={movie.id} className="glass-card flex gap-3 rounded-xl border-white/[0.08] p-3">
                <Link href={`/movie/${movie.id}`} className="relative h-32 w-22 shrink-0 overflow-hidden rounded-lg bg-muted">
                  <Image src={movie.posterUrl ?? FALLBACK_POSTER_URL} alt={movie.title} fill sizes="88px" className="object-cover" />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
                  <div>
                    <Link href={`/movie/${movie.id}`} className="truncate text-sm font-semibold hover:text-primary">
                      {movie.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {movie.releaseYear} &middot; {movie.genre}
                    </p>
                    <p className="mt-1 text-sm font-medium text-primary">
                      {owned ? "Owned" : formatKyat(movie.price)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {owned ? (
                      <Button size="sm" render={<Link href={`/player/${movie.id}`} />} nativeButton={false}>
                        <Play className="size-3.5 fill-current" />
                        Watch
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => setPurchaseTarget(movie)}>
                        <ShoppingBag className="size-3.5" />
                        Buy
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => toggleWatchlist(movie.id)}>
                      <X className="size-3.5" />
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <PurchaseDialog movie={purchaseTarget} open={!!purchaseTarget} onOpenChange={(o) => !o && setPurchaseTarget(null)} />
    </div>
  );
}
