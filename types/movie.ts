export type MovieStatus = "DRAFT" | "PROCESSING" | "PUBLISHED" | "ARCHIVED";

export type AccessType = "FREE" | "SUBSCRIPTION";

export interface MovieCategoryRef {
  id: string;
  name: string;
}

export interface Movie {
  id: string;
  title: string;
  description: string;
  posterUrl: string | null;
  coverUrl: string | null;
  genre: string;
  categories: MovieCategoryRef[];
  language: string;
  releaseYear: number;
  duration: number;
  rating: number;
  /** Episode rows carry this too, but it's vestigial — episode access is always governed by the parent series' own accessType. */
  accessType: AccessType;
  status: MovieStatus;
  /** Set only for episodes — null means a standalone movie. Episode access is unlocked by the parent series' accessType, never per-episode. */
  seriesId: string | null;
  seasonNumber: number | null;
  episodeNumber: number | null;
  /** Derived client-side from `language === "Burmese"` — the backend has no dedicated field for this. */
  isMyanmar: boolean;
  /** Derived client-side from localStorage — the backend has no watchlist model. */
  isInWatchlist: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WatchHistoryEntry {
  id: string;
  movieId: string;
  movieTitle: string;
  posterUrl: string | null;
  lastWatchedAt: string;
  progressPercent: number;
  lastPositionSeconds: number;
  durationMinutes: number | null;
}

export type MovieSortOption = "newest" | "rating" | "title";

export interface MovieQuery {
  search?: string;
  genre?: string;
  categoryId?: string;
  status?: MovieStatus;
  accessType?: AccessType;
  sort?: MovieSortOption;
  page?: number;
  limit?: number;
  /** Client-side only filters — applied locally over the fetched page since the backend doesn't support them yet. */
  language?: string;
  minRating?: number;
  releaseYear?: number;
}
