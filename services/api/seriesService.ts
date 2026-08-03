import { apiClient } from "./apiClient";
import { mapMovie, type BackendMovie } from "./movieService";
import type { PaginatedResponse, PaginationParams } from "@/types/api";
import type { Movie } from "@/types/movie";
import type { SeasonSummary, Series, SeriesListItem, SeriesPurchaseEntry } from "@/types/series";

export const seriesService = {
  getSeries(pagination: PaginationParams = {}) {
    return apiClient.get<PaginatedResponse<SeriesListItem>>("/series", { params: pagination });
  },

  /** Includes `isPurchased` for the caller — the detail page's single source of truth for showing Buy vs Watch. */
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

  /** One purchase unlocks the entire show — every season and episode, including ones added later. */
  purchaseSeries(seriesId: string) {
    return apiClient.post<{ id: string }>(`/series/${seriesId}/purchase`);
  },

  getMySeriesPurchases() {
    return apiClient.get<SeriesPurchaseEntry[]>("/series/me/purchases");
  },
};
