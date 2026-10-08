"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ProfileLibrary } from "@/components/profile/ProfileLibrary";
import { ProfileView, ProfileViewSkeleton } from "@/components/views/ProfileView";
import { useAuth } from "@/lib/context/auth-context";
import { useWatchlistMovies } from "@/hooks/use-watchlist";
import { useLibrary } from "@/lib/context/library-context";
import { useSubscription } from "@/lib/context/subscription-context";
import { historyService } from "@/services/api/historyService";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { toggleWatchlist } = useLibrary();
  const { isSubscribed } = useSubscription();

  // "Your library" reads exactly what the My List and Watch history pages
  // read — same query keys and calls — so moving between Profile and those
  // pages never fetches twice, and a removal on one shows on the other.
  // My List is one cached query per saved title (useWatchlistMovies), so a
  // Remove is just a filter and nothing is fetched again.
  const {
    movies: listMovies,
    isLoading: listLoading,
    isError: listError,
    refetch: refetchList,
  } = useWatchlistMovies();

  const {
    data: history,
    isLoading: historyLoading,
    isError: historyError,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ["watch-history"],
    queryFn: () => historyService.getWatchHistory({ limit: 50 }),
  });

  if (!user) return <ProfileViewSkeleton />;

  // Profile edits live inside ProfileEditDialog, which owns its own service
  // calls and pushes the refreshed user into the auth context — the page has
  // nothing left to hand down.
  return (
    <ProfileView
      user={user}
      onLogout={() => {
        logout();
        router.push("/login");
      }}
      library={
        <ProfileLibrary
          listMovies={listMovies}
          listLoading={listLoading}
          listError={listError}
          onRetryList={() => refetchList()}
          onRemoveFromList={toggleWatchlist}
          isSubscribed={isSubscribed}
          historyEntries={history?.items ?? []}
          historyLoading={historyLoading}
          historyError={historyError}
          onRetryHistory={() => refetchHistory()}
        />
      }
    />
  );
}
