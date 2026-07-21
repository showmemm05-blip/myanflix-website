/** The backend has no watchlist model yet, so this is persisted client-side only (per-browser). */
import { movieService } from "./movieService";
import type { Movie } from "@/types/movie";

const WATCHLIST_KEY = "myanflix_watchlist";

function readIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(WATCHLIST_KEY);
    return new Set<string>(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function writeIds(ids: Set<string>): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(WATCHLIST_KEY, JSON.stringify([...ids]));
}

export const watchlistService = {
  getWatchlistIds(): string[] {
    return [...readIds()];
  },

  isInWatchlist(movieId: string): boolean {
    return readIds().has(movieId);
  },

  addToWatchlist(movieId: string): void {
    const ids = readIds();
    ids.add(movieId);
    writeIds(ids);
  },

  removeFromWatchlist(movieId: string): void {
    const ids = readIds();
    ids.delete(movieId);
    writeIds(ids);
  },

  async getWatchlist(): Promise<Movie[]> {
    const ids = [...readIds()];
    const movies = await Promise.all(ids.map((id) => movieService.getMovieById(id)));
    return movies.filter((m): m is Movie => m !== null);
  },
};
