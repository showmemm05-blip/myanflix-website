"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useQuery, type InfiniteData } from "@tanstack/react-query";
import { Film, Tv } from "lucide-react";

import { LandscapeCard } from "@/components/cards";
import type { FilterSheetFacets } from "@/components/filters/FilterSheet";
import {
  DEFAULT_FILTERS,
  DEFAULT_SERIES_FILTERS,
  type FilterState,
  type SeriesFilterState,
} from "@/components/filters/filter-types";
import type { ActivePill } from "@/components/browse/ActiveFilterPills";
import { CrownIcon, Row, RowSkeleton, RowStack } from "@/components/system";
import { ErrorState } from "@/components/empty/ErrorState";
import { useHomeMovies } from "@/components/home/home-data";
import { useCatalogFilters } from "@/hooks/use-catalog-filters";
import { useContinueWatching, useMovieFacets, useMoviesInfinite } from "@/hooks/use-movies";
import { useSeriesFacets, useSeriesInfinite } from "@/hooks/use-series";
import { useAuth } from "@/lib/context/auth-context";
import { useLanguage } from "@/lib/context/language-context";
import { formatDuration } from "@/lib/format";
import { useSection } from "@/lib/i18n/sections/define";
import { mediaText } from "@/lib/i18n/sections/media";
import { shellText } from "@/lib/i18n/sections/shell";
import { resumeHref } from "@/lib/player/resume";
import { movieService } from "@/services/api/movieService";
import type { PaginatedResponse } from "@/types/api";
import type { Movie } from "@/types/movie";
import type { SeriesListItem, SeriesSortOption } from "@/types/series";
import { AllSection } from "./AllSection";
import { HubSkeleton, useScrollMemory } from "./CatalogParts";
import { genreViewHref, useMovieRow, useSeriesRow, type MediaKind } from "./media-data";
import { MovieCard, SeriesCard, SeriesWideCard } from "./MovieCard";
import { MovieHero } from "./MovieHero";
import { SeriesHero } from "./SeriesHero";

/** How many quick genres the chip rail offers — the sheet has the full facet list. */
const QUICK_GENRE_COUNT = 12;
/** How many titles a hub row shows. */
const ROW_LIMIT = 12;

// Closed until asked for, so their code is fetched on first open instead of
// with the page: "Sort & filter" (FilterSheet) and the Categories overlay.
const FilterSheet = dynamic(() => import("@/components/filters/FilterSheet").then((mod) => mod.FilterSheet), {
  ssr: false,
});
const CategoriesOverlayFromUrl = dynamic(
  () => import("./CategoriesOverlay").then((mod) => mod.CategoriesOverlayFromUrl),
  { ssr: false },
);

/**
 * True once `open` has been true: the lazy dialog then stays mounted, so it
 * can play its closing animation and keeps its state between openings.
 */
function useOpenedOnce(open: boolean): boolean {
  const [opened, setOpened] = useState(open);
  if (open && !opened) setOpened(true);
  return opened || open;
}

/** The plain unfiltered catalogue read: nothing set but the page size. */
function isPlainQuery(query: object): boolean {
  return Object.entries(query).every(([key, value]) => key === "limit" || value === undefined);
}

/**
 * The "newest added" row of a hub is the first ROW_LIMIT titles of the
 * unfiltered "All" grid (same endpoint, same default order), so while the
 * grid shows the plain catalogue the row is cut from its first page instead
 * of being asked for again. The last plain first page is remembered, so
 * filtering the grid afterwards leaves the row as it was. Only when the hub
 * opens already filtered (saved filters) does the row need its own request:
 * `needOwnQuery` says so.
 */
function useRowFromGrid<T>(
  grid: {
    data: InfiniteData<PaginatedResponse<T>, unknown> | undefined;
    isPlaceholderData: boolean;
    isLoading: boolean;
    isError: boolean;
  },
  plain: boolean,
  hydrated: boolean,
) {
  const firstPage = hydrated && plain && !grid.isPlaceholderData ? grid.data?.pages[0] : undefined;
  const [seenPage, setSeenPage] = useState(firstPage);
  if (firstPage && firstPage !== seenPage) setSeenPage(firstPage);
  const page = firstPage ?? seenPage;
  const items = useMemo(() => page?.items.slice(0, ROW_LIMIT), [page]);
  return {
    items,
    /** The grid it would come from is still on its first load (or the saved filters are not read yet). */
    waitingOnGrid: !items && (!hydrated || (plain && grid.isLoading)),
    failedWithGrid: !items && plain && grid.isError,
    needOwnQuery: hydrated && !plain && !items,
  };
}

/**
 * THE MOVIES / SERIES HUB — what /media and /media/movies render.
 *
 * Which hub is decided by the address alone: `?tab=series` (or the old
 * `?type=series` while no `tab` is set) is the Series hub, anything else the
 * Movies hub. The hub is keyed by it, so a chip that switches kind remounts
 * the catalog and its filter state is read fresh from the URL. The
 * Categories overlay sits beside it, driven by `?categories=` (and opening
 * on this hub's type).
 */
export function CatalogHubRoute() {
  const params = useSearchParams();
  const tab = params.get("tab");
  const kind: MediaKind = tab === "series" || (tab === null && params.get("type") === "series") ? "series" : "movies";
  // The overlay opens from `?categories=`; its code loads the first time it does.
  const categoriesOpened = useOpenedOnce(params.get("categories") !== null);

  return (
    <>
      {kind === "series" ? <SeriesHub key="series" /> : <MoviesHub key="movies" />}
      {categoriesOpened && <CategoriesOverlayFromUrl pageKind={kind} />}
    </>
  );
}

/** Scroll to the "All" section and move focus to it (rows' "See all"). */
function revealAll(el: HTMLElement | null) {
  if (!el) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  el.focus({ preventScroll: true });
}

function SeeAllButton({ label, onClick }: { label: string; onClick: () => void }) {
  const s = useSection(shellText);
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="mq-link cursor-pointer rounded-[6px] border-0 bg-transparent p-0 text-[15px] leading-5 font-bold outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link"
    >
      {s.seeAll}
    </button>
  );
}

/** A movie row that hides itself when it has nothing (or failed) — never an empty heading. */
function MovieRow({
  title,
  subtitle,
  movies,
  isLoading,
  onSeeAll,
  crown = false,
  topRated = false,
}: {
  title: string;
  subtitle: string;
  movies: Movie[] | undefined;
  isLoading: boolean;
  onSeeAll: () => void;
  crown?: boolean;
  topRated?: boolean;
}) {
  const m = useSection(mediaText);
  if (isLoading) return <RowSkeleton />;
  if (!movies || movies.length === 0) return null;
  return (
    <Row
      title={
        crown ? (
          <span className="flex items-center gap-2">
            <CrownIcon size={18} className="text-gold" />
            {title}
          </span>
        ) : (
          title
        )
      }
      subtitle={subtitle}
      action={<SeeAllButton label={m.seeAllOf(title)} onClick={onSeeAll} />}
    >
      {movies.map((movie) => (
        <MovieCard key={movie.id} movie={movie} layout="rail" showRating={topRated} metaYearOnly={topRated} />
      ))}
    </Row>
  );
}

/** Continue watching — signed-in viewers only, 1–95% watched, each card resumes playback. */
function ContinueWatchingRow() {
  const m = useSection(mediaText);
  const s = useSection(shellText);
  const { isAuthenticated } = useAuth();
  const { data, isLoading } = useContinueWatching(isAuthenticated);

  if (!isAuthenticated) return null;
  if (isLoading) return <RowSkeleton kind="landscape" />;
  const entries = data ?? [];
  if (entries.length === 0) return null;

  return (
    <Row title={m.continueWatching} seeAllHref="/watch-history" seeAllLabel={m.watchHistory}>
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

/* ═════════════════════════════════ MOVIES ═════════════════════════════════ */

function MoviesHub() {
  const { t } = useLanguage();
  const m = useSection(mediaText);
  const catalog = useCatalogFilters("media");
  const {
    filters,
    updateFilters,
    clearAll,
    density,
    setDensity,
    activeCount,
    pills,
    movieQuery,
    movieSortOptions,
    effectiveTerm,
    isDebouncing,
    clearSearch,
    hydrated,
  } = catalog;
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersOpened = useOpenedOnce(filtersOpen);
  const allRef = useRef<HTMLElement>(null);

  // "Top rated" is Home's own row (same key, same GET /movies?sort=rating), so
  // Home → Media renders it from cache instead of asking twice. The other two
  // keys are shared with the search page's BrowseSurface, not with Home (the
  // "home" prefix is historical: the old Home page used to own them).
  const trending = useQuery({ queryKey: ["home", "most-purchased"], queryFn: () => movieService.getMostPurchased() });
  const topRated = useHomeMovies("top-rated", { sort: "rating", limit: ROW_LIMIT });
  const premium = useMovieRow("premium", { accessType: "SUBSCRIPTION", limit: ROW_LIMIT });
  const free = useMovieRow("free", { accessType: "FREE", limit: ROW_LIMIT });
  const facets = useMovieFacets();
  // Waits for the saved filters/search to be read, so a returning visitor's
  // grid is fetched once, with their filters — not first with the defaults.
  const infinite = useMoviesInfinite(movieQuery, { enabled: hydrated });
  // "New releases" = the first 12 of the unfiltered grid (see useRowFromGrid).
  const newFromGrid = useRowFromGrid(infinite, isPlainQuery(movieQuery), hydrated);
  const newReleasesQuery = useQuery({
    queryKey: ["home", "new"],
    queryFn: () => movieService.getNewReleases(ROW_LIMIT),
    enabled: newFromGrid.needOwnQuery,
  });
  const newReleases = {
    data: newFromGrid.items ?? newReleasesQuery.data,
    isLoading: !newFromGrid.items && (newFromGrid.waitingOnGrid || newReleasesQuery.isLoading),
  };

  const movies = useMemo(() => infinite.data?.pages.flatMap((p) => p.items) ?? [], [infinite.data]);
  const total = infinite.data?.pages[0]?.total;
  const countReady = total !== undefined && !infinite.isPlaceholderData && !isDebouncing;

  const heroPicks = (topRated.data?.length ? topRated.data : trending.data) ?? [];
  const heroLoading = heroPicks.length === 0 && (topRated.isLoading || trending.isLoading);
  const pageFailed = topRated.isError && trending.isError && infinite.isError && movies.length === 0;

  useScrollMemory("myanflix-media-scroll:movies", hydrated && !heroLoading && !infinite.isLoading);

  const allPills: ActivePill[] = useMemo(
    () =>
      effectiveTerm
        ? [{ key: "q", label: m.searchPill(effectiveTerm), onRemove: clearSearch }, ...pills]
        : pills,
    [effectiveTerm, pills, clearSearch, m],
  );
  const narrowed = allPills.length > 0;
  const clearEverything = useCallback(() => {
    clearAll();
    clearSearch();
  }, [clearAll, clearSearch]);

  const seeAll = (patch: Partial<FilterState>) => () => {
    updateFilters({ ...DEFAULT_FILTERS, ...patch });
    clearSearch();
    revealAll(allRef.current);
  };

  const quickGenres = (facets.data?.genres ?? []).slice(0, QUICK_GENRE_COUNT).map((g) => g.value);
  const { fetchNextPage } = infinite;
  const loadMore = useCallback(() => void fetchNextPage(), [fetchNextPage]);

  if (pageFailed) {
    return (
      <div className="px-gutter pt-[clamp(96px,10vw,160px)] pb-[120px]">
        <h1 className="sr-only">{m.movies}</h1>
        <ErrorState
          title={m.loadMoviesFailed}
          description={t.browse.loadFailed}
          onRetry={() => {
            void topRated.refetch();
            void trending.refetch();
            void infinite.refetch();
          }}
        />
      </div>
    );
  }

  return (
    <div className="mq-rise">
      {heroLoading ? (
        <HubSkeleton label={m.loadingMovies} rows={[]} />
      ) : heroPicks.length > 0 ? (
        <MovieHero movies={heroPicks} />
      ) : (
        <h1 className="px-gutter pt-10 pb-2 text-title text-fg">{m.movies}</h1>
      )}

      <RowStack className="mt-2">
        <ContinueWatchingRow />
        <MovieRow
          title={t.browse.trendingRow}
          subtitle={m.trendingSub}
          movies={trending.data}
          isLoading={trending.isLoading}
          onSeeAll={seeAll({ sort: "mostPurchased" })}
        />
        <MovieRow
          title={m.newReleases}
          subtitle={m.newReleasesSub}
          movies={newReleases.data}
          isLoading={newReleases.isLoading}
          onSeeAll={seeAll({})}
        />
        <MovieRow
          title={m.premiumPicks}
          subtitle={m.premiumPicksSub}
          movies={premium.data}
          isLoading={premium.isLoading}
          onSeeAll={seeAll({ accessType: "SUBSCRIPTION" })}
          crown
        />
        <MovieRow
          title={m.freeToWatch}
          subtitle={m.freeToWatchSub}
          movies={free.data}
          isLoading={free.isLoading}
          onSeeAll={seeAll({ accessType: "FREE" })}
        />
        <MovieRow
          title={t.browse.topRatedRow}
          subtitle={m.topRatedSub}
          movies={topRated.data}
          isLoading={topRated.isLoading}
          onSeeAll={seeAll({ sort: "rating" })}
          topRated
        />

        <AllSection
          ref={allRef}
          headingId="h-all-movies"
          title={m.allMovies}
          countLabel={countReady ? (narrowed ? t.filters.matchCount(total ?? 0) : m.movieCount(total ?? 0)) : null}
          sort={filters.sort}
          sortOptions={movieSortOptions}
          onSortChange={(sort) => updateFilters({ sort: sort as FilterState["sort"] })}
          density={density}
          onDensityChange={setDensity}
          activeCount={activeCount}
          onOpenFilters={() => setFiltersOpen(true)}
          genres={quickGenres}
          selectedGenre={filters.genres.length === 1 ? filters.genres[0] : undefined}
          onGenreSelect={(genre) => updateFilters({ genres: genre ? [genre] : [] })}
          pills={allPills}
          onClearAll={clearEverything}
          itemCount={movies.length}
          isLoading={infinite.isLoading}
          isStale={infinite.isPlaceholderData}
          isError={infinite.isError}
          onRetry={() => void infinite.refetch()}
          hasNextPage={infinite.hasNextPage}
          isFetchingNextPage={infinite.isFetchingNextPage}
          onLoadMore={loadMore}
          loadingLabel={m.loadingMovies}
          loadingMoreLabel={m.loadingMoreMovies}
          errorTitle={m.loadMoviesFailed}
          emptyIcon={Film}
          emptyTitle={narrowed ? m.noMoviesMatch : t.browse.noMoviesTitle}
          emptyBody={narrowed ? m.noMatchBody : t.media.emptyLibraryBody}
          clearLabel={m.clearFilters}
        >
          {/* No `priority`: this grid sits below the hero and five rows, so
              its posters should not compete with what is on screen first. */}
          {movies.map((movie) => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </AllSection>
      </RowStack>

      {filtersOpened && (
        <FilterSheet
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          values={filters}
          onChange={updateFilters}
          onClear={clearAll}
          sortOptions={movieSortOptions}
          facets={facets.data}
          activeCount={activeCount}
          resultTotal={total}
          isCounting={isDebouncing || infinite.isFetching}
        />
      )}
    </div>
  );
}

/* ═════════════════════════════════ SERIES ═════════════════════════════════ */

/** The most common category among a pool of series — the hub's category row. */
function topCategory(pool: SeriesListItem[] | undefined): { id: string; name: string } | null {
  if (!pool) return null;
  const counts = new Map<string, { id: string; name: string; n: number }>();
  for (const s of pool) {
    for (const c of s.categories ?? []) {
      const entry = counts.get(c.id) ?? { id: c.id, name: c.name, n: 0 };
      entry.n += 1;
      counts.set(c.id, entry);
    }
  }
  let best: { id: string; name: string; n: number } | null = null;
  for (const entry of counts.values()) if (!best || entry.n > best.n) best = entry;
  return best ? { id: best.id, name: best.name } : null;
}

function SeriesRow({
  title,
  subtitle,
  items,
  isLoading,
  onSeeAll,
  seeAllHref,
  wide = false,
}: {
  title: string;
  subtitle: string;
  items: SeriesListItem[] | undefined;
  isLoading: boolean;
  onSeeAll?: () => void;
  seeAllHref?: string;
  wide?: boolean;
}) {
  const m = useSection(mediaText);
  if (isLoading) return <RowSkeleton kind={wide ? "landscape" : "poster"} />;
  if (!items || items.length === 0) return null;
  return (
    <Row
      title={title}
      subtitle={subtitle}
      seeAllHref={seeAllHref}
      action={onSeeAll ? <SeeAllButton label={m.seeAllOf(title)} onClick={onSeeAll} /> : undefined}
    >
      {items.map((series) =>
        wide ? <SeriesWideCard key={series.id} series={series} /> : <SeriesCard key={series.id} series={series} layout="rail" />,
      )}
    </Row>
  );
}

function SeriesHub() {
  const { t } = useLanguage();
  const m = useSection(mediaText);
  const catalog = useCatalogFilters("media");
  const {
    seriesFilters,
    updateSeriesFilters,
    clearAll,
    density,
    setDensity,
    activeCount,
    pills,
    seriesQuery,
    seriesSortOptions,
    effectiveTerm,
    isDebouncing,
    clearSearch,
    hydrated,
  } = catalog;
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersOpened = useOpenedOnce(filtersOpen);
  const allRef = useRef<HTMLElement>(null);

  const facets = useSeriesFacets();
  const newest = useSeriesRow("newest", { sort: "newest", limit: ROW_LIMIT });
  const free = useSeriesRow("free", { accessType: "FREE", limit: ROW_LIMIT });
  const topGenre = facets.data?.genres[0]?.value;
  const genreRow = useSeriesRow(`genre:${topGenre ?? ""}`, { genres: topGenre ? [topGenre] : undefined, limit: ROW_LIMIT }, Boolean(topGenre));
  const pool = useSeriesRow("pool", { limit: 50 });
  const category = topCategory(pool.data);
  const categoryItems = category ? (pool.data ?? []).filter((s) => s.categories?.some((c) => c.id === category.id)).slice(0, ROW_LIMIT) : [];
  // Waits for the saved filters/search to be read (see MoviesHub).
  const infinite = useSeriesInfinite(seriesQuery, { enabled: hydrated });
  // "Recently added" (and the hero) = the first 12 of the unfiltered grid.
  const recentFromGrid = useRowFromGrid(infinite, isPlainQuery(seriesQuery), hydrated);
  const recentQuery = useSeriesRow("recent", { limit: ROW_LIMIT }, recentFromGrid.needOwnQuery);
  const recent = {
    data: recentFromGrid.items ?? recentQuery.data,
    isLoading: !recentFromGrid.items && (recentFromGrid.waitingOnGrid || recentQuery.isLoading),
    isError: recentFromGrid.failedWithGrid || (!recentFromGrid.items && recentQuery.isError),
    refetch: () => (recentFromGrid.needOwnQuery ? recentQuery.refetch() : infinite.refetch()),
  };

  const series = useMemo(() => infinite.data?.pages.flatMap((p) => p.items) ?? [], [infinite.data]);
  const total = infinite.data?.pages[0]?.total;
  const countReady = total !== undefined && !infinite.isPlaceholderData && !isDebouncing;

  const heroPicks = recent.data ?? [];
  const heroLoading = recent.isLoading;
  const pageFailed = recent.isError && infinite.isError && series.length === 0;

  useScrollMemory("myanflix-media-scroll:series", hydrated && !heroLoading && !infinite.isLoading);

  const allPills: ActivePill[] = useMemo(
    () =>
      effectiveTerm
        ? [{ key: "q", label: m.searchPill(effectiveTerm), onRemove: clearSearch }, ...pills]
        : pills,
    [effectiveTerm, pills, clearSearch, m],
  );
  const narrowed = allPills.length > 0;
  const clearEverything = useCallback(() => {
    clearAll();
    clearSearch();
  }, [clearAll, clearSearch]);

  const seeAll = (patch: Partial<SeriesFilterState>) => () => {
    updateSeriesFilters({ ...DEFAULT_SERIES_FILTERS, ...patch });
    clearSearch();
    revealAll(allRef.current);
  };

  // The sheet edits one shape; series get the subset view, and movie-only
  // fields are stripped from their patches (as the browse surface does).
  const sheetValues: FilterState = {
    ...DEFAULT_FILTERS,
    sort: seriesFilters.sort,
    genres: seriesFilters.genres,
    languages: seriesFilters.languages,
    yearFrom: seriesFilters.yearFrom,
    yearTo: seriesFilters.yearTo,
    accessType: seriesFilters.accessType,
  };
  const sheetFacets: FilterSheetFacets | undefined = facets.data
    ? { genres: facets.data.genres, languages: facets.data.languages, years: facets.data.years }
    : undefined;
  const handleSheetChange = (next: Partial<FilterState>) => {
    const patch: Partial<SeriesFilterState> = {};
    if (next.sort !== undefined) patch.sort = next.sort as SeriesSortOption;
    if (next.genres !== undefined) patch.genres = next.genres;
    if (next.languages !== undefined) patch.languages = next.languages;
    if ("yearFrom" in next) patch.yearFrom = next.yearFrom;
    if ("yearTo" in next) patch.yearTo = next.yearTo;
    if ("accessType" in next) patch.accessType = next.accessType;
    updateSeriesFilters(patch);
  };

  const quickGenres = (facets.data?.genres ?? []).slice(0, QUICK_GENRE_COUNT).map((g) => g.value);
  const { fetchNextPage } = infinite;
  const loadMore = useCallback(() => void fetchNextPage(), [fetchNextPage]);

  if (pageFailed) {
    return (
      <div className="px-gutter pt-[clamp(96px,10vw,160px)] pb-[120px]">
        <h1 className="sr-only">{m.series}</h1>
        <ErrorState
          title={m.loadSeriesFailed}
          description={t.browse.loadFailed}
          onRetry={() => {
            void recent.refetch();
            void infinite.refetch();
          }}
        />
      </div>
    );
  }

  return (
    <div className="mq-rise">
      {heroLoading ? (
        <HubSkeleton label={m.loadingSeries} rows={[]} />
      ) : heroPicks.length > 0 ? (
        <SeriesHero series={heroPicks} />
      ) : (
        <h1 className="px-gutter pt-10 pb-2 text-title text-fg">{m.series}</h1>
      )}

      <RowStack className="mt-2">
        <SeriesRow
          title={m.newReleases}
          subtitle={m.seriesNewSub}
          items={newest.data}
          isLoading={newest.isLoading}
          onSeeAll={seeAll({ sort: "newest" })}
        />
        <SeriesRow
          title={m.recentlyAdded}
          subtitle={m.seriesRecentSub}
          items={recent.data}
          isLoading={recent.isLoading}
          onSeeAll={seeAll({})}
          wide
        />
        <SeriesRow
          title={m.freeToWatch}
          subtitle={m.freeToWatchSub}
          items={free.data}
          isLoading={free.isLoading}
          onSeeAll={seeAll({ accessType: "FREE" })}
        />
        {topGenre && (
          <SeriesRow
            title={topGenre}
            subtitle={m.genreSub}
            items={genreRow.data}
            isLoading={genreRow.isLoading}
            seeAllHref={genreViewHref("series", { genre: topGenre })}
          />
        )}
        {category && (
          <SeriesRow
            title={category.name}
            subtitle={m.categorySub}
            items={categoryItems}
            isLoading={false}
            seeAllHref={genreViewHref("series", { categoryId: category.id, name: category.name })}
          />
        )}

        <AllSection
          ref={allRef}
          headingId="h-all-series"
          title={m.allSeries}
          countLabel={countReady ? (narrowed ? t.filters.matchCount(total ?? 0) : m.seriesCount(total ?? 0)) : null}
          sort={seriesFilters.sort}
          sortOptions={seriesSortOptions}
          onSortChange={(sort) => updateSeriesFilters({ sort: sort as SeriesSortOption })}
          density={density}
          onDensityChange={setDensity}
          activeCount={activeCount}
          onOpenFilters={() => setFiltersOpen(true)}
          genres={quickGenres}
          selectedGenre={seriesFilters.genres.length === 1 ? seriesFilters.genres[0] : undefined}
          onGenreSelect={(genre) => updateSeriesFilters({ genres: genre ? [genre] : [] })}
          pills={allPills}
          onClearAll={clearEverything}
          itemCount={series.length}
          isLoading={infinite.isLoading}
          isStale={infinite.isPlaceholderData}
          isError={infinite.isError}
          onRetry={() => void infinite.refetch()}
          hasNextPage={infinite.hasNextPage}
          isFetchingNextPage={infinite.isFetchingNextPage}
          onLoadMore={loadMore}
          loadingLabel={m.loadingSeries}
          loadingMoreLabel={m.loadingMoreSeries}
          errorTitle={m.loadSeriesFailed}
          emptyIcon={Tv}
          emptyTitle={narrowed ? m.noSeriesMatch : t.browse.noSeriesTitle}
          emptyBody={narrowed ? m.noMatchBody : t.browse.noSeriesBody}
          clearLabel={m.clearFilters}
        >
          {/* No `priority` here either: the grid is below the hero and rows. */}
          {series.map((item) => (
            <SeriesCard key={item.id} series={item} />
          ))}
        </AllSection>
      </RowStack>

      {filtersOpened && (
        <FilterSheet
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          values={sheetValues}
          onChange={handleSheetChange}
          onClear={clearAll}
          sortOptions={seriesSortOptions}
          isSeries
          facets={sheetFacets}
          activeCount={activeCount}
          resultTotal={total}
          isCounting={isDebouncing || infinite.isFetching}
        />
      )}
    </div>
  );
}
