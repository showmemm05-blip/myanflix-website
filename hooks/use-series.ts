import { useQuery } from "@tanstack/react-query";
import { seriesService } from "@/services/api/seriesService";
import type { PaginationParams } from "@/types/api";

export function useSeriesList(pagination: PaginationParams = {}) {
  return useQuery({
    queryKey: ["series", pagination],
    queryFn: () => seriesService.getSeries(pagination),
  });
}
