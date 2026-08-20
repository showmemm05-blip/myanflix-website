import { useQuery } from "@tanstack/react-query";
import { seriesService } from "@/services/api/seriesService";
import type { PaginationParams } from "@/types/api";

export function useSeriesList(pagination: PaginationParams = {}) {
  return useQuery({
    queryKey: ["series", pagination],
    // Signal forwarded for the same reason as the movies query: an unobserved
    // in-flight request should stop, not finish. (Series search itself is
    // client-side — see BrowseSurface — so this key doesn't change as the user
    // types; the signal is here for navigation, not for search.)
    queryFn: ({ signal }) => seriesService.getSeries(pagination, { signal }),
  });
}
