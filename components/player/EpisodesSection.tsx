"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Clapperboard } from "lucide-react";
import { EmptyState } from "@/components/empty/EmptyState";
import { seriesService } from "@/services/api/seriesService";
import { useLanguage } from "@/lib/context/language-context";
import { EpisodeCard, EpisodeCardSkeleton } from "./EpisodeCard";

const SKELETON_COUNT = 4;

interface EpisodesSectionProps {
  seriesId: string;
  /** The episode currently loaded in the player above — highlighted, auto-scrolled to on mount, and excluded from acting like a normal link (still navigable, but visually marked as playing). */
  currentEpisodeId: string;
}

/**
 * Series-only — the player page renders this exclusively when the loaded
 * movie has a `seriesId` (see app/player/[movieId]/page.tsx); a standalone
 * movie never mounts this component at all.
 */
export function EpisodesSection({ seriesId, currentEpisodeId }: EpisodesSectionProps) {
  const { t } = useLanguage();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["series", seriesId, "player-episodes"],
    queryFn: () => seriesService.getPlayerEpisodes(seriesId),
    enabled: Boolean(seriesId),
  });

  // Scrolls to the current episode's card exactly once per page load — not
  // on every refetch, so it doesn't yank the viewport around if this query
  // ever refetches in the background.
  const currentCardRef = useRef<HTMLAnchorElement>(null);
  const hasScrolledRef = useRef(false);
  useEffect(() => {
    if (hasScrolledRef.current || !currentCardRef.current) return;
    currentCardRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    hasScrolledRef.current = true;
  }, [data]);

  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold">{t.player.episodes.title}</h2>

      {isLoading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: SKELETON_COUNT }).map((_, index) => (
            <EpisodeCardSkeleton key={index} />
          ))}
        </div>
      )}

      {isError && (
        <EmptyState icon={AlertTriangle} title={t.player.episodes.loadError} />
      )}

      {!isLoading && !isError && data && data.seasons.length === 0 && (
        <EmptyState icon={Clapperboard} title={t.player.episodes.emptyState} />
      )}

      {!isLoading && !isError && data && data.seasons.length > 0 && (
        <div className="flex flex-col gap-6">
          {data.seasons.map((season) => (
            <div key={season.seasonNumber}>
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                {t.player.episodes.season(season.seasonNumber)}
              </h3>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {season.episodes.map((episode) => {
                  const isCurrent = episode.id === currentEpisodeId;
                  return (
                    <EpisodeCard
                      key={episode.id}
                      episode={episode}
                      isCurrent={isCurrent}
                      ref={isCurrent ? currentCardRef : undefined}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
