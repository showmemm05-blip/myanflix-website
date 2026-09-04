import type { AccessType, AgeRating, MovieSortOption } from "@/types/movie";
import type { SeriesSortOption } from "@/types/series";

/** A picked cast member. The URL/API carry only the id; the name rides along so pills render instantly. */
export interface ActorSelection {
  id: string;
  name: string;
}

/**
 * THE canonical movie filter state — one shape, owned by exactly one hook
 * (`use-catalog-filters`). Field names match the wire params (actors aside,
 * which flatten to `actorIds`); multi-value facets are OR within, AND across.
 */
export interface FilterState {
  sort: MovieSortOption;
  genres: string[];
  languages: string[];
  actors: ActorSelection[];
  directors: string[];
  countries: string[];
  ageRatings: AgeRating[];
  yearFrom?: number;
  yearTo?: number;
  ratingMin?: number;
  ratingMax?: number;
  /** Minutes. The short/medium/long chips are pure presets over these two raw bounds. */
  durationMin?: number;
  durationMax?: number;
  accessType?: AccessType;
}

/** The series subset — only the columns series actually have. */
export interface SeriesFilterState {
  sort: SeriesSortOption;
  genres: string[];
  languages: string[];
  yearFrom?: number;
  yearTo?: number;
  accessType?: AccessType;
}

export const DEFAULT_MOVIE_SORT: MovieSortOption = "recentlyAdded";
export const DEFAULT_SERIES_SORT: SeriesSortOption = "recentlyAdded";

export const DEFAULT_FILTERS: FilterState = {
  sort: DEFAULT_MOVIE_SORT,
  genres: [],
  languages: [],
  actors: [],
  directors: [],
  countries: [],
  ageRatings: [],
};

export const DEFAULT_SERIES_FILTERS: SeriesFilterState = {
  sort: DEFAULT_SERIES_SORT,
  genres: [],
  languages: [],
};

/** Wire enum -> display label (the enum has no punctuation; people do). */
export const AGE_RATING_LABELS: Record<AgeRating, string> = {
  G: "G",
  PG: "PG",
  PG13: "PG-13",
  R: "R",
  NC17: "NC-17",
};

export const AGE_RATING_VALUES: AgeRating[] = ["G", "PG", "PG13", "R", "NC17"];

/** Everything except sort counts toward "N filters applied" and the bar badge. */
export function countActiveFilters(f: FilterState): number {
  return (
    f.genres.length +
    f.languages.length +
    f.actors.length +
    f.directors.length +
    f.countries.length +
    f.ageRatings.length +
    (f.yearFrom !== undefined || f.yearTo !== undefined ? 1 : 0) +
    (f.ratingMin !== undefined || f.ratingMax !== undefined ? 1 : 0) +
    (f.durationMin !== undefined || f.durationMax !== undefined ? 1 : 0) +
    (f.accessType !== undefined ? 1 : 0)
  );
}

export function countActiveSeriesFilters(f: SeriesFilterState): number {
  return (
    f.genres.length +
    f.languages.length +
    (f.yearFrom !== undefined || f.yearTo !== undefined ? 1 : 0) +
    (f.accessType !== undefined ? 1 : 0)
  );
}
