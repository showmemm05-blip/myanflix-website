"use client";

import { useCallback, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { ChevronLeftIcon, CloseIcon, GridComfortableIcon, GridCompactIcon, SearchIcon } from "@/components/system/icons";
import { SEARCH_MIN_LENGTH } from "@/hooks/use-search-term";
import { useLanguage } from "@/lib/context/language-context";
import { useSection } from "@/lib/i18n/sections/define";
import { searchText } from "@/lib/i18n/sections/search";
import { shellText } from "@/lib/i18n/sections/shell";
import { cn } from "@/lib/utils";
import type { GridDensity } from "./PosterGrid";
import { SearchSuggestions, suggestKey, type SearchSuggestionsHandle } from "./SearchSuggestions";

export type BrowseTab = "movies" | "series" | "books" | "music";
export const BROWSE_TABS: BrowseTab[] = ["movies", "series", "books", "music"];

/** The round, focus-ringed look every small control on this page shares. */
const FOCUS = "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link";

/**
 * THE SEARCH HEADER (Search / SearchResults boards).
 *
 * One block at the top of the browse surface: an optional heading, the search
 * field, a helper line, and the scope tabs (Movies · Series · Books ·
 * Music SOON) as white/raised chips.
 *
 * `size="hero"` is the Search page before a search runs — a 68px field
 * (56px on phones). `size="compact"` is the results view and the /media
 * catalog — a 56px field, with a Back button when `onBack` is given. It is
 * the SAME input element in both sizes, so typing never loses focus when the
 * page turns from "search" into "results" under the user's fingers.
 *
 * Movies get the suggestion panel under the field (arrow keys, Enter,
 * Escape — the input forwards its keys to it).
 */
export function BrowseBar({
  tab,
  onTabChange,
  tabs: allowedTabs = BROWSE_TABS,
  search,
  onSearchChange,
  size = "compact",
  intro,
  onBack,
  tabCounts,
  tabsLabel,
  controlsId,
  isSearching = false,
  isTooShort = false,
  onCommitSearch,
  onSeeAllResults,
  settledTerm,
}: {
  tab: BrowseTab;
  onTabChange: (tab: BrowseTab) => void;
  /** Which scopes this surface offers — the /media catalog carries movies|series only. */
  tabs?: BrowseTab[];
  search: string;
  onSearchChange: (value: string) => void;
  size?: "hero" | "compact";
  /** Rendered above the field (the Search page's title + subtitle). */
  intro?: ReactNode;
  /** Shows the round Back button before the field (results view). */
  onBack?: () => void;
  /** Result counts shown inside the tab chips (only the ones that are known). */
  tabCounts?: Partial<Record<BrowseTab, number>>;
  /** Accessible name of the tab row. */
  tabsLabel: string;
  /** The id of the region the tabs control. */
  controlsId?: string;
  /**
   * The term the results grid already shows (the settled search). Focusing
   * the field on exactly that term does not open the suggestion panel unless
   * its suggestions are already loaded: the grid is showing those results,
   * so asking the server again would only repeat them.
   */
  settledTerm?: string;
  /**
   * A search is on its way — INCLUDING the debounce window, which is most of
   * the wait and the part the user would otherwise experience as the page
   * quietly ignoring them.
   */
  isSearching?: boolean;
  /** The term is 1 character: nothing was sent, and the helper line says why. */
  isTooShort?: boolean;
  /** The user committed a term (Enter, a suggestion, See all) — file it as a recent search. */
  onCommitSearch?: (term: string) => void;
  /** The suggestion panel's "See all results" was pressed. */
  onSeeAllResults?: () => void;
}) {
  const { t } = useLanguage();
  const sx = useSection(searchText);
  const s = useSection(shellText);
  const hero = size === "hero";
  const hintId = useId();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  // Books included: the books grid honours the search term. Music has nothing
  // to search yet, but the field stays (the board keeps it; typing there is
  // harmless — the term carries over to the other tabs).
  const placeholder =
    tab === "series" ? t.browse.searchSeries : tab === "books" ? sx.searchBooks : t.browse.searchMovies;

  // The suggestion panel under the field (movies only). The bar says WHEN it
  // may show — on focus and on typing — and forwards the input's keys to it;
  // the panel itself owns the results and the highlighted row.
  const queryClient = useQueryClient();
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [activeOptionId, setActiveOptionId] = useState<string | null>(null);
  const closeSuggest = useCallback(() => setSuggestOpen(false), []);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const suggestRef = useRef<SearchSuggestionsHandle>(null);
  const listboxId = useId();
  const suggestable = tab === "movies";
  const suggestExpanded = suggestable && suggestOpen && search.trim().length >= SEARCH_MIN_LENGTH;

  const commit = () => onCommitSearch?.(search);

  const tabLabels: Record<BrowseTab, string> = {
    movies: t.search.movies,
    series: t.search.series,
    books: t.search.books,
    music: t.search.music,
  };

  const helpText = isTooShort
    ? t.browse.searchMinLength(SEARCH_MIN_LENGTH)
    : tab === "movies"
      ? sx.helpMovies
      : sx.helpOther;
  // The helper line always shows on the Search page; in the results view and
  // the catalog it only appears to say why a 1-letter term did nothing.
  const showHelp = hero || isTooShort;

  return (
    <section
      aria-label={hero ? undefined : s.search}
      className={cn(
        "relative z-10 px-gutter",
        hero ? "pt-[clamp(28px,3.4vw,52px)]" : "pt-[clamp(20px,2.4vw,32px)]",
      )}
    >
      {intro}

      <div
        role="search"
        className={cn("flex items-center gap-2", hero ? "mt-6 max-w-[960px]" : "max-w-[840px]")}
      >
        {onBack && (
          <button
            type="button"
            onClick={() => {
              onBack();
              // The button disappears with the results view — keep the caret in the field.
              inputRef.current?.focus();
            }}
            aria-label={sx.backToSearch}
            className={cn(
              "flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-tonal-faint text-fg transition-colors duration-150 hover:bg-tonal-soft",
              FOCUS,
            )}
          >
            <ChevronLeftIcon size={22} />
          </button>
        )}

        <div ref={searchWrapRef} className="relative min-w-0 flex-1">
          <label htmlFor={inputId} className="sr-only">
            {placeholder}
          </label>
          {/* The field's own glyph doubles as its progress indicator: the
              search icon pulses while a search is on its way. */}
          <SearchIcon
            size={hero ? 24 : 22}
            aria-hidden
            className={cn(
              "pointer-events-none absolute top-1/2 -translate-y-1/2 transition-colors duration-150",
              hero ? "left-5 max-desk:left-4" : "left-[18px]",
              isSearching ? "animate-pulse text-link" : "text-fg-faint",
            )}
          />
          <input
            ref={inputRef}
            id={inputId}
            type="search"
            autoComplete="off"
            enterKeyHint="search"
            value={search}
            onChange={(e) => {
              onSearchChange(e.target.value);
              setSuggestOpen(true);
            }}
            onFocus={() => {
              const current = search.trim();
              const alreadyShown =
                Boolean(settledTerm) &&
                current === settledTerm &&
                queryClient.getQueryData(suggestKey(current)) === undefined;
              if (!alreadyShown) setSuggestOpen(true);
            }}
            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
              if (e.key === "Enter") commit();
              // Arrows/Enter/Escape go to the panel first; Escape only
              // clears the field once the panel is already gone.
              if (suggestRef.current?.handleKeyDown(e)) return;
              if (e.key === "Escape" && search.length > 0) {
                e.preventDefault();
                onSearchChange("");
              }
            }}
            onBlur={(e) => {
              // Leaving the field for anything but the panel itself counts as
              // having searched for what's in it.
              if (!searchWrapRef.current?.contains(e.relatedTarget as Node | null)) commit();
            }}
            placeholder={placeholder}
            aria-busy={isSearching}
            aria-describedby={showHelp ? hintId : undefined}
            role={suggestable ? "combobox" : undefined}
            aria-autocomplete={suggestable ? "list" : undefined}
            aria-expanded={suggestable ? suggestExpanded : undefined}
            aria-controls={suggestable ? listboxId : undefined}
            aria-activedescendant={suggestable ? (activeOptionId ?? undefined) : undefined}
            className={cn(
              "block w-full min-w-0 rounded-[12px] border-0 bg-raised font-semibold text-fg outline-none transition-shadow duration-150",
              "placeholder:font-medium placeholder:text-fg-faint focus:shadow-[inset_0_0_0_1.5px_var(--mq-crimson)]",
              "[&::-webkit-search-cancel-button]:hidden",
              hero
                ? "h-[68px] pr-16 pl-[60px] text-[20px] max-desk:h-14 max-desk:rounded-[14px] max-desk:pl-[52px] max-desk:text-[17px]"
                : "h-14 pr-[60px] pl-[54px] text-[18px] max-desk:text-[17px]",
              suggestExpanded && "shadow-[inset_0_0_0_1.5px_var(--mq-crimson)]",
            )}
          />
          {search.length > 0 && (
            <button
              type="button"
              onClick={() => {
                onSearchChange("");
                inputRef.current?.focus();
              }}
              aria-label={t.browse.clearSearch}
              className={cn(
                "absolute top-1/2 right-2 flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent",
                FOCUS,
              )}
            >
              <span className="flex size-[26px] items-center justify-center rounded-full bg-tonal text-fg">
                <CloseIcon size={14} strokeWidth={2.2} />
              </span>
            </button>
          )}
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
              onPick={commit}
              onSeeAll={() => {
                commit();
                onSeeAllResults?.();
              }}
            />
          )}
        </div>
      </div>

      {showHelp && (
        <p
          id={hintId}
          role={isTooShort ? "status" : undefined}
          className={cn("mt-2.5 text-[13px] leading-[18px]", isTooShort ? "text-gold" : "text-fg-faint")}
        >
          {helpText}
        </p>
      )}

      {allowedTabs.length > 1 && (
        <ScopeTabs
          tabs={allowedTabs}
          tab={tab}
          labels={tabLabels}
          counts={tabCounts}
          onChange={onTabChange}
          label={tabsLabel}
          controlsId={controlsId}
          className={hero ? "mt-3.5" : "mt-4"}
        />
      )}
    </section>
  );
}

/**
 * The scope chips as a real tab row: one tab stop, arrows/Home/End move and
 * select, each tab names its count ("Movies, 31 results") or "coming soon".
 */
function ScopeTabs({
  tabs,
  tab,
  labels,
  counts,
  onChange,
  label,
  controlsId,
  className,
}: {
  tabs: BrowseTab[];
  tab: BrowseTab;
  labels: Record<BrowseTab, string>;
  counts?: Partial<Record<BrowseTab, number>>;
  onChange: (tab: BrowseTab) => void;
  label: string;
  controlsId?: string;
  className?: string;
}) {
  const sx = useSection(searchText);
  const s = useSection(shellText);
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = tabs.length - 1;
    let next = -1;
    if (event.key === "ArrowRight") next = index === last ? 0 : index + 1;
    else if (event.key === "ArrowLeft") next = index === 0 ? last : index - 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = last;
    if (next < 0) return;
    event.preventDefault();
    onChange(tabs[next]);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn("mq-rail -mx-gutter flex items-center gap-2 overflow-x-auto px-gutter", className)}
    >
      {tabs.map((value, index) => {
        const on = value === tab;
        const soon = value === "music";
        const count = counts?.[value];
        const hasCount = count !== undefined && !soon;
        return (
          <button
            key={value}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="tab"
            aria-selected={on}
            aria-controls={controlsId}
            tabIndex={on ? 0 : -1}
            aria-label={
              hasCount ? sx.tabWithCount(labels[value], count) : soon ? sx.tabComingSoon(labels[value]) : undefined
            }
            onClick={() => onChange(value)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={cn(
              "mq-snap inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-full border-0 pl-4 text-sm whitespace-nowrap transition-colors duration-150",
              hasCount || soon ? "pr-2" : "pr-4",
              on ? "bg-play font-extrabold text-ink" : "bg-raised font-semibold text-fg hover:bg-raised-hover",
              FOCUS,
            )}
          >
            {labels[value]}
            {hasCount && (
              <span
                aria-hidden
                className={cn(
                  "h-6 min-w-6 rounded-full px-2 text-center text-xs leading-6 font-extrabold nums",
                  on ? "bg-ink/10" : "bg-white/10",
                )}
              >
                {count}
              </span>
            )}
            {soon && (
              <span
                aria-hidden
                className={cn(
                  "h-[18px] rounded-[9px] px-1.5 text-[10px] leading-[18px] font-extrabold tracking-[0.06em]",
                  on ? "bg-ink/12" : "bg-white/12",
                )}
              >
                {s.soon}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Grid density: a two-button segmented pill (comfortable / compact) beside
 * the sort control. Desktop only — phones always get three posters a row.
 */
export function DensityToggle({
  density,
  onChange,
}: {
  density: GridDensity;
  onChange: (density: GridDensity) => void;
}) {
  const sx = useSection(searchText);
  const options: { value: GridDensity; label: string; icon: ReactNode }[] = [
    { value: "comfortable", label: sx.comfortableGrid, icon: <GridComfortableIcon size={18} /> },
    { value: "compact", label: sx.compactGrid, icon: <GridCompactIcon size={18} /> },
  ];
  return (
    <div role="group" aria-label={sx.gridDensity} className="flex gap-0.5 rounded-full bg-raised p-[3px] max-desk:hidden">
      {options.map((option) => {
        const on = density === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-label={option.label}
            title={option.label}
            aria-pressed={on}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex h-8 w-9 cursor-pointer items-center justify-center rounded-full border-0 transition-colors duration-150",
              on ? "bg-play text-ink" : "bg-transparent text-fg-muted hover:text-fg",
              FOCUS,
            )}
          >
            {option.icon}
          </button>
        );
      })}
    </div>
  );
}
