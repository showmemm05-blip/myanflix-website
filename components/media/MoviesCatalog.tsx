"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDownWideNarrow, Film, LoaderCircle, Search, SlidersHorizontal, Tv, X } from "lucide-react";

import { MovieGrid } from "./MovieGrid";
import { movieToBrowseItem, seriesToBrowseItem } from "@/components/browse/browse-item";
import { BROWSE_GENRES } from "@/components/browse/genres";
import { ActiveFilterPills, type ActivePill } from "@/components/browse/ActiveFilterPills";
import { FilterSheet } from "@/components/filters/FilterSheet";
import type {
  FilterState,
  SeriesFilterState,
  SeriesSortOption,
} from "@/components/filters/filter-types";
import { EmptyState } from "@/components/empty/EmptyState";
import { Chip } from "@/components/system/Chip";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMovies } from "@/hooks/use-movies";
import { useSeriesList } from "@/hooks/use-series";
import { useSearchTerm, SEARCH_MIN_LENGTH } from "@/hooks/use-search-term";
import { useLanguage } from "@/lib/context/language-context";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Movie, MovieSortOption } from "@/types/movie";

// Same storage keys the pre-/media catalog used, so a user's saved filters and
// scroll position survive the route move from /movies to /media/movies.
const PREFS_STORAGE_KEY = "myanflix-movies-filters";
const SCROLL_STORAGE_KEY = "myanflix-movies-scroll";
const DEFAULT_FILTERS: FilterState = { sort: "newest" };
const DEFAULT_SERIES_FILTERS: SeriesFilterState = { sort: "newest" };

/** Every pill-shaped control on the toolbar, so the row reads as one kit. */
const CONTROL =
  "focus-ring flex h-9 items-center justify-center rounded-full bg-white/5 text-muted-foreground ring-1 ring-white/10 transition-colors duration-150 ease-out ring-inset hover:bg-white/10 hover:text-foreground hover:ring-white/16";

/** Sentinel for the genre select's "every genre" row. */
const ALL_GENRES = "__all__";

type CatalogType = "movies" | "series";

/**
 * THE MOVIES CATALOG at /media/movies — a dense, poster-first shelf.
 *
 * Where the old /movies page opened on a hero and five rails before the
 * catalog, this page IS the catalog: one toolbar (a Movies/Series switch, the
 * search field, genre, sort, filters), then as many posters as the viewport
 * can carry. Discovery rails live on the All page now; this page is for
 * scanning everything.
 *
 * All of the machinery is inherited from the proven browse surface rather
 * than re-invented: the same debounced `useSearchTerm`, the same query hooks
 * and keys, the same filter sheet, the same localStorage prefs and scroll
 * restoration under the same storage keys. Series search stays client-side
 * for the same reason it was before — `GET /series` accepts no search param.
 */
export function MoviesCatalog() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const hintId = useId();

  const [type, setType] = useState<CatalogType>(() =>
    searchParams.get("type") === "series" ? "series" : "movies",
  );
  const [filters, setFilters] = useState<FilterState>(() => ({
    sort: (searchParams.get("sort") as MovieSortOption) ?? "newest",
    genre: searchParams.get("genre") ?? undefined,
  }));
  const [seriesFilters, setSeriesFilters] = useState<SeriesFilterState>(DEFAULT_SERIES_FILTERS);
  const {
    term: search,
    setTerm: setSearch,
    effectiveTerm,
    isDebouncing,
    isTooShort,
    clear: clearSearch,
  } = useSearchTerm(searchParams.get("q") ?? "");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Restore the user's last filters/search once on mount — an explicit URL
  // param (a shared link) still wins over storage.
  useEffect(() => {
    const stored = localStorage.getItem(PREFS_STORAGE_KEY);
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
    // Deliberately mount-only: re-running on searchParams changes would fight
    // the user's own subsequent edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyed on the SETTLED term so a keystroke never writes half a word.
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify({ filters, search: effectiveTerm }));
  }, [hydrated, filters, effectiveTerm]);

  // Keep the URL shareable: /media/movies?type=series&q=… — written once per
  // settled term, not once per keystroke.
  useEffect(() => {
    const params = new URLSearchParams();
    if (type === "series") params.set("type", "series");
    if (effectiveTerm) params.set("q", effectiveTerm);
    const qs = params.toString();
    router.replace(qs ? `/media/movies?${qs}` : "/media/movies", { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, effectiveTerm]);

  const isMovies = type === "movies";

  const seriesQuery = useSeriesList({ limit: 100 });
  const moviesQuery = useMovies({
    ...filters,
    // No `search` key while Series is showing — nothing on that view renders
    // this query, so the term would put a wasted request on the wire.
    search: isMovies ? effectiveTerm || undefined : undefined,
    limit: 60,
  });

  const filteredSeries = useMemo(() => {
    let items = seriesQuery.data?.items ?? [];
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
  }, [seriesQuery.data, effectiveTerm, seriesFilters]);

  const movieItems = useMemo(
    () =>
      (moviesQuery.data?.items ?? []).map((movie: Movie) =>
        movieToBrowseItem(movie, formatDuration(movie.duration)),
      ),
    [moviesQuery.data],
  );
  const seriesItems = useMemo(
    () => filteredSeries.map((s) => seriesToBrowseItem(s, t.browse.episodeCount(s.episodeCount))),
    [filteredSeries, t],
  );

  const movieFilterCount = [
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
  const activeFilterCount = isMovies ? movieFilterCount : seriesFilterCount;

  const activeQuery = isMovies ? moviesQuery : seriesQuery;
  const isSearching = isDebouncing || activeQuery.isFetching;
  const moviesAreStale = moviesQuery.isPlaceholderData;

  const items = isMovies ? movieItems : seriesItems;
  const isLoading = activeQuery.isLoading;
  const countReady = !isLoading && (!isMovies || !moviesAreStale);

  const pills: ActivePill[] = useMemo(() => {
    const out: ActivePill[] = [];
    if (isMovies) {
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
  }, [isMovies, filters, seriesFilters, t]);

  const clearAllFilters = () => {
    if (isMovies) setFilters(DEFAULT_FILTERS);
    else setSeriesFilters(DEFAULT_SERIES_FILTERS);
  };

  // Restore the last scroll position once there is content to scroll to —
  // e.g. coming back from a detail page. Session-scoped on purpose.
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

  const genre = isMovies ? filters.genre : seriesFilters.genre;
  const genreValue = genre ?? ALL_GENRES;
  const sortOptions = isMovies
    ? [
        { value: "newest", label: t.browse.sortNewest },
        { value: "rating", label: t.browse.sortRating },
        { value: "title", label: t.browse.sortTitle },
      ]
    : // Series carry no rating of their own, so "Top rated" would sort by nothing.
      [
        { value: "newest", label: t.browse.sortNewest },
        { value: "title", label: t.browse.sortTitle },
      ];

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 pt-5 pb-20 sm:px-6 lg:px-8">
      <h2 className="sr-only">{isMovies ? t.search.movies : t.search.series}</h2>

      {/* ─ The toolbar: one row of controls, then nothing but posters ─ */}
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
        <div className="flex items-center gap-2.5">
          {/* Movies/Series switch — the one split the media nav doesn't carry:
              series are films' siblings, not a fourth medium. */}
          <div
            role="group"
            aria-label={t.nav.media}
            className="flex shrink-0 items-center rounded-full bg-white/5 p-0.5 ring-1 ring-white/10 ring-inset"
          >
            {(
              [
                { value: "movies", label: t.search.movies },
                { value: "series", label: t.search.series },
              ] as const
            ).map((option) => {
              const active = type === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setType(option.value)}
                  aria-pressed={active}
                  className={cn(
                    "focus-ring h-8 rounded-full px-3.5 text-sm font-medium whitespace-nowrap transition-colors duration-150 ease-out",
                    active
                      ? "bg-white/10 text-foreground shadow-e1 ring-1 ring-white/15 ring-inset"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          {countReady && (
            <Chip tone="neutral" variant="outline" size="sm" className="nums">
              {t.browse.titleCount(items.length)}
            </Chip>
          )}
        </div>

        <div className="flex flex-1 items-center gap-1.5 lg:justify-end">
          {/* Search — pinned open: on a catalog this dense, the field is a
              primary control, not an icon to unfold. */}
          <div className="relative min-w-0 flex-1 lg:max-w-72">
            {isSearching ? (
              <LoaderCircle
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 animate-spin text-primary"
              />
            ) : (
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
            )}
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") clearSearch();
              }}
              placeholder={isMovies ? t.browse.searchMovies : t.browse.searchSeries}
              aria-busy={isSearching}
              aria-describedby={isTooShort ? hintId : undefined}
              className={cn("h-9 rounded-full pl-10", search ? "pr-9" : "pr-3")}
            />
            {search && (
              <button
                type="button"
                onClick={clearSearch}
                aria-label={t.browse.clearSearch}
                className="focus-ring absolute top-1/2 right-1.5 flex size-6.5 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors duration-150 hover:bg-white/10 hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
            {isTooShort && (
              <p
                id={hintId}
                role="status"
                className="pointer-events-none absolute top-full left-2 z-10 mt-1.5 rounded-full bg-background/95 px-2.5 py-1 text-[11px] whitespace-nowrap text-muted-foreground ring-1 ring-white/10 ring-inset backdrop-blur-md"
              >
                {t.browse.searchMinLength(SEARCH_MIN_LENGTH)}
              </p>
            )}
          </div>

          {/* Genre shortcut — reads from the same list the filter sheet does. */}
          <Select
            value={genreValue}
            onValueChange={(v) => {
              const next = String(v) === ALL_GENRES ? undefined : String(v);
              if (isMovies) setFilters((p) => ({ ...p, genre: next }));
              else setSeriesFilters((p) => ({ ...p, genre: next }));
            }}
          >
            <SelectTrigger
              className={cn(
                "hidden h-9 w-auto gap-1.5 rounded-full px-3.5 text-sm hover:bg-white/10 md:flex",
                genre &&
                  "border-primary/40 bg-primary/15 text-foreground hover:border-primary/60 hover:bg-primary/25",
              )}
              aria-label={t.filters.genre}
            >
              <SelectValue>
                {(value) => (String(value) === ALL_GENRES ? t.browse.allGenres : String(value))}
              </SelectValue>
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value={ALL_GENRES}>{t.browse.allGenres}</SelectItem>
              <SelectSeparator />
              {BROWSE_GENRES.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={isMovies ? filters.sort : seriesFilters.sort}
            onValueChange={(v) => {
              if (!v) return;
              if (isMovies) setFilters((p) => ({ ...p, sort: String(v) as MovieSortOption }));
              else setSeriesFilters((p) => ({ ...p, sort: String(v) as SeriesSortOption }));
            }}
          >
            <SelectTrigger
              className="h-9 w-auto gap-1.5 rounded-full px-3.5 text-sm hover:bg-white/10"
              aria-label={t.browse.sort}
            >
              <ArrowDownWideNarrow className="size-4 sm:hidden" />
              <span className="hidden sm:inline">
                <SelectValue>
                  {(value) => sortOptions.find((o) => o.value === value)?.label ?? String(value)}
                </SelectValue>
              </span>
            </SelectTrigger>
            <SelectContent align="end">
              {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            aria-label={t.browse.filters}
            className={cn(
              CONTROL,
              "gap-1.5 px-3.5 text-sm font-medium",
              activeFilterCount > 0 &&
                "bg-primary/15 text-foreground ring-primary/40 hover:bg-primary/25 hover:ring-primary/60",
            )}
          >
            <SlidersHorizontal className="size-4" />
            <span className="hidden lg:inline">{t.browse.filters}</span>
            {activeFilterCount > 0 && (
              <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground nums">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {pills.length > 0 && (
        <div className="mt-3">
          <ActiveFilterPills pills={pills} onClearAll={clearAllFilters} />
        </div>
      )}

      <div className="mt-5">
        {!isLoading && items.length === 0 ? (
          isMovies ? (
            <EmptyState icon={Film} title={t.browse.noMoviesTitle} description={t.browse.noMoviesBody} />
          ) : (
            <EmptyState icon={Tv} title={t.browse.noSeriesTitle} description={t.browse.noSeriesBody} />
          )
        ) : (
          <MovieGrid items={items} isLoading={isLoading} isStale={isMovies && moviesAreStale} />
        )}
      </div>

      <FilterSheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        values={isMovies ? filters : seriesFilters}
        sortOptions={sortOptions}
        showRating={isMovies}
        activeCount={activeFilterCount}
        resultCount={items.length}
        onChange={(next) => {
          if (isMovies) {
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
        onClear={clearAllFilters}
      />
    </div>
  );
}

/** Route-level Suspense fallback: the toolbar's silhouette plus a poster grid. */
export function MoviesCatalogSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 pt-5 pb-20 sm:px-6 lg:px-8">
      <div className="flex items-center gap-2.5">
        <div className="h-9 w-40 animate-pulse rounded-full bg-secondary/50" />
        <div className="ml-auto h-9 w-full max-w-72 animate-pulse rounded-full bg-secondary/40" />
      </div>
      <div className="mt-5">
        <MovieGrid items={[]} isLoading />
      </div>
    </div>
  );
}
