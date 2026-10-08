"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { LandscapeCard, PosterCard } from "@/components/cards";
import { EmptyState } from "@/components/empty/EmptyState";
import { ErrorState } from "@/components/empty/ErrorState";
import { CardGrid, FilterChip, Row, RowSkeleton } from "@/components/system";
import {
  BookmarkIcon,
  ChevronDownIcon,
  CloseIcon,
  CrownIcon,
  InfoIcon,
  LibraryIcon,
  PlayIcon,
} from "@/components/system/icons";
import { Button, buttonVariants } from "@/components/ui/button";
import { LibraryHeader } from "@/components/views/AccountShell";
import { useLanguage } from "@/lib/context/language-context";
import { formatDuration } from "@/lib/format";
import { useSection } from "@/lib/i18n/sections/define";
import { libraryText } from "@/lib/i18n/sections/library";
import { shellText } from "@/lib/i18n/sections/shell";
import { RESUME_COMPLETE_PERCENT, resumeHref } from "@/lib/player/resume";
import type { Movie, WatchHistoryEntry } from "@/types/movie";

export interface WatchlistViewProps {
  movies: Movie[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  isSubscribed: boolean;
  onRemove: (movieId: string) => void;
  onSubscribe: () => void;
  /** Watch history, for the Continue watching row (in-progress titles only). */
  continueEntries?: WatchHistoryEntry[];
  continueLoading?: boolean;
  /** The watch-history request failed: the row shows an error with Retry. */
  continueError?: boolean;
  onRetryContinue?: () => void;
}

type SortKey = "recent" | "title" | "year" | "rating";
type AccessFilter = "all" | "free" | "premium";

/**
 * The Library page — "My List" (Library board).
 *
 * The Library heading and its My List · Watch history strip; a Continue
 * watching row of wide 16:9 cards (titles started but not finished, from
 * watch history); then My List: a count, a sort menu (Recently saved, Title
 * A–Z, Release year, Rating), All / Free / Premium chips, and the poster grid.
 * Every card keeps an always-visible remove (X) button. Titles this viewer
 * can watch show the white Play disc on hover (mouse) or a white Watch pill
 * under the card (touch screens, which have no hover); locked Premium titles get the
 * gold "Subscribe to watch" pill under the card (it opens the subscribe
 * dialog, as before). Sorting and filtering happen in the browser — the list
 * itself lives in this browser (watchlistService), which a note says.
 *
 * Pure presentational — all data and callbacks arrive as props.
 */
export function WatchlistView({
  movies,
  isLoading,
  isError,
  onRetry,
  isSubscribed,
  onRemove,
  onSubscribe,
  continueEntries = [],
  continueLoading = false,
  continueError = false,
  onRetryContinue,
}: WatchlistViewProps) {
  const { t } = useLanguage();
  const lib = useSection(libraryText);
  const shell = useSection(shellText);
  const [sort, setSort] = useState<SortKey>("recent");
  const [access, setAccess] = useState<AccessFilter>("all");

  const inProgress = useMemo(
    () => continueEntries.filter((e) => e.progressPercent > 0 && e.progressPercent < RESUME_COMPLETE_PERCENT),
    [continueEntries],
  );

  const shown = useMemo(() => {
    // The list comes back oldest-saved first; "Recently saved" reverses it.
    const indexed = movies.map((movie, index) => ({ movie, index }));
    const filtered = indexed.filter(({ movie }) =>
      access === "all" ? true : access === "free" ? movie.accessType === "FREE" : movie.accessType !== "FREE",
    );
    filtered.sort((a, b) => {
      if (sort === "title") return a.movie.title.localeCompare(b.movie.title);
      if (sort === "year") return b.movie.releaseYear - a.movie.releaseYear || b.index - a.index;
      if (sort === "rating") return b.movie.rating - a.movie.rating || b.index - a.index;
      return b.index - a.index;
    });
    return filtered.map(({ movie }) => movie);
  }, [movies, sort, access]);

  const total = movies.length;
  const filteredEmpty = total > 0 && shown.length === 0;
  // An empty My List waits for watch history before it picks a message, so
  // the page never shows "No movies saved yet" and then swaps to "Nothing
  // here yet" a moment later — it stays on the loading skeleton instead.
  const loading = isLoading || (!isError && total === 0 && continueLoading && inProgress.length === 0);
  const allEmpty = !loading && !isError && total === 0 && inProgress.length === 0 && !continueError;

  const sortOptions: { value: SortKey; label: string }[] = [
    { value: "recent", label: lib.sortRecent },
    { value: "title", label: lib.sortTitle },
    { value: "year", label: lib.sortYear },
    { value: "rating", label: lib.sortRating },
  ];
  const accessOptions: { value: AccessFilter; label: string }[] = [
    { value: "all", label: lib.accessAll },
    { value: "free", label: t.badges.free },
    { value: "premium", label: t.badges.premium },
  ];

  const continueRow =
    continueLoading && inProgress.length === 0 ? (
      <RowSkeleton kind="landscape" className="mt-10" />
    ) : continueError && inProgress.length === 0 ? (
      <section aria-labelledby="continue-error-heading" className="mt-10 px-gutter">
        <h2 id="continue-error-heading" className="text-section-title text-fg">
          {lib.continueWatching}
        </h2>
        <ErrorState
          title={lib.continueError}
          description={shell.errorBody}
          onRetry={onRetryContinue}
          framed
          className="mt-4 [&>div]:py-8"
        />
      </section>
    ) : inProgress.length > 0 ? (
      <Row
        className="mt-10"
        title={lib.continueWatching}
        subtitle={lib.continueSubtitle}
        seeAllHref="/watch-history"
        seeAllLabel={lib.watchHistory}
      >
        {inProgress.map((entry) => {
          const percent = Math.round(entry.progressPercent);
          const left = entry.durationMinutes
            ? formatDuration((entry.durationMinutes * (100 - percent)) / 100)
            : null;
          return (
            <LandscapeCard
              key={entry.id}
              layout="rail"
              title={entry.movieTitle}
              // H-27: resume at the saved second, not 0:00.
              href={resumeHref(entry.movieId, entry.progressPercent, entry.lastPositionSeconds)}
              imageUrl={entry.posterUrl}
              progress={percent}
              meta={left ? lib.continueMeta(percent, left) : shell.percentWatched(percent)}
              a11yLabel={left ? lib.continueLabel(entry.movieTitle, percent, left) : shell.resume(entry.movieTitle, percent)}
            />
          );
        })}
      </Row>
    ) : null;

  return (
    <>
      <LibraryHeader current="list" title={lib.yourLibrary} subtitle={lib.librarySubtitle} />

      {loading ? (
        <div aria-busy="true" className="pt-10">
          <p role="status" className="sr-only">
            {lib.loadingLibrary}
          </p>
          <RowSkeleton kind="landscape" count={4} />
          <div className="mt-14 px-gutter">
            <span className="mq-skeleton block h-7 w-40 rounded-[6px]" />
            <CardGrid kind="posters" className="mt-[22px]">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} aria-hidden className="min-w-0">
                  <span className="mq-skeleton block aspect-2/3 rounded-[10px]" />
                  <span className="mq-skeleton mt-3 block h-3.5 w-4/5 rounded-[5px]" />
                  <span className="mq-skeleton mt-2 block h-3 w-1/2 rounded-[5px]" />
                </div>
              ))}
            </CardGrid>
          </div>
        </div>
      ) : isError ? (
        <div className="px-gutter pt-6">
          <ErrorState onRetry={onRetry} description={shell.errorBody} />
        </div>
      ) : allEmpty ? (
        <div className="px-gutter pt-12 pb-6">
          <EmptyState
            icon={LibraryIcon}
            headingLevel="h2"
            title={lib.nothingHereTitle}
            description={lib.nothingHereBody}
            className="py-0"
            action={
              <Link href="/media" className={buttonVariants({ variant: "play", size: "cta" })}>
                {lib.browseMovies}
              </Link>
            }
          />
        </div>
      ) : (
        <>
          {continueRow}

          <section
            id="my-list"
            aria-labelledby="my-list-heading"
            className="mt-[clamp(48px,4.4vw,64px)] scroll-mt-[calc(var(--shell-bar-h)+24px)] px-gutter"
          >
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
              <div className="flex min-w-0 flex-wrap items-baseline gap-x-3.5 gap-y-1">
                <h2
                  id="my-list-heading"
                  className="text-[clamp(26px,2.4vw,32px)] leading-[1.2] font-black tracking-[-0.02em] text-fg"
                >
                  {shell.myList}
                </h2>
                <span role="status" className="text-sm leading-5 text-fg-faint tabular-nums">
                  {access !== "all" && total > 0 ? lib.moviesShown(shown.length, total) : lib.moviesSaved(total)}
                </span>
              </div>
              {total > 0 && (
                <div className="relative">
                  <label htmlFor="list-sort" className="sr-only">
                    {lib.sortLabel}
                  </label>
                  <select
                    id="list-sort"
                    value={sort}
                    onChange={(e) => setSort(e.target.value as SortKey)}
                    className="h-10 cursor-pointer appearance-none rounded-full border-0 bg-raised pr-[38px] pl-4 text-sm font-bold text-fg outline-none transition-colors duration-150 [-webkit-appearance:none] hover:bg-raised-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link"
                  >
                    {sortOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon
                    size={16}
                    strokeWidth={2}
                    className="pointer-events-none absolute top-3 right-3.5 text-fg-muted"
                  />
                </div>
              )}
            </div>

            {total > 0 && (
              <div role="group" aria-label={lib.accessLabel} className="mt-[18px] flex flex-wrap gap-2">
                {accessOptions.map((option) => (
                  <FilterChip
                    key={option.value}
                    selected={access === option.value}
                    onClick={() => setAccess(option.value)}
                  >
                    {option.label}
                  </FilterChip>
                ))}
              </div>
            )}

            {shown.length > 0 ? (
              <CardGrid kind="posters" className="mt-6">
                {shown.map((movie) => {
                  const hasAccess = movie.accessType === "FREE" || isSubscribed;
                  const premium = movie.accessType !== "FREE";
                  const duration = formatDuration(movie.duration);
                  return (
                    <div key={movie.id} className="relative min-w-0">
                      <PosterCard
                        layout="grid"
                        title={movie.title}
                        href={`/movie/${movie.id}`}
                        imageUrl={movie.posterUrl}
                        meta={duration ? `${movie.releaseYear} · ${duration}` : String(movie.releaseYear)}
                        // An unrated title shows no rating, as before.
                        rating={movie.rating > 0 ? movie.rating : null}
                        premium={premium}
                        playHref={hasAccess ? `/player/${movie.id}` : null}
                        a11yLabel={lib.posterLabel(
                          movie.title,
                          movie.releaseYear,
                          premium ? t.badges.premium : t.badges.free,
                        )}
                        sizes="(max-width: 719px) 33vw, 200px"
                      />
                      {/* Always visible (also on touch): the one way off the list. */}
                      <button
                        type="button"
                        aria-label={shell.removeFromList(movie.title)}
                        onClick={() => onRemove(movie.id)}
                        className="absolute top-2 right-2 z-[3] flex size-8 cursor-pointer items-center justify-center rounded-full border-0 bg-art-badge text-white outline-none transition-colors duration-150 hover:bg-danger-fill focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link"
                      >
                        <CloseIcon size={16} strokeWidth={2} />
                      </button>
                      {/* Touch screens have no hover, so the poster's Play disc never
                          shows there: a Watch pill under the card keeps one tap
                          to the player, as the old Watch button did. Mouse
                          screens use the hover Play disc instead. */}
                      {hasAccess && (
                        <Link
                          href={`/player/${movie.id}`}
                          aria-label={shell.play(movie.title)}
                          className="mq-press relative z-[2] mt-2 inline-flex h-[30px] items-center gap-1.5 rounded-full bg-play px-3 text-[13px] font-extrabold text-ink outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link hover-device:hidden"
                        >
                          <PlayIcon size={12} />
                          {t.watchlist.watch}
                        </Link>
                      )}
                      {!hasAccess && (
                        <button
                          type="button"
                          aria-label={lib.subscribeToWatchTitle(movie.title)}
                          aria-haspopup="dialog"
                          onClick={onSubscribe}
                          className="mq-press relative z-[2] mt-2 inline-flex h-[30px] cursor-pointer items-center gap-1.5 rounded-full border-0 bg-gold/16 px-3 text-[13px] font-extrabold text-gold outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link"
                        >
                          <CrownIcon size={12} />
                          {lib.subscribeToWatch}
                        </button>
                      )}
                    </div>
                  );
                })}
              </CardGrid>
            ) : filteredEmpty ? (
              <EmptyState
                icon={BookmarkIcon}
                title={lib.nothingMatches}
                description={access === "free" ? lib.noFreeMovies : lib.noPremiumMovies}
                className="pt-14 pb-6"
                action={
                  <Button variant="tonal" size="cta" onClick={() => setAccess("all")}>
                    {lib.showAll}
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={BookmarkIcon}
                title={lib.noMoviesTitle}
                description={lib.noMoviesBody}
                className="pt-14 pb-6"
                action={
                  <Link href="/media" className={buttonVariants({ variant: "play", size: "cta" })}>
                    {lib.browseMovies}
                  </Link>
                }
              />
            )}

            <p className="mt-8 flex items-start gap-2 text-[13px] leading-[18px] text-fg-faint">
              <InfoIcon size={16} className="mt-px shrink-0" />
              {lib.browserNote}
            </p>
          </section>
        </>
      )}
    </>
  );
}
