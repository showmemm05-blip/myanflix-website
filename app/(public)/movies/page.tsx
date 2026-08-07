"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Film, Search, SlidersHorizontal, X } from "lucide-react";
import { MovieRow } from "@/components/movie/MovieRow";
import { MovieGrid } from "@/components/movie/MovieGrid";
import { MovieGridSkeleton } from "@/components/skeletons/MovieGridSkeleton";
import { MovieCardSkeleton } from "@/components/movie/MovieCard";
import { ContinueWatchingCard } from "@/components/movie/ContinueWatchingCard";
import { FilterPanel, type FilterState } from "@/components/filters/FilterPanel";
import { EmptyState } from "@/components/empty/EmptyState";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useMovies, useHomeRows, useContinueWatching } from "@/hooks/use-movies";
import { useDebounce } from "@/hooks/use-debounce";
import { useLanguage } from "@/lib/context/language-context";
import { useAuth } from "@/lib/context/auth-context";
import type { MovieSortOption } from "@/types/movie";

const FILTERS_STORAGE_KEY = "myanflix-movies-filters";
const SCROLL_STORAGE_KEY = "myanflix-movies-scroll";
const DEFAULT_FILTERS: FilterState = { sort: "newest" };
const ROW_SKELETON_COUNT = 4;

function MoviesPageContent() {
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();

  const [filters, setFilters] = useState<FilterState>(() => ({
    sort: (searchParams.get("sort") as MovieSortOption) ?? "newest",
    genre: searchParams.get("genre") ?? undefined,
  }));
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [filtersOpen, setFiltersOpen] = useState(false);
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
  const activeFilterCount = [
    filters.genre,
    filters.language,
    filters.releaseYear,
    filters.minRating,
    filters.accessType,
  ].filter((v) => v !== undefined).length;
  const hasActiveFilters = activeFilterCount > 0 || filters.sort !== "newest";
  const isBrowsing = !trimmedSearch && !hasActiveFilters;

  const homeRows = useHomeRows();
  const continueWatching = useContinueWatching(isAuthenticated);
  const { data, isLoading } = useMovies({
    ...filters,
    search: trimmedSearch || undefined,
    limit: 60,
  });

  // Restore the last scroll position once the page actually has content to
  // scroll to — e.g. coming back from a movie's detail page. Session-scoped
  // (not localStorage) so it resets on a fresh visit, matching how browsers
  // natively handle back/forward scroll restoration.
  const scrollRestored = useRef(false);
  useEffect(() => {
    if (scrollRestored.current || isLoading) return;
    const saved = sessionStorage.getItem(SCROLL_STORAGE_KEY);
    if (saved) window.scrollTo({ top: Number(saved) });
    scrollRestored.current = true;
  }, [isLoading]);

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

  return (
    <div className="flex flex-col">
      <div className="sticky top-16 z-30 border-b border-white/[0.06] bg-background/80 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1600px] items-center gap-3">
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.nav.searchPlaceholder}
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

          <Button variant="outline" onClick={() => setFiltersOpen(true)} className="shrink-0">
            <SlidersHorizontal className="size-4" />
            <span className="hidden sm:inline">Filters</span>
            {activeFilterCount > 0 && (
              <span className="flex size-4.5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1600px] flex-1 py-6">
        <div className="mb-4 px-4 sm:px-6 lg:px-8">
          <h1 className="text-xl font-bold sm:text-2xl">
            {trimmedSearch ? `Results for "${trimmedSearch}"` : "All Movies"}
          </h1>
        </div>

        {isBrowsing ? (
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
            <MovieRow title="Action" movies={homeRows.action.data ?? []} isLoading={homeRows.action.isLoading} />
            <MovieRow title="Drama" movies={homeRows.drama.data ?? []} isLoading={homeRows.drama.isLoading} />
            <MovieRow title="Comedy" movies={homeRows.comedy.data ?? []} isLoading={homeRows.comedy.isLoading} />

            <section className="flex flex-col gap-3">
              <h2 className="px-4 text-lg font-semibold sm:px-6 sm:text-xl lg:px-8">Browse All</h2>
              <div className="px-4 sm:px-6 lg:px-8">
                <MovieGrid movies={data?.items ?? []} isLoading={isLoading} />
              </div>
            </section>
          </div>
        ) : (
          <div className="px-4 sm:px-6 lg:px-8">
            {!isLoading && data?.items.length === 0 ? (
              <EmptyState icon={Film} title="No movies found" description="Try adjusting your search or filters." />
            ) : (
              <MovieGrid movies={data?.items ?? []} isLoading={isLoading} />
            )}
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
