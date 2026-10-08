"use client";

import { memo } from "react";

import Link from "next/link";

import { PosterCard } from "@/components/cards";
import { Artwork } from "@/components/system/Artwork";
import { CrownIcon } from "@/components/system/icons";
import { useLanguage } from "@/lib/context/language-context";
import { useLibrary } from "@/lib/context/library-context";
import { useSubscription } from "@/lib/context/subscription-context";
import { formatDuration } from "@/lib/format";
import { useSection } from "@/lib/i18n/sections/define";
import { mediaText } from "@/lib/i18n/sections/media";
import { shellText } from "@/lib/i18n/sections/shell";
import type { Movie } from "@/types/movie";
import type { SeriesListItem } from "@/types/series";
import { isRecent } from "./media-data";

/**
 * THE MEDIA HUBS' TITLE CARDS — thin adapters from the API shapes onto the
 * Marquee cards (components/cards).
 *
 * Behaviour kept from the old MediaCard: the gold crown on Premium titles,
 * the hover Play only when this viewer can actually watch (a free title, or
 * a subscriber — anyone else goes to the detail page, never straight into
 * the player's paywall), My List on movies only (the watchlist is keyed by
 * movie id), and the whole card links to the detail page.
 */
export const MovieCard = memo(function MovieCard({
  movie,
  layout = "grid",
  showRating = true,
  metaYearOnly = false,
  priority,
  sizes,
}: {
  movie: Movie;
  layout?: "rail" | "grid";
  /** Show the star + rating before the meta line. */
  showRating?: boolean;
  /** Top-rated rows show the year alone after the rating. */
  metaYearOnly?: boolean;
  priority?: boolean;
  sizes?: string;
}) {
  const m = useSection(mediaText);
  const { isInWatchlist, toggleWatchlist } = useLibrary();
  const { isSubscribed } = useSubscription();
  const canPlay = movie.accessType === "FREE" || isSubscribed;
  const runtime = formatDuration(movie.duration);
  const meta = metaYearOnly || !runtime ? String(movie.releaseYear) : `${movie.releaseYear} · ${runtime}`;
  const rating = movie.rating > 0 ? movie.rating.toFixed(1) : null;

  return (
    <PosterCard
      title={movie.title}
      href={`/movie/${movie.id}`}
      imageUrl={movie.posterUrl}
      meta={meta}
      rating={showRating ? rating : null}
      premium={movie.accessType === "SUBSCRIPTION"}
      isNew={isRecent(movie.createdAt)}
      playHref={canPlay ? `/player/${movie.id}` : null}
      onToggleList={() => toggleWatchlist(movie.id)}
      listSaved={isInWatchlist(movie.id)}
      a11yLabel={m.movieA11y(movie.title, movie.releaseYear, movie.genre, rating, movie.accessType === "SUBSCRIPTION")}
      layout={layout}
      priority={priority}
      sizes={sizes}
    />
  );
});

/**
 * A series poster: no Play (a series opens its detail page first) and no My
 * List (the website's watchlist only holds movies).
 */
export const SeriesCard = memo(function SeriesCard({
  series,
  layout = "grid",
  priority,
  sizes,
}: {
  series: SeriesListItem;
  layout?: "rail" | "grid";
  priority?: boolean;
  sizes?: string;
}) {
  const { t } = useLanguage();
  const m = useSection(mediaText);
  const episodes = t.browse.episodeCount(series.episodeCount);
  const rating = series.rating > 0 ? series.rating.toFixed(1) : null;

  return (
    <PosterCard
      title={series.title}
      href={`/series/${series.id}`}
      imageUrl={series.posterUrl}
      meta={`${episodes} · ${series.releaseYear}`}
      rating={rating}
      premium={series.accessType === "SUBSCRIPTION"}
      isNew={isRecent(series.createdAt)}
      a11yLabel={m.seriesA11y(series.title, series.releaseYear, series.genre, episodes, series.accessType === "SUBSCRIPTION")}
      layout={layout}
      priority={priority}
      sizes={sizes}
    />
  );
});

/**
 * The wide 16:9 series card ("Recently added" on the Series hub). Built here
 * rather than on <LandscapeCard> because that card always fades in a Play
 * disc, and a series opens its detail page first — no Play on series cards.
 */
export const SeriesWideCard = memo(function SeriesWideCard({ series }: { series: SeriesListItem }) {
  const { t } = useLanguage();
  const m = useSection(mediaText);
  const s = useSection(shellText);
  const episodes = t.browse.episodeCount(series.episodeCount);
  const premium = series.accessType === "SUBSCRIPTION";
  const isNew = isRecent(series.createdAt);

  return (
    <article className="group/card mq-snap relative w-[clamp(248px,24vw,360px)] min-w-0 shrink-0">
      <span className="relative block aspect-video overflow-hidden rounded-[12px] bg-raised">
        <Artwork
          src={series.coverUrl ?? series.posterUrl}
          seed={series.title}
          variant="landscape"
          sizes="(max-width: 719px) 70vw, 360px"
        />
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-3/5" style={{ background: "var(--mq-scrim-card)" }} />
        <span
          aria-hidden
          className="absolute right-3.5 bottom-3.5 left-3.5 line-clamp-2 text-lg leading-5 font-black tracking-[-0.02em] text-white uppercase"
        >
          {series.title}
        </span>
        {isNew && (
          <span
            aria-hidden
            className="absolute top-3 left-0 h-5 rounded-r-[4px] bg-crimson px-[7px] text-[10px] leading-5 font-extrabold tracking-[0.06em] text-white [&:lang(my)]:tracking-normal"
          >
            {s.newTag}
          </span>
        )}
        {premium && (
          <span
            role="img"
            aria-label={t.badges.premium}
            className="absolute bottom-11 left-2.5 flex size-6 items-center justify-center rounded-[6px] bg-art-badge"
          >
            <CrownIcon size={13} className="text-gold" />
          </span>
        )}
      </span>
      <span className="mt-2.5 block truncate text-[15px] leading-5 font-bold text-fg transition-colors duration-150 group-hover/card:text-link">
        {series.title}
      </span>
      <span className="block truncate text-[13px] leading-[18px] text-fg-faint tabular-nums">
        {series.genre} · {series.releaseYear} · {episodes}
      </span>
      <Link
        href={`/series/${series.id}`}
        aria-label={m.seriesA11y(series.title, series.releaseYear, series.genre, episodes, premium)}
        className="absolute inset-0 z-[1] rounded-[12px] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link"
      />
    </article>
  );
});
