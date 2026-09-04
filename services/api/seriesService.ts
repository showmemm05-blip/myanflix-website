import { apiClient, toCsvParams, type RequestSignalOptions } from "./apiClient";
import { mapMovie, type BackendMovie } from "./movieService";
import type { PaginatedResponse } from "@/types/api";
import type { Movie } from "@/types/movie";
import type {
  PlayerEpisodesResponse,
  SeasonSummary,
  Series,
  SeriesFacets,
  SeriesListItem,
  SeriesPurchaseEntry,
} from "@/types/series";
import type { SeriesQuery } from "@/types/series";

export const seriesService = {
  /**
   * The series catalog read — search/filter/sort all server-side, same wire
   * format as movies. `total` returned as the backend counted it.
   * `options` (optional, last) carries React Query's AbortSignal down to axios.
   */
  getSeries(query: SeriesQuery = {}, options: RequestSignalOptions = {}) {
    return apiClient.get<PaginatedResponse<SeriesListItem>>("/series", {
      ...options,
      params: toCsvParams(query as Record<string, unknown>),
    });
  },

  /** DB-derived filter options for the series tab (genres/languages/years). */
  getSeriesFacets(options: RequestSignalOptions = {}): Promise<SeriesFacets> {
    return apiClient.get<SeriesFacets>("/series/facets", options);
  },

  async getSeriesById(id: string): Promise<Series | null> {
    try {
      return await apiClient.get<Series>(`/series/${id}`);
    } catch {
      return null;
    }
  },

  getSeasons(id: string) {
    return apiClient.get<SeasonSummary[]>(`/series/${id}/seasons`);
  },

  /** Published episodes in playback order — episodes are Movie rows, playable via the normal player. */
  async getEpisodes(id: string, seasonNumber?: number): Promise<Movie[]> {
    const episodes = await apiClient.get<BackendMovie[]>(`/series/${id}/episodes`, {
      params: seasonNumber !== undefined ? { seasonNumber } : {},
    });
    return episodes.map(mapMovie);
  },

  /** Episodes grouped by season, each with the caller's own watch progress — for the player page's Episodes section. */
  getPlayerEpisodes(seriesId: string) {
    return apiClient.get<PlayerEpisodesResponse>(`/series/${seriesId}/player-episodes`);
  },

  /** Historical purchases from before the subscription model — frozen, no longer how access is granted. */
  getMySeriesPurchases() {
    return apiClient.get<SeriesPurchaseEntry[]>("/series/me/purchases");
  },
};
