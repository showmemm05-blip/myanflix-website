"use client";

import type { ReactNode } from "react";
import Link from "next/link";

import { LandscapeCard, LandscapeCardSkeleton, PosterCard, PosterCardSkeleton } from "@/components/cards";
import { EmptyState } from "@/components/empty/EmptyState";
import { ErrorState } from "@/components/empty/ErrorState";
import { Rail } from "@/components/system";
import { BookmarkIcon, HistoryIcon } from "@/components/system/icons";
import { useLanguage } from "@/lib/context/language-context";
import { formatDuration } from "@/lib/format";
import { useSection } from "@/lib/i18n/sections/define";
import { libraryText } from "@/lib/i18n/sections/library";
import { shellText } from "@/lib/i18n/sections/shell";
import { RESUME_COMPLETE_PERCENT, resumeHref } from "@/lib/player/resume";
import type { Movie, WatchHistoryEntry } from "@/types/movie";

/** How many titles each shelf shows before "See all". */
const SHELF_LIMIT = 10;

export interface ProfileLibraryProps {
  /** My List, in the order the watchlist service returns it (oldest saved first). */
  listMovies: Movie[];
  listLoading: boolean;
  listError: boolean;
  onRetryList: () => void;
  /** Removes a title from My List (the shared library context, with its Undo toast). */
  onRemoveFromList: (movieId: string) => void;
  isSubscribed: boolean;
  /** Watch history, newest first (the same ["watch-history"] query as /watch-history). */
  historyEntries: WatchHistoryEntry[];
  historyLoading: boolean;
  historyError: boolean;
  onRetryHistory: () => void;
}

/**
 * THE PROFILE PAGE'S "YOUR LIBRARY" GROUP (owner decision 2026-10-07: the
 * Profile page took the Library tab's place, Netflix "My Netflix" style).
 *
 * Two shelves, each a header (title + "See all") over a rail:
 * - My List — the saved posters, newest first, up to 10; See all → /watchlist.
 * - Watch history — recently watched titles with their progress lines, up to
 *   10; See all → /watch-history.
 * Each shelf has its own loading, error (with Retry) and empty state.
 *
 * The rails bleed to the screen edge on phones and sit inside the account
 * column on desktop (the side menu is to their left there).
 *
 * Pure presentational — all data and callbacks arrive as props.
 */
export function ProfileLibrary({
  listMovies,
  listLoading,
  listError,
  onRetryList,
  onRemoveFromList,
  isSubscribed,
  historyEntries,
  historyLoading,
  historyError,
  onRetryHistory,
}: ProfileLibraryProps) {
  const { t } = useLanguage();
  const lib = useSection(libraryText);
  const shell = useSection(shellText);

  // The list comes back oldest-saved first; the shelf shows the newest first
  // (the My List page's default "Recently saved" order).
  const saved = [...listMovies].reverse().slice(0, SHELF_LIMIT);
  const recent = historyEntries.slice(0, SHELF_LIMIT);

  return (
    <section aria-labelledby="profile-library" className="mt-10">
      <h2 id="profile-library" className="text-kicker">
        {lib.yourLibrary}
      </h2>

      <Shelf
        id="profile-my-list"
        title={shell.myList}
        seeAllHref="/watchlist"
        seeAllLabel={lib.seeAllList}
        className="mt-4"
      >
        {listLoading && saved.length === 0 ? (
          <ShelfSkeleton kind="poster" label={lib.loadingLibrary} />
        ) : listError && saved.length === 0 ? (
          <ErrorState
            title={lib.listLoadError}
            description={shell.errorBody}
            onRetry={onRetryList}
            framed
            className="mt-4 [&>div]:py-8"
          />
        ) : saved.length === 0 ? (
          <EmptyState
            icon={BookmarkIcon}
            title={lib.listEmptyTitle}
            description={lib.noMoviesBody}
            framed
            className="mt-4 py-8"
          />
        ) : (
          <Rail className={railClass}>
            {saved.map((movie) => {
              const premium = movie.accessType !== "FREE";
              const hasAccess = !premium || isSubscribed;
              const duration = formatDuration(movie.duration);
              return (
                <PosterCard
                  key={movie.id}
                  layout="rail"
                  title={movie.title}
                  href={`/movie/${movie.id}`}
                  imageUrl={movie.posterUrl}
                  meta={duration ? `${movie.releaseYear} · ${duration}` : String(movie.releaseYear)}
                  rating={movie.rating > 0 ? movie.rating : null}
                  premium={premium}
                  playHref={hasAccess ? `/player/${movie.id}` : null}
                  // Saved by definition: the card's list button removes it
                  // (same Undo toast as the My List page).
                  onToggleList={() => onRemoveFromList(movie.id)}
                  listSaved
                  a11yLabel={lib.posterLabel(movie.title, movie.releaseYear, premium ? t.badges.premium : t.badges.free)}
                />
              );
            })}
          </Rail>
        )}
      </Shelf>

      <Shelf
        id="profile-history"
        title={lib.watchHistory}
        seeAllHref="/watch-history"
        seeAllLabel={lib.seeAllHistory}
        className="mt-9"
      >
        {historyLoading && recent.length === 0 ? (
          <ShelfSkeleton kind="landscape" label={lib.loadingHistory} />
        ) : historyError && recent.length === 0 ? (
          <ErrorState
            title={lib.historyLoadError}
            description={shell.errorBody}
            onRetry={onRetryHistory}
            framed
            className="mt-4 [&>div]:py-8"
          />
        ) : recent.length === 0 ? (
          <EmptyState
            icon={HistoryIcon}
            title={t.watchHistory.empty}
            description={t.watchHistory.emptyDescription}
            framed
            className="mt-4 py-8"
          />
        ) : (
          <Rail className={railClass}>
            {recent.map((entry) => {
              const percent = Math.min(100, Math.max(0, Math.round(entry.progressPercent)));
              const complete = entry.progressPercent >= RESUME_COMPLETE_PERCENT;
              const left =
                entry.durationMinutes && !complete
                  ? formatDuration((entry.durationMinutes * (100 - percent)) / 100)
                  : null;
              return (
                <LandscapeCard
                  key={entry.id}
                  layout="rail"
                  title={entry.movieTitle}
                  // H-27: resume at the saved second; a finished title starts over.
                  href={resumeHref(entry.movieId, entry.progressPercent, entry.lastPositionSeconds)}
                  imageUrl={entry.posterUrl}
                  progress={percent}
                  meta={
                    complete
                      ? t.watchHistory.completed
                      : left
                        ? lib.continueMeta(percent, left)
                        : shell.percentWatched(percent)
                  }
                  a11yLabel={
                    complete
                      ? lib.watchAgainTitle(entry.movieTitle)
                      : left
                        ? lib.continueLabel(entry.movieTitle, percent, left)
                        : shell.resume(entry.movieTitle, percent)
                  }
                />
              );
            })}
          </Rail>
        )}
      </Shelf>
    </section>
  );
}

/**
 * Phones: the rail runs edge to edge (cancelling the page gutter). Desktop:
 * it stays inside the account column.
 */
const railClass = "-mx-gutter desk:mx-0 desk:px-0 desk:scroll-pl-0";

/** One shelf: an h3 with a crimson "See all" link on the right, then its content. */
function Shelf({
  id,
  title,
  seeAllHref,
  seeAllLabel,
  className,
  children,
}: {
  id: string;
  title: string;
  seeAllHref: string;
  /** The spoken name of the link (two "See all" links on one page need telling apart). */
  seeAllLabel: string;
  className?: string;
  children: ReactNode;
}) {
  const shell = useSection(shellText);
  return (
    <section aria-labelledby={id} className={className}>
      <div className="flex items-end justify-between gap-4">
        <h3 id={id} className="min-w-0 truncate text-section-title text-fg">
          {title}
        </h3>
        <Link
          href={seeAllHref}
          aria-label={seeAllLabel}
          className="mq-link shrink-0 rounded-[6px] text-[15px] leading-5 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link"
        >
          {shell.seeAll}
        </Link>
      </div>
      {children}
    </section>
  );
}

/** A non-scrolling line of skeleton cards with a hidden "Loading …" status. */
function ShelfSkeleton({ kind, label }: { kind: "poster" | "landscape"; label: string }) {
  return (
    <div aria-busy="true" className="-mx-gutter flex gap-4 overflow-hidden px-gutter pt-4 desk:mx-0 desk:px-0">
      {Array.from({ length: kind === "poster" ? 6 : 3 }, (_, i) =>
        kind === "poster" ? (
          <PosterCardSkeleton key={i} layout="rail" />
        ) : (
          <LandscapeCardSkeleton key={i} layout="rail" />
        ),
      )}
      <p role="status" className="sr-only">
        {label}
      </p>
    </div>
  );
}
