"use client";

import {
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type Ref,
  type RefObject,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { AnimatePresence, LazyMotion, domAnimation, m, useReducedMotion } from "framer-motion";

import { Artwork } from "@/components/system/Artwork";
import { CrownIcon, SearchIcon, StarIcon, ChevronRightIcon } from "@/components/system/icons";
import { SEARCH_MIN_LENGTH, SEARCH_STALE_TIME_MS } from "@/hooks/use-search-term";
import { useLanguage } from "@/lib/context/language-context";
import { useSection } from "@/lib/i18n/sections/define";
import { searchText } from "@/lib/i18n/sections/search";
import { cn } from "@/lib/utils";
import { movieService } from "@/services/api/movieService";
import type { Movie } from "@/types/movie";
import type { BrowseTab } from "./BrowseBar";

/** How many rows the panel shows — the footer says how many more the grid has. */
const SUGGEST_LIMIT = 8;
/**
 * The panel's own, shorter debounce. The grid waits 400ms (`SEARCH_DEBOUNCE_MS`)
 * because re-rendering sixty posters is expensive; eight text rows are not, so
 * suggestions may feel quick without asking the server once per keystroke.
 * 250ms (was 150) still lands well before the grid's 400ms, but skips the
 * in-between requests of ordinary typing.
 */
const SUGGEST_DEBOUNCE_MS = 250;

/** The suggestion query's cache key — BrowseBar checks it before reopening the panel. */
export const suggestKey = (term: string) => ["search-suggest", term] as const;

/** Keys the browse bar's input forwards; `true` means the panel consumed the key. */
export interface SearchSuggestionsHandle {
  handleKeyDown: (e: KeyboardEvent<HTMLInputElement>) => boolean;
}

/**
 * THE SUGGESTION PANEL — matches under the search field, as you type
 * (Search board, "typing" state: a popover slab under the field, two columns
 * of rows on desktop, one on phones, the matched letters set bold).
 *
 * It hangs off the browse bar's input and answers a narrower question than
 * the grid beneath it: "which of these is the one I mean?" So it fetches its
 * own small, relevance-sorted page on a short debounce and leaves the grid's
 * settled term, its 400ms debounce and its infinite query exactly alone.
 *
 * Movies only: the request was the Movies page, and each result links to
 * `/movie/[id]`. The series and books tabs keep the plain field.
 *
 * The bar owns the input (and so the keyboard); this component owns the
 * results and the highlighted row. They meet in two places: an imperative
 * handle the input forwards its arrow/Enter/Escape keys to, and an
 * `onActiveChange` callback so the input can name the highlighted row with
 * `aria-activedescendant`.
 */
export function SearchSuggestions({
  term,
  tab,
  open,
  onClose,
  anchorRef,
  listboxId,
  onActiveChange,
  onPick,
  onSeeAll,
  ref,
}: {
  /** The raw field value — this component trims and debounces it itself. */
  term: string;
  tab: BrowseTab;
  /** Whether the bar wants the panel shown (focus/typing). The term length still gates it. */
  open: boolean;
  onClose: () => void;
  /** The element that counts as "inside": a pointerdown anywhere else closes the panel. */
  anchorRef: RefObject<HTMLElement | null>;
  /** The id the input's `aria-controls` points at. */
  listboxId: string;
  /** The highlighted row's element id (null when none) — for the input's `aria-activedescendant`. */
  onActiveChange?: (id: string | null) => void;
  /** A suggestion was opened (click or Enter) — the page files the term as a recent search. */
  onPick?: () => void;
  /** "See all results for …": the grid under the panel already holds them; the page decides what else happens. */
  onSeeAll?: () => void;
  ref?: Ref<SearchSuggestionsHandle>;
}) {
  const { t } = useLanguage();
  const sx = useSection(searchText);
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const optionIdPrefix = useId();

  const trimmed = term.trim();
  const longEnough = trimmed.length >= SEARCH_MIN_LENGTH;
  const visible = open && tab === "movies" && longEnough;

  // The debounced term. Shortening below the minimum resets it in the same
  // render (nothing can be sent for it). Note keepPreviousData still keeps
  // the last rows on screen while a new term is debouncing — that is the
  // intended morph; the reset only stops a stale query from being sent.
  const [debounced, setDebounced] = useState(longEnough ? trimmed : "");
  if (!longEnough && debounced !== "") setDebounced("");
  useEffect(() => {
    if (!longEnough || trimmed === debounced) return;
    const timer = setTimeout(() => setDebounced(trimmed), SUGGEST_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [trimmed, longEnough, debounced]);

  const query = useQuery({
    queryKey: suggestKey(debounced),
    queryFn: ({ signal }) =>
      movieService.getMovies(
        { search: debounced, limit: SUGGEST_LIMIT, sort: "relevance" },
        { signal },
      ),
    enabled: visible && debounced.length >= SEARCH_MIN_LENGTH,
    // Holds the previous term's rows while the next term loads, so the list
    // morphs instead of flashing to skeletons on every keystroke.
    placeholderData: keepPreviousData,
    staleTime: SEARCH_STALE_TIME_MS,
  });

  const items: Movie[] = useMemo(() => query.data?.items ?? [], [query.data]);
  const total = query.data?.total ?? 0;

  // ─ Highlighted row ─
  // Remembered together with the term it was chosen for: a new result set
  // resets the highlight (the row it pointed at is gone) with no effect needed.
  const [highlight, setHighlight] = useState<{ term: string; index: number }>({ term: "", index: -1 });
  const active = highlight.term === debounced ? highlight.index : -1;
  const setActive = useCallback(
    (update: number | ((current: number) => number)) =>
      setHighlight((h) => {
        const index = typeof update === "function" ? update(h.term === debounced ? h.index : -1) : update;
        // Same row, same term → return the SAME object so React bails out of
        // the update; otherwise every pointer-move over a row re-rendered the
        // whole panel even though nothing changed.
        if (h.term === debounced && h.index === index) return h;
        return { term: debounced, index };
      }),
    [debounced],
  );
  const listRef = useRef<HTMLUListElement>(null);

  const activeId = visible && active >= 0 && active < items.length ? `${optionIdPrefix}${active}` : null;
  useEffect(() => {
    onActiveChange?.(activeId);
    // Cleanup: if the panel unmounts (tab switched away from Movies) while a
    // row is highlighted, the input must not keep pointing at a dead id.
    return () => onActiveChange?.(null);
  }, [activeId, onActiveChange]);

  // Keep the highlighted row in view when the arrows walk past the fold.
  useEffect(() => {
    if (active < 0) return;
    const row = listRef.current?.children[active];
    if (row instanceof HTMLElement) row.scrollIntoView({ block: "nearest" });
  }, [active]);

  useImperativeHandle(
    ref,
    () => ({
      handleKeyDown: (e) => {
        if (!visible) return false;
        switch (e.key) {
          case "ArrowDown":
            if (items.length === 0) return false;
            e.preventDefault();
            setActive((i) => (i + 1) % items.length);
            return true;
          case "ArrowUp":
            if (items.length === 0) return false;
            e.preventDefault();
            setActive((i) => (i <= 0 ? items.length - 1 : i - 1));
            return true;
          case "Enter": {
            const movie = items[active];
            // Nothing highlighted: the grid already shows the full results,
            // so Enter just gets the panel out of the way.
            onClose();
            if (!movie) return false;
            e.preventDefault();
            onPick?.();
            router.push(`/movie/${movie.id}`);
            return true;
          }
          case "Escape":
            e.preventDefault();
            onClose();
            return true;
          default:
            return false;
        }
      },
    }),
    [visible, items, active, setActive, onClose, onPick, router],
  );

  // Outside click. Capture phase, so a click that also re-renders its target
  // (a Select trigger, a tab) is still measured against the DOM it landed in.
  useEffect(() => {
    if (!visible) return;
    const onPointerDown = (e: PointerEvent) => {
      const inside = anchorRef.current;
      if (inside && !inside.contains(e.target as Node)) onClose();
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [visible, anchorRef, onClose]);

  const panelTransition = reducedMotion
    ? { duration: 0 }
    : { duration: 0.2, ease: [0.22, 1, 0.36, 1] as const };

  const isInitialLoading = query.isPending;
  const isRefreshing = query.isFetching && !query.isPending;

  // LazyMotion + `m` loads only the DOM animation features this panel uses,
  // not the whole motion library.
  return (
    <LazyMotion features={domAnimation}>
      <AnimatePresence>
        {visible && (
          <m.div
            key="panel"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={panelTransition}
            className="absolute top-[calc(100%+8px)] right-0 left-0 z-40 rounded-[16px] bg-popover p-2 shadow-e2"
          >
            <div className="flex items-center justify-between gap-3 px-2.5 pt-1.5 pb-2">
              <span id={`${listboxId}-label`} className="text-kicker">
                {t.search.suggestionsLabel}
              </span>
              <span className="text-xs leading-4 text-fg-faint max-desk:hidden">{sx.suggestKeysHint}</span>
            </div>

            <div
              className={cn(
                "max-h-[min(60vh,440px)] overflow-y-auto overscroll-contain transition-opacity duration-150",
                isRefreshing && "opacity-70",
              )}
            >
              {isInitialLoading ? (
                <SkeletonRows label={sx.loadingSuggestions} />
              ) : query.isError ? (
                <div className="flex flex-wrap items-center gap-3 px-2.5 pt-3.5 pb-3">
                  <p className="text-[15px] leading-[22px] text-fg-muted">{t.search.suggestError}</p>
                  <button
                    type="button"
                    onClick={() => query.refetch()}
                    className="mq-link rounded-[6px] text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link"
                  >
                    {t.common.retry}
                  </button>
                </div>
              ) : items.length === 0 ? (
                <div role="status" className="flex items-center gap-3 px-2.5 pt-3.5 pb-3">
                  <SearchIcon size={20} className="shrink-0 text-fg-faint" />
                  <p className="text-[15px] leading-[22px] text-fg-muted">{t.search.suggestNoResults(debounced)}</p>
                </div>
              ) : (
                <ul
                  ref={listRef}
                  id={listboxId}
                  role="listbox"
                  aria-labelledby={`${listboxId}-label`}
                  className="grid grid-cols-2 gap-x-2 gap-y-0.5 max-desk:grid-cols-1"
                >
                  {items.map((movie, index) => (
                    <li key={movie.id} role="presentation" className="min-w-0">
                      <SuggestionRow
                        id={`${optionIdPrefix}${index}`}
                        movie={movie}
                        term={debounced}
                        active={index === active}
                        a11yLabel={sx.titleA11y({
                          title: movie.title,
                          year: movie.releaseYear > 0 ? movie.releaseYear : undefined,
                          genre: movie.genre,
                          rating: movie.rating > 0 ? movie.rating.toFixed(1) : undefined,
                          premium: movie.accessType === "SUBSCRIPTION",
                        })}
                        onHover={() => setActive(index)}
                        onSelect={() => {
                          onPick?.();
                          onClose();
                        }}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {!isInitialLoading && !query.isError && items.length > 0 && (
              <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-2.5 pt-2.5 pb-1 shadow-[inset_0_1px_0_var(--mq-hairline)]">
                <span role="status" className="text-[13px] leading-[18px] text-fg-faint nums">
                  {t.search.suggestShowingOf(items.length, total)}
                  {total > items.length && (
                    <>
                      <span aria-hidden> · </span>
                      {t.search.suggestPressEnter}
                    </>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onSeeAll?.();
                  }}
                  className="mq-link inline-flex items-center gap-1.5 rounded-[6px] text-sm leading-5 font-extrabold outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link"
                >
                  {sx.seeAllResultsFor(debounced)}
                  <ChevronRightIcon size={16} />
                </button>
              </div>
            )}
          </m.div>
        )}
      </AnimatePresence>
    </LazyMotion>
  );
}

function SuggestionRow({
  id,
  movie,
  term,
  active,
  a11yLabel,
  onHover,
  onSelect,
}: {
  id: string;
  movie: Movie;
  term: string;
  active: boolean;
  a11yLabel: string;
  onHover: () => void;
  onSelect: () => void;
}) {
  const meta: string[] = [];
  if (movie.releaseYear > 0) meta.push(String(movie.releaseYear));
  if (movie.genre) meta.push(movie.genre);
  const premium = movie.accessType === "SUBSCRIPTION";

  return (
    <Link
      id={id}
      href={`/movie/${movie.id}`}
      role="option"
      aria-selected={active}
      aria-label={a11yLabel}
      tabIndex={-1}
      onPointerMove={onHover}
      onClick={onSelect}
      className={cn(
        "flex min-h-[72px] items-center gap-3 rounded-[10px] py-1.5 pr-2.5 pl-1.5 text-fg outline-none transition-colors duration-150",
        active ? "bg-tonal-ghost" : "hover:bg-tonal-ghost",
      )}
    >
      <span aria-hidden className="relative h-[60px] w-10 shrink-0 overflow-hidden rounded-[6px] bg-raised">
        <Artwork src={movie.posterUrl} seed={movie.title} variant="poster" sizes="40px" zoomOnHover={false} />
      </span>

      <span aria-hidden className="min-w-0 flex-1">
        <span className="block truncate text-[15px] leading-5 font-medium text-fg-muted">
          <Highlight text={movie.title} term={term} />
        </span>
        <span className="flex items-center gap-[5px] truncate text-[13px] leading-[18px] text-fg-faint nums">
          {movie.rating > 0 && (
            <>
              <StarIcon size={12} className="shrink-0 text-gold" />
              <span className="font-bold text-fg">{movie.rating.toFixed(1)}</span>
              {meta.length > 0 && <span> · </span>}
            </>
          )}
          {meta.join(" · ")}
        </span>
      </span>

      {premium && (
        <span aria-hidden className="flex size-6 shrink-0 items-center justify-center rounded-[6px] bg-gold/16 text-gold">
          <CrownIcon size={14} />
        </span>
      )}
    </Link>
  );
}

/** The matched letters in bold white; the rest of the title stays muted. */
function Highlight({ text, term }: { text: string; term: string }) {
  const at = term ? text.toLowerCase().indexOf(term.toLowerCase()) : -1;
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <strong className="font-extrabold text-fg">{text.slice(at, at + term.length)}</strong>
      {text.slice(at + term.length)}
    </>
  );
}

function SkeletonRows({ label }: { label: string }) {
  return (
    <div aria-busy="true" className="grid grid-cols-2 gap-x-2 max-desk:grid-cols-1">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex min-h-[72px] items-center gap-3 py-1.5 pr-2.5 pl-1.5">
          <span className="mq-skeleton h-[60px] w-10 shrink-0 rounded-[6px]" />
          <span className="flex min-w-0 flex-1 flex-col gap-2">
            <span className="mq-skeleton block h-3.5 w-3/5 rounded-[5px]" />
            <span className="mq-skeleton block h-3 w-2/5 rounded-[5px]" />
          </span>
        </div>
      ))}
      <p role="status" className="sr-only">
        {label}
      </p>
    </div>
  );
}
