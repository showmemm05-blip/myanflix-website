"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { loginHref } from "@/lib/auth/return-to";
import { useAuth } from "@/lib/context/auth-context";
import { useLanguage } from "@/lib/context/language-context";
import { watchlistService } from "@/services/api/watchlistService";

interface LibraryContextValue {
  isInWatchlist: (movieId: string) => boolean;
  toggleWatchlist: (movieId: string) => void;
  watchlistCount: number;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [watchlistIds, setWatchlistIds] = useState<Set<string>>(new Set());
  // The watchlist is a member feature: a visitor can't open /watchlist, so
  // saving would only ever fill a list they can never see. Every save button
  // in the app goes through here, so the one guest check lives here too.
  const { isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setWatchlistIds(new Set(watchlistService.getWatchlistIds()));
  }, []);

  const isInWatchlist = useCallback(
    (movieId: string) => isAuthenticated && watchlistIds.has(movieId),
    [isAuthenticated, watchlistIds],
  );

  const toggleWatchlist = useCallback((movieId: string) => {
    if (!isAuthenticated) {
      // Read the query at click time — this provider wraps the whole app, and
      // useSearchParams here would demand a Suspense boundary above it.
      const returnTo = `${pathname}${typeof window !== "undefined" ? window.location.search : ""}`;
      toast(t.watchlist.signInToSave, {
        action: { label: t.nav.signIn, onClick: () => router.push(loginHref(returnTo)) },
      });
      return;
    }
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
  }, [isAuthenticated, pathname, router, t]);

  const value = useMemo(
    () => ({
      isInWatchlist,
      toggleWatchlist,
      watchlistCount: isAuthenticated ? watchlistIds.size : 0,
    }),
    [isAuthenticated, isInWatchlist, toggleWatchlist, watchlistIds.size],
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error("useLibrary must be used within LibraryProvider");
  return ctx;
}
