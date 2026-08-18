"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Clapperboard, ListVideo, Play } from "lucide-react";
import { EmptyState } from "@/components/empty/EmptyState";
import { chipClass } from "@/components/system/Chip";
import { seriesService } from "@/services/api/seriesService";
import { useLanguage } from "@/lib/context/language-context";
import { formatDuration } from "@/lib/format";
import { FALLBACK_COVER_URL } from "@/lib/placeholder";
import { cn } from "@/lib/utils";
import type { PlayerEpisode } from "@/types/series";

const COMPLETED_THRESHOLD = 95;
const SKELETON_COUNT = 5;

/** Reads as "sound is coming out of this one" faster than any icon or label does. */
function NowPlayingBars() {
  return (
    <span aria-hidden className="flex h-3.5 items-end gap-[2px]">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="animate-eq-bar w-[3px] rounded-full bg-primary"
          style={{ height: "100%", animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  );
}

function EpisodeRow({
  episode,
  isCurrent,
  rowRef,
}: {
  episode: PlayerEpisode;
  isCurrent: boolean;
  rowRef?: React.Ref<HTMLAnchorElement>;
}) {
  const { t } = useLanguage();
  const progressPercent = episode.watchProgress?.progressPercent ?? 0;
  const isCompleted = progressPercent >= COMPLETED_THRESHOLD;
  const isInProgress = progressPercent > 0 && !isCompleted;

  return (
    <Link
      ref={rowRef}
      href={`/player/${episode.id}`}
      aria-current={isCurrent ? "true" : undefined}
      className={cn(
        "group flex gap-3 rounded-2xl p-2 outline-none transition-colors duration-150 ease-out",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        isCurrent ? "bg-primary/12 ring-1 ring-primary/40 ring-inset" : "hover:bg-white/[0.06]",
      )}
    >
      <div className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-xl bg-muted ring-1 ring-white/8 ring-inset">
        <Image
          src={episode.thumbnailUrl ?? episode.posterUrl ?? FALLBACK_COVER_URL}
          alt=""
          fill
          sizes="112px"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {isCurrent ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/55">
            <NowPlayingBars />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-[background-color,opacity] duration-200 ease-out group-hover:bg-black/45 group-hover:opacity-100">
            <span className="flex size-8 items-center justify-center rounded-full bg-white text-black shadow-e2">
              <Play className="size-3.5 translate-x-px fill-current" />
            </span>
          </div>
        )}

        {isCompleted && !isCurrent && (
          <span className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-black/70 text-primary ring-1 ring-white/12 backdrop-blur-md ring-inset">
            <CheckCircle2 className="size-3.5" />
          </span>
        )}

        {isInProgress && (
          <div className="absolute inset-x-0 bottom-0 h-[3px] bg-black/60">
            <div className="h-full bg-primary" style={{ width: `${progressPercent}%` }} />
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 pr-1">
        <p
          className={cn(
            "truncate text-sm font-semibold",
            isCurrent ? "text-primary" : "text-foreground",
          )}
        >
          {episode.episodeNumber != null && (
            <span className="text-muted-foreground nums">{episode.episodeNumber}. </span>
          )}
          {episode.title}
        </p>
        <p className={cn("text-xs text-muted-foreground", !isCurrent && !isInProgress && "nums")}>
          {isCurrent
            ? t.player.episodes.nowPlaying
            : isInProgress
              ? t.player.episodes.continueWatching
              : formatDuration(episode.duration)}
        </p>
      </div>
    </Link>
  );
}

function EpisodeRowSkeleton() {
  return (
    <div className="flex gap-3 p-2">
      <div className="aspect-video w-28 shrink-0 animate-pulse rounded-xl bg-muted" />
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
        <div className="h-3.5 w-4/5 animate-pulse rounded bg-muted" />
        <div className="h-3 w-14 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

interface EpisodeRailProps {
  seriesId: string;
  currentEpisodeId: string;
  /** `sidebar` caps its own height and scrolls internally; `inline` flows with the page. */
  variant?: "sidebar" | "inline";
  className?: string;
}

/**
 * The series queue, parked beside the picture instead of buried under the fold —
 * so choosing the next episode never costs a scroll away from what's playing.
 *
 * Shares its query key with the player page's own episode lookup, so mounting
 * this adds no extra network round trip.
 */
export function EpisodeRail({
  seriesId,
  currentEpisodeId,
  variant = "sidebar",
  className,
}: EpisodeRailProps) {
  const { t } = useLanguage();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["series", seriesId, "player-episodes"],
    queryFn: () => seriesService.getPlayerEpisodes(seriesId),
    enabled: Boolean(seriesId),
  });

  const seasons = useMemo(() => data?.seasons ?? [], [data]);
  const seasonOfCurrent = useMemo(
    () => seasons.find((season) => season.episodes.some((episode) => episode.id === currentEpisodeId)),
    [seasons, currentEpisodeId],
  );

  // Null until the data lands, then resolved below — a season picked before the
  // list arrives would just be overwritten by the first render that has seasons.
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const activeSeasonNumber =
    selectedSeason ?? seasonOfCurrent?.seasonNumber ?? seasons[0]?.seasonNumber ?? null;
  const activeSeason = seasons.find((season) => season.seasonNumber === activeSeasonNumber);

  // Scrolls the playing episode into view once per page load — not on every
  // refetch, so a background refresh never yanks the list under the user.
  const currentRowRef = useRef<HTMLAnchorElement>(null);
  const hasScrolledRef = useRef(false);
  useEffect(() => {
    if (hasScrolledRef.current || !currentRowRef.current) return;
    currentRowRef.current.scrollIntoView({ block: "nearest" });
    hasScrolledRef.current = true;
  }, [data, activeSeasonNumber]);

  const episodeCount = activeSeason?.episodes.length ?? 0;

  return (
    <section
      className={cn(
        "flex flex-col overflow-hidden rounded-3xl bg-card/60 ring-1 ring-white/8 backdrop-blur-xl ring-inset",
        variant === "sidebar" && "lg:max-h-[calc(100vh-10rem)]",
        className,
      )}
    >
      <header className="flex items-center gap-2.5 border-b border-white/[0.06] px-4 py-3.5">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/25 ring-inset">
          <ListVideo className="size-3.5" />
        </span>
        <h2 className="font-heading text-sm font-semibold tracking-tight">{t.player.episodes.title}</h2>
        {episodeCount > 0 && (
          <span className="ml-auto text-xs text-muted-foreground nums">
            {t.player.episodes.count(episodeCount)}
          </span>
        )}
      </header>

      {seasons.length > 1 && (
        <div className="scrollbar-none flex shrink-0 gap-1.5 overflow-x-auto border-b border-white/[0.06] px-3 py-2.5">
          {seasons.map((season) => {
            const isActive = season.seasonNumber === activeSeasonNumber;
            return (
              <button
                key={season.seasonNumber}
                type="button"
                onClick={() => setSelectedSeason(season.seasonNumber)}
                aria-pressed={isActive}
                className={chipClass({ tone: "mono", size: "md", selected: isActive })}
              >
                {t.player.episodes.season(season.seasonNumber)}
              </button>
            );
          })}
        </div>
      )}

      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-2">
        {isLoading && (
          <div className="flex flex-col">
            {Array.from({ length: SKELETON_COUNT }).map((_, index) => (
              <EpisodeRowSkeleton key={index} />
            ))}
          </div>
        )}

        {isError && <EmptyState icon={AlertTriangle} title={t.player.episodes.loadError} />}

        {!isLoading && !isError && episodeCount === 0 && (
          <EmptyState icon={Clapperboard} title={t.player.episodes.emptyState} />
        )}

        {!isLoading &&
          !isError &&
          activeSeason?.episodes.map((episode) => {
            const isCurrent = episode.id === currentEpisodeId;
            return (
              <EpisodeRow
                key={episode.id}
                episode={episode}
                isCurrent={isCurrent}
                rowRef={isCurrent ? currentRowRef : undefined}
              />
            );
          })}
      </div>
    </section>
  );
}
