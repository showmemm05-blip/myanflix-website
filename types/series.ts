import type { AccessType, FacetValue } from "./movie";

/**
 * The series subset of the canonical sort vocabulary — no rating / mostViewed
 * / mostPurchased in v1: series carry no rating column and no per-series watch
 * aggregate, so the UI simply doesn't offer them.
 */
export type SeriesSortOption =
  | "relevance"
  | "recentlyAdded"
  | "newest"
  | "oldest"
  | "title";

/** Same wire format as MovieQuery: OR within a facet, AND across facets, arrays as CSV. */
export interface SeriesQuery {
  search?: string;
  genres?: string[];
  languages?: string[];
  yearFrom?: number;
  yearTo?: number;
  accessType?: AccessType;
  sort?: SeriesSortOption;
  page?: number;
  limit?: number;
}

/** GET /series/facets — the series columns that exist: genre, language, year. */
export interface SeriesFacets {
  genres: FacetValue[];
  languages: FacetValue[];
  years: { min: number; max: number } | null;
}

export interface Series {
  id: string;
  title: string;
  description: string;
  posterUrl: string | null;
  coverUrl: string | null;
  genre: string;
  language: string;
  releaseYear: number;
  /** One access type for the whole show — governs every season and episode, including future ones. */
  accessType: AccessType;
  categories: { id: string; name: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface SeriesListItem extends Series {
  episodeCount: number;
}

/** The caller's own watch progress for one episode — null when never started. */
export interface PlayerEpisodeProgress {
  progressPercent: number;
  lastPositionSeconds: number;
}

/** An episode as shown in the player page's Episodes section — a lighter shape than the full `Movie`, since this list doesn't need categories/pricing/etc. */
export interface PlayerEpisode {
  id: string;
  title: string;
  episodeNumber: number | null;
  /** Minutes, same unit as `Movie.duration`. */
  duration: number;
  thumbnailUrl: string | null;
  posterUrl: string | null;
  watchProgress: PlayerEpisodeProgress | null;
}

export interface PlayerSeasonGroup {
  seasonNumber: number;
  episodes: PlayerEpisode[];
}

export interface PlayerEpisodesResponse {
  seasons: PlayerSeasonGroup[];
}
