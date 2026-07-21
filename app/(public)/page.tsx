"use client";

import Link from "next/link";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { HeroBanner } from "@/components/hero/HeroBanner";
import { MovieRow } from "@/components/movie/MovieRow";
import { useAuth } from "@/lib/context/auth-context";
import { useHomeRows } from "@/hooks/use-movies";
import { historyService } from "@/services/api/historyService";
import { movieService } from "@/services/api/movieService";
import { purchaseService } from "@/services/api/purchaseService";
import { FALLBACK_POSTER_URL } from "@/lib/placeholder";

export default function HomePage() {
  const { isAuthenticated } = useAuth();
  const rows = useHomeRows();

  const { data: continueWatching } = useQuery({
    queryKey: ["continue-watching"],
    queryFn: () => historyService.getWatchHistory({ limit: 10 }),
    enabled: isAuthenticated,
  });

  const { data: recommended, isLoading: isRecommendedLoading } = useQuery({
    queryKey: ["home", "recommended"],
    queryFn: async () => {
      const purchases = await purchaseService.getMyPurchases({ limit: 3 });
      const purchasedMovies = await Promise.all(
        purchases.items.map((p) => movieService.getMovieById(p.movieId)),
      );
      const genres = [...new Set(purchasedMovies.filter((m): m is NonNullable<typeof m> => m !== null).map((m) => m.genre))];
      return movieService.getRecommended(genres);
    },
    enabled: isAuthenticated,
  });

  const continueWatchingMovies = continueWatching?.items.filter((h) => h.progressPercent < 95) ?? [];

  return (
    <div className="flex flex-col gap-10 pb-16">
      <HeroBanner movies={rows.newReleases.data?.slice(0, 5) ?? []} />

      <div className="flex flex-col gap-10">
        {continueWatchingMovies.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="px-4 text-lg font-semibold sm:px-6 sm:text-xl lg:px-8">Continue Watching</h2>
            <div className="scrollbar-none flex gap-3 overflow-x-auto px-4 pb-1 sm:px-6 lg:px-8">
              {continueWatchingMovies.map((entry) => (
                <Link
                  key={entry.id}
                  href={`/player/${entry.movieId}`}
                  className="group relative aspect-2/3 w-40 shrink-0 overflow-hidden rounded-xl border border-white/[0.08] bg-muted sm:w-44 lg:w-48"
                >
                  <Image
                    src={entry.posterUrl ?? FALLBACK_POSTER_URL}
                    alt={entry.movieTitle}
                    fill
                    sizes="(max-width: 640px) 160px, 192px"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-black/40">
                    <div className="h-full bg-primary" style={{ width: `${entry.progressPercent}%` }} />
                  </div>
                  <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/80 to-transparent p-2">
                    <p className="truncate text-xs font-medium text-white">{entry.movieTitle}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <MovieRow title="New Releases" movies={rows.newReleases.data ?? []} isLoading={rows.newReleases.isLoading} viewAllHref="/movies?sort=newest" />
        <MovieRow title="Most Purchased Movies" movies={rows.mostPurchased.data ?? []} isLoading={rows.mostPurchased.isLoading} />
        <MovieRow title="Top Rated Movies" movies={rows.topRated.data ?? []} isLoading={rows.topRated.isLoading} viewAllHref="/movies?sort=rating" />

        {isAuthenticated && (
          <MovieRow title="Recommended For You" movies={recommended ?? []} isLoading={isRecommendedLoading} />
        )}

        <MovieRow title="Myanmar Movies" movies={rows.myanmar.data ?? []} isLoading={rows.myanmar.isLoading} />
        <MovieRow title="International Movies" movies={rows.international.data ?? []} isLoading={rows.international.isLoading} />
        <MovieRow title="Action" movies={rows.action.data ?? []} isLoading={rows.action.isLoading} viewAllHref="/movies?genre=Action" />
        <MovieRow title="Drama" movies={rows.drama.data ?? []} isLoading={rows.drama.isLoading} viewAllHref="/movies?genre=Drama" />
        <MovieRow title="Comedy" movies={rows.comedy.data ?? []} isLoading={rows.comedy.isLoading} viewAllHref="/movies?genre=Comedy" />
        <MovieRow title="Animation" movies={rows.animation.data ?? []} isLoading={rows.animation.isLoading} viewAllHref="/movies?genre=Animation" />
        <MovieRow title="Horror" movies={rows.horror.data ?? []} isLoading={rows.horror.isLoading} viewAllHref="/movies?genre=Horror" />
      </div>
    </div>
  );
}
