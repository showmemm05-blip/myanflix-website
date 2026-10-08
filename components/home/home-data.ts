"use client";

import { useQuery } from "@tanstack/react-query";

import { useMovie } from "@/hooks/use-movies";
import { historyService } from "@/services/api/historyService";
import { movieService } from "@/services/api/movieService";
import { seriesService } from "@/services/api/seriesService";
import { bookService } from "@/services/api/bookService";
import { ApiError } from "@/services/api/apiClient";
import { homeService } from "@/services/api/homeService";
import { subscriptionService } from "@/services/api/subscriptionService";
import type { Book } from "@/types/book";
import type { Movie, MovieQuery } from "@/types/movie";
import type { SeriesListItem, SeriesQuery } from "@/types/series";

/**
 * HOME'S DATA (owner, 2026-10-08: Home is movies, series and books, plus
 * the showcase sections approved the same day).
 *
 * The rows use the endpoints the site already calls — GET /movies,
 * GET /series, GET /books, the watch history — one request per row, kept
 * for five minutes, and never asked for while the row is hidden (a guest
 * never calls /books, the history or the plans). The featured titles in the
 * hero cost nothing extra: they are cut from the "Recently added" and
 * "New series" rows. The showcase (hero promos, spotlight, coming soon,
 * store links) is ONE GET /home/showcase; the Premium band reads the real
 * plans from GET /subscription-plans (signed-in only — it is 401 for guests).
 */

/** Rows stay fresh for five minutes — a Home revisit inside that renders from cache. */
export const HOME_STALE_MS = 5 * 60_000;
/** How many titles a row shows. */
export const ROW_LIMIT = 12;
/** The ranked row: exactly ten. */
export const TOP_10_LIMIT = 10;
/** How many picks the hero rotates through. */
export const HERO_COUNT = 5;

/**
 * The admin's Home promos and settings (GET /home/showcase), once per page,
 * fresh for five minutes. Keyed by signed-in state because a member's answer
 * may hold BOOK links a guest's never does.
 *
 * `authSettled` must be false while the session is still being restored
 * (useAuth().isLoading): during that time isAuthenticated is false but the
 * stored token is already sent, so asking then would cache a member's answer
 * under the guest key and ask a second time once the profile arrives.
 */
export function useHomeShowcase(isAuthenticated: boolean, authSettled: boolean) {
  return useQuery({
    queryKey: ["home", "showcase", isAuthenticated ? "member" : "guest"],
    queryFn: ({ signal }) => homeService.getShowcase({ signal }),
    enabled: authSettled,
    staleTime: HOME_STALE_MS,
    // The hero waits for this answer: a refusal (e.g. a backend without the
    // route yet) is final at once — Home then simply shows no promos.
    retry: (failures, error) => !(error instanceof ApiError && error.status >= 400 && error.status < 500) && failures < 1,
  });
}

/**
 * The real subscription plans (GET /subscription-plans) — the same
 * ["subscription-plans"] entry the Subscribe dialog reads, so opening it
 * from Home asks nothing again. Signed-in only: the endpoint is 401 for a
 * guest, so a guest's Premium band shows no prices rather than made-up ones.
 */
export function useHomePlans(enabled: boolean) {
  return useQuery({
    queryKey: ["subscription-plans"],
    queryFn: subscriptionService.getPlans,
    enabled,
    staleTime: HOME_STALE_MS,
  });
}

/** One row of movies (GET /movies), under its own Home key. */
export function useHomeMovies(key: string, query: MovieQuery, enabled = true) {
  return useQuery({
    queryKey: ["home", "movies", key, query],
    queryFn: async ({ signal }) => (await movieService.getMovies(query, { signal })).items,
    enabled,
    staleTime: HOME_STALE_MS,
  });
}

/** One row of series (GET /series). */
export function useHomeSeries(key: string, query: SeriesQuery, enabled = true) {
  return useQuery({
    queryKey: ["home", "series", key, query],
    queryFn: async ({ signal }) => (await seriesService.getSeries(query, { signal })).items,
    enabled,
    staleTime: HOME_STALE_MS,
  });
}

/**
 * The newest books (GET /books, newest first). Members only — the endpoint
 * is 401 for a guest — so callers pass `enabled: isAuthenticated`.
 */
export function useHomeBooks(enabled: boolean) {
  return useQuery({
    queryKey: ["home", "books", { limit: ROW_LIMIT }],
    queryFn: async ({ signal }) => (await bookService.getBooks({ limit: ROW_LIMIT }, { signal })).items as Book[],
    enabled,
    staleTime: HOME_STALE_MS,
  });
}

/**
 * The viewer's most recently watched title (the first row of the watch
 * history, finished or not) — what "Because you watched …" is built on.
 * Signed-in only.
 */
export function useLatestWatched(enabled: boolean) {
  return useQuery({
    queryKey: ["home", "watch-history", "latest"],
    queryFn: async () => (await historyService.getWatchHistory({ limit: 1 })).items[0] ?? null,
    enabled,
    staleTime: HOME_STALE_MS,
  });
}

/** Where "Because you watched" looks: the title's first category, or its genre. */
export type BecausePick =
  | { kind: "category"; id: string; name: string }
  | { kind: "genre"; name: string };

export function becausePickOf(movie: Movie | null | undefined): BecausePick | null {
  if (!movie) return null;
  const category = movie.categories?.[0];
  if (category) return { kind: "category", id: category.id, name: category.name };
  if (movie.genre) return { kind: "genre", name: movie.genre };
  return null;
}

/**
 * "Because you watched <title>": the last watched title (one small history
 * read), that title's own record (the same ["movie", id] entry the detail
 * page uses, so it is often already cached), then one GET /movies in its
 * first category — or its genre when it has no category — without the
 * title itself. Nothing is asked for a guest.
 */
export function useBecauseYouWatched(enabled: boolean) {
  const latest = useLatestWatched(enabled);
  const movieId = latest.data?.movieId ?? "";
  const watched = useMovie(enabled ? movieId : "", { staleTime: HOME_STALE_MS });
  const pick = becausePickOf(watched.data);
  const query: MovieQuery =
    pick?.kind === "category"
      ? { categoryId: pick.id, limit: ROW_LIMIT + 1 }
      : { genre: pick?.name, limit: ROW_LIMIT + 1 };
  const row = useHomeMovies(`because:${movieId}`, query, enabled && Boolean(movieId) && pick !== null);
  const items = row.data?.filter((m) => m.id !== movieId).slice(0, ROW_LIMIT);
  return {
    title: latest.data?.movieTitle ?? watched.data?.title ?? null,
    pick,
    items,
    isLoading:
      enabled &&
      (latest.isLoading || (Boolean(movieId) && watched.isLoading) || (pick !== null && row.isLoading)),
  };
}

/** One hero pick: a movie or a series, in one list sorted newest first. */
export type HeroPick = { kind: "movie"; movie: Movie } | { kind: "series"; series: SeriesListItem };

/** The newest movies and series, mixed, newest first — the hero's rotation. */
export function heroPicks(movies: Movie[] | undefined, series: SeriesListItem[] | undefined): HeroPick[] {
  const picks: HeroPick[] = [
    ...(movies ?? []).map((movie): HeroPick => ({ kind: "movie", movie })),
    ...(series ?? []).map((series): HeroPick => ({ kind: "series", series })),
  ];
  const added = (pick: HeroPick) =>
    Date.parse(pick.kind === "movie" ? pick.movie.createdAt : pick.series.createdAt) || 0;
  return picks.sort((a, b) => added(b) - added(a)).slice(0, HERO_COUNT);
}
