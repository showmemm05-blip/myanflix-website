import { apiClient, type RequestSignalOptions } from "./apiClient";
import type { PaginatedResponse } from "@/types/api";

/** An actor as GET /actors returns them — the cast filter's picker rows. */
export interface Actor {
  id: string;
  name: string;
  imageUrl: string | null;
  /** How many titles this person appears in — counted from the join server-side. */
  movieCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ActorSearchQuery {
  /** Matches on name, contains-insensitive. */
  search?: string;
  page?: number;
  limit?: number;
}

export const actorService = {
  /** The actor picker's data source — name search over the real cast table. */
  searchActors(
    query: ActorSearchQuery = {},
    options: RequestSignalOptions = {},
  ): Promise<PaginatedResponse<Actor>> {
    return apiClient.get<PaginatedResponse<Actor>>("/actors", {
      ...options,
      params: query,
    });
  },

  /** Resolves one actor — used to turn a URL-only actorIds deep link back into names for the pills. */
  async getActor(id: string): Promise<Actor | null> {
    try {
      return await apiClient.get<Actor>(`/actors/${id}`);
    } catch {
      // A deleted actor in an old link is silently dropped, not an error page.
      return null;
    }
  },
};
