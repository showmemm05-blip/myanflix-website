"use client";

import Image from "next/image";
import Link from "next/link";
import { Play } from "lucide-react";

import { SectionHeader } from "@/components/system/SectionHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/context/auth-context";
import { useLanguage } from "@/lib/context/language-context";
import { useContinueWatching } from "@/hooks/use-movies";
import { formatDuration } from "@/lib/format";
import { FALLBACK_POSTER_URL } from "@/lib/placeholder";
import { cn } from "@/lib/utils";
import type { WatchHistoryEntry } from "@/types/movie";

/**
 * CONTINUE WATCHING — the first row of browse for anyone who is mid-title.
 *
 * It is the one rail whose cards are not `MediaCard`s: a history entry carries
 * a poster, a title, a runtime and a percentage, and none of the year/rating
 * metadata the title card's meta line is built around. So it wears the same
 * anatomy — the same 2:3 poster, the same widths, the same hover play disc —
 * with the progress bar welded to the foot of the artwork and the percentage
 * taking the place of the meta line, because how far in you got IS the reason
 * this row exists.
 *
 * Behaviour matches the pre-redesign row exactly: signed-in users only, entries
 * between 1% and 95% watched, and the whole card resumes playback.
 */
export function ContinueWatchingRail() {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const { data, isLoading } = useContinueWatching(isAuthenticated);

  if (!isAuthenticated) return null;
  const entries = data ?? [];
  if (!isLoading && entries.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <SectionHeader
        title={t.player.episodes.continueWatching}
        className="mx-auto w-full max-w-[1600px] flex-row items-end justify-between gap-3 px-4 sm:px-6 lg:px-8"
      />

      <div className="scrollbar-none mx-auto flex w-full max-w-[1600px] snap-x snap-mandatory scroll-pl-4 gap-3 overflow-x-auto scroll-smooth px-4 pt-2 pb-4 sm:scroll-pl-6 sm:gap-4 sm:px-6 lg:scroll-pl-8 lg:px-8">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="w-36 shrink-0 sm:w-40 lg:w-44">
                <Skeleton className="aspect-2/3 rounded-xl" />
                <div className="px-0.5 pt-2">
                  <Skeleton className="h-3 w-4/5 rounded-full" />
                  <Skeleton className="mt-1.5 h-2.5 w-1/2 rounded-full" />
                </div>
              </div>
            ))
          : entries.map((entry) => <ContinueCard key={entry.id} entry={entry} />)}
      </div>
    </section>
  );
}

function ContinueCard({ entry }: { entry: WatchHistoryEntry }) {
  const { t } = useLanguage();
  const posterSrc = entry.posterUrl ?? FALLBACK_POSTER_URL;
  const progress = Math.min(100, Math.max(0, entry.progressPercent));

  return (
    <article className="group/card relative isolate flex w-36 min-w-0 shrink-0 snap-start flex-col sm:w-40 lg:w-44">
      {/* The poster, with the resume progress welded to its bottom edge — the
          one piece of information this row exists to show. */}
      <div className="relative aspect-2/3 overflow-hidden rounded-xl bg-secondary/60 shadow-e1 ring-1 ring-white/8 transition-[box-shadow] duration-200 ease-out ring-inset group-hover/card:shadow-e2 group-hover/card:ring-white/16">
        <Image
          src={posterSrc}
          alt=""
          fill
          sizes="(max-width: 640px) 144px, (max-width: 1024px) 160px, 176px"
          className="object-cover transition-transform duration-500 ease-out group-hover/card:scale-[1.05]"
        />

        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20"
        />

        <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20">
          <div
            className="h-full bg-primary transition-[width] duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Title + one line, exactly as the title card sets them. */}
      <div className="min-w-0 px-0.5 pt-2">
        <h3 className="truncate text-[13px] leading-tight font-medium text-foreground transition-colors duration-150 ease-out group-hover/card:text-primary sm:text-sm">
          {entry.movieTitle}
        </h3>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground nums sm:text-xs">
          {entry.durationMinutes ? (
            <>
              {formatDuration(entry.durationMinutes)}
              <span className="text-muted-foreground/40"> · </span>
            </>
          ) : null}
          {t.watchHistory.percentWatched(entry.progressPercent)}
        </p>
      </div>

      {/* Whole card resumes playback — the same destination the row has always had. */}
      <Link
        href={`/player/${entry.movieId}`}
        aria-label={`${t.watchHistory.resume}: ${entry.movieTitle}`}
        className="absolute inset-0 z-[1] rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      />

      {/* Spans the poster only, never the type below it — matching the title
          card's play disc in size and choreography. */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 flex aspect-2/3 items-center justify-center",
          "opacity-0 transition-opacity duration-200 ease-out",
          "group-hover/card:opacity-100 group-focus-within/card:opacity-100",
        )}
      >
        <span className="flex size-10 scale-90 items-center justify-center rounded-full bg-white text-black shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-transform duration-200 ease-out group-hover/card:scale-100 group-focus-within/card:scale-100">
          <Play className="size-4 translate-x-px fill-current" />
        </span>
      </div>
    </article>
  );
}
