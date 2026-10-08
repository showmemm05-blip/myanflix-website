"use client";

import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/services/api/apiClient";
import { movieService } from "@/services/api/movieService";
import { seriesService } from "@/services/api/seriesService";
import type { MovieQuery } from "@/types/movie";
import type { SeriesQuery } from "@/types/series";

/**
 * Small data helpers for the Media hubs. Everything here reads endpoints the
 * website already calls (GET /movies, GET /series, GET /categories,
 * GET /book-categories); nothing
 * new is asked of the API.
 */

/** "NEW" = added in the last 14 days (the mobile app's rule). */
const NEW_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

export function isRecent(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const added = Date.parse(iso);
  if (!Number.isFinite(added)) return false;
  return Date.now() - added <= NEW_WINDOW_MS;
}

/** One hub row of movies — a plain catalogue read, cached under its own key. */
export function useMovieRow(key: string, query: MovieQuery, enabled = true) {
  return useQuery({
    queryKey: ["media", "movies", key, query],
    queryFn: async () => (await movieService.getMovies(query)).items,
    enabled,
    staleTime: 60_000,
  });
}

/** One hub row of series — same idea as useMovieRow. */
export function useSeriesRow(key: string, query: SeriesQuery, enabled = true) {
  return useQuery({
    queryKey: ["media", "series", key, query],
    queryFn: async () => (await seriesService.getSeries(query)).items,
    enabled,
    staleTime: 60_000,
  });
}

export interface CatalogCategory {
  id: string;
  name: string;
  description?: string | null;
  movieCount?: number;
}

/**
 * Every admin category, in name order, empty ones included (the owner's
 * 2026-10-05 rule for the Categories overlay). GET /categories needs a
 * session, so guests never ask for it and simply see the genres.
 */
export function useCatalogCategories(enabled: boolean) {
  return useQuery({
    queryKey: ["categories"],
    queryFn: ({ signal }) => apiClient.get<CatalogCategory[]>("/categories", { signal }),
    enabled,
    staleTime: 5 * 60_000,
  });
}

export type MediaKind = "movies" | "series";

/** Where the genre / category view lives. */
export function genreViewHref(
  kind: MediaKind,
  pick: { genre: string } | { categoryId: string; name: string },
): string {
  const params = new URLSearchParams({ type: kind });
  if ("genre" in pick) params.set("genre", pick.genre);
  else {
    params.set("category", pick.categoryId);
    params.set("name", pick.name);
  }
  return `/media/genre?${params.toString()}`;
}

/** The hub each kind lives on. */
export function hubHref(kind: MediaKind): string {
  return kind === "series" ? "/media/movies?tab=series" : "/media";
}

/* ─────────────────────────── The Categories pop-up ─────────────────────────── */

/** The three lists the Categories pop-up can show (its Movies · Series · Books switch). */
export type CategoryKind = MediaKind | "books";

/**
 * Which list `?categories=` asks the pop-up to open on: `movies`, `series` or
 * `books` by name; anything else (the older `?categories=1`) means the list
 * of the page underneath (`fallback`).
 */
export function categoryKindFromParam(param: string | null, fallback: CategoryKind): CategoryKind {
  return param === "movies" || param === "series" || param === "books" ? param : fallback;
}

/** One row of GET /book-categories — the books' OWN shelves, not the movie categories. */
export interface BookCategory {
  id: string;
  name: string;
  description?: string | null;
  bookCount?: number;
}

/**
 * Every book category (GET /book-categories), in name order, empty ones
 * included. Members only, like /books itself (a guest gets 401), so callers
 * pass `enabled` only for a signed-in viewer and a guest never asks.
 */
export function useBookCategories(enabled: boolean) {
  return useQuery({
    queryKey: ["book-categories"],
    queryFn: ({ signal }) => apiClient.get<BookCategory[]>("/book-categories", { signal }),
    enabled,
    staleTime: 5 * 60_000,
  });
}

/** The Books hub with one book category picked in its "All books" grid. */
export function booksCategoryHref(categoryId: string): string {
  return `/media/books?category=${encodeURIComponent(categoryId)}`;
}
