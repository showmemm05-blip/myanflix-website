import { useCallback } from "react";
import { useQueries, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { useLibrary } from "@/lib/context/library-context";
import { movieService } from "@/services/api/movieService";
import type { Movie } from "@/types/movie";

/** Folds the per-title results into the list (module-level, so it is stable and memoised by React Query). */
function combineMovies(results: UseQueryResult<Movie | null>[]) {
  return {
    movies: results
      .map((result) => result.data)
      .filter((movie): movie is Movie => movie !== null && movie !== undefined),
    isLoading: results.some((result) => result.isLoading),
    isError: results.some((result) => result.isError),
  };
}

/**
 * The saved titles of My List, one query per title on the SAME key as the
 * detail page (["movie", id], same call, same freshness rules), so:
 *  - a title already opened (or already listed) is never fetched again;
 *  - removing a title is just a filter — nothing is re-asked;
 *  - saving a title asks for that one title only.
 * (Before, the list was one query keyed on the count, so every add or
 * remove re-fetched every saved title.)
 *
 * The order is the saved order. Titles that no longer load (deleted,
 * unpublished) are left out, as before.
 */
export function useWatchlistMovies() {
  const { watchlistIds } = useLibrary();
  const queryClient = useQueryClient();
  const list = useQueries({
    queries: watchlistIds.map((id) => ({
      queryKey: ["movie", id],
      queryFn: () => movieService.getMovieById(id),
    })),
    combine: combineMovies,
  });
  const refetch = useCallback(() => {
    for (const id of watchlistIds) void queryClient.refetchQueries({ queryKey: ["movie", id], exact: true });
  }, [queryClient, watchlistIds]);
  return { ...list, refetch };
}
