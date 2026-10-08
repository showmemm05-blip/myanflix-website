"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  ChevronDownIcon,
  CountBadge,
  FilterChip,
  FilterIcon,
  GridComfortableIcon,
  GridCompactIcon,
  RemovableChip,
  RowSkeleton,
  RowStack,
} from "@/components/system";
import type { ActivePill } from "@/components/browse/ActiveFilterPills";
import type { GridDensity } from "@/components/browse/PosterGrid";
import { useLanguage } from "@/lib/context/language-context";
import { useSection } from "@/lib/i18n/sections/define";
import { mediaText } from "@/lib/i18n/sections/media";
import { cn } from "@/lib/utils";

/**
 * The pieces every Media "All …" section shares (Media.dc.html "All movies"):
 * the 40px sort chip, the comfortable/compact switch, the tonal "Sort &
 * filter" button with its count badge, the genre chip rail, the removable
 * filter pills with Clear all, and the infinite-scroll sentinel.
 */

/** The native sort <select> dressed as a 40px chip, with a hidden label. */
export function SortSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const { t } = useLanguage();
  const id = useId();
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        {t.filters.sortBy}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 cursor-pointer appearance-none rounded-full border-0 bg-raised pr-[38px] pl-4 text-sm font-bold text-fg transition-colors duration-150 outline-none [-webkit-appearance:none] hover:bg-raised-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDownIcon size={16} className="pointer-events-none absolute top-3 right-3.5 text-fg-muted" />
    </div>
  );
}

/** Comfortable / compact grid switch — desktop only, like the board. */
export function DensitySwitch({
  density,
  onChange,
}: {
  density: GridDensity;
  onChange: (density: GridDensity) => void;
}) {
  const m = useSection(mediaText);
  const option = (value: GridDensity, label: string, icon: ReactNode) => {
    const on = density === value;
    return (
      <button
        type="button"
        aria-label={label}
        aria-pressed={on}
        onClick={() => onChange(value)}
        className={cn(
          "flex h-8 w-9 cursor-pointer items-center justify-center rounded-full border-0 transition-colors duration-150 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link",
          on ? "bg-play text-ink" : "bg-transparent text-fg-muted hover:text-fg",
        )}
      >
        {icon}
      </button>
    );
  };
  return (
    <div role="group" aria-label={m.gridDensity} className="flex gap-0.5 rounded-full bg-raised p-[3px] max-desk:hidden">
      {option("comfortable", m.comfortableGrid, <GridComfortableIcon size={18} />)}
      {option("compact", m.compactGrid, <GridCompactIcon size={18} />)}
    </div>
  );
}

/** The tonal "Sort & filter" button with the crimson count disc. */
export function FilterButton({ count, onClick }: { count: number; onClick: () => void }) {
  const m = useSection(mediaText);
  return (
    <Button
      variant="tonal"
      size="toolbar"
      aria-haspopup="dialog"
      aria-label={count > 0 ? m.sortAndFilterApplied(count) : undefined}
      onClick={onClick}
      className="px-3.5 font-extrabold"
    >
      <FilterIcon size={18} />
      {m.sortAndFilter}
      {count > 0 && <CountBadge n={count} aria-hidden />}
    </Button>
  );
}

/** The genre chip rail: "All genres" + the facet genres (DB-derived, by count). */
export function GenreChipRow({
  genres,
  selected,
  onSelect,
  className,
}: {
  genres: string[];
  /** The single selected genre, or undefined for "All genres". */
  selected: string | undefined;
  onSelect: (genre: string | undefined) => void;
  className?: string;
}) {
  const { t } = useLanguage();
  const m = useSection(mediaText);
  if (genres.length === 0) return null;
  return (
    <div
      role="group"
      aria-label={t.filters.genre}
      className={cn("mq-rail -mx-gutter mt-[18px] flex gap-2 overflow-x-auto px-gutter", className)}
    >
      <FilterChip selected={selected === undefined} onClick={() => onSelect(undefined)}>
        {m.allGenres}
      </FilterChip>
      {genres.map((genre) => (
        <FilterChip key={genre} selected={selected === genre} onClick={() => onSelect(selected === genre ? undefined : genre)}>
          {genre}
        </FilterChip>
      ))}
    </div>
  );
}

/** Removable crimson pills, one per applied value, then the crimson "Clear all". */
export function AppliedFilters({
  pills,
  onClearAll,
  className,
}: {
  pills: ActivePill[];
  onClearAll: () => void;
  className?: string;
}) {
  const { t } = useLanguage();
  if (pills.length === 0) return null;
  return (
    <div className={cn("mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-2", className)}>
      {pills.map((pill) => (
        <RemovableChip key={pill.key} label={pill.label} onRemove={pill.onRemove} />
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="mq-link h-9 cursor-pointer rounded-[6px] border-0 bg-transparent px-1.5 text-sm font-extrabold outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link"
      >
        {t.browse.clearAll}
      </button>
    </div>
  );
}

/**
 * The sentinel that turns pagination into scroll: it asks for the next page
 * as it nears the viewport (600px early), never twice for the same page.
 * Never a "Load more" button.
 */
export function InfiniteSentinel({
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !hasNextPage || isFetchingNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onLoadMore();
      },
      { rootMargin: "600px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, onLoadMore]);
  return <div ref={ref} aria-hidden className="h-px" />;
}

/** The "All movies" heading row: h2 + live count on the left, tools on the right. */
export function AllSectionHeader({
  id,
  title,
  count,
  tools,
}: {
  id: string;
  title: string;
  count: ReactNode;
  tools: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
      <div className="flex min-w-0 items-baseline gap-3.5">
        <h2 id={id} className="text-[clamp(26px,2.4vw,32px)] leading-[1.2] font-black tracking-[-0.02em] text-fg [&:lang(my)]:tracking-normal">
          {title}
        </h2>
        <span role="status" className="text-sm leading-5 text-fg-faint tabular-nums">
          {count}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2.5 max-desk:w-full max-desk:justify-between">{tools}</div>
    </div>
  );
}

/**
 * The whole-hub loading look: a hero-sized block pulled up under the bar
 * (inline margin, NOT `under-bar`, so the bar stays frosted while loading)
 * and two skeleton rows.
 */
export function HubSkeleton({ label, rows = ["poster", "poster"] }: { label?: string; rows?: Array<"poster" | "landscape" | "book"> }) {
  return (
    <div aria-busy="true">
      <div
        className="mq-skeleton h-[clamp(600px,56vw,820px)] rounded-none bg-surface"
        style={{ marginTop: "calc(-1 * var(--shell-bar-h, 124px))" }}
      />
      <RowStack className="mt-2">
        {rows.map((kind, i) => (
          <RowSkeleton key={i} kind={kind} count={kind === "landscape" ? 5 : 8} />
        ))}
      </RowStack>
      {label && (
        <p role="status" className="sr-only">
          {label}
        </p>
      )}
    </div>
  );
}

/**
 * Best-effort scroll memory for a hub: the position is saved per address
 * while scrolling and restored once, when the page is opened again at that
 * same address and its content is ready (e.g. coming back from a detail
 * page). Session-scoped, wrapped in try/catch like all browser storage.
 */
export function useScrollMemory(storageKey: string, ready: boolean) {
  const restored = useRef(false);

  useEffect(() => {
    if (restored.current || !ready) return;
    restored.current = true;
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) return;
      const saved = JSON.parse(raw) as { url?: string; y?: number };
      const here = window.location.pathname + window.location.search;
      if (saved.url === here && typeof saved.y === "number" && saved.y > 0) {
        window.scrollTo({ top: saved.y });
      }
    } catch {
      // Storage blocked or malformed — nothing to restore.
    }
  }, [ready, storageKey]);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        try {
          sessionStorage.setItem(
            storageKey,
            JSON.stringify({ url: window.location.pathname + window.location.search, y: window.scrollY }),
          );
        } catch {
          // Storage blocked — scroll memory is a convenience only.
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [storageKey]);
}
