import { apiClient } from "./apiClient";
import type { PaginatedResponse, PaginationParams } from "@/types/api";
import type { WatchHistoryEntry } from "@/types/movie";

interface BackendWatchHistoryEntry {
  id: string;
  movieId: string;
  movieTitle: string;
  posterUrl: string | null;
  durationMinutes: number | null;
  progress: number;
  lastPosition: number;
  updatedAt: string;
}

function mapWatchHistory(entry: BackendWatchHistoryEntry): WatchHistoryEntry {
  return {
    id: entry.id,
    movieId: entry.movieId,
    movieTitle: entry.movieTitle,
    posterUrl: entry.posterUrl,
    lastWatchedAt: entry.updatedAt,
    progressPercent: Math.round(entry.progress),
    lastPositionSeconds: entry.lastPosition,
    durationMinutes: entry.durationMinutes,
  };
}

export const historyService = {
  async getWatchHistory(pagination: PaginationParams = {}): Promise<PaginatedResponse<WatchHistoryEntry>> {
    const res = await apiClient.get<PaginatedResponse<BackendWatchHistoryEntry>>("/videos/me/watch-history", {
      params: pagination,
    });
    return { ...res, items: res.items.map(mapWatchHistory) };
  },

  updateProgress(movieId: string, progressPercent: number, lastPositionSeconds: number): Promise<void> {
    return apiClient.patch(`/videos/${movieId}/watch-progress`, {
      progress: progressPercent,
      lastPosition: lastPositionSeconds,
    });
  },
};
