import Link from "next/link";
import Image from "next/image";
import { forwardRef } from "react";
import { CheckCircle2, Play } from "lucide-react";
import { useLanguage } from "@/lib/context/language-context";
import { formatDuration } from "@/lib/format";
import { FALLBACK_COVER_URL } from "@/lib/placeholder";
import { cn } from "@/lib/utils";
import type { PlayerEpisode } from "@/types/series";

const COMPLETED_THRESHOLD = 95;

interface EpisodeCardProps {
  episode: PlayerEpisode;
  isCurrent: boolean;
}

/** One row in the player page's Episodes section — landscape thumbnail + episode number/title/duration, with a Netflix-style thin progress bar baked into the thumbnail's bottom edge for a partially-watched episode, or a completed checkmark once it's done. */
export const EpisodeCard = forwardRef<HTMLAnchorElement, EpisodeCardProps>(function EpisodeCard(
  { episode, isCurrent },
  ref,
) {
  const { t } = useLanguage();
  const progressPercent = episode.watchProgress?.progressPercent ?? 0;
  const isCompleted = progressPercent >= COMPLETED_THRESHOLD;
  const isInProgress = progressPercent > 0 && !isCompleted;

  return (
    <Link
      ref={ref}
      href={`/player/${episode.id}`}
      className={cn(
        "group flex gap-3 rounded-xl border p-3 transition-colors",
        isCurrent
          ? "border-primary/50 bg-primary/5"
          : "border-white/[0.08] bg-secondary/20 hover:bg-secondary/30",
      )}
    >
      <div className="relative h-20 w-36 shrink-0 overflow-hidden rounded-lg bg-muted sm:h-24 sm:w-40">
        <Image
          src={episode.thumbnailUrl ?? episode.posterUrl ?? FALLBACK_COVER_URL}
          alt={episode.title}
          fill
          sizes="(max-width: 640px) 144px, 160px"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {isCurrent ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-white">
              <Play className="size-3.5 fill-current text-primary" />
              {t.player.episodes.nowPlaying}
            </span>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-opacity duration-200 group-hover:bg-black/40 group-hover:opacity-100">
            <div className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
              <Play className="size-4 fill-current" />
            </div>
          </div>
        )}

        {isCompleted && (
          <div className="absolute right-1 top-1 flex items-center gap-1 rounded-md bg-primary/90 px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground backdrop-blur-sm">
            <CheckCircle2 className="size-3" />
          </div>
        )}

        {isInProgress && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-black/50">
            <div className="h-full bg-primary" style={{ width: `${progressPercent}%` }} />
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
        <p className="text-xs font-medium text-muted-foreground">
          {episode.episodeNumber != null
            ? t.player.episodes.episodeLabel(episode.episodeNumber)
            : null}
        </p>
        <p className={cn("truncate text-sm font-semibold", isCurrent && "text-primary")}>{episode.title}</p>
        <p className="text-xs text-muted-foreground">{formatDuration(episode.duration)}</p>

        {isInProgress && (
          <p className="mt-0.5 text-[11px] text-primary">{t.player.episodes.continueWatching}</p>
        )}
        {isCompleted && (
          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
            <CheckCircle2 className="size-3" />
            {t.player.episodes.completed}
          </p>
        )}
      </div>
    </Link>
  );
});

export function EpisodeCardSkeleton() {
  return (
    <div className="flex gap-3 rounded-xl border border-white/[0.08] bg-secondary/20 p-3">
      <div className="h-20 w-36 shrink-0 animate-pulse rounded-lg bg-muted sm:h-24 sm:w-40" />
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
        <div className="h-3 w-16 animate-pulse rounded bg-muted" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-3 w-12 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}
