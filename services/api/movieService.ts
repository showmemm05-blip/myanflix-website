import { apiClient, toCsvParams, type RequestSignalOptions } from "./apiClient";
import type { PaginatedResponse } from "@/types/api";
import type { Movie, MovieFacets, MovieQuery } from "@/types/movie";

export interface BackendMovie {
  id: string;
  title: string;
  description: string;
  posterUrl: string | null;
  coverUrl: string | null;
  genre: string;
  language: string;
  releaseYear: number;
  duration: number;
  rating: number;
  director: string | null;
  country: string | null;
  ageRating: Movie["ageRating"];
  accessType: Movie["accessType"];
  status: Movie["status"];
  seriesId: string | null;
  seasonNumber: number | null;
  episodeNumber: number | null;
  categories: { id: string; name: string }[];
  actors: { id: string; name: string; imageUrl: string | null }[];
  createdAt: string;
  updatedAt: string;
}

export function mapMovie(m: BackendMovie): Movie {
  return {
    id: m.id,
    title: m.title,
    description: m.description,
    posterUrl: m.posterUrl,
    coverUrl: m.coverUrl,
    genre: m.genre,
    categories: m.categories,
    // The API always sends this (CATALOG_INCLUDE loads it), but an older
    // cached response would not — default rather than crash the detail page.
    actors: m.actors ?? [],
    language: m.language,
    releaseYear: m.releaseYear,
    duration: m.duration,
    rating: m.rating,
    // Nullable metadata — an older cached response predates the columns, so
    // default to null rather than undefined.
    director: m.director ?? null,
    country: m.country ?? null,
    ageRating: m.ageRating ?? null,
    accessType: m.accessType,
    status: m.status,
    seriesId: m.seriesId ?? null,
    seasonNumber: m.seasonNumber ?? null,
    episodeNumber: m.episodeNumber ?? null,
    isMyanmar: m.language === "Burmese",
    isInWatchlist: false,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  };
}

export const movieService = {
  /**
   * The catalogue read — and the app's one search request.
   *
   * Every filter and sort is done SERVER-SIDE now: the canonical query passes
   * straight through (arrays CSV-joined), and `total` is returned exactly as
   * the backend counted it — that number is the match count the UI shows, so
   * it must never be overwritten with a page-local length.
   *
   * `options` is last and optional so every existing caller is untouched; it
   * carries React Query's `AbortSignal` through to axios so a search the user
   * has already typed past is cancelled rather than finished.
   */
  async getMovies(
    query: MovieQuery = {},
    options: RequestSignalOptions = {},
  ): Promise<PaginatedResponse<Movie>> {
    const res = await apiClient.get<{ items: BackendMovie[]; total: number; page: number; limit: number }>(
      "/movies",
      { ...options, params: toCsvParams(query as Record<string, unknown>) },
    );
    return { ...res, items: res.items.map(mapMovie) };
  },

  /** DB-derived filter options over the public catalog — what makes the sheet's auto-hide honest. */
  getFacets(options: RequestSignalOptions = {}): Promise<MovieFacets> {
    return apiClient.get<MovieFacets>("/movies/facets", options);
  },

  async getMovieById(id: string): Promise<Movie | null> {
    try {
      const movie = await apiClient.get<BackendMovie>(`/movies/${id}`);
      return mapMovie(movie);
    } catch {
      return null;
    }
  },

  async getSimilarMovies(movieId: string, limit = 8): Promise<Movie[]> {
    const movie = await movieService.getMovieById(movieId);
    if (!movie) return [];
    const res = await movieService.getMovies({ genre: movie.genre, limit: limit + 1 });
    return res.items.filter((m) => m.id !== movieId).slice(0, limit);
  },

  async getNewReleases(limit = 12): Promise<Movie[]> {
    const res = await movieService.getMovies({ limit });
    return res.items;
  },

  async getMostPurchased(limit = 12): Promise<Movie[]> {
    const movies = await apiClient.get<BackendMovie[]>("/movies/most-purchased");
    return movies.slice(0, limit).map(mapMovie);
  },

  async getTopRated(limit = 12): Promise<Movie[]> {
    // Server-sorted now — no over-fetch-and-slice.
    const res = await movieService.getMovies({ sort: "rating", limit });
    return res.items;
  },

  async getMyanmarMovies(limit = 12): Promise<Movie[]> {
    // "Myanmar" is defined as language === "Burmese" — now a server param.
    const res = await movieService.getMovies({ languages: ["Burmese"], limit });
    return res.items;
  },

  async getInternationalMovies(limit = 12): Promise<Movie[]> {
    // THE one documented client-side exception: "not Burmese" has no server
    // param (the query vocabulary has no not-in), so this home rail filters a
    // fetched page locally. It is a rail, not a counted result list — no
    // total is ever shown from it.
    const res = await movieService.getMovies({ limit: 40 });
    return res.items.filter((m) => !m.isMyanmar).slice(0, limit);
  },

  async getByGenre(genre: string, limit = 12): Promise<Movie[]> {
    const res = await movieService.getMovies({ genre, limit });
    return res.items;
  },

};
