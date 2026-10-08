"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SubscribeDialog } from "@/components/dialogs/SubscribeDialog";
import { WatchlistView } from "@/components/views/WatchlistView";
import { useWatchlistMovies } from "@/hooks/use-watchlist";
import { useLibrary } from "@/lib/context/library-context";
import { useSubscription } from "@/lib/context/subscription-context";
import { historyService } from "@/services/api/historyService";

export default function WatchlistPage() {
  const { toggleWatchlist } = useLibrary();
  const { isSubscribed } = useSubscription();
  const [subscribeOpen, setSubscribeOpen] = useState(false);

  // One cached query per saved title (see useWatchlistMovies): a Remove is
  // just a filter, so the card goes at once and nothing is fetched again.
  const { movies: watchlistMovies, isLoading, isError, refetch } = useWatchlistMovies();

  // Continue watching: the same query (key and call) as the Watch history
  // page (and the Profile page's Your library group), so moving between them never fetches twice.
  const {
    data: history,
    isLoading: historyLoading,
    isError: historyError,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ["watch-history"],
    queryFn: () => historyService.getWatchHistory({ limit: 50 }),
  });

  return (
    <>
      <WatchlistView
        movies={watchlistMovies}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        isSubscribed={isSubscribed}
        onRemove={toggleWatchlist}
        onSubscribe={() => setSubscribeOpen(true)}
        continueEntries={history?.items ?? []}
        continueLoading={historyLoading}
        continueError={historyError}
        onRetryContinue={() => refetchHistory()}
      />
      <SubscribeDialog open={subscribeOpen} onOpenChange={setSubscribeOpen} />
    </>
  );
}
