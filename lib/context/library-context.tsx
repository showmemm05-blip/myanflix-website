"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { loginHref } from "@/lib/auth/return-to";
import { useAuth } from "@/lib/context/auth-context";
import { useLanguage } from "@/lib/context/language-context";
import { pickSection } from "@/lib/i18n/sections/define";
import { libraryText } from "@/lib/i18n/sections/library";
import { watchlistService } from "@/services/api/watchlistService";

interface LibraryContextValue {
  isInWatchlist: (movieId: string) => boolean;
  toggleWatchlist: (movieId: string) => void;
  watchlistCount: number;
  /** The saved movie ids in the order they were saved (empty for a guest). */
  watchlistIds: readonly string[];
}

const LibraryContext = createContext<LibraryContextValue | null>(null);
const EMPTY_IDS: readonly string[] = [];

export function LibraryProvider({ children }: { children: ReactNode }) {
  // The saved ids live in this browser's storage. useSyncExternalStore reads
  // them with an empty server snapshot, so the server HTML and the hydrating
  // client agree (no mismatch), and then switches to the stored list — with
  // no extra mount effect and no second render of the whole tree.
  const savedIds = useSyncExternalStore(
    watchlistService.subscribe,
    watchlistService.getIdsSnapshot,
    watchlistService.getServerIdsSnapshot,
  );
  const watchlistIds = useMemo(() => new Set(savedIds), [savedIds]);
  // The watchlist is a member feature: a visitor can't open /watchlist, so
  // saving would only ever fill a list they can never see. Every save button
  // in the app goes through here, so the one guest check lives here too.
  const { isAuthenticated } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();

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
    // The saved list lives in this browser's storage, so it is the truth for
    // "was it saved?". Side effects (storage write, toast) stay out of the
    // state updater, which React may run twice.
    // Each write notifies the store above, which re-renders the readers.
    const add = (id: string) => watchlistService.addToWatchlist(id);
    const remove = (id: string) => watchlistService.removeFromWatchlist(id);
    const l = pickSection(libraryText, language);
    if (watchlistService.getWatchlistIds().includes(movieId)) {
      remove(movieId);
      // Undo puts the title straight back (the Library board's toast).
      toast(l.removedFromList, { action: { label: l.undo, onClick: () => add(movieId) } });
    } else {
      add(movieId);
      toast.success(l.addedToList);
    }
  }, [isAuthenticated, language, pathname, router, t]);

  const value = useMemo(
    () => ({
      isInWatchlist,
      toggleWatchlist,
      watchlistCount: isAuthenticated ? watchlistIds.size : 0,
      watchlistIds: isAuthenticated ? savedIds : EMPTY_IDS,
    }),
    [isAuthenticated, isInWatchlist, toggleWatchlist, watchlistIds.size, savedIds],
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error("useLibrary must be used within LibraryProvider");
  return ctx;
}
