"use client";

import { LandscapeCard } from "@/components/cards";
import { MEDIA_CHIP_HREF } from "@/components/layout/MediaChipStrip";
import { MovieCard, SeriesCard } from "@/components/media/MovieCard";
import { genreViewHref } from "@/components/media/media-data";
import { Row, RowSkeleton, RowStack } from "@/components/system";
import { useContinueWatching } from "@/hooks/use-movies";
import { useAuth } from "@/lib/context/auth-context";
import { useLanguage } from "@/lib/context/language-context";
import { formatDuration } from "@/lib/format";
import { useSection } from "@/lib/i18n/sections/define";
import { homeText } from "@/lib/i18n/sections/home";
import { mediaText } from "@/lib/i18n/sections/media";
import { shellText } from "@/lib/i18n/sections/shell";
import { resumeHref } from "@/lib/player/resume";
import type { Movie } from "@/types/movie";
import type { SeriesListItem } from "@/types/series";
import { RankedRail, RankedRailSkeleton } from "./RankedRail";
import { HOME_STALE_MS, ROW_LIMIT, TOP_10_LIMIT, useBecauseYouWatched, useHomeMovies } from "./home-data";

/**
 * HOME'S ROWS (HomeMovies.dc.html), each one hiding itself when it has
 * nothing, failed, or is not allowed for this viewer — never an empty
 * heading. Every "See all" goes to the matching Media destination that
 * already exists. (The books shelf now lives inside the "Read on MyanFlix"
 * band — HomeBooksBand.tsx — with the same data and rules.)
 */

/** Where "See all" goes for the movie rows: the Movies hub, sorted the same way. */
export const HOME_SEE_ALL = {
  recentlyAdded: MEDIA_CHIP_HREF.movies,
  series: MEDIA_CHIP_HREF.series,
  books: MEDIA_CHIP_HREF.books,
  mostViewed: `${MEDIA_CHIP_HREF.movies}?sort=mostViewed`,
  topRated: `${MEDIA_CHIP_HREF.movies}?sort=rating`,
  watchHistory: "/watch-history",
} as const;

/** A movie row: skeleton while loading, nothing when empty or failed. */
export function HomeMovieRow({
  title,
  subtitle,
  movies,
  isLoading,
  seeAllHref,
  topRated = false,
}: {
  title: string;
  subtitle?: string;
  movies: Movie[] | undefined;
  isLoading: boolean;
  seeAllHref: string;
  topRated?: boolean;
}) {
  if (isLoading) return <RowSkeleton />;
  if (!movies || movies.length === 0) return null;
  return (
    <Row title={title} subtitle={subtitle} seeAllHref={seeAllHref}>
      {movies.map((movie) => (
        <MovieCard key={movie.id} movie={movie} layout="rail" showRating={topRated} metaYearOnly={topRated} />
      ))}
    </Row>
  );
}

/** New series — newest first, the SERIES-tagged posters of the board. */
export function HomeSeriesRow({
  title,
  items,
  isLoading,
}: {
  title: string;
  items: SeriesListItem[] | undefined;
  isLoading: boolean;
}) {
  if (isLoading) return <RowSkeleton />;
  if (!items || items.length === 0) return null;
  return (
    <Row title={title} seeAllHref={HOME_SEE_ALL.series}>
      {items.map((series) => (
        <SeriesCard key={series.id} series={series} layout="rail" />
      ))}
    </Row>
  );
}

/**
 * Continue watching — signed-in viewers only, 1–95% watched (the hook
 * filters), wide 16:9 cards with the red progress line, each resuming
 * playback at the saved second. Hidden when there is nothing to resume.
 */
export function HomeContinueWatching() {
  const m = useSection(mediaText);
  const s = useSection(shellText);
  const { isAuthenticated } = useAuth();
  const { data, isLoading } = useContinueWatching(isAuthenticated, { staleTime: HOME_STALE_MS });

  if (!isAuthenticated) return null;
  if (isLoading) return <RowSkeleton kind="landscape" />;
  const entries = data ?? [];
  if (entries.length === 0) return null;

  return (
    <Row title={m.continueWatching} seeAllHref={HOME_SEE_ALL.watchHistory}>
      {entries.map((entry) => {
        const pct = Math.round(Math.min(100, Math.max(0, entry.progressPercent)));
        return (
          <LandscapeCard
            key={entry.id}
            layout="rail"
            title={entry.movieTitle}
            href={resumeHref(entry.movieId, entry.progressPercent, entry.lastPositionSeconds)}
            imageUrl={entry.posterUrl}
            progress={pct}
            meta={m.watchedMeta(formatDuration(entry.durationMinutes), pct)}
            a11yLabel={s.resume(entry.movieTitle, pct)}
          />
        );
      })}
    </Row>
  );
}

/** Top 10 most viewed — the ranked rail (movies sorted by mostViewed). */
export function HomeTop10() {
  const h = useSection(homeText);
  const top10 = useHomeMovies("most-viewed", { sort: "mostViewed", limit: TOP_10_LIMIT });
  if (top10.isLoading) return <RankedRailSkeleton />;
  if (!top10.data || top10.data.length === 0) return null;
  return <RankedRail title={h.top10} movies={top10.data} seeAllHref={HOME_SEE_ALL.mostViewed} />;
}

/** Top rated — movies sorted by rating, the star + year under each poster. */
export function HomeTopRated() {
  const { t } = useLanguage();
  const m = useSection(mediaText);
  const topRated = useHomeMovies("top-rated", { sort: "rating", limit: ROW_LIMIT });
  return (
    <HomeMovieRow
      title={t.browse.topRatedRow}
      subtitle={m.topRatedSub}
      movies={topRated.data}
      isLoading={topRated.isLoading}
      seeAllHref={HOME_SEE_ALL.topRated}
      topRated
    />
  );
}

/**
 * Because you watched <title> — signed-in only: titles in the same first
 * category (or genre) as the viewer's most recently watched title, without
 * that title. Hidden when there is no history or nothing to show. "See all"
 * opens that category / genre in the Media genre view.
 */
export function HomeBecauseYouWatched() {
  const h = useSection(homeText);
  const { isAuthenticated } = useAuth();
  const because = useBecauseYouWatched(isAuthenticated);

  if (!isAuthenticated) return null;
  if (because.isLoading) return <RowSkeleton />;
  if (!because.title || !because.pick || !because.items || because.items.length === 0) return null;

  const seeAllHref =
    because.pick.kind === "category"
      ? genreViewHref("movies", { categoryId: because.pick.id, name: because.pick.name })
      : genreViewHref("movies", { genre: because.pick.name });

  return (
    <Row title={h.becauseYouWatched(because.title)} subtitle={h.moreOf(because.pick.name)} seeAllHref={seeAllHref}>
      {because.items.map((movie) => (
        <MovieCard key={movie.id} movie={movie} layout="rail" />
      ))}
    </Row>
  );
}

/**
 * THE LOADING BOARD (HomeLoading.dc.html): a hero-sized block pulled up
 * under the bar (inline margin, not `under-bar`, so the bar stays frosted
 * while loading) with the copy's skeleton lines bottom-left, then the rows'
 * skeletons. aria-busy with a hidden "Loading Home" status.
 */
export function HomeSkeleton() {
  const h = useSection(homeText);
  return (
    <div aria-busy="true">
      <div
        aria-hidden
        className="relative h-[clamp(600px,56vw,820px)] bg-surface"
        style={{ marginTop: "calc(-1 * var(--shell-bar-h, 124px))" }}
      >
        <div
          className="absolute inset-x-0 bottom-0 h-[300px]"
          style={{ background: "linear-gradient(180deg, rgba(8,8,11,0) 0%, var(--mq-ground) 100%)" }}
        />
        <div className="absolute bottom-[clamp(40px,5vw,80px)] left-gutter flex w-[min(560px,calc(100%-2*var(--mq-gutter)))] flex-col">
          <div className="flex gap-2">
            <span className="mq-skeleton h-6 w-14 rounded-[6px]" />
            <span className="mq-skeleton h-6 w-24 rounded-[6px]" />
          </div>
          <span className="mq-skeleton mt-3.5 h-8 w-[62%] rounded-[8px] desk:h-12" />
          <span className="mq-skeleton mt-3.5 h-3.5 w-[40%] rounded-[5px]" />
          <span className="mq-skeleton mt-4 h-3.5 w-[94%] rounded-[5px]" />
          <span className="mq-skeleton mt-2 h-3.5 w-[72%] rounded-[5px]" />
          <div className="mt-[22px] flex gap-3">
            <span className="mq-skeleton h-[52px] w-[150px] rounded-[12px]" />
            <span className="mq-skeleton h-[52px] w-[150px] rounded-[12px]" />
            <span className="mq-skeleton size-[52px] rounded-[12px]" />
          </div>
        </div>
      </div>
      <div aria-hidden className="mt-[clamp(28px,3vw,40px)] grid grid-cols-2 gap-x-4 gap-y-3 px-gutter desk:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <span key={i} className="mq-skeleton block h-32 rounded-[16px]" />
        ))}
      </div>
      <RowStack className="mt-[clamp(36px,3.4vw,52px)]">
        <RowSkeleton kind="landscape" count={5} />
        <RowSkeleton count={8} />
        <RowSkeleton count={8} />
      </RowStack>
      <p role="status" className="sr-only">
        {h.loadingHome}
      </p>
    </div>
  );
}
