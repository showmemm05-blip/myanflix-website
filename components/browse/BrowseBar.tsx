"use client";

import { useCallback, useId, useRef, useState } from "react";
import {
  ArrowDownWideNarrow,
  LayoutGrid,
  LoaderCircle,
  Rows3,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SEARCH_MIN_LENGTH } from "@/hooks/use-search-term";
import { useLanguage } from "@/lib/context/language-context";
import { cn } from "@/lib/utils";
import type { GridDensity } from "./PosterGrid";
import { SearchSuggestions, type SearchSuggestionsHandle } from "./SearchSuggestions";

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
  tabs: allowedTabs = BROWSE_TABS,
  search,
  onSearchChange,
  genre,
  genreOptions,
  onGenreChange,
  sort,
  onSortChange,
  sortOptions,
  onOpenFilters,
  activeFilterCount,
  searchAlwaysOpen = false,
  isSearching = false,
  isTooShort = false,
}: {
  tab: BrowseTab;
  onTabChange: (tab: BrowseTab) => void;
  /** Which modes this surface offers — the /media catalog carries movies|series only. */
  tabs?: BrowseTab[];
  search: string;
  onSearchChange: (value: string) => void;
  /** Undefined means "every genre" — the select's own reset option. */
  genre: string | undefined;
  /** DB-derived (facets), never a hard-coded list — the same values the filter sheet offers. */
  genreOptions: string[];
  onGenreChange: (genre: string | undefined) => void;
  sort: string;
  onSortChange: (sort: string) => void;
  /** Supplied by the surface from t.filters.sort* — series get the shorter honest subset. */
  sortOptions: { value: string; label: string }[];
  onOpenFilters: () => void;
  activeFilterCount: number;
  /** The Search destination keeps the field unfolded even when it's empty. */
  searchAlwaysOpen?: boolean;
  /**
   * A search is on its way — INCLUDING the debounce window, which is most of
   * the wait and the part the user would otherwise experience as the page
   * quietly ignoring them.
   */
  isSearching?: boolean;
  /** The term is 1 character: nothing was sent, and the field says why. */
  isTooShort?: boolean;
}) {
  const { t } = useLanguage();
  // Books included: the books grid honours the search term, and a search
  // page where the Books tab cannot START a search was a reviewer-flagged
  // dead end (the term was only clearable, never typeable, from there).
  const searchable = tab === "movies" || tab === "series" || tab === "books";
  const hintId = useId();

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

  // The suggestion panel under the field (movies only). The bar says WHEN it
  // may show — on focus and on typing — and forwards the input's keys to it;
  // the panel itself owns the results and the highlighted row.
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [activeOptionId, setActiveOptionId] = useState<string | null>(null);
  const closeSuggest = useCallback(() => setSuggestOpen(false), []);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const suggestRef = useRef<SearchSuggestionsHandle>(null);
  const listboxId = useId();
  const suggestable = tab === "movies";

  const tabLabels: Record<BrowseTab, string> = {
    movies: t.search.movies,
    series: t.search.series,
    books: t.search.books,
    music: t.search.music,
  };
  const tabs: { value: BrowseTab; label: string }[] = allowedTabs.map((value) => ({
    value,
    label: tabLabels[value],
  }));

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
                    genre &&
                      "border-primary/40 bg-primary/15 text-foreground hover:border-primary/60 hover:bg-primary/25",
                  )}
                  aria-label={t.filters.genre}
                >
                  <SelectValue>
                    {(value) => (String(value) === ALL_GENRES ? t.browse.allGenres : String(value))}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value={ALL_GENRES}>{t.browse.allGenres}</SelectItem>
                  <SelectSeparator />
                  {genreOptions.map((option) => (
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
                <SelectContent align="end">
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
              <div ref={searchWrapRef} className="relative min-w-0 flex-1">
                {/* The field's own glyph doubles as its progress indicator —
                    the search icon spins in place. Nothing moves, nothing is
                    added to the row, and the signal is where the user is
                    already looking. */}
                {isSearching ? (
                  <LoaderCircle
                    aria-hidden="true"
                    className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 animate-spin text-primary"
                  />
                ) : (
                  <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
                )}
                <Input
                  ref={inputRef}
                  value={search}
                  onChange={(e) => {
                    onSearchChange(e.target.value);
                    setSuggestOpen(true);
                  }}
                  onFocus={() => {
                    setSearchOpen(true);
                    setSuggestOpen(true);
                  }}
                  onKeyDown={(e) => {
                    // Arrows/Enter/Escape go to the panel first; Escape only
                    // clears the field once the panel is already gone.
                    if (suggestRef.current?.handleKeyDown(e)) return;
                    if (e.key === "Escape") closeSearch();
                  }}
                  onBlur={() => {
                    if (search.trim().length === 0) setSearchOpen(false);
                  }}
                  placeholder={placeholder}
                  aria-busy={isSearching}
                  aria-describedby={isTooShort ? hintId : undefined}
                  role={suggestable ? "combobox" : undefined}
                  aria-autocomplete={suggestable ? "list" : undefined}
                  aria-expanded={suggestable ? suggestOpen && search.trim().length >= SEARCH_MIN_LENGTH : undefined}
                  aria-controls={suggestable ? listboxId : undefined}
                  aria-activedescendant={activeOptionId ?? undefined}
                  className="h-9 rounded-full pr-3 pl-10"
                />
                {suggestable && (
                  <SearchSuggestions
                    ref={suggestRef}
                    term={search}
                    tab={tab}
                    open={suggestOpen}
                    onClose={closeSuggest}
                    anchorRef={searchWrapRef}
                    listboxId={listboxId}
                    onActiveChange={setActiveOptionId}
                  />
                )}
                {/* Why nothing happened, said quietly and next to the cause.
                    It hangs below the bar rather than widening it, so a stray
                    keystroke never reflows the whole strip. */}
                {isTooShort && (
                  <p
                    id={hintId}
                    role="status"
                    className="pointer-events-none absolute top-full left-2 z-10 mt-1.5 rounded-full bg-background/95 px-2.5 py-1 text-[11px] whitespace-nowrap text-muted-foreground ring-1 ring-white/10 ring-inset backdrop-blur-md"
                  >
                    {t.browse.searchMinLength(SEARCH_MIN_LENGTH)}
                  </p>
                )}
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
