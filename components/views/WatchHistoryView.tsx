"use client";

import { History } from "lucide-react";
import { WatchHistoryCard, WatchHistoryCardSkeleton } from "@/components/cards/WatchHistoryCard";
import { EmptyState } from "@/components/empty/EmptyState";
import { ErrorState } from "@/components/empty/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import { AccountShell } from "@/components/views/AccountShell";
import { useLanguage } from "@/lib/context/language-context";
import type { WatchHistoryEntry } from "@/types/movie";

export interface WatchHistoryViewProps {
  entries: WatchHistoryEntry[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

/**
 * Pure presentational watch-history page body — all data and callbacks arrive
 * as props so a harness can render it without auth or queries.
 *
 * The entry card itself (poster · progress · resume) lives in components/cards
 * and is shared with the rest of the app; the page shell and its measure come
 * from <AccountShell>, so all this file owns is the grid rhythm.
 */
export function WatchHistoryView({ entries, isLoading, isError, onRetry }: WatchHistoryViewProps) {
  const { t } = useLanguage();

  return (
    <AccountShell>
      <PageHeader eyebrow={t.watchHistory.eyebrow} title={t.watchHistory.title} subtitle={t.watchHistory.subtitle} />

      <div>
        {isLoading ? (
          <div className={gridClass}>
            {Array.from({ length: 6 }).map((_, i) => (
              <WatchHistoryCardSkeleton key={i} />
            ))}
          </div>
        ) : isError ? (
          <ErrorState onRetry={onRetry} />
        ) : entries.length === 0 ? (
          <EmptyState icon={History} title={t.watchHistory.empty} description={t.watchHistory.emptyDescription} />
        ) : (
          <div className={gridClass}>
            {entries.map((entry) => (
              <WatchHistoryCard key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </AccountShell>
  );
}

/** Two columns is the widest the entry card reads well at the account measure. */
const gridClass = "grid grid-cols-1 gap-4 md:grid-cols-2";
