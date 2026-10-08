"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { EmptyState } from "@/components/empty/EmptyState";
import { SignInEmptyState } from "@/components/empty/SignInEmptyState";
import { Artwork, CheckIcon, CloseIcon, FilterChip } from "@/components/system";
import { seriesService } from "@/services/api/seriesService";
import { useAuth } from "@/lib/context/auth-context";
import { useLanguage } from "@/lib/context/language-context";
import { useSection } from "@/lib/i18n/sections/define";
import { playText } from "@/lib/i18n/sections/play";
import { shellText } from "@/lib/i18n/sections/shell";
import { formatDuration, UNKNOWN_DURATION } from "@/lib/format";
import { resumeHref } from "@/lib/player/resume";
import { cn } from "@/lib/utils";
import type { PlayerEpisode } from "@/types/series";
import { CloudOffGlyph, EmptyBoxIcon, EpisodesIcon } from "./player-icons";
import styles from "./player.module.css";

const COMPLETED_THRESHOLD = 95;
const SKELETON_COUNT = 5;

/** Reads as "sound is coming out of this one" faster than any icon or label does. */
function NowPlayingBars() {
  return (
    <span aria-hidden className="flex h-[18px] items-end gap-[3px]">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="animate-eq-bar w-1 rounded-[2px] bg-crimson"
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
  const p = useSection(playText);
  const progressPercent = episode.watchProgress?.progressPercent ?? 0;
  const isCompleted = progressPercent >= COMPLETED_THRESHOLD;
  const isInProgress = progressPercent > 0 && !isCompleted;
  const runtime = formatDuration(episode.duration) ?? UNKNOWN_DURATION;

  return (
    <Link
      ref={rowRef}
      // A half-watched episode picks up where it was left (H-27). The row
      // for the episode already playing keeps the plain link — its saved
      // second is older than where the viewer is now.
      href={
        isInProgress && !isCurrent
          ? resumeHref(episode.id, progressPercent, episode.watchProgress?.lastPositionSeconds ?? 0)
          : `/player/${episode.id}`
      }
      aria-current={isCurrent ? "true" : undefined}
      className={cn(
        "group/card flex items-center gap-3 rounded-[12px] p-2 text-fg outline-none transition-colors duration-150 ease-out",
        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-link",
        isCurrent ? "bg-crimson/12" : "hover:bg-tonal-ghost",
      )}
    >
      <span
        className={cn(
          "relative aspect-video w-32 shrink-0 overflow-hidden rounded-card bg-raised",
          isCurrent && "shadow-[inset_0_0_0_2px_var(--mq-crimson)]",
        )}
      >
        <Artwork
          src={episode.thumbnailUrl ?? episode.posterUrl}
          seed={episode.title}
          variant="landscape"
          sizes="128px"
        />

        {isCurrent && (
          <span className="absolute inset-0 flex items-center justify-center bg-[rgba(8,8,11,0.55)] shadow-[inset_0_0_0_2px_var(--mq-crimson)]">
            <NowPlayingBars />
          </span>
        )}

        {isCompleted && !isCurrent && (
          <span
            aria-hidden
            className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-money text-ink"
          >
            <CheckIcon size={12} strokeWidth={3} />
          </span>
        )}

        {isInProgress && (
          <span aria-hidden className="absolute inset-x-0 bottom-0 h-[3px] bg-[rgba(8,8,11,0.6)]">
            <span className="block h-full bg-crimson" style={{ width: `${progressPercent}%` }} />
          </span>
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block truncate text-[15px] leading-5 font-bold",
            isCurrent ? "text-link" : "text-fg",
          )}
        >
          {episode.episodeNumber != null && (
            <span className="text-fg-faint tabular-nums">{episode.episodeNumber}. </span>
          )}
          {episode.title}
        </span>
        <span
          className={cn(
            "mt-0.5 block text-[13px] leading-[18px] font-semibold tabular-nums",
            isCurrent ? "text-link" : "text-fg-faint",
          )}
        >
          {isCurrent
            ? t.player.episodes.nowPlaying
            : isInProgress
              ? p.continuePercent(Math.round(progressPercent))
              : isCompleted
                ? `${runtime} · ${p.watched}`
                : runtime}
        </span>
      </span>
    </Link>
  );
}

function EpisodeRowSkeleton() {
  return (
    <div aria-hidden className="flex items-center gap-3 p-2">
      <span className="mq-skeleton aspect-video w-32 shrink-0 rounded-card" />
      <span className="flex-1">
        <span className="mq-skeleton block h-3.5 w-4/5 rounded-[5px]" />
        <span className="mq-skeleton mt-2 block h-3 w-2/5 rounded-[5px]" />
      </span>
    </div>
  );
}

interface EpisodeRailProps {
  seriesId: string;
  currentEpisodeId: string;
  /**
   * `framed` — the solid panel beside the framed video; `floating` — the
   * frosted panel over the full-window (theater) stage. Both fill their cell
   * and scroll the list inside.
   */
  variant?: "framed" | "floating";
  /** Shows the round close button in the header. */
  onClose?: () => void;
  className?: string;
}

/**
 * The series queue, parked beside (or over) the picture instead of buried
 * under the fold — so choosing the next episode never costs a scroll away
 * from what's playing.
 *
 * Shares its query key with the player page's own episode lookup, so mounting
 * this adds no extra network round trip.
 *
 * Memoised: the player page re-renders with its clock several times a second
 * during playback, and none of that touches the episode list — its props
 * (ids, variant, a stable close callback) only change on a real change.
 */
export const EpisodeRail = memo(function EpisodeRail({
  seriesId,
  currentEpisodeId,
  variant = "framed",
  onClose,
  className,
}: EpisodeRailProps) {
  const { t } = useLanguage();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  // The strip is members-only on the API: never ask for it as a guest.
  const isGuest = !isAuthenticated && !isAuthLoading;
  const { data, isLoading, isError } = useQuery({
    queryKey: ["series", seriesId, "player-episodes"],
    queryFn: () => seriesService.getPlayerEpisodes(seriesId),
    enabled: Boolean(seriesId) && isAuthenticated,
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

  const p = useSection(playText);
  const shell = useSection(shellText);

  return (
    <section
      id="episode-rail"
      aria-labelledby="episode-rail-title"
      className={cn(
        "absolute inset-0 flex flex-col overflow-hidden rounded-dialog text-fg",
        variant === "floating"
          ? "bg-[rgba(18,18,23,0.86)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)] backdrop-blur-[24px] backdrop-saturate-[1.4]"
          : "bg-surface",
        styles.rise,
        className,
      )}
    >
      <div className="flex items-center gap-2.5 pt-4 pr-3 pb-3 pl-5">
        <h2 id="episode-rail-title" className="text-xl leading-[26px] font-extrabold tracking-[-0.01em] text-fg">
          {t.player.episodes.title}
        </h2>
        {episodeCount > 0 && (
          <span className="text-[13px] leading-[18px] text-fg-faint tabular-nums">
            {t.player.episodes.count(episodeCount)}
          </span>
        )}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={p.closeEpisodes}
            className="ml-auto flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-tonal-faint text-fg outline-none transition-[background-color,transform] duration-150 hover:bg-white/14 active:scale-[0.92] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link"
          >
            <CloseIcon size={18} />
          </button>
        )}
      </div>

      {seasons.length > 1 && (
        <div role="group" aria-label={p.seasons} className="mq-rail flex shrink-0 gap-2 overflow-x-auto px-5 pb-3.5">
          {seasons.map((season) => {
            const isActive = season.seasonNumber === activeSeasonNumber;
            return (
              <FilterChip
                key={season.seasonNumber}
                selected={isActive}
                onClick={() => setSelectedSeason(season.seasonNumber)}
              >
                {t.player.episodes.season(season.seasonNumber)}
              </FilterChip>
            );
          })}
        </div>
      )}

      <div aria-hidden className="h-px shrink-0 bg-hairline" />

      <div className={cn("min-h-0 flex-1 overflow-y-auto p-2", styles.vscroll)}>
        {(isLoading || isAuthLoading) && (
          <div aria-busy="true">
            <p role="status" className="sr-only">
              {shell.loading}
            </p>
            {Array.from({ length: SKELETON_COUNT }).map((_, index) => (
              <EpisodeRowSkeleton key={index} />
            ))}
          </div>
        )}

        {isGuest && (
          <SignInEmptyState
            icon={EpisodesIcon}
            title={t.player.state.signInTitle}
            description={t.player.state.signInBody}
            returnTo={`/player/${currentEpisodeId}`}
          />
        )}

        {isError && <EmptyState icon={CloudOffGlyph} tone="danger" title={t.player.episodes.loadError} />}

        {isAuthenticated && !isLoading && !isError && episodeCount === 0 && (
          <EmptyState icon={EmptyBoxIcon} title={t.player.episodes.emptyState} />
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
});
