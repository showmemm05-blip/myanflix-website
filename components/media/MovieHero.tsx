"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { SubscribeDialog } from "@/components/dialogs/SubscribeDialog";
import {
  CheckIcon,
  CrownIcon,
  HeroActions,
  HeroMeta,
  HeroPager,
  HeroShell,
  HeroSynopsis,
  HeroTags,
  HeroTitle,
  InfoIcon,
  PlayIcon,
  PlusIcon,
  Rating,
  Tag,
} from "@/components/system";
import { AGE_RATING_LABELS } from "@/components/filters/filter-types";
import { Button, buttonVariants } from "@/components/ui/button";
import { loginHref } from "@/lib/auth/return-to";
import { useAuth } from "@/lib/context/auth-context";
import { useLanguage } from "@/lib/context/language-context";
import { useLibrary } from "@/lib/context/library-context";
import { useSubscription } from "@/lib/context/subscription-context";
import { formatDuration } from "@/lib/format";
import { useSection } from "@/lib/i18n/sections/define";
import { mediaText } from "@/lib/i18n/sections/media";
import { shellText } from "@/lib/i18n/sections/shell";
import type { Movie } from "@/types/movie";
import { HeroAnnouncer } from "./HeroAnnouncer";
import { isRecent } from "./media-data";

/**
 * THE MOVIES HUB HERO (Media.dc.html) — up to five featured movies behind
 * the 5-part story pager. Tags (NEW, PREMIUM or FREE + a kicker), the title,
 * rating · year · length · genre · age, a two-line synopsis, then:
 *
 *  - white Play when this viewer can watch (a free title, or a subscriber);
 *  - otherwise the gold "Subscribe to watch" — the subscribe dialog for a
 *    signed-in member, the sign-in page (coming back here) for a guest;
 *  - the tonal My List toggle and the square More info link.
 *
 * The pager fills over 8s, pauses on hover/focus, and moves on by itself
 * (never under reduced motion). Screen readers hear the new slide only while
 * the hero is paused or moved by hand (HeroAnnouncer), never every 8s.
 */
export function MovieHero({
  movies,
  headingLevel = "h1",
  size = "hub",
  label,
  kicker,
}: {
  movies: Movie[];
  headingLevel?: "h1" | "h2";
  size?: "hub" | "detail";
  /** Accessible name of the hero region. */
  label?: string;
  /** Replaces the NEW-based kicker (e.g. "Top pick in Drama"). */
  kicker?: string;
}) {
  const { t } = useLanguage();
  const m = useSection(mediaText);
  const s = useSection(shellText);
  const { isAuthenticated } = useAuth();
  const { isSubscribed } = useSubscription();
  const { isInWatchlist, toggleWatchlist } = useLibrary();
  const pathname = usePathname();
  const params = useSearchParams();
  const [index, setIndex] = useState(0);
  const [subscribeOpen, setSubscribeOpen] = useState(false);

  const picks = movies.slice(0, 5);
  const count = picks.length;
  const safeIndex = count > 0 ? index % count : 0;
  const movie = picks[safeIndex];
  if (!movie) return null;

  const premium = movie.accessType === "SUBSCRIPTION";
  const canWatch = !premium || isSubscribed;
  const isNew = isRecent(movie.createdAt);
  const runtime = formatDuration(movie.duration);
  const saved = isInWatchlist(movie.id);
  const query = params.toString();
  const here = query ? `${pathname}?${query}` : pathname;

  return (
    <>
      <HeroAnnouncer
        slides={count}
        paused={subscribeOpen}
        announcement={s.slideOf(movie.title, safeIndex + 1, count)}
      >
        <HeroShell
          size={size}
          imageUrl={movie.coverUrl ?? movie.posterUrl}
          seed={movie.title}
          artKey={movie.id}
          label={label ?? m.featuredMovies}
          carousel={count > 1}
        >
          <div>
            <HeroTags>
              {isNew && <Tag kind="new">{s.newTag}</Tag>}
              {premium ? <Tag kind="premium">{s.premiumTag}</Tag> : <Tag kind="free">{s.freeTag}</Tag>}
              <span className="text-sm leading-5 font-semibold text-fg-body">
                {kicker ?? (isNew ? m.recentlyAdded : s.featured)}
              </span>
            </HeroTags>
            <HeroTitle as={headingLevel} className={size === "detail" ? "text-[clamp(36px,3.8vw,56px)]" : undefined}>
              {movie.title}
            </HeroTitle>
            <HeroMeta>
              {movie.rating > 0 && <Rating value={movie.rating} size="lg" />}
              <span>{movie.releaseYear}</span>
              {runtime && <span>{runtime}</span>}
              <span>{movie.genre}</span>
              {movie.ageRating && <Tag kind="age">{AGE_RATING_LABELS[movie.ageRating]}</Tag>}
            </HeroMeta>
            {size === "hub" && movie.description && <HeroSynopsis>{movie.description}</HeroSynopsis>}
          </div>
          <HeroActions className={size === "detail" ? "mt-[22px]" : undefined}>
            {canWatch ? (
              <Link
                href={`/player/${movie.id}`}
                aria-label={s.play(movie.title)}
                className={buttonVariants({ variant: "play", size: "hero" })}
              >
                <PlayIcon size={20} />
                {t.browse.play}
              </Link>
            ) : isAuthenticated ? (
              <Button variant="gold" size="hero" className="px-6" onClick={() => setSubscribeOpen(true)}>
                <CrownIcon size={18} />
                {t.movieDetail.subscribeToWatch}
              </Button>
            ) : (
              <Link href={loginHref(here)} className={buttonVariants({ variant: "gold", size: "hero", className: "px-6" })}>
                <CrownIcon size={18} />
                {t.movieDetail.subscribeToWatch}
              </Link>
            )}
            <Button
              variant="tonal"
              size="hero"
              aria-pressed={saved}
              onClick={() => toggleWatchlist(movie.id)}
              className="px-[22px] text-base font-bold"
            >
              {saved ? <CheckIcon size={20} /> : <PlusIcon size={20} />}
              {s.myList}
            </Button>
            <Link
              href={`/movie/${movie.id}`}
              aria-label={m.moreAbout(movie.title)}
              className={buttonVariants({ variant: "tonal", size: "icon-hero" })}
            >
              <InfoIcon size={22} />
            </Link>
          </HeroActions>
          {count > 1 && (
            <HeroPager
              count={count}
              index={safeIndex}
              onSelect={setIndex}
              onAdvance={() => setIndex((i) => (i + 1) % count)}
              paused={subscribeOpen}
              label={label ?? m.featuredMovies}
              itemLabel={(i) => s.slideOf(picks[i].title, i + 1, count)}
            />
          )}
        </HeroShell>
      </HeroAnnouncer>
      {isAuthenticated && <SubscribeDialog open={subscribeOpen} onOpenChange={setSubscribeOpen} />}
    </>
  );
}
