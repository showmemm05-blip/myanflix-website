"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { watchlistService } from "@/services/api/watchlistService";

interface LibraryContextValue {
  isInWatchlist: (movieId: string) => boolean;
  toggleWatchlist: (movieId: string) => void;
  watchlistCount: number;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [watchlistIds, setWatchlistIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setWatchlistIds(new Set(watchlistService.getWatchlistIds()));
  }, []);

  const isInWatchlist = useCallback((movieId: string) => watchlistIds.has(movieId), [watchlistIds]);

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
      isInWatchlist,
      toggleWatchlist,
      watchlistCount: watchlistIds.size,
    }),
    [isInWatchlist, toggleWatchlist, watchlistIds.size],
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error("useLibrary must be used within LibraryProvider");
  return ctx;
}
