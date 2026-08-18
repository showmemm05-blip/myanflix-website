import type { Movie, AccessType } from "@/types/movie";
import type { SeriesListItem } from "@/types/series";

/**
 * The flattened shape the browse cards render. Movies and series carry
 * different fields, but on a browse grid they read as the same kind of thing —
 * normalising here is what lets one card design cover both without the card
 * knowing which it's showing.
 */
export interface BrowseItem {
  id: string;
  /** Where clicking the card goes — a movie or series detail page. */
  href: string;
  /** Set only when the item can be played directly (a movie); series open their detail page first. */
  playHref: string | null;
  title: string;
  posterUrl: string | null;
  coverUrl: string | null;
  accessType: AccessType;
  /** Movies only — series carry no rating of their own. */
  rating: number | null;
  releaseYear: number;
  /** The right half of the meta line: a runtime for movies, an episode count for series. */
  meta: string;
  genre: string;
  /** Only movies can be watchlisted — the watchlist is keyed by movie id. */
  watchlistId: string | null;
}

export function movieToBrowseItem(movie: Movie, runtime: string): BrowseItem {
  return {
    id: movie.id,
    href: `/movie/${movie.id}`,
    playHref: `/player/${movie.id}`,
    title: movie.title,
    posterUrl: movie.posterUrl,
    coverUrl: movie.coverUrl,
    accessType: movie.accessType,
    rating: movie.rating,
    releaseYear: movie.releaseYear,
    meta: runtime,
    genre: movie.genre,
    watchlistId: movie.id,
  };
}

export function seriesToBrowseItem(series: SeriesListItem, episodes: string): BrowseItem {
  return {
    id: series.id,
    href: `/series/${series.id}`,
    playHref: null,
    title: series.title,
    posterUrl: series.posterUrl,
    coverUrl: series.coverUrl,
    accessType: series.accessType,
    rating: null,
    releaseYear: series.releaseYear,
    meta: episodes,
    genre: series.genre,
    watchlistId: null,
  };
}
