"use client";

import Link from "next/link";

import { MEDIA_CHIP_HREF } from "@/components/layout/MediaChipStrip";
import { genreViewHref } from "@/components/media/media-data";
import { Artwork } from "@/components/system/Artwork";
import { ChevronRightIcon, CrownIcon, HistoryIcon } from "@/components/system/icons";
import { useLanguage } from "@/lib/context/language-context";
import { formatDuration } from "@/lib/format";
import { useSection } from "@/lib/i18n/sections/define";
import { searchText } from "@/lib/i18n/sections/search";
import { shellText } from "@/lib/i18n/sections/shell";
import { cn } from "@/lib/utils";
import type { FacetValue, Movie } from "@/types/movie";

const FOCUS = "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link";
/** How many genre chips "Browse by category" shows — the overlay has the rest. */
const CATEGORY_CHIP_COUNT = 12;

/** The board's section header: 22/28 title, faint subtitle, an optional action on the right. */
export function IdleHeader({
  id,
  title,
  subtitle,
  action,
  icon,
}: {
  id: string;
  title: React.ReactNode;
  /** A small decorative glyph before the title (Trending's crimson arrow). */
  icon?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h2 id={id} className={cn("text-section-title text-fg", icon && "flex items-center gap-2.5")}>
          {icon}
          {title}
        </h2>
        {subtitle && <p className="mt-0.5 text-sm leading-5 text-fg-faint">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/**
 * RECENT SEARCHES — clock chips that run the search again, and a crimson
 * Clear. Saved only in this browser ("Only on this device").
 */
export function RecentSearches({
  terms,
  onReplay,
  onClear,
}: {
  terms: readonly string[];
  onReplay: (term: string) => void;
  onClear: () => void;
}) {
  const sx = useSection(searchText);
  if (terms.length === 0) return null;
  return (
    <section aria-labelledby="search-recent" className="px-gutter">
      <IdleHeader
        id="search-recent"
        title={sx.recentTitle}
        subtitle={sx.recentSub}
        action={
          <button
            type="button"
            onClick={onClear}
            aria-label={sx.recentClearLabel}
            className={cn("mq-link h-10 shrink-0 cursor-pointer rounded-[6px] border-0 bg-transparent px-1 text-[15px]", FOCUS)}
          >
            {sx.recentClear}
          </button>
        }
      />
      <div className="mt-4 flex flex-wrap gap-2">
        {terms.map((term) => (
          <button
            key={term}
            type="button"
            onClick={() => onReplay(term)}
            aria-label={sx.searchAgain(term)}
            className={cn(
              "inline-flex h-10 max-w-full cursor-pointer items-center gap-2 rounded-full border-0 bg-raised pr-4 pl-[13px] text-[15px] font-semibold text-fg transition-colors duration-150 hover:bg-raised-hover",
              FOCUS,
            )}
          >
            <HistoryIcon size={18} className="shrink-0 text-fg-faint" />
            <span className="truncate">{term}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

/**
 * TRENDING SEARCHES — the ten most-bought titles as a ranked list in two
 * columns (one on phones): an outlined rank number, a 16:9 thumbnail with
 * the Premium crown, title and "2025 · Drama · 2h 4m". The whole row opens
 * the title. There is no record of what people search for, so the ranking
 * is the existing most-purchased list.
 */
export function TrendingSearches({ movies, isLoading }: { movies: Movie[] | undefined; isLoading: boolean }) {
  const sx = useSection(searchText);
  const s = useSection(shellText);
  if (isLoading) return <TrendingSkeleton label={s.loading} />;
  const picks = (movies ?? []).slice(0, 10);
  if (picks.length === 0) return null;

  return (
    <section aria-labelledby="search-trending" className="mq-rise px-gutter">
      <IdleHeader
        id="search-trending"
        icon={<TrendingIcon size={22} className="shrink-0 text-link" />}
        title={sx.trendingTitle}
        subtitle={sx.trendingSub}
      />
      <ol className="mt-4 grid grid-cols-2 gap-x-[clamp(16px,3vw,48px)] gap-y-1 max-desk:grid-cols-1">
        {picks.map((movie, index) => {
          const premium = movie.accessType === "SUBSCRIPTION";
          const runtime = formatDuration(movie.duration);
          const meta = [movie.releaseYear > 0 ? String(movie.releaseYear) : null, movie.genre || null, runtime]
            .filter(Boolean)
            .join(" · ");
          const a11y = sx.trendingRank(
            index + 1,
            sx.titleA11y({
              title: movie.title,
              year: movie.releaseYear > 0 ? movie.releaseYear : undefined,
              genre: movie.genre,
              rating: movie.rating > 0 ? movie.rating.toFixed(1) : undefined,
              premium,
            }),
          );
          return (
            <li key={movie.id} className="min-w-0">
              <Link
                href={`/movie/${movie.id}`}
                aria-label={a11y}
                className={cn(
                  "group/card flex min-h-[88px] items-center gap-4 rounded-[12px] py-2 pr-3 pl-1 text-fg transition-colors duration-150 hover:bg-white/5 max-desk:gap-3",
                  FOCUS,
                )}
              >
                <span
                  aria-hidden
                  className="w-11 shrink-0 text-center text-[36px] leading-10 font-black tracking-[-0.04em] text-transparent nums [-webkit-text-stroke:1.5px_var(--mq-fg-muted)] max-desk:w-7 max-desk:text-[28px]"
                >
                  {index + 1}
                </span>
                <span
                  aria-hidden
                  className="relative h-[72px] w-32 shrink-0 overflow-hidden rounded-[8px] bg-raised max-desk:h-[54px] max-desk:w-24"
                >
                  <Artwork src={movie.coverUrl ?? movie.posterUrl} seed={movie.title} variant="landscape" sizes="128px" />
                  {premium && (
                    <span className="absolute top-1.5 left-1.5 flex size-5 items-center justify-center rounded-[5px] bg-art-badge text-gold">
                      <CrownIcon size={12} />
                    </span>
                  )}
                </span>
                <span aria-hidden className="min-w-0 flex-1">
                  <span className="block truncate text-base leading-[22px] font-extrabold text-fg transition-colors duration-150 group-hover/card:text-link">
                    {movie.title}
                  </span>
                  {meta && <span className="block truncate text-[13px] leading-[18px] text-fg-faint nums">{meta}</span>}
                </span>
                <ChevronRightIcon size={18} aria-hidden className="shrink-0 text-fg-faint" />
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function TrendingSkeleton({ label }: { label: string }) {
  return (
    <div aria-busy="true" className="px-gutter">
      <span className="mq-skeleton block h-[22px] w-[220px] rounded-[6px]" />
      <span className="mq-skeleton mt-2.5 block h-[13px] w-[180px] rounded-[5px]" />
      <div className="mt-4 grid grid-cols-2 gap-x-[clamp(16px,3vw,48px)] gap-y-1 max-desk:grid-cols-1">
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="flex min-h-[88px] items-center gap-4 py-2 pr-3 pl-1">
            <span className="mq-skeleton h-9 w-11 shrink-0 rounded-[6px] max-desk:w-7" />
            <span className="mq-skeleton h-[72px] w-32 shrink-0 rounded-[8px] max-desk:h-[54px] max-desk:w-24" />
            <span className="flex flex-1 flex-col gap-2">
              <span className="mq-skeleton block h-[15px] w-3/5 rounded-[5px]" />
              <span className="mq-skeleton block h-3 w-2/5 rounded-[5px]" />
            </span>
          </div>
        ))}
      </div>
      <p role="status" className="sr-only">
        {label}
      </p>
    </div>
  );
}

/**
 * BROWSE BY CATEGORY — genre chips with their title counts (the catalogue's
 * own facets, busiest first). A chip opens that genre's page
 * (/media/genre?type=…&genre=…, MediaGenre board); "All categories" opens the
 * Media hub's Categories overlay.
 */
export function CategoryChips({
  kind,
  genres,
  isLoading,
}: {
  kind: "movies" | "series";
  genres: FacetValue[] | undefined;
  isLoading: boolean;
}) {
  const { t } = useLanguage();
  const sx = useSection(searchText);
  const id = `search-categories-${kind}`;

  if (isLoading) {
    return (
      <div aria-busy="true" className="px-gutter">
        <span className="mq-skeleton block h-[22px] w-[200px] rounded-[6px]" />
        <div className="mt-4 flex flex-wrap gap-2.5">
          {[96, 120, 104, 88, 112, 92, 128, 100, 84, 116].map((w, i) => (
            <span key={i} className="mq-skeleton block h-11 rounded-full" style={{ width: w }} />
          ))}
        </div>
      </div>
    );
  }
  const chips = (genres ?? []).slice(0, CATEGORY_CHIP_COUNT);
  if (chips.length === 0) return null;

  return (
    <section aria-labelledby={id} className="mq-rise px-gutter">
      <IdleHeader
        id={id}
        title={sx.categoriesTitle}
        subtitle={kind === "movies" ? sx.categoriesMovies : sx.categoriesSeries}
        action={
          <Link href={MEDIA_CHIP_HREF.categories} className={cn("mq-link shrink-0 rounded-[6px] text-[15px] leading-5", FOCUS)}>
            {sx.allCategories}
          </Link>
        }
      />
      <div role="group" aria-label={t.filters.genre} className="mt-4 flex flex-wrap gap-2.5">
        {chips.map((genre) => (
          <Link
            key={genre.value}
            href={genreViewHref(kind, { genre: genre.value })}
            aria-label={
              kind === "movies" ? sx.categoryMovies(genre.value, genre.count) : sx.categorySeries(genre.value, genre.count)
            }
            className={cn(
              "inline-flex h-11 items-center gap-2.5 rounded-full bg-raised px-[18px] text-[15px] font-bold whitespace-nowrap text-fg transition-colors duration-150 hover:bg-raised-hover",
              FOCUS,
            )}
          >
            {genre.value}
            <span aria-hidden className="text-[13px] font-semibold text-fg-faint nums">
              {genre.count}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/** The board's trending arrow (Search.dc.html "Trending searches" heading). */
function TrendingIcon({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d="M4 16l5-5 4 4 7-7" />
      <path d="M15 8h5v5" />
    </svg>
  );
}
