"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Film, Tv } from "lucide-react";

import type { ActivePill } from "@/components/browse/ActiveFilterPills";
import { FilterSheet, type FilterSheetFacets } from "@/components/filters/FilterSheet";
import {
  AGE_RATING_LABELS,
  DEFAULT_FILTERS,
  DEFAULT_MOVIE_SORT,
  DEFAULT_SERIES_SORT,
  countActiveFilters,
  type FilterState,
} from "@/components/filters/filter-types";
import { CardGrid, ChevronRightIcon, CloseIcon, GridLoadingMore, SegmentedControl } from "@/components/system";
import { EmptyState } from "@/components/empty/EmptyState";
import { ErrorState } from "@/components/empty/ErrorState";
import { Button, buttonVariants } from "@/components/ui/button";
import { useMovieFacets, useMoviesInfinite } from "@/hooks/use-movies";
import { useSeriesFacets, useSeriesInfinite } from "@/hooks/use-series";
import { useAuth } from "@/lib/context/auth-context";
import { useLanguage } from "@/lib/context/language-context";
import { useSection } from "@/lib/i18n/sections/define";
import { mediaText } from "@/lib/i18n/sections/media";
import { shellText } from "@/lib/i18n/sections/shell";
import { cn } from "@/lib/utils";
import { movieService } from "@/services/api/movieService";
import type { Movie, MovieQuery, MovieSortOption } from "@/types/movie";
import type { SeriesListItem, SeriesQuery, SeriesSortOption } from "@/types/series";
import { AppliedFilters, FilterButton, InfiniteSentinel, SortSelect } from "./CatalogParts";
import { CategoriesOverlay, type CategoryPick } from "./CategoriesOverlay";
import { categoryKindFromParam, hubHref, useCatalogCategories, type MediaKind } from "./media-data";
import { MovieCard, SeriesCard } from "./MovieCard";
import { MovieHero } from "./MovieHero";
import { SeriesHero } from "./SeriesHero";

const MOVIE_SORTS: MovieSortOption[] = ["recentlyAdded", "newest", "oldest", "rating", "title", "mostViewed", "mostPurchased"];
const SERIES_SORTS: SeriesSortOption[] = ["recentlyAdded", "newest", "oldest", "title"];

/**
 * ONE GENRE OR CATEGORY, OPENED (MediaGenre.dc.html) — /media/genre.
 *
 *   ?type=movies|series & genre=Drama
 *   ?type=movies|series & category=<id> & name=<category name>
 *
 * A shorter hero with the top pick, then a round close button (back to the
 * hub), the small "Genre" / "Category" label, the name as the page title and
 * a "Change" link that reopens the Categories overlay. A Movies | Series
 * switch, the sort chip, "Sort & filter", a live count, removable pills and
 * the infinite poster grid.
 *
 * Movies and series are both matched by the server (genre / categoryId), so
 * the count is the real total from the first page.
 *
 * The sort and filters here are this view's own (they are not written into
 * the address and do not touch the hubs' saved filters).
 *
 * Only the kind on screen is asked for: a movie pick never loads series (and
 * the other way round) — see MoviesFeed / SeriesFeed below.
 */
export function GenreView() {
  const params = useSearchParams();
  const kind: MediaKind = params.get("type") === "series" ? "series" : "movies";
  const genre = params.get("genre")?.trim() || null;
  const categoryId = params.get("category")?.trim() || null;
  const nameParam = params.get("name")?.trim() || null;
  // Remount on a new pick or kind, so sort and filters start clean.
  return (
    <GenreViewInner
      key={`${kind}|${genre ?? ""}|${categoryId ?? ""}`}
      kind={kind}
      genre={genre}
      categoryId={categoryId}
      nameParam={nameParam}
    />
  );
}

function GenreViewInner({
  kind,
  genre,
  categoryId,
  nameParam,
}: {
  kind: MediaKind;
  genre: string | null;
  categoryId: string | null;
  nameParam: string | null;
}) {
  const { t } = useLanguage();
  const m = useSection(mediaText);
  const s = useSection(shellText);
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [filters, setFilters] = useState<FilterState>({
    ...DEFAULT_FILTERS,
    sort: kind === "series" ? (DEFAULT_SERIES_SORT as MovieSortOption) : DEFAULT_MOVIE_SORT,
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [overlayOpen, setOverlayOpen] = useState(false);
  // The Media chip strip's Categories chip opens the overlay over this page
  // by adding `?categories=<type>`; the "Change" link opens it directly.
  const overlayParam = params.get("categories");
  const closeOverlay = () => {
    setOverlayOpen(false);
    if (overlayParam === null) return;
    const qs = new URLSearchParams(params.toString());
    qs.delete("categories");
    router.replace(`${pathname}?${qs.toString()}`, { scroll: false });
  };

  const categories = useCatalogCategories(isAuthenticated && Boolean(categoryId));
  const categoryName = categoryId ? categories.data?.find((c) => c.id === categoryId)?.name ?? nameParam : null;
  const pickName = genre ?? categoryName ?? m.unknownPick;
  const pickKind = genre ? m.genre : m.category;
  const current: CategoryPick = genre ? `genre:${genre}` : categoryId ? `category:${categoryId}` : "all";

  const sortLabels: Record<MovieSortOption, string> = {
    relevance: t.filters.sortRelevance,
    recentlyAdded: t.filters.sortRecentlyAdded,
    newest: t.filters.sortNewest,
    oldest: t.filters.sortOldest,
    rating: t.filters.sortRating,
    title: t.filters.sortTitle,
    mostViewed: t.filters.sortMostViewed,
    mostPurchased: t.filters.sortMostPurchased,
  };
  const sortOptions = (kind === "series" ? SERIES_SORTS : MOVIE_SORTS).map((value) => ({ value, label: sortLabels[value] }));
  const defaultSort = kind === "series" ? DEFAULT_SERIES_SORT : DEFAULT_MOVIE_SORT;

  // ── Queries ────────────────────────────────────────────────────────
  const movieQuery: MovieQuery = useMemo(
    () => ({
      genres: genre ? [genre] : filters.genres.length > 0 ? filters.genres : undefined,
      categoryId: categoryId ?? undefined,
      languages: filters.languages.length > 0 ? filters.languages : undefined,
      actorIds: filters.actors.length > 0 ? filters.actors.map((a) => a.id) : undefined,
      directors: filters.directors.length > 0 ? filters.directors : undefined,
      countries: filters.countries.length > 0 ? filters.countries : undefined,
      ageRatings: filters.ageRatings.length > 0 ? filters.ageRatings : undefined,
      yearFrom: filters.yearFrom,
      yearTo: filters.yearTo,
      ratingMin: filters.ratingMin,
      ratingMax: filters.ratingMax,
      durationMin: filters.durationMin,
      durationMax: filters.durationMax,
      accessType: filters.accessType,
      sort: filters.sort !== DEFAULT_MOVIE_SORT ? filters.sort : undefined,
      limit: 30,
    }),
    [genre, categoryId, filters],
  );
  const seriesQuery: SeriesQuery = useMemo(
    () => ({
      genres: genre ? [genre] : filters.genres.length > 0 ? filters.genres : undefined,
      categoryId: categoryId ?? undefined,
      languages: filters.languages.length > 0 ? filters.languages : undefined,
      yearFrom: filters.yearFrom,
      yearTo: filters.yearTo,
      accessType: filters.accessType,
      sort: filters.sort !== DEFAULT_SERIES_SORT ? (filters.sort as SeriesSortOption) : undefined,
      limit: 30,
    }),
    [genre, categoryId, filters],
  );

  const topPick = useQuery({
    queryKey: ["media", "genre-top", genre, categoryId],
    queryFn: async () =>
      (await movieService.getMovies({ genres: genre ? [genre] : undefined, categoryId: categoryId ?? undefined, sort: "rating", limit: 1 })).items,
    enabled: kind === "movies",
  });

  // ── Filters: count, pills ──────────────────────────────────────────
  const visibleFilters: FilterState =
    kind === "series"
      ? { ...DEFAULT_FILTERS, sort: filters.sort, genres: filters.genres, languages: filters.languages, yearFrom: filters.yearFrom, yearTo: filters.yearTo, accessType: filters.accessType }
      : filters;
  const activeCount = countActiveFilters({ ...visibleFilters, genres: genre ? [] : visibleFilters.genres });
  const update = useCallback((next: Partial<FilterState>) => setFilters((prev) => ({ ...prev, ...next })), []);
  const clearFilters = useCallback(
    () => setFilters({ ...DEFAULT_FILTERS, sort: defaultSort as MovieSortOption }),
    [defaultSort],
  );

  const pills: ActivePill[] = [];
  const pushList = (key: string, values: string[], field: "genres" | "languages" | "directors" | "countries") => {
    for (const value of values) {
      pills.push({ key: `${key}:${value}`, label: value, onRemove: () => update({ [field]: filters[field].filter((v) => v !== value) }) });
    }
  };
  if (!genre) pushList("genre", visibleFilters.genres, "genres");
  pushList("language", visibleFilters.languages, "languages");
  pushList("director", visibleFilters.directors, "directors");
  pushList("country", visibleFilters.countries, "countries");
  for (const actor of visibleFilters.actors) {
    pills.push({ key: `actor:${actor.id}`, label: actor.name, onRemove: () => update({ actors: filters.actors.filter((a) => a.id !== actor.id) }) });
  }
  for (const rating of visibleFilters.ageRatings) {
    pills.push({ key: `age:${rating}`, label: AGE_RATING_LABELS[rating], onRemove: () => update({ ageRatings: filters.ageRatings.filter((r) => r !== rating) }) });
  }
  const range = (from?: number, to?: number) =>
    from !== undefined && to !== undefined ? (from === to ? String(from) : `${from}–${to}`) : from !== undefined ? `≥ ${from}` : `≤ ${to}`;
  if (visibleFilters.yearFrom !== undefined || visibleFilters.yearTo !== undefined) {
    pills.push({ key: "years", label: range(visibleFilters.yearFrom, visibleFilters.yearTo), onRemove: () => update({ yearFrom: undefined, yearTo: undefined }) });
  }
  if (visibleFilters.ratingMin !== undefined || visibleFilters.ratingMax !== undefined) {
    pills.push({
      key: "rating",
      label: `${t.filters.rating} ${range(visibleFilters.ratingMin, visibleFilters.ratingMax)}`,
      onRemove: () => update({ ratingMin: undefined, ratingMax: undefined }),
    });
  }
  if (visibleFilters.durationMin !== undefined || visibleFilters.durationMax !== undefined) {
    pills.push({
      key: "duration",
      label: `${t.filters.duration} ${range(visibleFilters.durationMin, visibleFilters.durationMax)}`,
      onRemove: () => update({ durationMin: undefined, durationMax: undefined }),
    });
  }
  if (visibleFilters.accessType) {
    pills.push({
      key: "access",
      label: visibleFilters.accessType === "FREE" ? t.search.accessFree : t.search.accessSubscription,
      onRemove: () => update({ accessType: undefined }),
    });
  }
  if (visibleFilters.sort !== defaultSort) {
    pills.push({ key: "sort", label: sortLabels[visibleFilters.sort], onRemove: () => update({ sort: defaultSort as MovieSortOption }) });
  }
  const narrowed = pills.length > 0;

  // ── Navigation ────────────────────────────────────────────────────
  const setKind = (next: MediaKind) => {
    const qs = new URLSearchParams(params.toString());
    qs.set("type", next);
    router.replace(`${pathname}?${qs.toString()}`, { scroll: false });
  };
  const browseAll = kind === "series" ? m.browseAllSeries : m.browseAllMovies;
  const EmptyIcon = kind === "series" ? Tv : Film;
  const noun = kind === "series" ? m.seriesCount : m.movieCount;

  // Everything below depends on the list of the kind on screen.
  const renderPage = (feed: GenreFeed) => {
    const { movies, series, total } = feed;
    const infinite = feed;
    const itemCount = kind === "series" ? series.length : movies.length;

    const countReady = total !== undefined && !infinite.isPlaceholderData;
    const countLabel = !countReady ? null : narrowed ? t.filters.matchCount(total ?? 0) : noun(total ?? 0);

    // ── Sheet ─────────────────────────────────────────────────────────
    const facetData = feed.facets;
    const sheetFacets: FilterSheetFacets | undefined = facetData
      ? {
          ...facetData,
          // The genre is the page itself when a genre is open.
          genres: genre ? [] : facetData.genres,
        }
      : undefined;
    const handleSheetChange = (next: Partial<FilterState>) => {
      if (kind === "movies") {
        update(next);
        return;
      }
      const patch: Partial<FilterState> = {};
      if (next.sort !== undefined) patch.sort = next.sort;
      if (next.genres !== undefined) patch.genres = next.genres;
      if (next.languages !== undefined) patch.languages = next.languages;
      if ("yearFrom" in next) patch.yearFrom = next.yearFrom;
      if ("yearTo" in next) patch.yearTo = next.yearTo;
      if ("accessType" in next) patch.accessType = next.accessType;
      update(patch);
    };

    const heroMovies = kind === "movies" ? topPick.data ?? [] : [];
    const heroSeries = kind === "series" ? series.slice(0, 1) : [];
    const showHero = !narrowed && (heroMovies.length > 0 || heroSeries.length > 0);
    const endReached = countReady && !infinite.hasNextPage && itemCount > 0;
    // The top pick's title is an h2, so when it shows, the page's h1 (the
    // pick's name) comes first for screen readers and the visible name under
    // the hero becomes an h2 that labels its section.
    const PickHeading = showHero ? "h2" : "h1";

    return (
      <div className="mq-rise">
        {showHero && (
          <h1 className="sr-only">
            {pickKind}: {pickName}
          </h1>
        )}
        {showHero &&
          (kind === "movies" ? (
            <MovieHero movies={heroMovies} size="detail" headingLevel="h2" label={m.topPickIn(pickName)} kicker={m.topPickIn(pickName)} />
          ) : (
            <SeriesHero series={heroSeries} size="detail" headingLevel="h2" label={m.topPickIn(pickName)} kicker={m.topPickIn(pickName)} />
          ))}

        <section aria-labelledby="h-pick" className={cn("px-gutter", showHero ? "pt-2" : "pt-10")}>
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-[18px]">
            <div className="flex min-w-0 items-center gap-4">
              <Link
                href={hubHref(kind)}
                aria-label={m.closePick(pickName)}
                className={buttonVariants({ variant: "tonal", size: "icon-round" })}
              >
                <CloseIcon size={20} />
              </Link>
              <div className="min-w-0">
                <p className="text-[13px] leading-[18px] font-extrabold tracking-[0.1em] text-fg-faint uppercase [&:lang(my)]:tracking-normal">
                  {pickKind}
                </p>
                <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1">
                  <PickHeading id="h-pick" className="mt-0.5 text-[clamp(32px,3.2vw,46px)] leading-[1.1] font-black tracking-[-0.03em] text-fg [&:lang(my)]:tracking-normal">
                    {pickName}
                  </PickHeading>
                  <button
                    type="button"
                    aria-haspopup="dialog"
                    aria-label={m.changeCategory(pickName)}
                    onClick={() => setOverlayOpen(true)}
                    className="mq-link inline-flex cursor-pointer items-center gap-1 rounded-[6px] border-0 bg-transparent p-0 text-[15px] leading-5 font-bold outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link"
                  >
                    {m.change}
                    <ChevronRightIcon size={16} />
                  </button>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 max-desk:w-full max-desk:justify-between">
              <SegmentedControl
                fit
                label={m.show}
                value={kind}
                onChange={setKind}
                options={[
                  { value: "movies", label: m.movies },
                  { value: "series", label: m.series },
                ]}
              />
              {(itemCount > 0 || narrowed) && (
                <>
                  <SortSelect
                    value={filters.sort}
                    options={sortOptions}
                    onChange={(sort) => update({ sort: sort as MovieSortOption })}
                  />
                  <FilterButton count={activeCount} onClick={() => setFiltersOpen(true)} />
                </>
              )}
            </div>
          </div>

          <p role="status" className="mt-3.5 text-sm leading-5 text-fg-faint tabular-nums">
            {countLabel ?? <span aria-hidden>—</span>}
          </p>
          <AppliedFilters pills={pills} onClearAll={clearFilters} className="mt-3.5" />

          {infinite.isError && itemCount === 0 ? (
            <ErrorState className="pt-6" description={s.errorBody} onRetry={feed.refetch} />
          ) : !infinite.isLoading && itemCount === 0 && !infinite.hasNextPage ? (
            <EmptyState
              icon={EmptyIcon}
              headingLevel="h2"
              title={
                narrowed
                  ? kind === "series"
                    ? m.noSeriesFiltered
                    : m.noMoviesFiltered
                  : kind === "series"
                    ? m.noSeriesIn(pickName)
                    : m.noMoviesIn(pickName)
              }
              description={narrowed ? m.emptyFilteredBody : m.emptyPickBody}
              action={
                narrowed ? (
                  <Button variant="play" size="cta" onClick={clearFilters}>
                    {m.clearFilters}
                  </Button>
                ) : (
                  <>
                    <Link href={hubHref(kind)} className={buttonVariants({ variant: "play", size: "cta" })}>
                      {browseAll}
                    </Link>
                    <Button variant="tonal" size="cta" aria-haspopup="dialog" onClick={() => setOverlayOpen(true)}>
                      {m.otherCategories}
                    </Button>
                  </>
                )
              }
            />
          ) : (
            <>
              <CardGrid
                kind="posters"
                aria-busy={infinite.isLoading || infinite.isFetchingNextPage || undefined}
                className={cn("mt-[22px] transition-opacity duration-200", infinite.isPlaceholderData && "opacity-60")}
              >
                {kind === "series"
                  ? series.map((item, i) => <SeriesCard key={item.id} series={item} priority={i < 7} />)
                  : movies.map((movie, i) => <MovieCard key={movie.id} movie={movie} priority={i < 7} />)}
                {infinite.isLoading && (
                  <GridLoadingMore kind="poster" count={14} label={s.loading} />
                )}
                {infinite.isFetchingNextPage && (
                  <GridLoadingMore kind="poster" count={7} label={kind === "series" ? m.loadingMoreSeries : m.loadingMoreMovies} />
                )}
              </CardGrid>
              <InfiniteSentinel
                hasNextPage={infinite.hasNextPage}
                isFetchingNextPage={infinite.isFetchingNextPage}
                onLoadMore={feed.loadMore}
              />
              {endReached && (
                <p className="mt-9 text-center text-sm leading-5 text-fg-faint">
                  {m.everyTitleIn(pickName)}{" "}
                  <Link href={hubHref(kind)} className="mq-link font-bold">
                    {browseAll}
                  </Link>
                </p>
              )}
            </>
          )}
        </section>

        <FilterSheet
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          values={visibleFilters}
          onChange={handleSheetChange}
          onClear={clearFilters}
          sortOptions={sortOptions}
          isSeries={kind === "series"}
          facets={sheetFacets}
          activeCount={activeCount}
          resultTotal={total}
          isCounting={infinite.isFetching}
        />
        <CategoriesOverlay
          open={overlayOpen || overlayParam !== null}
          onClose={closeOverlay}
          onNavigate={() => setOverlayOpen(false)}
          initialKind={overlayParam === null ? kind : categoryKindFromParam(overlayParam, kind)}
          current={current}
          currentKind={kind}
        />
      </div>
    );
  };

  return kind === "series" ? (
    <SeriesFeed query={seriesQuery}>
      {renderPage}
    </SeriesFeed>
  ) : (
    <MoviesFeed query={movieQuery}>{renderPage}</MoviesFeed>
  );
}

/* ═══════════════════════════════ THE FEEDS ═══════════════════════════════ */

/** The list of the kind on screen, its filter options and its loading state. */
interface GenreFeed {
  movies: Movie[];
  series: SeriesListItem[];
  total: number | undefined;
  facets: FilterSheetFacets | undefined;
  isLoading: boolean;
  isError: boolean;
  isFetching: boolean;
  isFetchingNextPage: boolean;
  isPlaceholderData: boolean;
  hasNextPage: boolean;
  refetch: () => void;
  loadMore: () => void;
}

/** Movies of the pick — matched by the server (genre / categoryId). */
function MoviesFeed({ query, children }: { query: MovieQuery; children: (feed: GenreFeed) => ReactNode }) {
  const facets = useMovieFacets();
  const infinite = useMoviesInfinite(query);
  const movies = useMemo(() => infinite.data?.pages.flatMap((p) => p.items) ?? [], [infinite.data]);
  const { fetchNextPage, refetch } = infinite;
  const loadMore = useCallback(() => void fetchNextPage(), [fetchNextPage]);
  const retry = useCallback(() => void refetch(), [refetch]);
  return children({
    movies,
    series: [],
    total: infinite.data?.pages[0]?.total,
    facets: facets.data,
    isLoading: infinite.isLoading,
    isError: infinite.isError,
    isFetching: infinite.isFetching,
    isFetchingNextPage: infinite.isFetchingNextPage,
    isPlaceholderData: infinite.isPlaceholderData,
    hasNextPage: infinite.hasNextPage,
    refetch: retry,
    loadMore,
  });
}

/** Series of the pick — matched by the server (genre / categoryId), same as movies. */
function SeriesFeed({ query, children }: { query: SeriesQuery; children: (feed: GenreFeed) => ReactNode }) {
  const facets = useSeriesFacets();
  const infinite = useSeriesInfinite(query);
  const series = useMemo(() => infinite.data?.pages.flatMap((p) => p.items) ?? [], [infinite.data]);
  const { fetchNextPage, refetch } = infinite;
  const loadMore = useCallback(() => void fetchNextPage(), [fetchNextPage]);
  const retry = useCallback(() => void refetch(), [refetch]);
  return children({
    movies: [],
    series,
    total: infinite.data?.pages[0]?.total,
    facets: facets.data,
    isLoading: infinite.isLoading,
    isError: infinite.isError,
    isFetching: infinite.isFetching,
    isFetchingNextPage: infinite.isFetchingNextPage,
    isPlaceholderData: infinite.isPlaceholderData,
    hasNextPage: infinite.hasNextPage,
    refetch: retry,
    loadMore,
  });
}
