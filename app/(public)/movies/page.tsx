"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen, Film, LayoutGrid, Music, Search, SlidersHorizontal, Tv, X } from "lucide-react";
import { MovieRow } from "@/components/movie/MovieRow";
import { MovieGrid } from "@/components/movie/MovieGrid";
import { MovieGridSkeleton } from "@/components/skeletons/MovieGridSkeleton";
import { MovieCardSkeleton } from "@/components/movie/MovieCard";
import { ContinueWatchingCard } from "@/components/movie/ContinueWatchingCard";
import { FilterPanel, type FilterState } from "@/components/filters/FilterPanel";
import { SeriesRow } from "@/components/series/SeriesRow";
import { SeriesGrid } from "@/components/series/SeriesGrid";
import { SeriesFilterPanel, type SeriesFilterState } from "@/components/filters/SeriesFilterPanel";
import { EmptyState } from "@/components/empty/EmptyState";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useMovies, useHomeRows, useContinueWatching } from "@/hooks/use-movies";
import { useSeriesList } from "@/hooks/use-series";
import { useDebounce } from "@/hooks/use-debounce";
import { useLanguage } from "@/lib/context/language-context";
import { useAuth } from "@/lib/context/auth-context";
import { cn } from "@/lib/utils";
import type { MovieSortOption } from "@/types/movie";

const FILTERS_STORAGE_KEY = "myanflix-movies-filters";
const SCROLL_STORAGE_KEY = "myanflix-movies-scroll";
const DEFAULT_FILTERS: FilterState = { sort: "newest" };
const DEFAULT_SERIES_FILTERS: SeriesFilterState = { sort: "newest" };
const ROW_SKELETON_COUNT = 4;

type Tab = "all" | "movies" | "series" | "books" | "music";
const TAB_VALUES: Tab[] = ["all", "movies", "series", "books", "music"];

function MoviesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();

  const [tab, setTab] = useState<Tab>(() => {
    const fromUrl = searchParams.get("tab");
    return TAB_VALUES.includes(fromUrl as Tab) ? (fromUrl as Tab) : "all";
  });

  const [filters, setFilters] = useState<FilterState>(() => ({
    sort: (searchParams.get("sort") as MovieSortOption) ?? "newest",
    genre: searchParams.get("genre") ?? undefined,
  }));
  const [seriesFilters, setSeriesFilters] = useState<SeriesFilterState>(DEFAULT_SERIES_FILTERS);
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [seriesFiltersOpen, setSeriesFiltersOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const debouncedSearch = useDebounce(search, 300);

  // Restore the user's last filters/search once on mount — an explicit URL
  // param (e.g. a shared /movies?genre=Action link) still wins over storage.
  useEffect(() => {
    const stored = localStorage.getItem(FILTERS_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as { filters?: Partial<FilterState>; search?: string };
        if (parsed.filters && !searchParams.get("sort") && !searchParams.get("genre")) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setFilters((prev) => ({ ...prev, ...parsed.filters }));
        }
        if (typeof parsed.search === "string" && !searchParams.get("q")) {
          setSearch(parsed.search);
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

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify({ filters, search }));
  }, [hydrated, filters, search]);

  const trimmedSearch = debouncedSearch.trim();

  // Keep the URL in sync with the active tab (and search, on the tabs that
  // show a search box) so /movies?tab=series is shareable/bookmarkable and
  // so /series and /search can redirect straight into the right tab.
  useEffect(() => {
    const params = new URLSearchParams();
    params.set("tab", tab);
    if ((tab === "movies" || tab === "series") && trimmedSearch) {
      params.set("q", trimmedSearch);
    }
    router.replace(`/movies?${params.toString()}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, trimmedSearch]);

  const activeFilterCount = [
    filters.genre,
    filters.language,
    filters.releaseYear,
    filters.minRating,
    filters.accessType,
  ].filter((v) => v !== undefined).length;

  const seriesActiveFilterCount = [
    seriesFilters.genre,
    seriesFilters.language,
    seriesFilters.releaseYear,
    seriesFilters.accessType,
  ].filter((v) => v !== undefined).length;

  const homeRows = useHomeRows();
  const continueWatching = useContinueWatching(isAuthenticated);
  const seriesQuery = useSeriesList({ limit: 100 });

  // Movies tab — always filtered/searched by whatever's currently in the search box + FilterPanel.
  const moviesQuery = useMovies({
    ...filters,
    search: trimmedSearch || undefined,
    limit: 60,
  });
  // "All" tab's "Browse All" section — deliberately unfiltered, independent of
  // the Movies tab's own search/filters, so switching to "All" always shows
  // the full catalog regardless of what's left over in the search box.
  const browseAllQuery = useMovies({ limit: 60 });

  const filteredSeries = useMemo(() => {
    let items = seriesQuery.data?.items ?? [];
    if (trimmedSearch) {
      const q = trimmedSearch.toLowerCase();
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
  }, [seriesQuery.data, trimmedSearch, seriesFilters]);

  // Restore the last scroll position once the page actually has content to
  // scroll to — e.g. coming back from a movie's detail page. Session-scoped
  // (not localStorage) so it resets on a fresh visit, matching how browsers
  // natively handle back/forward scroll restoration.
  const scrollRestored = useRef(false);
  useEffect(() => {
    if (scrollRestored.current || browseAllQuery.isLoading) return;
    const saved = sessionStorage.getItem(SCROLL_STORAGE_KEY);
    if (saved) window.scrollTo({ top: Number(saved) });
    scrollRestored.current = true;
  }, [browseAllQuery.isLoading]);

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

  const showContinueWatching =
    isAuthenticated && (continueWatching.isLoading || (continueWatching.data?.length ?? 0) > 0);

  const tabOptions: { value: Tab; label: string; icon: typeof LayoutGrid }[] = [
    { value: "all", label: t.search.all, icon: LayoutGrid },
    { value: "movies", label: t.search.movies, icon: Film },
    { value: "series", label: t.search.series, icon: Tv },
    { value: "books", label: t.search.books, icon: BookOpen },
    { value: "music", label: t.search.music, icon: Music },
  ];

  return (
    <div className="flex flex-col">
      <div className="sticky top-16 z-30 border-b border-white/[0.06] bg-background/80 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-3">
          <div className="scrollbar-none flex items-center gap-2 overflow-x-auto">
            {tabOptions.map((option) => {
              const active = tab === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTab(option.value)}
                  aria-pressed={active}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground shadow-[0_0_0_1px_var(--primary)]"
                      : "border-white/10 bg-secondary/40 text-muted-foreground hover:border-white/20 hover:bg-secondary hover:text-foreground",
                  )}
                >
                  <option.icon className="size-4" />
                  {option.label}
                </button>
              );
            })}
          </div>

          {(tab === "movies" || tab === "series") && (
            <div className="flex items-center gap-3">
              <div className="relative max-w-md flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={tab === "movies" ? t.nav.searchPlaceholder : t.search.seriesPlaceholder}
                  className="bg-secondary/60 pl-9 pr-9"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={t.common.close}
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>

              <Button
                variant="outline"
                onClick={() => (tab === "movies" ? setFiltersOpen(true) : setSeriesFiltersOpen(true))}
                className="shrink-0"
              >
                <SlidersHorizontal className="size-4" />
                <span className="hidden sm:inline">{t.search.filters}</span>
                {(tab === "movies" ? activeFilterCount : seriesActiveFilterCount) > 0 && (
                  <span className="flex size-4.5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                    {tab === "movies" ? activeFilterCount : seriesActiveFilterCount}
                  </span>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1600px] flex-1 py-6">
        {tab === "all" && (
          <div className="flex flex-col gap-10 pt-2">
            {showContinueWatching && (
              <section className="flex flex-col gap-3">
                <h2 className="px-4 text-lg font-semibold sm:px-6 sm:text-xl lg:px-8">Continue Watching</h2>
                <div className="scrollbar-none flex gap-3 overflow-x-auto scroll-smooth px-4 pb-1 sm:px-6 lg:px-8">
                  {continueWatching.isLoading
                    ? Array.from({ length: ROW_SKELETON_COUNT }).map((_, i) => <MovieCardSkeleton key={i} />)
                    : continueWatching.data?.map((entry) => <ContinueWatchingCard key={entry.id} entry={entry} />)}
                </div>
              </section>
            )}

            <MovieRow title="Trending Now" movies={homeRows.mostPurchased.data ?? []} isLoading={homeRows.mostPurchased.isLoading} />
            <MovieRow title="Recently Added" movies={homeRows.newReleases.data ?? []} isLoading={homeRows.newReleases.isLoading} />
            <MovieRow title="Top Rated" movies={homeRows.topRated.data ?? []} isLoading={homeRows.topRated.isLoading} />
            <SeriesRow
              title={t.search.seriesRow}
              series={(seriesQuery.data?.items ?? []).slice(0, 12)}
              isLoading={seriesQuery.isLoading}
              viewAllHref="/movies?tab=series"
            />
            <MovieRow title="Action" movies={homeRows.action.data ?? []} isLoading={homeRows.action.isLoading} />
            <MovieRow title="Drama" movies={homeRows.drama.data ?? []} isLoading={homeRows.drama.isLoading} />
            <MovieRow title="Comedy" movies={homeRows.comedy.data ?? []} isLoading={homeRows.comedy.isLoading} />

            <section className="flex flex-col gap-3">
              <h2 className="px-4 text-lg font-semibold sm:px-6 sm:text-xl lg:px-8">Browse All</h2>
              <div className="px-4 sm:px-6 lg:px-8">
                <MovieGrid movies={browseAllQuery.data?.items ?? []} isLoading={browseAllQuery.isLoading} />
              </div>
            </section>
          </div>
        )}

        {tab === "movies" && (
          <div className="px-4 sm:px-6 lg:px-8">
            <h1 className="mb-4 text-xl font-bold sm:text-2xl">
              {trimmedSearch ? `Results for "${trimmedSearch}"` : "All Movies"}
            </h1>
            {!moviesQuery.isLoading && moviesQuery.data?.items.length === 0 ? (
              <EmptyState icon={Film} title="No movies found" description="Try adjusting your search or filters." />
            ) : (
              <MovieGrid movies={moviesQuery.data?.items ?? []} isLoading={moviesQuery.isLoading} />
            )}
          </div>
        )}

        {tab === "series" && (
          <div className="px-4 sm:px-6 lg:px-8">
            <h1 className="mb-4 text-xl font-bold sm:text-2xl">
              {trimmedSearch ? `Results for "${trimmedSearch}"` : "All Series"}
            </h1>
            {!seriesQuery.isLoading && filteredSeries.length === 0 ? (
              <EmptyState icon={Tv} title="No series found" description="Try adjusting your search or filters." />
            ) : (
              <SeriesGrid series={filteredSeries} isLoading={seriesQuery.isLoading} />
            )}
          </div>
        )}

        {tab === "books" && (
          <div className="px-4 py-10 sm:px-6 lg:px-8">
            <EmptyState icon={BookOpen} title={t.search.books} description={t.search.booksComingSoon} />
          </div>
        )}

        {tab === "music" && (
          <div className="px-4 py-10 sm:px-6 lg:px-8">
            <EmptyState icon={Music} title={t.search.music} description={t.search.musicComingSoon} />
          </div>
        )}
      </div>

      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-sm">
          <SheetTitle className="sr-only">Filters</SheetTitle>
          <div className="p-4">
            <FilterPanel
              filters={filters}
              onChange={(next) => setFilters((prev) => ({ ...prev, ...next }))}
              onClear={() => setFilters(DEFAULT_FILTERS)}
            />
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={seriesFiltersOpen} onOpenChange={setSeriesFiltersOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-sm">
          <SheetTitle className="sr-only">Filters</SheetTitle>
          <div className="p-4">
            <SeriesFilterPanel
              filters={seriesFilters}
              onChange={(next) => setSeriesFilters((prev) => ({ ...prev, ...next }))}
              onClear={() => setSeriesFilters(DEFAULT_SERIES_FILTERS)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default function MoviesPage() {
  return (
    <Suspense fallback={<MovieGridSkeleton />}>
      <MoviesPageContent />
    </Suspense>
  );
}
