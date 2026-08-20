import { apiClient, type RequestSignalOptions } from "./apiClient";
import { mapMovie, type BackendMovie } from "./movieService";
import type { PaginatedResponse, PaginationParams } from "@/types/api";
import type { Movie } from "@/types/movie";
import type {
  PlayerEpisodesResponse,
  SeasonSummary,
  Series,
  SeriesListItem,
  SeriesPurchaseEntry,
} from "@/types/series";

export const seriesService = {
  /** `options` (optional, last) carries React Query's AbortSignal down to axios. */
  getSeries(pagination: PaginationParams = {}, options: RequestSignalOptions = {}) {
    return apiClient.get<PaginatedResponse<SeriesListItem>>("/series", {
      ...options,
      params: pagination,
    });
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
