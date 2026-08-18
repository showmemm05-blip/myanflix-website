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
 * a poster, a title, a runtime and a percentage, and none of the genre/year/
 * rating metadata the dossier card's spine is built around. So it wears the
 * same anatomy — landscape plate, inset poster tile at the seam, type on the
 * plate, hover play disc — with the progress bar taking the place of the meta
 * line, because how far in you got IS the reason this row exists.
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
        className="flex-row items-end justify-between gap-3 px-4 sm:px-6 lg:px-8"
      />

      <div className="scrollbar-none flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pt-2 pb-4 sm:px-6 lg:px-8">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="w-72 shrink-0 rounded-2xl bg-card/40 p-2 sm:w-80">
                <Skeleton className="aspect-video rounded-xl" />
                <div className="flex items-start gap-3 px-1 pt-2.5 pb-1">
                  <Skeleton className="-mt-11 aspect-2/3 w-14 shrink-0 rounded-lg sm:-mt-12 sm:w-16" />
                  <div className="min-w-0 flex-1 pt-1">
                    <Skeleton className="h-3.5 w-4/5 rounded-full" />
                    <Skeleton className="mt-2 h-2.5 w-3/5 rounded-full" />
                  </div>
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
    <article className="group/card relative isolate w-72 shrink-0 snap-start rounded-2xl bg-card/55 p-2 ring-1 shadow-e1 transition-[transform,background-color,box-shadow] duration-200 ease-out ring-white/8 ring-inset hover:-translate-y-0.5 hover:bg-card/80 hover:shadow-e3 focus-within:-translate-y-0.5 focus-within:bg-card/80 sm:w-80">
      {/* The still, with the resume progress welded to its bottom edge — the
          one piece of information this row exists to show. */}
      <div className="relative aspect-video overflow-hidden rounded-xl bg-secondary/60 ring-1 ring-white/8 ring-inset">
        <Image
          src={posterSrc}
          alt=""
          fill
          sizes="(max-width: 640px) 78vw, 340px"
          className="object-cover transition-transform duration-500 ease-out group-hover/card:scale-[1.04]"
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

      {/* The spine — the poster tile straddles the seam exactly as it does on
          the dossier card, so the two rails read as one family. */}
      <div className="flex items-start gap-3 px-1 pt-2.5 pb-1">
        <div className="relative -mt-11 aspect-2/3 w-14 shrink-0 overflow-hidden rounded-lg bg-secondary shadow-e2 ring-2 ring-card sm:-mt-12 sm:w-16">
          <Image src={posterSrc} alt="" fill sizes="72px" className="object-cover" />
        </div>

        <div className="min-w-0 flex-1 pt-0.5">
          <h3 className="truncate font-heading text-[15px] leading-tight font-semibold text-foreground transition-colors duration-150 ease-out group-hover/card:text-primary">
            {entry.movieTitle}
          </h3>
          <p className="mt-1 truncate text-xs text-muted-foreground nums">
            {entry.durationMinutes ? (
              <>
                {formatDuration(entry.durationMinutes)}
                <span className="text-muted-foreground/40"> · </span>
              </>
            ) : null}
            {t.watchHistory.percentWatched(entry.progressPercent)}
          </p>
        </div>
      </div>

      {/* Whole card resumes playback — the same destination the row has always had. */}
      <Link
        href={`/player/${entry.movieId}`}
        aria-label={`${t.watchHistory.resume}: ${entry.movieTitle}`}
        className="absolute inset-0 z-[1] rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      />

      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-2 top-2 flex aspect-video items-center justify-center",
          "opacity-0 transition-opacity duration-200 ease-out",
          "group-hover/card:opacity-100 group-focus-within/card:opacity-100",
        )}
      >
        <span className="flex size-12 scale-90 items-center justify-center rounded-full bg-white text-black shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-transform duration-200 ease-out group-hover/card:scale-100 group-focus-within/card:scale-100">
          <Play className="size-4.5 translate-x-px fill-current" />
        </span>
      </div>
    </article>
  );
}
