"use client";

import { useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";
import { WatchHistoryCard } from "@/components/cards/WatchHistoryCard";
import { EmptyState } from "@/components/empty/EmptyState";
import { historyService } from "@/services/api/historyService";

export default function WatchHistoryPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["watch-history"],
    queryFn: () => historyService.getWatchHistory({ limit: 50 }),
  });

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold sm:text-3xl">Watch History</h1>
        <p className="mt-1 text-sm text-muted-foreground">Pick up right where you left off.</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <EmptyState icon={History} title="No watch history yet" description="Movies you watch will appear here." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((entry) => (
            <WatchHistoryCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
