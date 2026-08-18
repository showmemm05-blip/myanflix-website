"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Info, Play, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Chip } from "@/components/system/Chip";
import { Kicker } from "@/components/system/Kicker";
import { useSubscription } from "@/lib/context/subscription-context";
import { useLanguage } from "@/lib/context/language-context";
import { formatDuration } from "@/lib/format";
import { FALLBACK_COVER_URL } from "@/lib/placeholder";
import { cn } from "@/lib/utils";
import type { Movie } from "@/types/movie";

const ROTATE_MS = 8000;

/**
 * THE ONE BIG THING at the top of browse — the editorial opening of Aurora
 * Theater: kicker, display title, a single line of metadata, and the two CTAs.
 * The artwork runs full bleed behind it, with the aurora wash bleeding off the
 * hero's edges so the top of the page feels lit rather than painted.
 *
 * It rotates through a handful of picks so the page has a pulse without the
 * user doing anything, but pauses whenever the pointer is over it or the tab is
 * hidden — a carousel that keeps moving under someone reading it is the classic
 * version of this component done badly.
 */
export function SpotlightHero({ movies }: { movies: Movie[] }) {
  const router = useRouter();
  const { t } = useLanguage();
  const { isSubscribed } = useSubscription();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const picks = movies.slice(0, 5);
  const count = picks.length;

  // Keep the timer honest when the list shrinks (e.g. a refetch returns fewer).
  const safeIndex = count > 0 ? index % count : 0;
  const active = picks[safeIndex];

  useEffect(() => {
    if (paused || count < 2) return;
    const id = setInterval(() => {
      // Don't burn through the picks while the tab is in the background —
      // the user would come back to a hero that had silently moved on.
      if (document.visibilityState === "visible") setIndex((i) => (i + 1) % count);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [paused, count]);

  if (!active) return null;

  const canPlay = active.accessType === "FREE" || isSubscribed;

  return (
    <section
      className="relative isolate overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Backdrops are stacked and cross-faded rather than swapped so the
          rotation never flashes the empty container between images. */}
      <div className="absolute inset-0 -z-10">
        {picks.map((movie, i) => (
          <Image
            key={movie.id}
            src={movie.coverUrl ?? movie.posterUrl ?? FALLBACK_COVER_URL}
            alt=""
            fill
            priority={i === 0}
            sizes="100vw"
            className={cn(
              "object-cover transition-opacity duration-700 ease-out",
              i === safeIndex ? "opacity-100" : "opacity-0",
            )}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/85 to-background/25" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent" />
        {/* The signature aurora, bleeding off the hero's edges. Pure
            decoration — it sits under the scrims, never behind the copy. */}
        <div aria-hidden className="aurora-wash pointer-events-none absolute inset-0 opacity-70 blur-3xl" />
      </div>

      <div className="mx-auto flex max-w-[1600px] flex-col gap-5 px-4 pt-10 pb-8 sm:px-6 sm:pt-14 sm:pb-10 lg:px-8 lg:pt-20 lg:pb-14">
        <div className="max-w-xl">
          <Kicker tone="primary">{t.browse.featured}</Kicker>
          <h1 className="mt-2.5 line-clamp-2 text-display">{active.title}</h1>

          <div className="mt-3.5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1 font-medium text-foreground nums">
              <Star className="size-3.5 fill-premium text-premium" />
              {active.rating.toFixed(1)}
            </span>
            <span className="nums">{active.releaseYear}</span>
            <span className="nums">{formatDuration(active.duration)}</span>
            <Chip tone="neutral" variant="outline" size="sm">
              {active.genre}
            </Chip>
            {active.accessType === "FREE" && (
              <Chip tone="success" size="sm">
                {t.search.accessFree}
              </Chip>
            )}
          </div>

          <p className="mt-3.5 line-clamp-2 text-body-muted sm:line-clamp-3">{active.description}</p>

          {/* Same CTA pair as the detail-page hero: white pill to play, glass pill for details. */}
          <div className="mt-6 flex flex-wrap items-center gap-2.5">
            {canPlay ? (
              <Button
                variant="onArt"
                size="pill"
                onClick={() => router.push(`/player/${active.id}`)}
              >
                <Play className="size-4 fill-current" />
                {t.browse.play}
              </Button>
            ) : (
              <Button
                size="pill"
                render={<Link href={`/movie/${active.id}`} />}
                nativeButton={false}
              >
                <Info className="size-4" />
                {t.browse.details}
              </Button>
            )}
            {canPlay && (
              <Link
                href={`/movie/${active.id}`}
                className="focus-ring flex h-11 items-center gap-2 rounded-full bg-white/8 px-5 text-sm font-semibold text-foreground ring-1 ring-white/15 backdrop-blur-md transition-colors duration-200 ease-out ring-inset hover:bg-white/15"
              >
                <Info className="size-4" />
                {t.browse.details}
              </Link>
            )}
          </div>
        </div>

        {count > 1 && (
          // -mx-2.5 pulls the padded hit areas back so the dots still line up
          // with the copy above them.
          <div className="-mx-2.5 flex items-center">
            {picks.map((movie, i) => (
              <button
                key={movie.id}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={t.browse.showFeatured(movie.title)}
                aria-current={i === safeIndex}
                // The dot stays 4px tall; the TARGET is 40×40 — a rotating
                // hero's controls are the last thing that should need aim.
                className="focus-ring group/dot flex size-10 items-center justify-center rounded-full"
              >
                <span
                  aria-hidden
                  className={cn(
                    "h-1 rounded-full transition-all duration-300 ease-out",
                    i === safeIndex
                      ? "w-8 bg-primary"
                      : "w-4 bg-white/25 group-hover/dot:bg-white/50",
                  )}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export function SpotlightHeroSkeleton() {
  return (
    <div className="relative isolate">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] overflow-hidden">
        <div className="aurora-wash absolute inset-0 blur-3xl" />
      </div>
      <div className="mx-auto max-w-[1600px] px-4 pt-10 pb-8 sm:px-6 sm:pt-14 sm:pb-10 lg:px-8 lg:pt-20 lg:pb-14">
        <div className="max-w-xl">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-3 h-10 w-3/4" />
          <Skeleton className="mt-3 h-4 w-1/2" />
          <Skeleton className="mt-5 h-11 w-52 rounded-full" />
        </div>
      </div>
    </div>
  );
}
