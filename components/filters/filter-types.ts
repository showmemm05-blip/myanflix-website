import type { AccessType, MovieSortOption } from "@/types/movie";

export interface FilterState {
  genre?: string;
  language?: string;
  releaseYear?: number;
  /** Movies only — series carry no rating of their own. */
  minRating?: number;
  accessType?: AccessType;
  sort: MovieSortOption;
}

export type SeriesSortOption = "newest" | "title";

export interface SeriesFilterState {
  genre?: string;
  language?: string;
  releaseYear?: number;
  accessType?: AccessType;
  sort: SeriesSortOption;
}

/**
 * The shape the filter sheet edits. Movie and series filters differ only in
 * which sort options they offer and whether rating applies, so the sheet works
 * against this common view of both rather than existing twice.
 */
export interface FilterSheetValues {
  genre?: string;
  language?: string;
  releaseYear?: number;
  minRating?: number;
  accessType?: AccessType;
  sort: string;
}
