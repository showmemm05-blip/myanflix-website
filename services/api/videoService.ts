import { apiClient, API_ORIGIN } from "./apiClient";

export const videoService = {
  /** Resolves the HLS master playlist URL for a movie — throws if not purchased or not ready yet. */
  async getStreamInfo(movieId: string): Promise<{ playlistUrl: string }> {
    const { playlistUrl } = await apiClient.get<{ playlistUrl: string }>(`/videos/${movieId}/stream`);
    return { playlistUrl: playlistUrl.startsWith("http") ? playlistUrl : `${API_ORIGIN}${playlistUrl}` };
  },
};
