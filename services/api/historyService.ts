import { API_BASE_URL, CLIENT_PLATFORM, CLIENT_PLATFORM_HEADER, apiClient } from "./apiClient";
import { tokenStore } from "@/lib/auth/token-store";
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

  /**
   * The same PATCH as `updateProgress`, for the moment the page is going away
   * (tab closed, switched away from, or the phone locked). axios cannot ask
   * the browser to finish a request after the page is gone, so this one is a
   * plain `fetch` with `keepalive`, carrying the same bearer token and
   * platform header the axios interceptor adds. Fire-and-forget: there is no
   * refresh-on-401 here (a page that is closing cannot wait for one), and a
   * signed-out visitor sends nothing at all. Not sendBeacon — that cannot
   * carry the Authorization header.
   */
  sendProgressOnExit(movieId: string, progressPercent: number, lastPositionSeconds: number): void {
    const token = tokenStore.getAccessToken();
    if (!token || typeof fetch !== "function") return;
    try {
      void fetch(`${API_BASE_URL}/videos/${encodeURIComponent(movieId)}/watch-progress`, {
        method: "PATCH",
        keepalive: true,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          [CLIENT_PLATFORM_HEADER]: CLIENT_PLATFORM,
        },
        body: JSON.stringify({ progress: progressPercent, lastPosition: lastPositionSeconds }),
      }).catch(() => {});
    } catch {
      // A browser that refuses the keepalive request outright — nothing to do.
    }
  },
};
