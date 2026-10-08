import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { movieService } from "@/services/api/movieService";
import { historyService } from "@/services/api/historyService";
import { SEARCH_STALE_TIME_MS } from "@/hooks/use-search-term";
import type { MovieQuery } from "@/types/movie";

const CONTINUE_WATCHING_MIN_PERCENT = 1;
const CONTINUE_WATCHING_MAX_PERCENT = 95;


/** Exported so anything (prefetch, invalidation) can address the infinite catalog's cache entries. */
export const moviesInfiniteKey = (query: MovieQuery) => ["movies", "infinite", query] as const;

/**
 * The infinite-scroll catalog query — same one query path as `useMovies`
 * (GET /movies), paged. `pages[0].total` is the backend's real total for the
 * whole filtered set: it IS the match count the UI shows, never a page's
 * `items.length`.
 */
export function useMoviesInfinite(
  query: MovieQuery = {},
  { enabled = true }: { enabled?: boolean } = {},
) {
  return useInfiniteQuery({
    enabled,
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
export function useMovieFacets({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ["movies", "facets"],
    queryFn: ({ signal }) => movieService.getFacets({ signal }),
    staleTime: 5 * 60_000,
    enabled,
  });
}

/**
 * One title (GET /movies/:id). The detail page keeps the default freshness
 * (re-checked on every visit); a row that only needs the record for a while
 * — Home's "Because you watched" — passes `staleTime` so a revisit inside
 * that window renders from cache without a background re-request.
 */
export function useMovie(id: string, { staleTime }: { staleTime?: number } = {}) {
  return useQuery({
    queryKey: ["movie", id],
    queryFn: () => movieService.getMovieById(id),
    enabled: Boolean(id),
    staleTime,
  });
}

/**
 * "More like this". Pass `{ genre: movie?.genre }` when the page already has
 * the movie (from useMovie): the list is then one GET /movies?genre=… call
 * that waits for the genre, instead of fetching the same movie a second time
 * first. Called with just the id it keeps the older two-step lookup.
 */
export function useSimilarMovies(id: string, options?: { genre: string | null | undefined }) {
  const withGenre = options !== undefined;
  const genre = options?.genre ?? undefined;
  return useQuery({
    queryKey: withGenre ? ["movie", id, "similar", genre] : ["movie", id, "similar"],
    queryFn: ({ signal }) =>
      withGenre && genre
        ? movieService.getSimilarByGenre(id, genre, undefined, { signal })
        : movieService.getSimilarMovies(id),
    enabled: withGenre ? Boolean(id && genre) : Boolean(id),
  });
}

/**
 * In-progress (not-yet-completed) watch history, most recent first — powers
 * the "Continue Watching" row. The title page keeps the default freshness so
 * its Resume button reflects the latest playback; Home passes `staleTime`
 * (its rows are kept for five minutes) so a revisit renders from cache.
 */
export function useContinueWatching(enabled: boolean, { staleTime }: { staleTime?: number } = {}) {
  return useQuery({
    queryKey: ["continue-watching"],
    queryFn: async () => {
      const res = await historyService.getWatchHistory({ limit: 20 });
      return res.items.filter(
        (e) => e.progressPercent >= CONTINUE_WATCHING_MIN_PERCENT && e.progressPercent < CONTINUE_WATCHING_MAX_PERCENT,
      );
    },
    enabled,
    staleTime,
  });
}
