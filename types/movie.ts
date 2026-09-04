export type MovieStatus = "DRAFT" | "PROCESSING" | "PUBLISHED" | "ARCHIVED";

export type AccessType = "FREE" | "SUBSCRIPTION";

/** Wire values of the backend enum. Displayed as G / PG / PG-13 / R / NC-17. */
export type AgeRating = "G" | "PG" | "PG13" | "R" | "NC17";

export interface MovieCategoryRef {
  id: string;
  name: string;
}

/** A member of a film's cast, as the movie payload carries them. */
export interface MovieActorRef {
  id: string;
  name: string;
  imageUrl: string | null;
}

export interface Movie {
  id: string;
  title: string;
  description: string;
  posterUrl: string | null;
  coverUrl: string | null;
  genre: string;
  categories: MovieCategoryRef[];
  /** The cast, in the order the catalog returns it. Empty for a film with none. */
  actors: MovieActorRef[];
  language: string;
  releaseYear: number;
  duration: number;
  rating: number;
  /** Nullable metadata added for the filter system — null until the admin backfills it. */
  director: string | null;
  country: string | null;
  ageRating: AgeRating | null;
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

/**
 * The canonical sort vocabulary — mirrors the backend's MovieSort enum, and
 * every option maps to an honest data source there:
 *
 *  - relevance:     title-first two-tier ranking; only offered while a search
 *                   term is active (without one the server falls back to
 *                   recentlyAdded).
 *  - recentlyAdded: createdAt — the default.
 *  - newest/oldest: releaseYear.
 *  - rating:        the admin-set rating.
 *  - mostViewed:    unique viewers from real watch history.
 *  - mostPurchased: the FROZEN pre-subscription purchases table — labeled
 *                   "Most Purchased" with an era hint, never "Most Popular".
 */
export type MovieSortOption =
  | "relevance"
  | "recentlyAdded"
  | "newest"
  | "oldest"
  | "rating"
  | "title"
  | "mostViewed"
  | "mostPurchased";

/**
 * The canonical catalog query — param names identical to the backend DTO and
 * the URL. Multi-value facets are OR within the facet, AND across facets;
 * arrays travel as CSV on the wire (see `toCsvParams`).
 */
export interface MovieQuery {
  search?: string;
  /** LEGACY single-genre param — kept for the ?genre= deep-link contract; the backend merges it into `genres`. */
  genre?: string;
  genres?: string[];
  languages?: string[];
  actorIds?: string[];
  directors?: string[];
  countries?: string[];
  ageRatings?: AgeRating[];
  yearFrom?: number;
  yearTo?: number;
  ratingMin?: number;
  ratingMax?: number;
  /** Minutes — the short/medium/long buckets are pure UI presets over these raw bounds. */
  durationMin?: number;
  durationMax?: number;
  categoryId?: string;
  status?: MovieStatus;
  accessType?: AccessType;
  sort?: MovieSortOption;
  page?: number;
  limit?: number;
}

/** One offered filter value and how many public titles carry it. */
export interface FacetValue {
  value: string;
  count: number;
}

/**
 * GET /movies/facets — DB-derived distincts over the public catalog. An empty
 * facet means "no title carries this yet", and its control auto-hides.
 */
export interface MovieFacets {
  genres: FacetValue[];
  languages: FacetValue[];
  countries: FacetValue[];
  ageRatings: FacetValue[];
  directors: FacetValue[];
  years: { min: number; max: number } | null;
}
