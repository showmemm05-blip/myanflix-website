import { useQuery } from "@tanstack/react-query";
import { actorService } from "@/services/api/actorService";

/**
 * The cast filter's search — live against GET /actors from the first
 * character (a cast list is short enough that one letter is already a useful
 * narrowing, unlike the 2-char catalog search minimum).
 */
export function useActorSearch(term: string) {
  const trimmed = term.trim();
  return useQuery({
    queryKey: ["actors", "search", trimmed],
    queryFn: ({ signal }) =>
      actorService.searchActors({ search: trimmed, limit: 20 }, { signal }),
    enabled: trimmed.length >= 1,
    staleTime: 60_000,
  });
}
