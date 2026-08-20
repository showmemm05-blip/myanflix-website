import { apiClient } from "./apiClient";

export interface PeakUsersResponse {
  /** Highest number of members ever watching at once (the only field the public endpoint exposes). */
  peakUsers: number;
}

export const peakUsersService = {
  /**
   * GET /peak-users is @Public on the backend — no token required, so we skip
   * auth entirely: no Authorization header, and no refresh-on-401 dance for a
   * route that can never 401.
   */
  getPeakUsers: () => apiClient.get<PeakUsersResponse>("/peak-users", { skipAuth: true }),
};
