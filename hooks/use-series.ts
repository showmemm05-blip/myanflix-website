import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { seriesService } from "@/services/api/seriesService";
import { SEARCH_STALE_TIME_MS } from "@/hooks/use-search-term";
import type { SeriesQuery } from "@/types/series";

export const seriesInfiniteKey = (query: SeriesQuery) => ["series", "infinite", query] as const;

/**
 * Infinite-scroll series catalog — server-side search/filter/sort now (the
 * old client-side title filtering over one big page is gone). Same contract
 * as `useMoviesInfinite`: `pages[0].total` is the honest match count.
 */
export function useSeriesInfinite(query: SeriesQuery = {}) {
  return useInfiniteQuery({
    queryKey: seriesInfiniteKey(query),
    queryFn: ({ pageParam, signal }) =>
      seriesService.getSeries({ ...query, page: pageParam }, { signal }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((n, p) => n + p.items.length, 0);
      return loaded < lastPage.total ? lastPage.page + 1 : undefined;
    },
    placeholderData: keepPreviousData,
    staleTime: SEARCH_STALE_TIME_MS,
  });
}

/** Series filter options (genres/languages/years) — the series tab's counterpart of useMovieFacets. */
export function useSeriesFacets() {
  return useQuery({
    queryKey: ["series", "facets"],
    queryFn: ({ signal }) => seriesService.getSeriesFacets({ signal }),
    staleTime: 5 * 60_000,
  });
}
