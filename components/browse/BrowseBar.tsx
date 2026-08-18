"use client";

import { useRef, useState } from "react";
import { ArrowDownWideNarrow, LayoutGrid, Rows3, Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/lib/context/language-context";
import { cn } from "@/lib/utils";
import { BROWSE_GENRES } from "./genres";
import type { GridDensity } from "./PosterGrid";

export type BrowseTab = "movies" | "series" | "books" | "music";
export const BROWSE_TABS: BrowseTab[] = ["movies", "series", "books", "music"];

/** Sentinel for the genre select's "every genre" row (see genreValue below). */
const ALL_GENRES = "__all__";

/** Every pill-shaped control on the bar, so the row reads as one kit. */
const CONTROL =
  "focus-ring flex h-9 items-center justify-center rounded-full bg-white/5 text-muted-foreground ring-1 ring-white/10 transition-colors duration-150 ease-out ring-inset hover:bg-white/10 hover:text-foreground hover:ring-white/16";

/**
 * THE BROWSE BAR — one line, and only one.
 *
 * It used to be two full-width bands stacked on top of each other: a row of
 * filled tabs plus icon buttons, and beneath it a second row of genre chips.
 * Two bars of chrome before a single frame of artwork, with genre offered in
 * two places at once (ten chips here, fifteen in the filter sheet) — the same
 * question answered differently depending on where you asked it.
 *
 * Now: the four modes are quiet underlined words on the left, the way a
 * publication labels its sections; every *filter* — genre, sort, the rest —
 * is a compact control on the right, and genre reads from the same list the
 * filter sheet does. Grid density moved out entirely, next to the result count
 * it actually changes (see `DensityToggle`).
 *
 * Search still expands from an icon rather than sitting open, because on a
 * browse page the verb is "browse"; on the Search destination it is pinned
 * open, because there the verb is "search".
 */
export function BrowseBar({
  tab,
  onTabChange,
  search,
  onSearchChange,
  genre,
  onGenreChange,
  sort,
  onSortChange,
  sortOptions,
  onOpenFilters,
  activeFilterCount,
  searchAlwaysOpen = false,
}: {
  tab: BrowseTab;
  onTabChange: (tab: BrowseTab) => void;
  search: string;
  onSearchChange: (value: string) => void;
  /** Undefined means "every genre" — the select's own reset option. */
  genre: string | undefined;
  onGenreChange: (genre: string | undefined) => void;
  sort: string;
  onSortChange: (sort: string) => void;
  /** Supplied by the page — series have no rating, so their list is shorter. */
  sortOptions: { value: string; label: string }[];
  onOpenFilters: () => void;
  activeFilterCount: number;
  /** The Search destination keeps the field unfolded even when it's empty. */
  searchAlwaysOpen?: boolean;
}) {
  const { t } = useLanguage();
  const searchable = tab === "movies" || tab === "series";

  // UI-only state: whether the user unfolded the field. The field also counts
  // as open whenever a query is active (e.g. restored from the URL), so what
  // the list is filtered by is always visible.
  const [searchOpen, setSearchOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const open = searchAlwaysOpen || searchOpen || search.trim().length > 0;

  const openSearch = () => {
    setSearchOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  };
  const closeSearch = () => {
    onSearchChange("");
    setSearchOpen(false);
  };

  const tabs: { value: BrowseTab; label: string }[] = [
    { value: "movies", label: t.search.movies },
    { value: "series", label: t.search.series },
    { value: "books", label: t.search.books },
    { value: "music", label: t.search.music },
  ];

  const placeholder = tab === "movies" ? t.browse.searchMovies : t.browse.searchSeries;
  // base-ui treats an empty string as "no value" (it would render the
  // placeholder), so the reset row carries an explicit sentinel instead.
  const genreValue = genre ?? ALL_GENRES;

  return (
    <div className="sticky top-14 z-30 border-b lg:top-0 border-white/[0.06] bg-background/80 backdrop-blur-xl">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
        <div className="relative flex items-center gap-4">
          {/* Modes: underlined words, not buttons. The rule sits on the bar's
              own bottom border, so the active section looks attached to the
              page below it. */}
          <div className="scrollbar-none -mb-px flex min-w-0 shrink items-center gap-5 overflow-x-auto sm:gap-6">
            {tabs.map((option) => {
              const active = tab === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onTabChange(option.value)}
                  aria-pressed={active}
                  className={cn(
                    "focus-ring relative shrink-0 border-b-2 py-3.5 text-sm font-medium whitespace-nowrap transition-colors duration-150 ease-out",
                    active
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          {searchable && (
            <div className="ml-auto flex shrink-0 items-center gap-1.5 py-2">
              {!open && (
                <button
                  type="button"
                  onClick={openSearch}
                  aria-label={placeholder}
                  title={placeholder}
                  className={cn(CONTROL, "w-9")}
                >
                  <Search className="size-4" />
                </button>
              )}

              {/* Genre: the shortcut that used to be a second row of chips. */}
              <Select
                value={genreValue}
                onValueChange={(v) =>
                  onGenreChange(String(v) === ALL_GENRES ? undefined : String(v))
                }
              >
                <SelectTrigger
                  className={cn(
                    "hidden h-9 w-auto gap-1.5 rounded-full px-3.5 text-sm hover:bg-white/10 sm:flex",
                    genre && "bg-primary/15 text-foreground ring-primary/40",
                  )}
                  aria-label={t.filters.genre}
                >
                  <SelectValue>
                    {(value) => (String(value) === ALL_GENRES ? t.browse.allGenres : String(value))}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_GENRES}>{t.browse.allGenres}</SelectItem>
                  {BROWSE_GENRES.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sort} onValueChange={(v) => v && onSortChange(String(v))}>
                <SelectTrigger
                  className="h-9 w-auto gap-1.5 rounded-full px-3.5 text-sm hover:bg-white/10"
                  aria-label={t.browse.sort}
                >
                  <ArrowDownWideNarrow className="size-4 sm:hidden" />
                  {/* base-ui renders the raw value by default — map it back to
                      the translated label. Icon-only below sm to keep one row. */}
                  <span className="hidden sm:inline">
                    <SelectValue>
                      {(value) => sortOptions.find((o) => o.value === value)?.label ?? String(value)}
                    </SelectValue>
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <button
                type="button"
                onClick={onOpenFilters}
                // The label is hidden below sm, so the button needs a name of
                // its own or it reads as an unlabelled icon to a screen reader.
                aria-label={t.browse.filters}
                className={cn(
                  CONTROL,
                  "gap-1.5 px-3.5 text-sm font-medium",
                  activeFilterCount > 0 &&
                    "bg-primary/15 text-foreground ring-primary/40 hover:bg-primary/25 hover:ring-primary/60",
                )}
              >
                <SlidersHorizontal className="size-4" />
                <span className="hidden lg:inline">{t.browse.filters}</span>
                {activeFilterCount > 0 && (
                  <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground nums">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
          )}

          {/* Expanded search. On phones it overlays the whole strip (the tabs
              would otherwise leave it ~100px); from sm up it docks inline on
              the right at a sane width. */}
          {searchable && open && (
            <div className="absolute inset-0 z-10 flex items-center gap-1.5 bg-background sm:static sm:z-auto sm:order-last sm:ml-1.5 sm:w-64 sm:bg-transparent">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  value={search}
                  onChange={(e) => onSearchChange(e.target.value)}
                  onFocus={() => setSearchOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") closeSearch();
                  }}
                  onBlur={() => {
                    if (search.trim().length === 0) setSearchOpen(false);
                  }}
                  placeholder={placeholder}
                  className="h-9 rounded-full pr-3 pl-10"
                />
              </div>
              <button
                type="button"
                onClick={closeSearch}
                aria-label={t.browse.clearSearch}
                className={cn(CONTROL, "w-9 shrink-0")}
              >
                <X className="size-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Grid density, docked beside the result count rather than orbiting the
 * toolbar: it changes how many cards fit a row, so it belongs to the grid, not
 * to the page's chrome. Desktop only — a phone grid is one column either way.
 */
export function DensityToggle({
  density,
  onChange,
}: {
  density: GridDensity;
  onChange: (density: GridDensity) => void;
}) {
  const { t } = useLanguage();
  const label = density === "comfortable" ? t.browse.compactView : t.browse.comfortableView;

  return (
    <button
      type="button"
      onClick={() => onChange(density === "comfortable" ? "compact" : "comfortable")}
      aria-label={label}
      title={label}
      className={cn(CONTROL, "hidden size-9 lg:flex")}
    >
      {density === "comfortable" ? <Rows3 className="size-4" /> : <LayoutGrid className="size-4" />}
    </button>
  );
}
