"use client";

import Link from "next/link";
import Image from "next/image";
import { Play, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Surface } from "@/components/system/Surface";
import { useLanguage } from "@/lib/context/language-context";
import { formatRelativeDate } from "@/lib/format";
import { FALLBACK_POSTER_URL } from "@/lib/placeholder";
import { cn } from "@/lib/utils";
import type { WatchHistoryEntry } from "@/types/movie";

/**
 * A row of history: artwork, what it is, how far in you got, and the one action
 * that matters — resume, or watch again once it's finished. The progress bar is
 * the loudest thing in the row on purpose; it is the reason this list exists.
 */
export function WatchHistoryCard({ entry }: { entry: WatchHistoryEntry }) {
  const { t } = useLanguage();
  const isComplete = entry.progressPercent >= 95;
  const barWidth = Math.min(100, Math.max(0, entry.progressPercent));

  return (
    <Surface interactive className="flex gap-3.5 p-3">
      <Link
        href={`/movie/${entry.movieId}`}
        className="focus-ring relative aspect-2/3 w-20 shrink-0 overflow-hidden rounded-xl bg-secondary/60 ring-1 ring-white/10 ring-inset"
      >
        <Image
          src={entry.posterUrl ?? FALLBACK_POSTER_URL}
          alt={entry.movieTitle}
          fill
          sizes="80px"
          className="object-cover"
        />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
        <div className="min-w-0">
          <Link
            href={`/movie/${entry.movieId}`}
            className="focus-ring block truncate rounded font-heading text-sm font-semibold transition-colors duration-150 ease-out hover:text-primary"
          >
            {entry.movieTitle}
          </Link>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {t.watchHistory.lastWatched(formatRelativeDate(entry.lastWatchedAt))}
          </p>
        </div>

        <div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            {/* Finished titles read emerald (done), in-progress violet (your action). */}
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-300 ease-out",
                isComplete ? "bg-success" : "bg-primary",
              )}
              style={{ width: `${barWidth}%` }}
            />
          </div>
          <div className="mt-2.5 flex items-center justify-between gap-2">
            <span className="truncate text-xs text-muted-foreground nums">
              {isComplete ? t.watchHistory.completed : t.watchHistory.percentWatched(entry.progressPercent)}
            </span>
            {isComplete ? (
              <Button
                size="pill-sm"
                variant="ghost"
                className="shrink-0 bg-white/8 font-semibold ring-1 ring-white/15 ring-inset hover:bg-white/15 active:scale-[0.98]"
                render={<Link href={`/player/${entry.movieId}`} />}
                nativeButton={false}
              >
                <RotateCcw className="size-3.5" />
                {t.watchHistory.watchAgain}
              </Button>
            ) : (
              <Button
                variant="onArt"
                size="pill-sm"
                className="shrink-0"
                render={<Link href={`/player/${entry.movieId}`} />}
                nativeButton={false}
              >
                <Play className="size-3.5 fill-current" />
                {t.watchHistory.resume}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Surface>
  );
}

export function WatchHistoryCardSkeleton() {
  return (
    <Surface className="flex gap-3.5 p-3">
      <Skeleton className="aspect-2/3 w-20 shrink-0 rounded-xl" />
      <div className="flex min-w-0 flex-1 flex-col justify-between py-1">
        <div>
          <Skeleton className="h-4 w-3/5" />
          <Skeleton className="mt-2 h-3 w-2/5" />
        </div>
        <div>
          <Skeleton className="h-1.5 w-full rounded-full" />
          <div className="mt-2.5 flex items-center justify-between gap-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-10 w-24 rounded-full" />
          </div>
        </div>
      </div>
    </Surface>
  );
}
