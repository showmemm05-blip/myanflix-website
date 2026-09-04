"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Film, LoaderCircle, Music, Tv, X } from "lucide-react";
import { SpotlightHero, SpotlightHeroSkeleton } from "./SpotlightHero";
import { BrowseBar, DensityToggle } from "./BrowseBar";
import { ActiveFilterPills } from "./ActiveFilterPills";
import { PosterGrid } from "./PosterGrid";
import { PosterRail } from "./PosterRail";
import { ContinueWatchingRail } from "./ContinueWatchingRail";
import { movieToBrowseItem, seriesToBrowseItem } from "./browse-item";
import { FilterSheet, type FilterSheetFacets } from "@/components/filters/FilterSheet";
import { AuroraBackdrop, Chip, chipClass, SectionHeader } from "@/components/system";
import {
  DEFAULT_FILTERS,
  type FilterState,
  type SeriesFilterState,
} from "@/components/filters/filter-types";
import { EmptyState } from "@/components/empty/EmptyState";
import { useHomeRows, useMovieFacets, useMoviesInfinite } from "@/hooks/use-movies";
import { useSeriesFacets, useSeriesInfinite } from "@/hooks/use-series";
import { useCatalogFilters } from "@/hooks/use-catalog-filters";
import { useBooks } from "@/hooks/use-books";
import { BookCard } from "@/components/media/BookCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/lib/context/language-context";
import { formatDuration } from "@/lib/format";
import type { Movie } from "@/types/movie";
import type { SeriesListItem, SeriesSortOption } from "@/types/series";

const SCROLL_STORAGE_KEY = "myanflix-movies-scroll";

/** How many quick-genre entries the bar's select offers — the sheet has the full facet list. */
const QUICK_GENRE_COUNT = 12;

/**
 * THE BROWSE SURFACE — the catalog, its search, its filters and its rails.
 *
 * One surface backs both routes because they are genuinely the same screen:
 * `/media/movies` is the dense catalog (tabs restricted to Movies|Series,
 * grid-first — no hero, no idle rails), `/search` is the same machinery as a
 * destination of its own (all four tabs, the field pinned open, editorial
 * rails as the idle state). Same filter-state owner (`use-catalog-filters`),
 * same query hooks, same sheet — the old parallel MoviesCatalog is deleted.
 *
 * Filtering, sorting and counting all happen SERVER-SIDE: this component only
 * renders pages and totals it was given.
 */
export function BrowseSurface({ mode = "search" }: { mode?: "media" | "search" }) {
  const { t } = useLanguage();
  const isSearchSurface = mode === "search";

  const {
    tab,
    setTab,
    allowedTabs,
    search,
    setSearch,
    effectiveTerm,
    isDebouncing,
    isTooShort,
    clearSearch,
    filters,
    seriesFilters,
    updateFilters,
    updateSeriesFilters,
    clearAll,
    density,
    setDensity,
    activeCount,
    pills,
    movieQuery,
    seriesQuery,
    movieSortOptions,
    seriesSortOptions,
  } = useCatalogFilters(mode);

  const [filtersOpen, setFiltersOpen] = useState(false);

  const isMoviesTab = tab === "movies";
  /** Rails are the idle state; the moment the user narrows anything, the page becomes a result list. */
  const isNarrowed = Boolean(effectiveTerm) || activeCount > 0 || pills.length > 0;

  const homeRows = useHomeRows();
  const movieFacets = useMovieFacets();
  const seriesFacets = useSeriesFacets();

  const moviesInfinite = useMoviesInfinite(movieQuery);
  const seriesInfinite = useSeriesInfinite(seriesQuery);

  // Books are searched server-side on the same settled term the movies grid
  // uses (the tab renders from this query alone).
  const booksQuery = useBooks({ limit: 60, search: effectiveTerm || undefined });

  /**
   * One "we're working on it" signal covering BOTH halves of the wait: the
   * debounce window and the request itself — of whichever query the visible
   * tab actually renders.
   */
  const resultsInfinite = tab === "series" ? seriesInfinite : moviesInfinite;
  const isSearching = isDebouncing || resultsInfinite.isFetching;
  /**
   * The grid is showing the PREVIOUS key's results while this one loads (see
   * `keepPreviousData` in the infinite hooks). While true, the heading and the
   * count would be captioning the wrong pictures — the count is withheld and
   * the grid recedes instead.
   */
  const moviesAreStale = moviesInfinite.isPlaceholderData;
  const seriesAreStale = seriesInfinite.isPlaceholderData;

  const movies: Movie[] = useMemo(
    () => moviesInfinite.data?.pages.flatMap((p) => p.items) ?? [],
    [moviesInfinite.data],
  );
  const series: SeriesListItem[] = useMemo(
    () => seriesInfinite.data?.pages.flatMap((p) => p.items) ?? [],
    [seriesInfinite.data],
  );

  /**
   * THE match count — the backend's total for the whole filtered set, carried
   * on every page. Never `items.length` (that's just how much has scrolled in
   * so far), and it also feeds the sheet's "Show N results" button, so both
   * numbers can never disagree.
   */
  const totalForTab = resultsInfinite.data?.pages[0]?.total;
  const countIsStale = tab === "series" ? seriesAreStale : moviesAreStale;
  const countReady = totalForTab !== undefined && !countIsStale && !isDebouncing;
  /** Only ever rendered behind a `countReady` guard — the 0 is unreachable. */
  const displayTotal = totalForTab ?? 0;

  const toMovieItems = useCallback(
    (items: Movie[] | undefined) =>
      (items ?? []).map((movie) => movieToBrowseItem(movie, formatDuration(movie.duration))),
    [],
  );
  const toSeriesItems = useCallback(
    (items: SeriesListItem[]) =>
      items.map((s) => seriesToBrowseItem(s, t.browse.episodeCount(s.episodeCount))),
    [t],
  );

  const movieItems = useMemo(() => toMovieItems(movies), [toMovieItems, movies]);
  const seriesItems = useMemo(() => toSeriesItems(series), [toSeriesItems, series]);

  // Restore the last scroll position once the page actually has content —
  // e.g. coming back from a detail page. Best-effort under infinite scroll:
  // only the first page is present on a fresh mount, so a position deep in
  // page 4 clamps to the bottom of page 1. Session-scoped on purpose.
  const scrollRestored = useRef(false);
  useEffect(() => {
    if (scrollRestored.current || moviesInfinite.isLoading) return;
    const saved = sessionStorage.getItem(SCROLL_STORAGE_KEY);
    if (saved) window.scrollTo({ top: Number(saved) });
    scrollRestored.current = true;
  }, [moviesInfinite.isLoading]);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        sessionStorage.setItem(SCROLL_STORAGE_KEY, String(window.scrollY));
        ticking = false;
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // The editorial hero and the idle rails are the SEARCH destination's idle
  // opening; /media/movies is the dense catalog and goes straight to the
  // grid, filters applied or not.
  const showRails = isMoviesTab && !isNarrowed && isSearchSurface;
  const showResults = isMoviesTab && !showRails;
  const showHero = showRails;
  const heroPicks = homeRows.mostPurchased.data ?? homeRows.topRated.data ?? [];

  // The bar's quick-genre select — top values from the DB-derived facets
  // (already ordered by count), never a hard-coded list.
  const quickGenres = useMemo(() => {
    const facetGenres = isMoviesTab
      ? movieFacets.data?.genres
      : seriesFacets.data?.genres;
    return (facetGenres ?? []).slice(0, QUICK_GENRE_COUNT).map((g) => g.value);
  }, [isMoviesTab, movieFacets.data, seriesFacets.data]);

  // The bar's genre select is a one-tap shortcut over the multi-select:
  // showing a single picked genre, replacing the set when used.
  const quickGenre = isMoviesTab
    ? filters.genres.length === 1
      ? filters.genres[0]
      : undefined
    : seriesFilters.genres.length === 1
      ? seriesFilters.genres[0]
      : undefined;

  // The sheet edits one shape for both tabs; series get the subset view and
  // movie-only fields are stripped from their patches below.
  const sheetValues: FilterState = isMoviesTab
    ? filters
    : {
        ...DEFAULT_FILTERS,
        sort: seriesFilters.sort,
        genres: seriesFilters.genres,
        languages: seriesFilters.languages,
        yearFrom: seriesFilters.yearFrom,
        yearTo: seriesFilters.yearTo,
        accessType: seriesFilters.accessType,
      };

  const sheetFacets: FilterSheetFacets | undefined = isMoviesTab
    ? movieFacets.data
    : seriesFacets.data
      ? {
          genres: seriesFacets.data.genres,
          languages: seriesFacets.data.languages,
          years: seriesFacets.data.years,
        }
      : undefined;

  const handleSheetChange = (next: Partial<FilterState>) => {
    if (isMoviesTab) {
      updateFilters(next);
      return;
    }
    // Series carry no cast/director/country/age-rating/rating/duration —
    // apply only the fields their state has, rather than storing values the
    // query would silently ignore.
    const patch: Partial<SeriesFilterState> = {};
    if (next.sort !== undefined) patch.sort = next.sort as SeriesSortOption;
    if (next.genres !== undefined) patch.genres = next.genres;
    if (next.languages !== undefined) patch.languages = next.languages;
    if ("yearFrom" in next) patch.yearFrom = next.yearFrom;
    if ("yearTo" in next) patch.yearTo = next.yearTo;
    if ("accessType" in next) patch.accessType = next.accessType;
    updateSeriesFilters(patch);
  };

  const matchCountLine = (
    <p className="flex items-center gap-2 text-sm text-muted-foreground nums" role="status">
      {countReady ? (
        t.filters.matchCount(displayTotal)
      ) : (
        <>
          <span aria-hidden>—</span>
          <LoaderCircle aria-hidden className="size-3.5 animate-spin opacity-60" />
        </>
      )}
    </p>
  );

  return (
    <div className="relative isolate flex flex-col">
      {/* Ambient page light. The hero carries its own aurora, so this only
          paints the top of the page when the hero isn't there. */}
      {!showHero && <AuroraBackdrop />}

      {showHero &&
        (homeRows.mostPurchased.isLoading && heroPicks.length === 0 ? (
          <SpotlightHeroSkeleton />
        ) : (
          <SpotlightHero movies={heroPicks} />
        ))}

      <BrowseBar
        tab={tab}
        onTabChange={setTab}
        tabs={allowedTabs}
        search={search}
        onSearchChange={setSearch}
        genre={quickGenre}
        genreOptions={quickGenres}
        onGenreChange={(genre) =>
          isMoviesTab
            ? updateFilters({ genres: genre ? [genre] : [] })
            : updateSeriesFilters({ genres: genre ? [genre] : [] })
        }
        sort={isMoviesTab ? filters.sort : seriesFilters.sort}
        sortOptions={isMoviesTab ? movieSortOptions : seriesSortOptions}
        onSortChange={(sort) =>
          isMoviesTab
            ? updateFilters({ sort: sort as FilterState["sort"] })
            : updateSeriesFilters({ sort: sort as SeriesSortOption })
        }
        onOpenFilters={() => setFiltersOpen(true)}
        activeFilterCount={activeCount}
        // On the Search destination the field is the reason for the page — it
        // never collapses back down to an icon.
        searchAlwaysOpen={isSearchSurface}
        isSearching={isSearching}
        isTooShort={isTooShort}
      />

      <div className="mx-auto w-full max-w-[1600px] flex-1 pt-4 pb-20">
        {/* What's currently narrowing the list — each value removable in
            place — plus the honest match count for exactly that narrowing. */}
        {(isMoviesTab || tab === "series") && (pills.length > 0 || Boolean(effectiveTerm)) && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 sm:px-6 lg:px-8">
            <ActiveFilterPills pills={pills} onClearAll={clearAll} />
            {matchCountLine}
          </div>
        )}

        {showRails && (
          <div className="mt-7 flex flex-col gap-10 sm:gap-12">
            {/* Where you left off comes before anything the catalog wants to
                show you — restored from the pre-redesign browse page. */}
            <ContinueWatchingRail />
            <PosterRail
              title={t.browse.trendingRow}
              items={toMovieItems(homeRows.mostPurchased.data)}
              isLoading={homeRows.mostPurchased.isLoading}
            />
            <PosterRail
              title={t.browse.newRow}
              items={toMovieItems(homeRows.newReleases.data)}
              isLoading={homeRows.newReleases.isLoading}
            />
            <PosterRail
              title={t.browse.topRatedRow}
              items={toMovieItems(homeRows.topRated.data)}
              isLoading={homeRows.topRated.isLoading}
            />
            <PosterRail
              title={t.browse.seriesRow}
              items={toSeriesItems(series.slice(0, 12))}
              isLoading={seriesInfinite.isLoading}
              viewAllHref="/media/movies?type=series"
            />
            <PosterRail title={t.browse.actionRow} items={toMovieItems(homeRows.action.data)} isLoading={homeRows.action.isLoading} />
            <PosterRail title={t.browse.dramaRow} items={toMovieItems(homeRows.drama.data)} isLoading={homeRows.drama.isLoading} />
            <PosterRail title={t.browse.comedyRow} items={toMovieItems(homeRows.comedy.data)} isLoading={homeRows.comedy.isLoading} />

            <section className="flex flex-col gap-5 px-4 sm:px-6 lg:px-8">
              <SectionHeader
                kicker={t.nav.media}
                title={t.browse.everything}
                action={
                  <>
                    {countReady && (
                      <Chip tone="neutral" variant="outline" size="sm" className="nums">
                        {t.browse.titleCount(displayTotal)}
                      </Chip>
                    )}
                    <DensityToggle density={density} onChange={setDensity} />
                  </>
                }
              />
              <PosterGrid
                items={movieItems}
                isLoading={moviesInfinite.isLoading}
                isStale={moviesAreStale}
                density={density}
              />
              <InfiniteScrollFooter
                hasNextPage={moviesInfinite.hasNextPage}
                isFetchingNextPage={moviesInfinite.isFetchingNextPage}
                onLoadMore={moviesInfinite.fetchNextPage}
                density={density}
              />
            </section>
          </div>
        )}

        {showResults && (
          <section className="mt-6 flex flex-col gap-5 px-4 sm:px-6 lg:px-8">
            <SectionHeader
              as="h1"
              size="page"
              kicker={effectiveTerm || isSearchSurface ? t.nav.search : t.nav.media}
              title={effectiveTerm ? t.browse.resultsFor(effectiveTerm) : t.search.movies}
              action={
                <>
                  {countReady && (
                    <Chip tone="neutral" variant="outline" size="sm" className="nums">
                      {t.browse.titleCount(displayTotal)}
                    </Chip>
                  )}
                  {effectiveTerm && (
                    <button
                      type="button"
                      onClick={clearSearch}
                      className={chipClass({ tone: "primary", variant: "outline", size: "sm" })}
                    >
                      {t.browse.clearSearch}
                      <X className="opacity-70" />
                    </button>
                  )}
                  <DensityToggle density={density} onChange={setDensity} />
                </>
              }
            />
            {!moviesInfinite.isLoading && movieItems.length === 0 ? (
              <EmptyState icon={Film} title={t.browse.noMoviesTitle} description={t.browse.noMoviesBody} />
            ) : (
              <>
                <PosterGrid
                  items={movieItems}
                  isLoading={moviesInfinite.isLoading}
                  isStale={moviesAreStale}
                  density={density}
                />
                <InfiniteScrollFooter
                  hasNextPage={moviesInfinite.hasNextPage}
                  isFetchingNextPage={moviesInfinite.isFetchingNextPage}
                  onLoadMore={moviesInfinite.fetchNextPage}
                  density={density}
                />
              </>
            )}
          </section>
        )}

        {tab === "series" && (
          <section className="mt-6 flex flex-col gap-5 px-4 sm:px-6 lg:px-8">
            <SectionHeader
              as="h1"
              size="page"
              kicker={effectiveTerm ? t.nav.search : t.nav.series}
              title={effectiveTerm ? t.browse.resultsFor(effectiveTerm) : t.browse.allSeries}
              action={
                <>
                  {countReady && (
                    <Chip tone="neutral" variant="outline" size="sm" className="nums">
                      {t.browse.titleCount(displayTotal)}
                    </Chip>
                  )}
                  {effectiveTerm && (
                    <button
                      type="button"
                      onClick={clearSearch}
                      className={chipClass({ tone: "primary", variant: "outline", size: "sm" })}
                    >
                      {t.browse.clearSearch}
                      <X className="opacity-70" />
                    </button>
                  )}
                  <DensityToggle density={density} onChange={setDensity} />
                </>
              }
            />
            {!seriesInfinite.isLoading && seriesItems.length === 0 ? (
              <EmptyState icon={Tv} title={t.browse.noSeriesTitle} description={t.browse.noSeriesBody} />
            ) : (
              <>
                <PosterGrid
                  items={seriesItems}
                  isLoading={seriesInfinite.isLoading}
                  isStale={seriesAreStale}
                  density={density}
                />
                <InfiniteScrollFooter
                  hasNextPage={seriesInfinite.hasNextPage}
                  isFetchingNextPage={seriesInfinite.isFetchingNextPage}
                  onLoadMore={seriesInfinite.fetchNextPage}
                  density={density}
                />
              </>
            )}
          </section>
        )}

        {tab === "books" && (
          <section className="mt-6 flex flex-col gap-5 px-4 sm:px-6 lg:px-8">
            <SectionHeader
              as="h1"
              size="page"
              kicker={effectiveTerm ? t.nav.search : t.search.books}
              title={effectiveTerm ? t.browse.resultsFor(effectiveTerm) : t.media.newBooks}
              action={
                <>
                  {!booksQuery.isLoading && (
                    <Chip tone="neutral" variant="outline" size="sm" className="nums">
                      {t.media.bookCount(booksQuery.data?.items.length ?? 0)}
                    </Chip>
                  )}
                  {effectiveTerm && (
                    <button
                      type="button"
                      onClick={clearSearch}
                      className={chipClass({ tone: "primary", variant: "outline", size: "sm" })}
                    >
                      {t.browse.clearSearch}
                      <X className="opacity-70" />
                    </button>
                  )}
                </>
              }
            />
            {booksQuery.isLoading ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {Array.from({ length: 12 }, (_, i) => (
                  <div key={i} className="flex flex-col">
                    <Skeleton className="aspect-[5/7] w-full rounded-r-lg rounded-l-[4px]" />
                    <Skeleton className="mt-3 h-4 w-full" />
                    <Skeleton className="mt-2 h-3 w-20" />
                  </div>
                ))}
              </div>
            ) : (booksQuery.data?.items.length ?? 0) === 0 ? (
              <EmptyState
                icon={BookOpen}
                title={effectiveTerm ? t.media.noBooksTitle : t.media.emptyLibraryTitle}
                description={effectiveTerm ? t.search.booksNoResults : t.media.emptyLibraryBody}
              />
            ) : (
              <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {booksQuery.data!.items.map((book, index) => (
                  <BookCard key={book.id} book={book} priority={index < 6} />
                ))}
              </div>
            )}
          </section>
        )}

        {tab === "music" && (
          <div className="px-4 py-14 sm:px-6 lg:px-8">
            <EmptyState icon={Music} title={t.search.music} description={t.search.musicComingSoon} />
          </div>
        )}
      </div>

      <FilterSheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        values={sheetValues}
        onChange={handleSheetChange}
        onClear={clearAll}
        sortOptions={isMoviesTab ? movieSortOptions : seriesSortOptions}
        isSeries={!isMoviesTab}
        facets={sheetFacets}
        activeCount={activeCount}
        resultTotal={totalForTab}
        isCounting={isSearching}
      />
    </div>
  );
}

/**
 * The sentinel that turns pagination into scroll. It sits after the grid and
 * asks for the next page as it enters the 600px pre-viewport margin — guarded
 * so an in-flight page is never double-requested — and shows a skeleton row
 * while that page loads.
 */
function InfiniteScrollFooter({
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  density,
}: {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  density: Parameters<typeof PosterGrid>[0]["density"];
}) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasNextPage || isFetchingNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onLoadMore();
      },
      { rootMargin: "600px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, onLoadMore]);

  return (
    <>
      {isFetchingNextPage && (
        <PosterGrid items={[]} isLoading skeletonCount={6} density={density} />
      )}
      <div ref={sentinelRef} aria-hidden className="h-px" />
    </>
  );
}

export { SpotlightHeroSkeleton as BrowseSurfaceSkeleton };

/** Route-level Suspense fallback for the dense /media/movies catalog: bar silhouette + grid. */
export function CatalogSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 pt-5 pb-20 sm:px-6 lg:px-8">
      <div className="flex items-center gap-2.5">
        <div className="h-9 w-40 animate-pulse rounded-full bg-secondary/50" />
        <div className="ml-auto h-9 w-full max-w-72 animate-pulse rounded-full bg-secondary/40" />
      </div>
      <div className="mt-5">
        <PosterGrid items={[]} isLoading />
      </div>
    </div>
  );
}
