"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SubscribeDialog } from "@/components/dialogs/SubscribeDialog";
import { WatchlistView } from "@/components/views/WatchlistView";
import { useLibrary } from "@/lib/context/library-context";
import { useSubscription } from "@/lib/context/subscription-context";
import { watchlistService } from "@/services/api/watchlistService";

export default function WatchlistPage() {
  const { watchlistCount, toggleWatchlist } = useLibrary();
  const { isSubscribed } = useSubscription();
  const [subscribeOpen, setSubscribeOpen] = useState(false);

  // watchlistCount in the key re-runs the query whenever the localStorage-backed
  // library changes (e.g. Remove), so the list stays in sync without a mutation.
  const {
    data: watchlistMovies = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["watchlist", watchlistCount],
    queryFn: () => watchlistService.getWatchlist(),
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
      />
      <SubscribeDialog open={subscribeOpen} onOpenChange={setSubscribeOpen} />
    </>
  );
}
