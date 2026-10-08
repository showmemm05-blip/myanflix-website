"use client";

import Link from "next/link";
import { RotateCcw } from "lucide-react";

import { Artwork } from "@/components/system/Artwork";
import { CheckIcon, PlayIcon } from "@/components/system/icons";
import { buttonVariants } from "@/components/ui/button";
import { useLanguage } from "@/lib/context/language-context";
import { formatDuration } from "@/lib/format";
import { useSection } from "@/lib/i18n/sections/define";
import { clockTime, libraryText } from "@/lib/i18n/sections/library";
import { RESUME_COMPLETE_PERCENT, resumeHref } from "@/lib/player/resume";
import { cn } from "@/lib/utils";
import type { WatchHistoryEntry } from "@/types/movie";

/**
 * A row of watch history (WatchHistory board): the poster, the title link,
 * "2h 4m · Last watched 9:40 PM", a 4px progress bar (crimson while in
 * progress, grey once finished) and the one action that matters — Resume at
 * the saved second, or Watch again from the start. Flat #121217 row, radius
 * 16, raised on hover. No poster → the fallback scene.
 */
export function WatchHistoryCard({ entry }: { entry: WatchHistoryEntry }) {
  const { t, language } = useLanguage();
  const lib = useSection(libraryText);
  const percent = Math.min(100, Math.max(0, Math.round(entry.progressPercent)));
  const isComplete = entry.progressPercent >= RESUME_COMPLETE_PERCENT;
  const length = formatDuration(entry.durationMinutes);
  const left =
    entry.durationMinutes && !isComplete ? formatDuration((entry.durationMinutes * (100 - percent)) / 100) : null;
  const lastWatched = t.watchHistory.lastWatched(clockTime(entry.lastWatchedAt, language));

  return (
    <article className="flex gap-4 rounded-[16px] bg-surface p-3 transition-colors duration-150 hover:bg-raised">
      {/* The poster repeats the title link for the pointer; keyboard and
          screen readers get the one named link next to it. */}
      <Link
        href={`/movie/${entry.movieId}`}
        tabIndex={-1}
        aria-hidden
        className="group/card relative aspect-2/3 w-20 shrink-0 overflow-hidden rounded-[10px] bg-raised"
      >
        <Artwork src={entry.posterUrl} seed={entry.movieTitle} variant="poster" sizes="80px" />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
        <div className="min-w-0">
          <Link
            href={`/movie/${entry.movieId}`}
            className="block truncate rounded-[6px] text-base leading-[22px] font-extrabold text-fg outline-none transition-colors duration-150 hover:text-link focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link"
          >
            {entry.movieTitle}
          </Link>
          <p className="mt-0.5 truncate text-[13px] leading-[18px] text-fg-faint tabular-nums">
            {length ? `${length} · ${lastWatched}` : lastWatched}
          </p>
        </div>

        <div>
          <div
            role="progressbar"
            aria-label={isComplete ? lib.completedLabel(entry.movieTitle) : lib.progressLabel(entry.movieTitle, percent)}
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-1 w-full overflow-hidden rounded-[2px] bg-hairline-strong"
          >
            <div
              className={cn("h-full rounded-[2px]", isComplete ? "bg-fg-faint" : "bg-crimson")}
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="mt-2.5 flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-1.5 truncate text-[13px] leading-[18px] text-fg-muted tabular-nums">
              {isComplete && <CheckIcon size={16} className="shrink-0 text-money" />}
              <span className="truncate">
                {isComplete
                  ? t.watchHistory.completed
                  : left
                    ? lib.statusLeft(percent, left)
                    : t.watchHistory.percentWatched(percent)}
              </span>
            </span>
            {isComplete ? (
              <Link
                href={`/player/${entry.movieId}`}
                aria-label={lib.watchAgainTitle(entry.movieTitle)}
                className={cn(buttonVariants({ variant: "tonal" }), "h-9 shrink-0 gap-1.5 pr-3.5 pl-3 font-extrabold")}
              >
                <RotateCcw className="size-4" strokeWidth={1.75} />
                {t.watchHistory.watchAgain}
              </Link>
            ) : (
              <Link
                // H-27: resume at the saved second, not 0:00.
                href={resumeHref(entry.movieId, entry.progressPercent, entry.lastPositionSeconds)}
                aria-label={lib.resumeFrom(entry.movieTitle, percent)}
                className={cn(buttonVariants({ variant: "tonal" }), "h-9 shrink-0 gap-1.5 pr-3.5 pl-3 font-extrabold")}
              >
                <PlayIcon size={16} />
                {t.watchHistory.resume}
              </Link>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export function WatchHistoryCardSkeleton() {
  return (
    <div aria-hidden className="flex gap-4 rounded-[16px] bg-surface p-3">
      <span className="mq-skeleton block aspect-2/3 w-20 shrink-0 rounded-[10px]" />
      <span className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
        <span>
          <span className="mq-skeleton block h-4 w-3/5 rounded-[5px]" />
          <span className="mq-skeleton mt-2 block h-3 w-2/5 rounded-[5px]" />
        </span>
        <span>
          <span className="mq-skeleton block h-1 rounded-[2px]" />
          <span className="mt-2.5 flex justify-between">
            <span className="mq-skeleton block h-3 w-20 rounded-[5px]" />
            <span className="mq-skeleton block h-9 w-24 rounded-[12px]" />
          </span>
        </span>
      </span>
    </div>
  );
}
