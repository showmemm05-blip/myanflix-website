"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { movieService } from "@/services/api/movieService";
import { seriesService } from "@/services/api/seriesService";
import { watchlistService } from "@/services/api/watchlistService";
import { notificationService } from "@/services/api/notificationService";
import { useAuth } from "@/lib/context/auth-context";
import { ApiError } from "@/services/api/apiClient";

interface LibraryContextValue {
  isPurchased: (movieId: string) => boolean;
  /** Owning a series unlocks every one of its episodes — episode access checks go through this, never isPurchased. */
  isSeriesPurchased: (seriesId: string) => boolean;
  isInWatchlist: (movieId: string) => boolean;
  purchaseMovie: (movieId: string) => Promise<void>;
  purchaseSeries: (seriesId: string) => Promise<void>;
  toggleWatchlist: (movieId: string) => void;
  purchasedCount: number;
  watchlistCount: number;
  refreshPurchases: () => Promise<void>;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, refreshProfile } = useAuth();
  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set());
  const [purchasedSeriesIds, setPurchasedSeriesIds] = useState<Set<string>>(new Set());
  const [watchlistIds, setWatchlistIds] = useState<Set<string>>(new Set());

  const loadPurchases = useCallback(async () => {
    if (!isAuthenticated) {
      setPurchasedIds(new Set());
      setPurchasedSeriesIds(new Set());
      return;
    }
    const [movies, series] = await Promise.allSettled([
      movieService.getMyPurchases({ limit: 100 }),
      seriesService.getMySeriesPurchases(),
    ]);
    setPurchasedIds(movies.status === "fulfilled" ? new Set(movies.value.items.map((p) => p.movieId)) : new Set());
    setPurchasedSeriesIds(
      series.status === "fulfilled" ? new Set(series.value.map((p) => p.seriesId)) : new Set(),
    );
  }, [isAuthenticated]);

  useEffect(() => {
    loadPurchases();
  }, [loadPurchases]);

  useEffect(() => {
    setWatchlistIds(new Set(watchlistService.getWatchlistIds()));
  }, []);

  const isPurchased = useCallback((movieId: string) => purchasedIds.has(movieId), [purchasedIds]);
  const isSeriesPurchased = useCallback(
    (seriesId: string) => purchasedSeriesIds.has(seriesId),
    [purchasedSeriesIds],
  );
  const isInWatchlist = useCallback((movieId: string) => watchlistIds.has(movieId), [watchlistIds]);

  const purchaseMovie = useCallback(
    async (movieId: string) => {
      try {
        await movieService.purchaseMovie(movieId);
        setPurchasedIds((prev) => new Set(prev).add(movieId));
        const movie = await movieService.getMovieById(movieId);
        toast.success("Purchase successful", {
          description: movie ? `"${movie.title}" has been added to your library.` : undefined,
        });
        notificationService.push({
          type: "PURCHASE",
          title: "Purchase successful",
          message: movie ? `You've successfully purchased "${movie.title}". Enjoy watching!` : "Purchase successful.",
          movieId,
          posterUrl: movie?.posterUrl ?? undefined,
        });
        await refreshProfile();
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Purchase failed");
        throw err;
      }
    },
    [refreshProfile],
  );

  const purchaseSeries = useCallback(
    async (seriesId: string) => {
      try {
        await seriesService.purchaseSeries(seriesId);
        setPurchasedSeriesIds((prev) => new Set(prev).add(seriesId));
        const series = await seriesService.getSeriesById(seriesId);
        toast.success("Purchase successful", {
          description: series
            ? `"${series.title}" is unlocked — every season and episode is now yours to watch.`
            : undefined,
        });
        notificationService.push({
          type: "PURCHASE",
          title: "Purchase successful",
          message: series
            ? `You've unlocked the whole series "${series.title}". Enjoy watching!`
            : "Purchase successful.",
          posterUrl: series?.posterUrl ?? undefined,
        });
        await refreshProfile();
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Purchase failed");
        throw err;
      }
    },
    [refreshProfile],
  );

  const toggleWatchlist = useCallback((movieId: string) => {
    setWatchlistIds((prev) => {
      const wasIn = prev.has(movieId);
      if (wasIn) {
        watchlistService.removeFromWatchlist(movieId);
        toast("Removed from watchlist");
      } else {
        watchlistService.addToWatchlist(movieId);
        toast.success("Added to watchlist");
      }
      const next = new Set(prev);
      if (wasIn) next.delete(movieId);
      else next.add(movieId);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      isPurchased,
      isSeriesPurchased,
      isInWatchlist,
      purchaseMovie,
      purchaseSeries,
      toggleWatchlist,
      purchasedCount: purchasedIds.size,
      watchlistCount: watchlistIds.size,
      refreshPurchases: loadPurchases,
    }),
    [
      isPurchased,
      isSeriesPurchased,
      isInWatchlist,
      purchaseMovie,
      purchaseSeries,
      toggleWatchlist,
      purchasedIds.size,
      watchlistIds.size,
      loadPurchases,
    ],
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error("useLibrary must be used within LibraryProvider");
  return ctx;
}
