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
import Image from "next/image";
import { useRouter } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronRight, Film, Star } from "lucide-react";

import { SEARCH_MIN_LENGTH, SEARCH_STALE_TIME_MS } from "@/hooks/use-search-term";
import { useLanguage } from "@/lib/context/language-context";
import { cn } from "@/lib/utils";
import { movieService } from "@/services/api/movieService";
import type { Movie } from "@/types/movie";
import type { BrowseTab } from "./BrowseBar";

/** How many rows the panel shows — the footer says how many more the grid has. */
const SUGGEST_LIMIT = 8;
/**
 * The panel's own, shorter debounce. The grid waits 400ms (`SEARCH_DEBOUNCE_MS`)
 * because re-rendering sixty posters is expensive; eight text rows are not, so
 * suggestions may feel immediate without asking the server once per keystroke.
 */
const SUGGEST_DEBOUNCE_MS = 150;

/** Keys the browse bar's input forwards; `true` means the panel consumed the key. */
export interface SearchSuggestionsHandle {
  handleKeyDown: (e: KeyboardEvent<HTMLInputElement>) => boolean;
}

/**
 * THE SUGGESTION PANEL — matches under the search field, as you type.
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
  ref?: Ref<SearchSuggestionsHandle>;
}) {
  const { t } = useLanguage();
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
    queryKey: ["search-suggest", debounced],
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
    [visible, items, active, setActive, onClose, router],
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
    : { duration: 0.18, ease: [0.16, 1, 0.3, 1] as const };
  const rowTransition = reducedMotion ? { duration: 0 } : { duration: 0.15, ease: "easeOut" as const };

  const isInitialLoading = query.isPending;
  const isRefreshing = query.isFetching && !query.isPending;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="panel"
          initial={{ opacity: 0, y: -6, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.985 }}
          transition={panelTransition}
          style={{ transformOrigin: "top" }}
          className="glass-card absolute top-full right-0 left-0 z-40 mt-2 overflow-hidden rounded-2xl sm:left-auto sm:w-[22rem] sm:min-w-full"
        >
          <div
            className={cn(
              "scrollbar-thin max-h-[min(60vh,420px)] overflow-y-auto overscroll-contain p-1.5 transition-opacity duration-150",
              isRefreshing && "opacity-70",
            )}
          >
            {isInitialLoading ? (
              <SkeletonRows />
            ) : query.isError ? (
              <div className="flex flex-col items-start gap-2 px-3 py-4">
                <p className="text-sm text-muted-foreground">{t.search.suggestError}</p>
                <button
                  type="button"
                  onClick={() => query.refetch()}
                  className="focus-ring rounded-full bg-white/8 px-3 py-1 text-xs font-medium text-foreground ring-1 ring-white/12 transition-colors ring-inset hover:bg-white/14"
                >
                  {t.common.retry}
                </button>
              </div>
            ) : items.length === 0 ? (
              <p className="px-3 py-4 text-sm text-muted-foreground">
                {t.search.suggestNoResults(debounced)}
              </p>
            ) : (
              <ul
                ref={listRef}
                id={listboxId}
                role="listbox"
                aria-label={t.search.suggestionsLabel}
                className="flex flex-col"
              >
                <AnimatePresence initial={false} mode="popLayout">
                  {items.map((movie, index) => (
                    <motion.li
                      key={movie.id}
                      layout={!reducedMotion}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={rowTransition}
                      role="presentation"
                    >
                      <SuggestionRow
                        id={`${optionIdPrefix}${index}`}
                        movie={movie}
                        term={debounced}
                        active={index === active}
                        onHover={() => setActive(index)}
                        onSelect={onClose}
                      />
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </div>

          {!isInitialLoading && !query.isError && total > items.length && (
            <p className="border-t border-white/[0.06] px-3.5 py-2 text-[11px] text-muted-foreground">
              <span className="nums">{t.search.suggestShowingOf(items.length, total)}</span>
              <span className="mx-1.5 opacity-50">·</span>
              {t.search.suggestPressEnter}
            </p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SuggestionRow({
  id,
  movie,
  term,
  active,
  onHover,
  onSelect,
}: {
  id: string;
  movie: Movie;
  term: string;
  active: boolean;
  onHover: () => void;
  onSelect: () => void;
}) {
  const meta: string[] = [];
  if (movie.releaseYear > 0) meta.push(String(movie.releaseYear));
  if (movie.genre) meta.push(movie.genre);

  return (
    <Link
      id={id}
      href={`/movie/${movie.id}`}
      role="option"
      aria-selected={active}
      tabIndex={-1}
      onPointerMove={onHover}
      onClick={onSelect}
      className={cn(
        "group/row flex items-center gap-3 rounded-xl px-2 py-1.5 outline-none transition-colors duration-100 ease-out",
        active ? "bg-white/10" : "hover:bg-white/6 active:bg-white/10",
      )}
    >
      <div className="relative aspect-2/3 w-11 shrink-0 overflow-hidden rounded-md bg-secondary/60 ring-1 ring-white/8 ring-inset">
        {movie.posterUrl ? (
          <Image src={movie.posterUrl} alt="" fill sizes="44px" className="object-cover" />
        ) : (
          <Film className="absolute top-1/2 left-1/2 size-4 -translate-x-1/2 -translate-y-1/2 text-muted-foreground/60" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          <Highlight text={movie.title} term={term} />
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
          {meta.map((part, i) => (
            <span key={part} className="contents">
              {i > 0 && <span className="opacity-50">·</span>}
              <span className={i === 0 && movie.releaseYear > 0 ? "nums" : undefined}>{part}</span>
            </span>
          ))}
          {movie.rating > 0 && (
            <>
              {meta.length > 0 && <span className="opacity-50">·</span>}
              <span className="inline-flex items-center gap-0.5 nums">
                <Star className="size-3 fill-current text-premium" aria-hidden="true" />
                {movie.rating.toFixed(1)}
              </span>
            </>
          )}
        </p>
      </div>

      <ChevronRight
        aria-hidden="true"
        className={cn(
          "size-4 shrink-0 text-muted-foreground transition-[opacity,transform] duration-150 ease-out",
          active ? "translate-x-0 opacity-100" : "-translate-x-1 opacity-0 group-hover/row:translate-x-0 group-hover/row:opacity-100",
        )}
      />
    </Link>
  );
}

/** The matched substring, marked — plain text when the term isn't in the title at all. */
function Highlight({ text, term }: { text: string; term: string }) {
  const at = term ? text.toLowerCase().indexOf(term.toLowerCase()) : -1;
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <mark className="rounded-sm bg-primary/25 text-inherit">{text.slice(at, at + term.length)}</mark>
      {text.slice(at + term.length)}
    </>
  );
}

function SkeletonRows() {
  return (
    <div role="status" aria-busy="true" className="flex flex-col">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-2 py-1.5">
          <div className="aspect-2/3 w-11 shrink-0 animate-pulse rounded-md bg-white/8" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="h-3.5 w-3/5 animate-pulse rounded bg-white/8" />
            <div className="h-3 w-2/5 animate-pulse rounded bg-white/6" />
          </div>
        </div>
      ))}
    </div>
  );
}
