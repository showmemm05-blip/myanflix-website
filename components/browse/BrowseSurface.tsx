"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { BookCard, BookCardSkeleton } from "@/components/cards/BookCard";
import { EmptyState } from "@/components/empty/EmptyState";
import { ErrorState } from "@/components/empty/ErrorState";
import { SignInEmptyState } from "@/components/empty/SignInEmptyState";
import type { FilterSheetFacets } from "@/components/filters/FilterSheet";
import {
  DEFAULT_FILTERS,
  type FilterState,
  type SeriesFilterState,
} from "@/components/filters/filter-types";
import { MEDIA_CHIP_HREF } from "@/components/layout/MediaChipStrip";
import { CardGrid, GridLoadingMore } from "@/components/system/Row";
import { BookmarkIcon, ChevronDownIcon, FilterIcon, SearchIcon } from "@/components/system/icons";
import { Button } from "@/components/ui/button";
import { useBooks } from "@/hooks/use-books";
import { useCatalogFilters } from "@/hooks/use-catalog-filters";
import { useMovieFacets, useMoviesInfinite } from "@/hooks/use-movies";
import { useSeriesFacets, useSeriesInfinite } from "@/hooks/use-series";
import { useAuth } from "@/lib/context/auth-context";
import { useLanguage } from "@/lib/context/language-context";
import { formatDuration } from "@/lib/format";
import { useSection } from "@/lib/i18n/sections/define";
import { searchText } from "@/lib/i18n/sections/search";
import { shellText } from "@/lib/i18n/sections/shell";
import { cn } from "@/lib/utils";
import { movieService } from "@/services/api/movieService";
import type { Movie } from "@/types/movie";
import type { SeriesListItem, SeriesSortOption } from "@/types/series";
import { BrowseBar, DensityToggle, type BrowseTab } from "./BrowseBar";
import { ActiveFilterPills } from "./ActiveFilterPills";
import { ContinueWatchingRail } from "./ContinueWatchingRail";
import { InfiniteSentinel } from "@/components/media/CatalogParts";
import { PosterGrid, type GridDensity } from "./PosterGrid";
import { PosterRail } from "./PosterRail";
import { CategoryChips, IdleHeader, RecentSearches, TrendingSearches } from "./SearchIdle";
import { movieToBrowseItem, seriesToBrowseItem, type BrowseItem } from "./browse-item";
import { useRecentSearches } from "./recent-searches";

const SCROLL_STORAGE_KEY = "myanflix-movies-scroll";

// "Sort & filter" is closed until asked for, so its code is fetched on first
// open instead of with the page.
const FilterSheet = dynamic(() => import("@/components/filters/FilterSheet").then((mod) => mod.FilterSheet), {
  ssr: false,
});

const FOCUS = "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link";

/**
 * THE BROWSE SURFACE — the /search page: the catalogue's search, its
 * filters and its rails. (The /media hubs are CatalogHub now.)
 *
 *  - `/search` (Search + SearchResults boards). Before anything is narrowed it
 *    is the Search page: a big field, the scope tabs, then recent searches,
 *    trending searches, browse-by-category chips, Continue watching, Popular
 *    movies and Series to binge. The moment a term settles or a filter is on,
 *    the same field shrinks (it is the same input — focus never jumps), a
 *    Back button appears, the tabs show their counts, and the page becomes
 *    "Results for …" with sort, grid density, Sort & filter, removable
 *    filter pills and an endless poster grid.
 *
 * Same filter-state owner (`use-catalog-filters`), same query hooks, same
 * drawer. Filtering, sorting and counting all happen SERVER-SIDE: this
 * component only renders pages and totals it was given.
 */
export function BrowseSurface() {
  const { t } = useLanguage();
  const sx = useSection(searchText);
  const s = useSection(shellText);
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  // Where a guest lands again after signing in: this exact tab, term and filters.
  const signInReturnTo = queryString ? `${pathname}?${queryString}` : pathname;
  const resultsId = useId();
  const headingId = useId();
  const sortId = useId();

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
    hydrated,
  } = useCatalogFilters("search");

  // The address can change the tab after mount — the Media chip strip's
  // "Series" chip links to `?tab=series` while this page is already open.
  // Follow the URL when IT changes (never when our own tab click is still on
  // its way into the address bar).
  const urlTab = searchParams.get("tab");
  const [seenUrlTab, setSeenUrlTab] = useState(urlTab);
  if (urlTab !== seenUrlTab) {
    setSeenUrlTab(urlTab);
    if (urlTab && urlTab !== tab && allowedTabs.includes(urlTab as BrowseTab)) setTab(urlTab as BrowseTab);
  }

  const recent = useRecentSearches(user?.id ?? null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  // The lazy sheet stays mounted from its first open on (so it can animate closed).
  const [filtersMounted, setFiltersMounted] = useState(false);
  if (filtersOpen && !filtersMounted) setFiltersMounted(true);

  const isMoviesTab = tab === "movies";
  const isCatalogTab = tab === "movies" || tab === "series";
  /** Anything narrowing the list — a settled term, a filter, a non-default sort. */
  const isNarrowed = Boolean(effectiveTerm) || activeCount > 0 || pills.length > 0;
  /**
   * The results view (SearchResults board): once a catalogue tab is
   * narrowed, or a books search has a term.
   */
  const resultsView = isCatalogTab ? isNarrowed : tab === "books" && Boolean(effectiveTerm);

  // The two home rows the Search page shows (Trending = most purchased,
  // Popular = top rated). Same query keys as the media hub's rows, so they
  // share its cache.
  const mostPurchased = useQuery({
    queryKey: ["home", "most-purchased"],
    queryFn: () => movieService.getMostPurchased(),
  });
  const topRated = useQuery({
    queryKey: ["home", "top-rated"],
    queryFn: () => movieService.getTopRated(),
  });
  const movieFacets = useMovieFacets();
  // Series facets feed only the Series tab (its genre chips and its filter sheet).
  const seriesFacets = useSeriesFacets({ enabled: tab === "series" });

  // Every request below waits for the saved filters/search to be read
  // (`hydrated`), so it goes out once, with them. The movie grid is only
  // asked for when something on the Movies tab shows it: the results grid, or
  // the open Sort & filter sheet (its "Show N results" count comes from this
  // grid's total). The idle Search page shows rails instead.
  const moviesInfinite = useMoviesInfinite(movieQuery, {
    enabled: hydrated && isMoviesTab && (resultsView || filtersOpen),
  });
  // The series list also feeds the idle Movies tab's "Series to binge" rail.
  const seriesInfinite = useSeriesInfinite(seriesQuery, { enabled: hydrated });

  // Books are searched server-side on the same settled term the movies grid
  // uses (the tab renders from this query alone). The library is
  // members-only, so a guest never fires the request — the tab shows a
  // sign-in prompt instead.
  const booksQuery = useBooks(
    { limit: 60, search: effectiveTerm || undefined },
    { enabled: isAuthenticated },
  );

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
   * so far), and it also feeds the drawer's "Show N results" button, so both
   * numbers can never disagree.
   */
  const totalForTab = resultsInfinite.data?.pages[0]?.total;
  const countIsStale = tab === "series" ? seriesAreStale : moviesAreStale;
  const countReady = totalForTab !== undefined && !countIsStale && !isDebouncing;
  /** Only ever rendered behind a `countReady` guard — the 0 is unreachable. */
  const displayTotal = totalForTab ?? 0;

  const booksReady = isAuthenticated && !isAuthLoading && !booksQuery.isLoading && !booksQuery.isError;
  const bookItems = booksQuery.data?.items ?? [];

  const toMovieItems = useCallback(
    (items: Movie[] | undefined) =>
      (items ?? []).map((movie) => movieToBrowseItem(movie, formatDuration(movie.duration))),
    [],
  );
  const toSeriesItems = useCallback(
    (items: SeriesListItem[]) =>
      items.map((item) => seriesToBrowseItem(item, t.browse.episodeCount(item.episodeCount))),
    [t],
  );

  const movieItems = useMemo(() => toMovieItems(movies), [toMovieItems, movies]);
  const seriesItems = useMemo(() => toSeriesItems(series), [toSeriesItems, series]);

  const showCatalogResults = isCatalogTab && (resultsView || tab === "series");

  // Restore the last scroll position once the page actually has content —
  // e.g. coming back from a detail page. Best-effort under infinite scroll:
  // only the first page is present on a fresh mount, so a position deep in
  // page 4 clamps to the bottom of page 1. Session-scoped on purpose.
  // "Has content" = the saved filters are read and whatever this view renders
  // has loaded (a switched-off query reports "not loading", so each view
  // waits on its own data, not on a grid it does not show).
  const contentLoading =
    !hydrated ||
    (tab === "books"
      ? booksQuery.isLoading
      : showCatalogResults
        ? resultsInfinite.isLoading
        : isMoviesTab && (topRated.isLoading || seriesInfinite.isLoading));
  const scrollRestored = useRef(false);
  useEffect(() => {
    if (scrollRestored.current || contentLoading) return;
    try {
      const saved = sessionStorage.getItem(SCROLL_STORAGE_KEY);
      if (saved) window.scrollTo({ top: Number(saved) });
    } catch {
      // Storage blocked — start at the top.
    }
    scrollRestored.current = true;
  }, [contentLoading]);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        try {
          sessionStorage.setItem(SCROLL_STORAGE_KEY, String(window.scrollY));
        } catch {
          // Storage blocked — nothing to restore later, which is fine.
        }
        ticking = false;
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // The drawer edits one shape for both tabs; series get the subset view and
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
    // Series carry no cast/director/country/age-rating/duration filters —
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

  const sortValue = isMoviesTab ? filters.sort : seriesFilters.sort;
  const sortOptions = isMoviesTab ? movieSortOptions : seriesSortOptions;
  const onSortChange = (sort: string) =>
    isMoviesTab
      ? updateFilters({ sort: sort as FilterState["sort"] })
      : updateSeriesFilters({ sort: sort as SeriesSortOption });

  /**
   * Back to the Search page: the term and this tab's filters go. Books have no
   * filters of their own — only the term goes, so the Series filters (which
   * the shared clearAll resets on any non-Movies tab) are left alone.
   */
  const backToSearch = () => {
    clearSearch();
    if (isCatalogTab) clearAll();
  };

  const replayRecent = (term: string) => {
    setSearch(term);
    recent.remember(term);
  };

  // ── The scope tabs' counts (results view only; only what is known) ──
  const tabCounts: Partial<Record<BrowseTab, number>> | undefined =
    resultsView
      ? {
          ...(isCatalogTab && countReady ? { [tab]: displayTotal } : {}),
          ...(booksReady ? { books: bookItems.length } : {}),
        }
      : undefined;

  const tabLabel = { movies: t.search.movies, series: t.search.series, books: t.search.books, music: t.search.music }[tab];

  // ── Heading for the results section ──
  const resultsHeading = effectiveTerm
    ? t.browse.resultsFor(effectiveTerm)
    : tab === "series"
      ? t.browse.allSeries
      : tab === "books"
        ? t.media.newBooks
        : t.search.movies;
  const HeadingTag = resultsView ? "h1" : "h2";

  const intro =
    !resultsView ? (
      <>
        <h1 className="text-title text-fg">{t.nav.search}</h1>
        <p className="mt-1.5 text-[15px] leading-[22px] text-fg-muted">{sx.pageSubtitle}</p>
      </>
    ) : null;

  const countLine = (label: string | null, pending: boolean) =>
    label !== null ? (
      <span role="status" className="text-sm leading-5 text-fg-faint nums">
        {label}
      </span>
    ) : pending ? (
      <span aria-hidden className="mq-skeleton inline-block h-3.5 w-[88px] rounded-[5px]" />
    ) : null;

  const catalogCount = countLine(
    countReady ? (isNarrowed ? t.filters.matchCount(displayTotal) : t.browse.titleCount(displayTotal)) : null,
    !resultsInfinite.isError,
  );

  const tools = (
    <div className="flex flex-wrap items-center gap-2.5 max-desk:w-full max-desk:justify-between">
      <div className="relative">
        <label htmlFor={sortId} className="sr-only">
          {t.filters.sortBy}
        </label>
        <select
          id={sortId}
          value={sortValue}
          onChange={(e) => onSortChange(e.target.value)}
          className={cn(
            "h-10 cursor-pointer appearance-none rounded-full border-0 bg-raised pr-[38px] pl-4 text-sm font-bold text-fg [color-scheme:dark] transition-colors duration-150 hover:bg-raised-hover",
            FOCUS,
          )}
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDownIcon size={16} aria-hidden className="pointer-events-none absolute top-3 right-3.5 text-fg-muted" />
      </div>
      <DensityToggle density={density} onChange={setDensity} />
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={filtersOpen}
        aria-label={activeCount > 0 ? sx.sortAndFilterCount(activeCount) : undefined}
        onClick={() => setFiltersOpen(true)}
        className={cn(
          "mq-press inline-flex h-10 cursor-pointer items-center gap-2 rounded-[12px] border-0 pr-3 pl-3.5 text-sm font-extrabold text-fg",
          activeCount > 0 ? "bg-crimson/18" : "bg-tonal hover:bg-tonal-hover",
          filtersOpen && "shadow-[inset_0_0_0_1.5px_var(--mq-link)]",
          FOCUS,
        )}
      >
        <FilterIcon size={18} />
        {sx.sortAndFilter}
        {activeCount > 0 && (
          <span aria-hidden className="h-5 min-w-5 rounded-full bg-crimson px-1.5 text-center text-[11px] leading-5 font-extrabold nums">
            {activeCount}
          </span>
        )}
      </button>
    </div>
  );

  const emptyActions = (onClearSearch: boolean) => (
    <>
      {(activeCount > 0 || pills.length > 0) && (
        <Button variant="play" size="cta" onClick={clearAll}>
          {sx.clearFilters}
        </Button>
      )}
      {onClearSearch && (
        <button
          type="button"
          onClick={clearSearch}
          className={cn("mq-link cursor-pointer rounded-[6px] border-0 bg-transparent text-[15px] leading-5", FOCUS)}
        >
          {t.browse.clearSearch}
        </button>
      )}
    </>
  );

  return (
    <div className="relative flex flex-col pb-[clamp(56px,6vw,96px)]">
      <BrowseBar
        tab={tab}
        onTabChange={setTab}
        tabs={allowedTabs}
        search={search}
        onSearchChange={setSearch}
        size={resultsView ? "compact" : "hero"}
        intro={intro}
        onBack={resultsView ? backToSearch : undefined}
        tabCounts={tabCounts}
        tabsLabel={resultsView ? sx.resultsIn : sx.searchIn}
        controlsId={resultsId}
        isSearching={isSearching}
        isTooShort={isTooShort}
        onCommitSearch={recent.remember}
        settledTerm={effectiveTerm}
      />

      <div id={resultsId} role={allowedTabs.length > 1 ? "tabpanel" : undefined} aria-label={tabLabel}>
        {/* ── /search, Movies, nothing narrowed: the Search page proper ── */}
        {isMoviesTab && !resultsView && (
          <div className="mt-[clamp(36px,3.4vw,52px)] flex flex-col gap-[clamp(40px,3.6vw,56px)]">
            <RecentSearches terms={recent.terms} onReplay={replayRecent} onClear={recent.clear} />
            {mostPurchased.isError && topRated.isError ? (
              <ErrorState
                className="px-gutter"
                title={sx.suggestErrorTitle}
                description={sx.suggestErrorBody}
                onRetry={() => {
                  void mostPurchased.refetch();
                  void topRated.refetch();
                }}
              />
            ) : (
              <>
                <TrendingSearches movies={mostPurchased.data} isLoading={mostPurchased.isLoading} />
                <CategoryChips
                  kind="movies"
                  genres={movieFacets.data?.genres}
                  isLoading={movieFacets.isLoading}
                />
              </>
            )}
            <ContinueWatchingRail />
            <PosterRail
              title={sx.popularTitle}
              subtitle={sx.popularSub}
              items={toMovieItems(topRated.data)}
              isLoading={topRated.isLoading}
              viewAllHref="/media/movies?tab=movies&sort=rating"
            />
            <PosterRail
              title={t.browse.seriesRow}
              subtitle={sx.seriesSub}
              items={toSeriesItems(series.slice(0, 12))}
              isLoading={seriesInfinite.isLoading}
              viewAllHref={MEDIA_CHIP_HREF.series}
            />
          </div>
        )}

        {/* ── /search, Series, nothing narrowed: genres first, then every series ── */}
        {tab === "series" && !resultsView && (
          <div className="mt-[clamp(36px,3.4vw,52px)]">
            <RecentSearches terms={recent.terms} onReplay={replayRecent} onClear={recent.clear} />
            <div className={cn(recent.terms.length > 0 && "mt-[clamp(40px,3.6vw,56px)]")}>
              <CategoryChips
                kind="series"
                genres={seriesFacets.data?.genres}
                isLoading={seriesFacets.isLoading}
              />
            </div>
          </div>
        )}

        {/* ── Movies / Series results ── */}
        {showCatalogResults && (
          <section
            aria-labelledby={headingId}
            className={cn(
              "px-gutter",
              resultsView ? "pt-[clamp(28px,2.8vw,40px)]" : "pt-[clamp(40px,3.6vw,56px)]",
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
              <div className="flex min-w-0 flex-wrap items-baseline gap-x-3.5 gap-y-1">
                <HeadingTag
                  id={headingId}
                  className={cn("min-w-0 break-words text-fg", resultsView ? "text-title" : "text-section-title")}
                >
                  {resultsHeading}
                </HeadingTag>
                {catalogCount}
              </div>
              {!(resultsInfinite.isError && (tab === "series" ? seriesItems : movieItems).length === 0) && tools}
            </div>

            <ActiveFilterPills pills={pills} onClearAll={clearAll} className="mt-[18px]" />

            <div className="mt-6">
              {isMoviesTab ? (
                <CatalogResults
                  kind="movies"
                  items={movieItems}
                  query={moviesInfinite}
                  isStale={moviesAreStale}
                  density={density}
                  emptyTitle={t.browse.noMoviesTitle}
                  emptyBody={t.browse.noMoviesBody}
                  emptyActions={emptyActions(Boolean(effectiveTerm))}
                  loadingMoreLabel={sx.loadingMoreMovies}
                  searchingLabel={sx.searching}
                  errorBody={t.browse.loadFailed}
                />
              ) : (
                <CatalogResults
                  kind="series"
                  items={seriesItems}
                  query={seriesInfinite}
                  isStale={seriesAreStale}
                  density={density}
                  emptyTitle={t.browse.noSeriesTitle}
                  emptyBody={t.browse.noSeriesBody}
                  emptyActions={emptyActions(Boolean(effectiveTerm))}
                  loadingMoreLabel={sx.loadingMoreSeries}
                  searchingLabel={sx.searching}
                  errorBody={t.browse.loadFailed}
                />
              )}
            </div>
          </section>
        )}

        {/* ── Books ── */}
        {tab === "books" && (
          <section
            aria-labelledby={headingId}
            className={cn("px-gutter", resultsView ? "pt-[clamp(28px,2.8vw,40px)]" : "pt-[clamp(36px,3.4vw,52px)]")}
          >
            {resultsView ? (
              <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1">
                <h1 id={headingId} className="min-w-0 break-words text-title text-fg">
                  {resultsHeading}
                </h1>
                {countLine(booksReady ? t.media.bookCount(bookItems.length) : null, isAuthenticated && booksQuery.isLoading)}
              </div>
            ) : (
              <IdleHeader
                id={headingId}
                title={t.media.newBooks}
                subtitle={booksReady ? t.media.bookCount(bookItems.length) : undefined}
                action={
                  <Link href={MEDIA_CHIP_HREF.books} className={cn("mq-link shrink-0 rounded-[6px] text-[15px] leading-5", FOCUS)}>
                    {s.seeAll}
                  </Link>
                }
              />
            )}

            <div className="mt-[22px]">
              {!isAuthenticated && !isAuthLoading ? (
                <SignInEmptyState
                  title={t.browse.booksSignInTitle}
                  description={t.browse.booksSignInBody}
                  returnTo={signInReturnTo}
                />
              ) : isAuthLoading || booksQuery.isLoading ? (
                <CardGrid kind="books" aria-busy="true">
                  {Array.from({ length: 12 }, (_, i) => (
                    <BookCardSkeleton key={i} />
                  ))}
                </CardGrid>
              ) : booksQuery.isError ? (
                <ErrorState description={s.errorBody} onRetry={() => void booksQuery.refetch()} />
              ) : bookItems.length === 0 ? (
                <EmptyState
                  icon={effectiveTerm ? SearchIcon : BookmarkIcon}
                  title={effectiveTerm ? t.media.noBooksTitle : t.media.emptyLibraryTitle}
                  description={effectiveTerm ? t.search.booksNoResults : t.media.emptyLibraryBody}
                  action={
                    effectiveTerm ? (
                      <button
                        type="button"
                        onClick={clearSearch}
                        className={cn("mq-link cursor-pointer rounded-[6px] border-0 bg-transparent text-[15px] leading-5", FOCUS)}
                      >
                        {t.browse.clearSearch}
                      </button>
                    ) : undefined
                  }
                />
              ) : (
                <CardGrid kind="books">
                  {bookItems.map((book, index) => (
                    <BookCard
                      key={book.id}
                      title={book.title}
                      author={book.author}
                      href={`/books/${book.id}`}
                      coverUrl={book.coverUrl}
                      meta={book.categories[0]?.name ? `${book.author} · ${book.categories[0].name}` : book.author}
                      priority={index < 7}
                    />
                  ))}
                </CardGrid>
              )}
            </div>
          </section>
        )}

        {/* ── Music ── */}
        {tab === "music" && (
          <div className="px-gutter pt-8">
            <EmptyState
              icon={MusicNoteIcon}
              headingLevel="h2"
              title={sx.musicTitle}
              description={sx.musicBody}
              action={
                <Button variant="tonal" size="cta" onClick={() => setTab("movies")}>
                  {sx.searchMovies}
                </Button>
              }
            />
          </div>
        )}
      </div>

      {isCatalogTab && filtersMounted && (
        <FilterSheet
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          values={sheetValues}
          onChange={handleSheetChange}
          onClear={clearAll}
          sortOptions={sortOptions}
          isSeries={!isMoviesTab}
          facets={sheetFacets}
          activeCount={activeCount}
          resultTotal={totalForTab}
          isCounting={isSearching}
          type={isMoviesTab ? "movies" : "series"}
          onTypeChange={(next) => setTab(next)}
        />
      )}
    </div>
  );
}

/** The music note the Music tab's "coming soon" disc shows (board icon). */
function MusicNoteIcon({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

interface InfiniteLike {
  isLoading: boolean;
  isError: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => unknown;
  refetch: () => unknown;
}

/**
 * One catalogue grid with all of its states: skeleton grid while the first
 * page loads, the error state (when nothing is on screen), the empty state
 * with Clear filters / Clear search, and endless scrolling with a row of
 * skeleton posters in the same columns — never a "Load more" button.
 */
function CatalogResults({
  kind,
  items,
  query,
  isStale,
  density,
  emptyTitle,
  emptyBody,
  emptyActions,
  loadingMoreLabel,
  searchingLabel,
  errorBody,
}: {
  kind: "movies" | "series";
  items: BrowseItem[];
  query: InfiniteLike;
  isStale: boolean;
  density: GridDensity;
  emptyTitle: string;
  emptyBody: string;
  emptyActions: ReactNode;
  loadingMoreLabel: string;
  searchingLabel: string;
  errorBody: string;
}) {
  // fetchNextPage is stable across renders; the query object itself is not.
  const fetchNextPage = query.fetchNextPage;
  const loadMore = useCallback(() => void fetchNextPage(), [fetchNextPage]);

  if (query.isError && items.length === 0) {
    return <ErrorState description={errorBody} onRetry={() => void query.refetch()} />;
  }
  if (!query.isLoading && items.length === 0) {
    return (
      <EmptyState
        icon={SearchIcon}
        headingLevel="h2"
        title={emptyTitle}
        description={emptyBody}
        action={emptyActions}
        className="pt-10"
      />
    );
  }
  return (
    <>
      <PosterGrid
        key={kind}
        items={items}
        isLoading={query.isLoading}
        isStale={isStale}
        density={density}
        footer={
          query.isFetchingNextPage ? <GridLoadingMore kind="poster" count={7} label={loadingMoreLabel} /> : null
        }
      />
      {query.isLoading && (
        <p role="status" className="sr-only">
          {searchingLabel}
        </p>
      )}
      <InfiniteSentinel
        hasNextPage={query.hasNextPage}
        isFetchingNextPage={query.isFetchingNextPage}
        onLoadMore={loadMore}
      />
    </>
  );
}

/** Route-level Suspense fallback for /search: the title, the big field and the scope chips. */
export function BrowseSurfaceSkeleton() {
  return (
    <div aria-busy="true" className="px-gutter pt-[clamp(28px,3.4vw,52px)]">
      <span className="mq-skeleton block h-10 w-40 rounded-[8px]" />
      <span className="mq-skeleton mt-3 block h-4 w-72 max-w-full rounded-[5px]" />
      <span className="mq-skeleton mt-6 block h-[68px] max-w-[960px] rounded-[12px] max-desk:h-14" />
      <div className="mt-5 flex gap-2">
        {[88, 80, 76, 92].map((w, i) => (
          <span key={i} className="mq-skeleton block h-9 rounded-full" style={{ width: w }} />
        ))}
      </div>
    </div>
  );
}
