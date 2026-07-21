export type MovieStatus = "DRAFT" | "PROCESSING" | "PUBLISHED" | "ARCHIVED";

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
  price: number;
  isPremium: boolean;
  status: MovieStatus;
  /** Derived client-side from `language === "Burmese"` — the backend has no dedicated field for this. */
  isMyanmar: boolean;
  /** Derived client-side from the caller's purchase list. */
  isPurchased: boolean;
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

export type MovieSortOption = "newest" | "rating" | "price-asc" | "price-desc";

export interface MovieQuery {
  search?: string;
  genre?: string;
  categoryId?: string;
  status?: MovieStatus;
  sort?: MovieSortOption;
  page?: number;
  limit?: number;
  /** Client-side only filters — applied locally over the fetched page since the backend doesn't support them yet. */
  language?: string;
  minRating?: number;
  maxPrice?: number;
}
