"use client";

import Link from "next/link";

import { WatchHistoryCard, WatchHistoryCardSkeleton } from "@/components/cards/WatchHistoryCard";
import { EmptyState } from "@/components/empty/EmptyState";
import { ErrorState } from "@/components/empty/ErrorState";
import { HistoryIcon } from "@/components/system/icons";
import { buttonVariants } from "@/components/ui/button";
import { LibraryHeader } from "@/components/views/AccountShell";
import { useLanguage } from "@/lib/context/language-context";
import { useSection } from "@/lib/i18n/sections/define";
import { dayHeading, libraryText } from "@/lib/i18n/sections/library";
import { shellText } from "@/lib/i18n/sections/shell";
import type { WatchHistoryEntry } from "@/types/movie";

export interface WatchHistoryViewProps {
  entries: WatchHistoryEntry[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

/** History rows: auto-fill from 400px (3 across at 1440), one column on phones. */
const gridClass = "mq-stack grid grid-cols-[repeat(auto-fill,minmax(400px,1fr))] gap-x-4 gap-y-3";

/**
 * The Watch history page (WatchHistory board): the Library heading with the
 * My List · Watch history strip, "24 titles · newest first", then the rows
 * grouped by day (Today / Yesterday / weekday · date). The incoming order is
 * kept — groups are cut where the day changes.
 *
 * Pure presentational — all data and callbacks arrive as props.
 */
export function WatchHistoryView({ entries, isLoading, isError, onRetry }: WatchHistoryViewProps) {
  const { t, language } = useLanguage();
  const lib = useSection(libraryText);
  const shell = useSection(shellText);
  const ready = !isLoading && !isError && entries.length > 0;

  const groups: { key: string; label: string; date: string; items: WatchHistoryEntry[] }[] = [];
  for (const entry of entries) {
    const day = dayHeading(entry.lastWatchedAt, language, lib);
    const last = groups[groups.length - 1];
    if (last && last.key === day.key) last.items.push(entry);
    else groups.push({ key: day.key, label: day.label, date: day.date, items: [entry] });
  }

  return (
    <>
      <LibraryHeader
        current="history"
        title={lib.watchHistory}
        subtitle={t.watchHistory.subtitle}
        aside={ready ? lib.historyCount(entries.length) : undefined}
      />

      <div className="px-gutter pt-10">
        {isLoading ? (
          <div aria-busy="true">
            <p role="status" className="sr-only">
              {lib.loadingHistory}
            </p>
            <span className="mq-skeleton block h-[18px] w-[180px] rounded-[6px]" />
            <div className={`${gridClass} mt-3.5`}>
              {Array.from({ length: 6 }).map((_, i) => (
                <WatchHistoryCardSkeleton key={i} />
              ))}
            </div>
          </div>
        ) : isError ? (
          <ErrorState onRetry={onRetry} description={shell.errorBody} />
        ) : entries.length === 0 ? (
          <EmptyState
            icon={HistoryIcon}
            headingLevel="h2"
            title={t.watchHistory.empty}
            description={t.watchHistory.emptyDescription}
            className="pt-8 pb-6"
            action={
              <Link href="/media" className={buttonVariants({ variant: "play", size: "cta" })}>
                {lib.browseMovies}
              </Link>
            }
          />
        ) : (
          <div className="flex flex-col gap-9">
            {groups.map((group) => (
              <section key={group.key} aria-labelledby={`history-day-${group.key}`}>
                <h2 id={`history-day-${group.key}`} className="text-[15px] leading-5 font-extrabold text-fg">
                  {group.label}
                  {group.date && <span className="font-semibold text-fg-faint"> · {group.date}</span>}
                </h2>
                <div className={`${gridClass} mt-3.5`}>
                  {group.items.map((entry) => (
                    <WatchHistoryCard key={entry.id} entry={entry} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
