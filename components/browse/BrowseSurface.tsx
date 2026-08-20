"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BookOpen, Film, Music, Tv, X } from "lucide-react";
import { SpotlightHero, SpotlightHeroSkeleton } from "./SpotlightHero";
import { BrowseBar, DensityToggle, BROWSE_TABS, type BrowseTab } from "./BrowseBar";
import { ActiveFilterPills, type ActivePill } from "./ActiveFilterPills";
import { PosterGrid, type GridDensity } from "./PosterGrid";
import { PosterRail } from "./PosterRail";
import { ContinueWatchingRail } from "./ContinueWatchingRail";
import { movieToBrowseItem, seriesToBrowseItem } from "./browse-item";
import { FilterSheet } from "@/components/filters/FilterSheet";
import { AuroraBackdrop, Chip, chipClass, SectionHeader } from "@/components/system";
import type {
  FilterState,
  SeriesFilterState,
  SeriesSortOption,
} from "@/components/filters/filter-types";
import { EmptyState } from "@/components/empty/EmptyState";
import { useMovies, useHomeRows } from "@/hooks/use-movies";
import { useSeriesList } from "@/hooks/use-series";
import { useSearchTerm } from "@/hooks/use-search-term";
import { useLanguage } from "@/lib/context/language-context";
import { formatDuration } from "@/lib/format";
import type { Movie, MovieSortOption } from "@/types/movie";
import type { SeriesListItem } from "@/types/series";

const PREFS_STORAGE_KEY = "myanflix-movies-filters";
const SCROLL_STORAGE_KEY = "myanflix-movies-scroll";
const DEFAULT_FILTERS: FilterState = { sort: "newest" };
const DEFAULT_SERIES_FILTERS: SeriesFilterState = { sort: "newest" };

/**
 * THE BROWSE SURFACE — the catalog, its search, its filters and its rails.
 *
 * It backs two routes because they are genuinely the same screen: `/movies` is
 * the catalog, `/search` is the catalog with the search field already open. The
 * nav promotes Search to a primary destination, so it has to BE a destination —
 * a redirect to `/movies` could never light its own nav item up. Same
 * components, same query hooks, same stored preferences; `mode` only decides
 * whether the editorial hero and the idle rails are on, and which path the
 * shareable URL is written back to.
 */
export function BrowseSurface({ mode = "media" }: { mode?: "media" | "search" }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const isSearchSurface = mode === "search";

  const [tab, setTab] = useState<BrowseTab>(() => {
    const fromUrl = searchParams.get("tab");
    // "all" was the old default tab — its content is now the idle state of
    // Movies, so old links land somewhere sensible instead of 404-ing a tab.
    return BROWSE_TABS.includes(fromUrl as BrowseTab) ? (fromUrl as BrowseTab) : "movies";
  });

  const [filters, setFilters] = useState<FilterState>(() => ({
    sort: (searchParams.get("sort") as MovieSortOption) ?? "newest",
    genre: searchParams.get("genre") ?? undefined,
  }));
  const [seriesFilters, setSeriesFilters] = useState<SeriesFilterState>(DEFAULT_SERIES_FILTERS);
  /**
   * All of the search's timing lives in one hook (see `use-search-term`):
   * `search` follows the keyboard so the field never lags, `effectiveTerm` is
   * what the app actually searches for — debounced, trimmed, and empty until
   * it's long enough to be worth a request — and clearing resets in the same
   * tick rather than a debounce window later.
   */
  const {
    term: search,
    setTerm: setSearch,
    effectiveTerm,
    isDebouncing,
    isTooShort,
    clear: clearSearch,
  } = useSearchTerm(searchParams.get("q") ?? "");
  const [density, setDensity] = useState<GridDensity>("comfortable");
  /** Picked from the Categories tab; behaves like any other movie filter once set. */
  const [category, setCategory] = useState<{ id: string; name: string } | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Restore the user's last filters/search once on mount — an explicit URL
  // param (e.g. a shared /movies?genre=Action link) still wins over storage.
  useEffect(() => {
    const stored = localStorage.getItem(PREFS_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as {
          filters?: Partial<FilterState>;
          search?: string;
          density?: GridDensity;
        };
        if (parsed.filters && !searchParams.get("sort") && !searchParams.get("genre")) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setFilters((prev) => ({ ...prev, ...parsed.filters }));
        }
        if (typeof parsed.search === "string" && !searchParams.get("q")) {
          setSearch(parsed.search);
        }
        if (parsed.density === "compact" || parsed.density === "comfortable") {
          setDensity(parsed.density);
        }
      } catch {
        // Malformed storage — fall back to defaults already in state.
      }
    }
    setHydrated(true);
    // Deliberately mount-only: re-running this on every searchParams change would
    // fight the user's own subsequent filter/search edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyed on the SETTLED term, never the raw field: keying this on `search`
  // ran a JSON.stringify and a synchronous localStorage write on every single
  // keystroke, and persisted half-typed words as the query to restore.
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(
      PREFS_STORAGE_KEY,
      JSON.stringify({ filters, search: effectiveTerm, density }),
    );
  }, [hydrated, filters, effectiveTerm, density]);

  // Keep the URL in sync with the active tab and search so /movies?tab=series
  // stays shareable and /series can redirect into the right mode. It writes
  // back to whichever route is showing the surface, so a user who arrived at
  // /search stays on /search (and keeps that nav item lit) while they type.
  useEffect(() => {
    const params = new URLSearchParams();
    params.set("tab", tab);
    // Keyed on the settled term, not the raw one: the URL is rewritten once
    // per search, not once per keystroke.
    if (effectiveTerm) params.set("q", effectiveTerm);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, effectiveTerm, pathname]);

  const movieFilterCount = [
    category?.id,
    filters.genre,
    filters.language,
    filters.releaseYear,
    filters.minRating,
    filters.accessType,
  ].filter((v) => v !== undefined).length;

  const seriesFilterCount = [
    seriesFilters.genre,
    seriesFilters.language,
    seriesFilters.releaseYear,
    seriesFilters.accessType,
  ].filter((v) => v !== undefined).length;

  const isMoviesTab = tab === "movies";
  const activeFilterCount = isMoviesTab ? movieFilterCount : seriesFilterCount;
  /** Rails are the idle state; the moment the user narrows anything, the page becomes a result list. */
  const isNarrowed = Boolean(effectiveTerm) || activeFilterCount > 0;

  const homeRows = useHomeRows();
  const seriesQuery = useSeriesList({ limit: 100 });
  const moviesQuery = useMovies({
    ...filters,
    categoryId: category?.id,
    // No `search` key at all below the minimum length — the query stays the
    // plain catalogue read rather than being disabled, so a half-typed word
    // leaves the grid showing titles instead of an empty state.
    //
    // And no `search` at all while the Series tab is showing: nothing on that
    // tab renders this query (series are filtered from `seriesQuery` in
    // memory, below), so sending the term here would put a request on the wire
    // whose response is thrown away.
    search: isMoviesTab ? effectiveTerm || undefined : undefined,
    limit: 60,
  });

  /**
   * One "we're working on it" signal covering BOTH halves of the wait: the
   * debounce window (during which nothing is in flight and React Query has
   * nothing to report) and the request itself — of whichever query the visible
   * tab is actually rendering, so the Series tab doesn't spin on a movies
   * request it ignores.
   */
  const resultsQuery = tab === "series" ? seriesQuery : moviesQuery;
  const isSearching = isDebouncing || resultsQuery.isFetching;
  /**
   * The grid is showing the PREVIOUS key's results while this one loads (see
   * `keepPreviousData` in use-movies). The heading and the count chip read
   * from the already-updated term, so while this is true they'd be captioning
   * the wrong pictures — the count is withheld and the grid recedes instead.
   */
  const moviesAreStale = moviesQuery.isPlaceholderData;

  const toMovieItems = useCallback(
    (movies: Movie[] | undefined) =>
      (movies ?? []).map((movie) => movieToBrowseItem(movie, formatDuration(movie.duration))),
    [],
  );
  const toSeriesItems = useCallback(
    (series: SeriesListItem[]) =>
      series.map((s) => seriesToBrowseItem(s, t.browse.episodeCount(s.episodeCount))),
    [t],
  );

  const filteredSeries = useMemo(() => {
    let items = seriesQuery.data?.items ?? [];
    // SERIES SEARCH IS CLIENT-SIDE ON PURPOSE — not an oversight. `GET /series`
    // accepts no `search` param at all, so there is nothing to send; the page
    // of series is already in memory and gets filtered here. It reads the very
    // same `effectiveTerm` the movies request uses, so both tabs narrow on the
    // same keystroke rather than drifting apart.
    if (effectiveTerm) {
      const q = effectiveTerm.toLowerCase();
      items = items.filter((s) => s.title.toLowerCase().includes(q));
    }
    if (seriesFilters.genre) items = items.filter((s) => s.genre === seriesFilters.genre);
    if (seriesFilters.language) items = items.filter((s) => s.language === seriesFilters.language);
    if (seriesFilters.releaseYear) items = items.filter((s) => s.releaseYear === seriesFilters.releaseYear);
    if (seriesFilters.accessType) items = items.filter((s) => s.accessType === seriesFilters.accessType);

    const sorted = [...items];
    if (seriesFilters.sort === "title") {
      sorted.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      sorted.sort((a, b) => b.releaseYear - a.releaseYear);
    }
    return sorted;
    // Keyed on `effectiveTerm`, never the raw field: a keystroke must not
    // re-filter and re-sort the whole list a debounce window early.
  }, [seriesQuery.data, effectiveTerm, seriesFilters]);

  const movieItems = useMemo(() => toMovieItems(moviesQuery.data?.items), [toMovieItems, moviesQuery.data]);
  const seriesItems = useMemo(() => toSeriesItems(filteredSeries), [toSeriesItems, filteredSeries]);

  const pills: ActivePill[] = useMemo(() => {
    if (isMoviesTab) {
      const out: ActivePill[] = [];
      if (category) out.push({ key: "category", label: category.name, onRemove: () => setCategory(null) });
      if (filters.genre) out.push({ key: "genre", label: filters.genre, onRemove: () => setFilters((p) => ({ ...p, genre: undefined })) });
      if (filters.language) out.push({ key: "language", label: filters.language, onRemove: () => setFilters((p) => ({ ...p, language: undefined })) });
      if (filters.releaseYear) out.push({ key: "year", label: String(filters.releaseYear), onRemove: () => setFilters((p) => ({ ...p, releaseYear: undefined })) });
      if (filters.minRating) out.push({ key: "rating", label: `${filters.minRating}+ ★`, onRemove: () => setFilters((p) => ({ ...p, minRating: undefined })) });
      if (filters.accessType) {
        out.push({
          key: "access",
          label: filters.accessType === "FREE" ? t.search.accessFree : t.search.accessSubscription,
          onRemove: () => setFilters((p) => ({ ...p, accessType: undefined })),
        });
      }
      return out;
    }
    const out: ActivePill[] = [];
    if (seriesFilters.genre) out.push({ key: "genre", label: seriesFilters.genre, onRemove: () => setSeriesFilters((p) => ({ ...p, genre: undefined })) });
    if (seriesFilters.language) out.push({ key: "language", label: seriesFilters.language, onRemove: () => setSeriesFilters((p) => ({ ...p, language: undefined })) });
    if (seriesFilters.releaseYear) out.push({ key: "year", label: String(seriesFilters.releaseYear), onRemove: () => setSeriesFilters((p) => ({ ...p, releaseYear: undefined })) });
    if (seriesFilters.accessType) {
      out.push({
        key: "access",
        label: seriesFilters.accessType === "FREE" ? t.search.accessFree : t.search.accessSubscription,
        onRemove: () => setSeriesFilters((p) => ({ ...p, accessType: undefined })),
      });
    }
    return out;
  }, [isMoviesTab, filters, seriesFilters, category, t]);

  // Restore the last scroll position once the page actually has content to
  // scroll to — e.g. coming back from a movie's detail page. Session-scoped
  // (not localStorage) so it resets on a fresh visit, matching how browsers
  // natively handle back/forward scroll restoration.
  const scrollRestored = useRef(false);
  useEffect(() => {
    if (scrollRestored.current || moviesQuery.isLoading) return;
    const saved = sessionStorage.getItem(SCROLL_STORAGE_KEY);
    if (saved) window.scrollTo({ top: Number(saved) });
    scrollRestored.current = true;
  }, [moviesQuery.isLoading]);

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

  // The editorial hero and the idle rails are the CATALOG's opening. On the
  // search destination they'd bury the field the user came for, so that route
  // goes straight to the result list (unfiltered, it simply lists everything).
  const showRails = isMoviesTab && !isNarrowed && !isSearchSurface;
  const showResults = isMoviesTab && (isNarrowed || isSearchSurface);
  const showHero = showRails;
  const heroPicks = homeRows.mostPurchased.data ?? homeRows.topRated.data ?? [];

  return (
    <div className="relative isolate flex flex-col">
      {/* Ambient page light. The hero carries its own aurora, so this only
          paints the top of the page when the hero isn't there — a result list
          or a non-video tab still opens on lit chrome rather than flat navy. */}
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
        search={search}
        onSearchChange={setSearch}
        genre={isMoviesTab ? filters.genre : seriesFilters.genre}
        onGenreChange={(genre) =>
          isMoviesTab
            ? setFilters((p) => ({ ...p, genre }))
            : setSeriesFilters((p) => ({ ...p, genre }))
        }
        sort={isMoviesTab ? filters.sort : seriesFilters.sort}
        sortOptions={
          isMoviesTab
            ? [
                { value: "newest", label: t.browse.sortNewest },
                { value: "rating", label: t.browse.sortRating },
                { value: "title", label: t.browse.sortTitle },
              ]
            : // Series carry no rating of their own, so "Top rated" would sort by nothing.
              [
                { value: "newest", label: t.browse.sortNewest },
                { value: "title", label: t.browse.sortTitle },
              ]
        }
        onSortChange={(sort) =>
          isMoviesTab
            ? setFilters((p) => ({ ...p, sort: sort as MovieSortOption }))
            : setSeriesFilters((p) => ({ ...p, sort: sort as SeriesSortOption }))
        }
        onOpenFilters={() => setFiltersOpen(true)}
        activeFilterCount={activeFilterCount}
        // On the Search destination the field is the reason for the page — it
        // never collapses back down to an icon.
        searchAlwaysOpen={isSearchSurface}
        isSearching={isSearching}
        isTooShort={isTooShort}
      />

      <div className="mx-auto w-full max-w-[1600px] flex-1 pt-4 pb-20">
        {/* What's currently narrowing the list — and nothing at all when
            nothing is. The genre row that used to sit here permanently is now
            a control on the bar itself. */}
        {(isMoviesTab || tab === "series") && pills.length > 0 && (
          <div className="px-4 sm:px-6 lg:px-8">
            <ActiveFilterPills
              pills={pills}
              onClearAll={() => {
                if (isMoviesTab) {
                  setFilters(DEFAULT_FILTERS);
                  setCategory(null);
                } else {
                  setSeriesFilters(DEFAULT_SERIES_FILTERS);
                }
              }}
            />
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
              items={toSeriesItems((seriesQuery.data?.items ?? []).slice(0, 12))}
              isLoading={seriesQuery.isLoading}
              viewAllHref="/movies?tab=series"
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
                    {!moviesQuery.isLoading && !moviesAreStale && (
                      <Chip tone="neutral" variant="outline" size="sm" className="nums">
                        {t.browse.titleCount(movieItems.length)}
                      </Chip>
                    )}
                    <DensityToggle density={density} onChange={setDensity} />
                  </>
                }
              />
              <PosterGrid
                items={movieItems}
                isLoading={moviesQuery.isLoading}
                isStale={moviesAreStale}
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
                  {!moviesQuery.isLoading && !moviesAreStale && (
                    <Chip tone="neutral" variant="outline" size="sm" className="nums">
                      {t.browse.titleCount(movieItems.length)}
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
            {!moviesQuery.isLoading && movieItems.length === 0 ? (
              <EmptyState icon={Film} title={t.browse.noMoviesTitle} description={t.browse.noMoviesBody} />
            ) : (
              <PosterGrid
                items={movieItems}
                isLoading={moviesQuery.isLoading}
                isStale={moviesAreStale}
                density={density}
              />
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
                  {!seriesQuery.isLoading && (
                    <Chip tone="neutral" variant="outline" size="sm" className="nums">
                      {t.browse.titleCount(seriesItems.length)}
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
            {!seriesQuery.isLoading && seriesItems.length === 0 ? (
              <EmptyState icon={Tv} title={t.browse.noSeriesTitle} description={t.browse.noSeriesBody} />
            ) : (
              <PosterGrid items={seriesItems} isLoading={seriesQuery.isLoading} density={density} />
            )}
          </section>
        )}

        {tab === "books" && (
          <div className="px-4 py-14 sm:px-6 lg:px-8">
            <EmptyState icon={BookOpen} title={t.search.books} description={t.search.booksComingSoon} />
          </div>
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
        values={isMoviesTab ? filters : seriesFilters}
        sortOptions={
          isMoviesTab
            ? [
                { value: "newest", label: t.browse.sortNewest },
                { value: "rating", label: t.browse.sortRating },
                { value: "title", label: t.browse.sortTitle },
              ]
            : [
                { value: "newest", label: t.browse.sortNewest },
                { value: "title", label: t.browse.sortTitle },
              ]
        }
        showRating={isMoviesTab}
        activeCount={activeFilterCount}
        resultCount={isMoviesTab ? movieItems.length : seriesItems.length}
        onChange={(next) => {
          if (isMoviesTab) {
            setFilters((prev) => ({
              ...prev,
              ...next,
              sort: (next.sort as MovieSortOption) ?? prev.sort,
            }));
          } else {
            // Series have no rating filter, so drop it rather than storing a
            // value the query would silently ignore.
            const { minRating: _minRating, ...rest } = next;
            setSeriesFilters((prev) => ({
              ...prev,
              ...rest,
              sort: (next.sort as SeriesSortOption) ?? prev.sort,
            }));
          }
        }}
        onClear={() => {
          if (isMoviesTab) {
            setFilters(DEFAULT_FILTERS);
            setCategory(null);
          } else {
            setSeriesFilters(DEFAULT_SERIES_FILTERS);
          }
        }}
      />

    </div>
  );
}

export { SpotlightHeroSkeleton as BrowseSurfaceSkeleton };
