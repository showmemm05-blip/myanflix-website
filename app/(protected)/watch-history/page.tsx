"use client";

import { useQuery } from "@tanstack/react-query";
import { WatchHistoryView } from "@/components/views/WatchHistoryView";
import { historyService } from "@/services/api/historyService";

export default function WatchHistoryPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["watch-history"],
    queryFn: () => historyService.getWatchHistory({ limit: 50 }),
  });

  return (
    <WatchHistoryView
      entries={data?.items ?? []}
      isLoading={isLoading}
      isError={isError}
      onRetry={() => refetch()}
    />
  );
}
