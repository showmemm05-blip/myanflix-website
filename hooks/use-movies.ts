import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { movieService } from "@/services/api/movieService";
import { historyService } from "@/services/api/historyService";
import { SEARCH_STALE_TIME_MS } from "@/hooks/use-search-term";
import type { MovieQuery } from "@/types/movie";

const CONTINUE_WATCHING_MIN_PERCENT = 1;
const CONTINUE_WATCHING_MAX_PERCENT = 95;

/**
 * The catalogue query. It is also the search query — searching is this same
 * list with a `search` param, not a separate stack.
 *
 * WHY A LATE RESPONSE CAN'T OVERWRITE A NEWER ONE — two mechanisms, belt and
 * braces, and deliberately no third:
 *
 * 1. **Cancellation.** `queryFn` consumes React Query's `signal` and forwards
 *    it into axios. Consuming it is also what gives React Query permission to
 *    abort on unsubscribe, so the moment the key changes ("avengers" → "avatar")
 *    the superseded request is aborted mid-flight and never resolves at all.
 * 2. **Keying.** Every result is cached under its own `["movies", query]` key.
 *    So even a response that outruns the abort resolves into the "avengers"
 *    cache entry — never into the "avatar" entry the screen is rendering.
 *
 * That is why there is no request-id / sequence guard here: keying already
 * makes a stale write impossible, and a hand-rolled guard would be a third
 * mechanism with nothing left to catch.
 *
 * `staleTime` (with React Query's dedupe of identical in-flight keys) keeps a
 * just-searched term from being asked twice, and `keepPreviousData` holds the
 * previous results on screen while the next ones load, so the grid never
 * flashes empty between terms.
 */
export function useMovies(query: MovieQuery = {}) {
  return useQuery({
    queryKey: ["movies", query],
    queryFn: ({ signal }) => movieService.getMovies(query, { signal }),
    placeholderData: keepPreviousData,
    staleTime: SEARCH_STALE_TIME_MS,
  });
}

/** Exported so anything (prefetch, invalidation) can address the infinite catalog's cache entries. */
export const moviesInfiniteKey = (query: MovieQuery) => ["movies", "infinite", query] as const;

/**
 * The infinite-scroll catalog query — same one query path as `useMovies`
 * (GET /movies), paged. `pages[0].total` is the backend's real total for the
 * whole filtered set: it IS the match count the UI shows, never a page's
 * `items.length`.
 */
export function useMoviesInfinite(query: MovieQuery = {}) {
  return useInfiniteQuery({
    queryKey: moviesInfiniteKey(query),
    queryFn: ({ pageParam, signal }) =>
      movieService.getMovies({ ...query, page: pageParam }, { signal }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((n, p) => n + p.items.length, 0);
      return loaded < lastPage.total ? lastPage.page + 1 : undefined;
    },
    // Holds the previous key's pages on screen while a new filter/term loads,
    // so the grid recedes instead of flashing empty.
    placeholderData: keepPreviousData,
    staleTime: SEARCH_STALE_TIME_MS,
  });
}

/** The filter sheet's option lists — DB-derived, so empty facets can honestly hide their control. */
export function useMovieFacets() {
  return useQuery({
    queryKey: ["movies", "facets"],
    queryFn: ({ signal }) => movieService.getFacets({ signal }),
    staleTime: 5 * 60_000,
  });
}

export function useMovie(id: string) {
  return useQuery({
    queryKey: ["movie", id],
    queryFn: () => movieService.getMovieById(id),
    enabled: Boolean(id),
  });
}

export function useSimilarMovies(id: string) {
  return useQuery({
    queryKey: ["movie", id, "similar"],
    queryFn: () => movieService.getSimilarMovies(id),
    enabled: Boolean(id),
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: () => movieService.getCategories(),
    staleTime: 5 * 60_000,
  });
}

export function useCategory(id: string) {
  return useQuery({
    queryKey: ["category", id],
    queryFn: () => movieService.getCategoryById(id),
    enabled: Boolean(id),
  });
}

/** In-progress (not-yet-completed) watch history, most recent first — powers the "Continue Watching" row. */
export function useContinueWatching(enabled: boolean) {
  return useQuery({
    queryKey: ["continue-watching"],
    queryFn: async () => {
      const res = await historyService.getWatchHistory({ limit: 20 });
      return res.items.filter(
        (e) => e.progressPercent >= CONTINUE_WATCHING_MIN_PERCENT && e.progressPercent < CONTINUE_WATCHING_MAX_PERCENT,
      );
    },
    enabled,
  });
}

export function useHomeRows() {
  const newReleases = useQuery({ queryKey: ["home", "new"], queryFn: () => movieService.getNewReleases() });
  const mostPurchased = useQuery({
    queryKey: ["home", "most-purchased"],
    queryFn: () => movieService.getMostPurchased(),
  });
  const topRated = useQuery({ queryKey: ["home", "top-rated"], queryFn: () => movieService.getTopRated() });
  const myanmar = useQuery({ queryKey: ["home", "myanmar"], queryFn: () => movieService.getMyanmarMovies() });
  const international = useQuery({
    queryKey: ["home", "international"],
    queryFn: () => movieService.getInternationalMovies(),
  });
  const action = useQuery({ queryKey: ["home", "action"], queryFn: () => movieService.getByGenre("Action") });
  const drama = useQuery({ queryKey: ["home", "drama"], queryFn: () => movieService.getByGenre("Drama") });
  const comedy = useQuery({ queryKey: ["home", "comedy"], queryFn: () => movieService.getByGenre("Comedy") });
  const animation = useQuery({
    queryKey: ["home", "animation"],
    queryFn: () => movieService.getByGenre("Animation"),
  });
  const horror = useQuery({ queryKey: ["home", "horror"], queryFn: () => movieService.getByGenre("Horror") });

  return {
    newReleases,
    mostPurchased,
    topRated,
    myanmar,
    international,
    action,
    drama,
    comedy,
    animation,
    horror,
  };
}
