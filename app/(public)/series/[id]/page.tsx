"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Check, Layers, Play, Tv } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/loading/Spinner";
import { EmptyState } from "@/components/empty/EmptyState";
import { SubscribeDialog } from "@/components/dialogs/SubscribeDialog";
import { seriesService } from "@/services/api/seriesService";
import { useSubscription } from "@/lib/context/subscription-context";
import { formatDuration } from "@/lib/format";
import { FALLBACK_COVER_URL, FALLBACK_POSTER_URL } from "@/lib/placeholder";
import type { Movie } from "@/types/movie";

export default function SeriesDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: series, isLoading } = useQuery({
    queryKey: ["series", id],
    queryFn: () => seriesService.getSeriesById(id),
    enabled: Boolean(id),
  });
  const { data: episodes } = useQuery({
    queryKey: ["series", id, "episodes"],
    queryFn: () => seriesService.getEpisodes(id),
    enabled: Boolean(id),
  });
  const { isSubscribed } = useSubscription();

  const [subscribeOpen, setSubscribeOpen] = useState(false);

  const hasAccess = Boolean(series && (series.accessType === "FREE" || isSubscribed));

  const seasons = useMemo(() => {
    const map = new Map<number, Movie[]>();
    for (const episode of episodes ?? []) {
      const season = episode.seasonNumber ?? 1;
      if (!map.has(season)) map.set(season, []);
      map.get(season)!.push(episode);
    }
    return new Map([...map.entries()].sort(([a], [b]) => a - b));
  }, [episodes]);

  const firstEpisode = episodes?.[0] ?? null;

  if (isLoading) return <PageLoader />;

  if (!series) {
    return (
      <div className="mx-auto max-w-[1600px] px-4 py-16 sm:px-6 lg:px-8">
        <EmptyState
          icon={Tv}
          title="Series not found"
          description="This show may have been removed."
          action={
            <Button render={<Link href="/series" />} nativeButton={false}>
              Back to Series
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="relative h-[50vh] min-h-[360px] w-full overflow-hidden">
        <Image
          src={series.coverUrl ?? FALLBACK_COVER_URL}
          alt={series.title}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-background/10" />
      </div>

      <div className="mx-auto -mt-32 flex w-full max-w-[1600px] flex-col gap-6 px-4 sm:px-6 lg:-mt-40 lg:flex-row lg:px-8">
        <div className="relative mx-auto -mt-16 aspect-2/3 w-44 shrink-0 overflow-hidden rounded-xl border border-white/10 shadow-2xl sm:w-56 lg:mx-0 lg:mt-0">
          <Image src={series.posterUrl ?? FALLBACK_POSTER_URL} alt={series.title} fill sizes="224px" className="object-cover" />
        </div>

        <div className="flex flex-1 flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="size-3.5" />
              {series.releaseYear}
            </span>
            <span className="flex items-center gap-1">
              <Layers className="size-3.5" />
              {seasons.size} season{seasons.size === 1 ? "" : "s"} &middot; {episodes?.length ?? 0} episode
              {(episodes?.length ?? 0) === 1 ? "" : "s"}
            </span>
          </div>

          <h1 className="text-2xl font-bold sm:text-4xl">{series.title}</h1>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground">{series.genre}</span>
            {series.categories.map((category) => (
              <span key={category.id} className="rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground">
                {category.name}
              </span>
            ))}
          </div>

          <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">{series.description}</p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            {hasAccess ? (
              firstEpisode ? (
                <Button size="lg" render={<Link href={`/player/${firstEpisode.id}`} />} nativeButton={false}>
                  <Play className="size-4 fill-current" />
                  Watch Now
                </Button>
              ) : (
                <Button size="lg" disabled>
                  <Check className="size-4" />
                  No episodes yet
                </Button>
              )
            ) : (
              // The one subscribe surface for the whole show — individual episodes are never gated separately.
              <Button size="lg" onClick={() => setSubscribeOpen(true)}>
                <Play className="size-4 fill-current" />
                Subscribe to Watch
              </Button>
            )}
          </div>
          {hasAccess && series.accessType === "SUBSCRIPTION" && (
            <p className="text-xs text-muted-foreground">
              Unlocked by your subscription — every season and episode, including future ones.
            </p>
          )}
        </div>
      </div>

      <div className="mx-auto mt-10 flex w-full max-w-[1600px] flex-col gap-8 px-4 pb-16 sm:px-6 lg:px-8">
        {seasons.size === 0 ? (
          <EmptyState icon={Tv} title="No episodes yet" description="Episodes will appear here once they're released." />
        ) : (
          [...seasons.entries()].map(([seasonNumber, seasonEpisodes]) => (
            <div key={seasonNumber}>
              <h2 className="mb-3 text-lg font-semibold">Season {seasonNumber}</h2>
              <div className="flex flex-col gap-2">
                {seasonEpisodes.map((episode) => {
                  const row = (
                    <div
                      className={`flex items-center gap-4 rounded-xl border border-white/[0.06] bg-secondary/20 p-3 transition-colors ${
                        hasAccess ? "hover:border-primary/40 hover:bg-secondary/40" : "opacity-80"
                      }`}
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-sm font-semibold text-muted-foreground">
                        {episode.episodeNumber ?? "?"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{episode.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {episode.duration > 0 ? formatDuration(episode.duration) : "—"}
                        </p>
                      </div>
                      {/* Episodes never carry their own gate — access always comes from the parent series. */}
                      {hasAccess ? (
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                          <Play className="size-4 fill-current" />
                        </span>
                      ) : (
                        <span className="shrink-0 text-xs font-medium text-muted-foreground">Subscribe to watch</span>
                      )}
                    </div>
                  );

                  return hasAccess ? (
                    <Link key={episode.id} href={`/player/${episode.id}`}>
                      {row}
                    </Link>
                  ) : (
                    <div key={episode.id}>{row}</div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      <SubscribeDialog open={subscribeOpen} onOpenChange={setSubscribeOpen} />
    </div>
  );
}
