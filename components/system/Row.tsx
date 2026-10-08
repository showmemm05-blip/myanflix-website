"use client";

import { forwardRef, useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import Link from "next/link";

import { BookCardSkeleton } from "@/components/cards/BookCard";
import { LandscapeCardSkeleton } from "@/components/cards/LandscapeCard";
import { PosterCardSkeleton } from "@/components/cards/PosterCard";
import { useSection } from "@/lib/i18n/sections/define";
import { shellText } from "@/lib/i18n/sections/shell";
import { cn } from "@/lib/utils";
import { ChevronLeftIcon, ChevronRightIcon } from "./icons";

/**
 * ROWS (SHELL.md §11, DesignSystem "Row: header + full-bleed rail").
 *
 * <RowStack> stacks rows with clamp(36px, 3.4vw, 52px) between them.
 *
 * <Row title="Trending now" subtitle="Most bought on MyanFlix" seeAllHref="/media/movies">
 *   {items.map((m) => <PosterCard key={m.id} layout="rail" … />)}
 * </Row>
 *
 * The header sits on the page gutter: title 22/28 · 800, optional subtitle
 * 14/20 faint, a crimson "See all" link, and two 36px round arrows that fade
 * in on hover/focus (desktop only — never the only way to reach anything).
 * The rail starts on the gutter, bleeds past the right edge, snaps, hides
 * its scrollbar and leaves 40px of air after the last card.
 *
 * Rows are full-bleed: put them directly in the page, NOT inside a padded
 * container (the gutter is built in).
 */
export function RowStack({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("flex flex-col gap-[clamp(36px,3.4vw,52px)]", className)}>{children}</div>;
}

export function Row({
  title,
  subtitle,
  seeAllHref,
  seeAllLabel,
  action,
  arrows = true,
  headingLevel = "h2",
  id,
  className,
  railClassName,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Shows the crimson "See all" link. */
  seeAllHref?: string;
  /** Replaces "See all" (e.g. "Watch history"). */
  seeAllLabel?: string;
  /** Anything else for the header's right side (rendered before See all). */
  action?: ReactNode;
  arrows?: boolean;
  headingLevel?: "h2" | "h3";
  id?: string;
  className?: string;
  railClassName?: string;
  children: ReactNode;
}) {
  const s = useSection(shellText);
  const autoId = useId();
  const headingId = id ?? `row-${autoId}`;
  const railRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const measure = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    const start = el.scrollLeft <= 4;
    const end = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    setEdges((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
  }, []);

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    const first = requestAnimationFrame(measure);
    el.addEventListener("scroll", measure, { passive: true });
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    observer?.observe(el);
    return () => {
      cancelAnimationFrame(first);
      el.removeEventListener("scroll", measure);
      observer?.disconnect();
    };
  }, [measure]);

  const scrollBy = (direction: 1 | -1) => {
    const el = railRef.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: reduce ? "auto" : "smooth" });
  };

  const Heading = headingLevel;

  return (
    <section aria-labelledby={headingId} className={cn("group/row", className)}>
      <div className="flex items-end justify-between gap-4 px-gutter">
        <div className="min-w-0">
          <Heading id={headingId} className="text-section-title text-fg">
            {title}
          </Heading>
          {subtitle && <p className="mt-0.5 text-sm leading-5 text-fg-faint">{subtitle}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-4">
          {action}
          {seeAllHref && (
            <Link href={seeAllHref} className="mq-link rounded-[6px] text-[15px] leading-5 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link">
              {seeAllLabel ?? s.seeAll}
            </Link>
          )}
          {arrows && (
            <div className="flex gap-2 opacity-0 transition-opacity duration-200 group-focus-within/row:opacity-100 group-hover/row:opacity-100 max-desk:hidden">
              <RowArrow label={s.scrollLeft} disabled={edges.start} onClick={() => scrollBy(-1)}>
                <ChevronLeftIcon size={18} />
              </RowArrow>
              <RowArrow label={s.scrollRight} disabled={edges.end} onClick={() => scrollBy(1)}>
                <ChevronRightIcon size={18} />
              </RowArrow>
            </div>
          )}
        </div>
      </div>
      <Rail ref={railRef} className={railClassName}>
        {children}
      </Rail>
    </section>
  );
}

function RowArrow({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-9 cursor-pointer items-center justify-center rounded-full border-0 bg-tonal-soft text-fg transition-colors duration-150 outline-none hover:bg-tonal-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link disabled:cursor-default disabled:opacity-40"
    >
      {children}
    </button>
  );
}

/**
 * The bare scroller: gutter-aligned, snapping, scrollbar hidden, 40px of air
 * at the end. Use it when you need a rail without the <Row> header.
 */
export const Rail = forwardRef<HTMLDivElement, { className?: string; children: ReactNode; label?: string }>(
  function Rail({ className, children, label }, ref) {
    return (
      <div
        ref={ref}
        // A name only counts on an element with a role: a labelled rail is a
        // group ("Trending now", …); an unlabelled one stays a plain box.
        role={label ? "group" : undefined}
        aria-label={label}
        className={cn("mq-rail flex gap-4 overflow-x-auto px-gutter pt-4 pb-1", className)}
      >
        {children}
        <span aria-hidden className="w-10 shrink-0" />
      </div>
    );
  },
);

/**
 * The loading row: a 180×22 title bar and a non-scrolling line of skeleton
 * cards. aria-busy, with a hidden "Loading" status for screen readers.
 */
export function RowSkeleton({
  kind = "poster",
  count,
  withHeader = true,
  className,
}: {
  kind?: "poster" | "landscape" | "book";
  count?: number;
  withHeader?: boolean;
  className?: string;
}) {
  const s = useSection(shellText);
  const n = count ?? (kind === "landscape" ? 5 : 9);
  return (
    <div aria-busy="true" className={className}>
      {withHeader && (
        <div className="px-gutter">
          <span className="mq-skeleton block h-[22px] w-[180px] rounded-[6px]" />
        </div>
      )}
      <div className="flex gap-4 overflow-hidden px-gutter pt-4">
        {Array.from({ length: n }, (_, i) =>
          kind === "landscape" ? (
            <LandscapeCardSkeleton key={i} layout="rail" />
          ) : kind === "book" ? (
            <BookCardSkeleton key={i} layout="rail" />
          ) : (
            <PosterCardSkeleton key={i} layout="rail" />
          ),
        )}
      </div>
      <p role="status" className="sr-only">
        {s.loading}
      </p>
    </div>
  );
}

/**
 * Grids. `kind="posters"` = auto-fill minmax(168px, 1fr), gap 28/16 (7
 * columns at 1440); `"posters-compact"` = minmax(128px, 1fr); `"books"` =
 * minmax(140px, 1fr); `"cards"` = landscape/panels minmax(300px, 1fr). Under
 * 720px posters and books go to 3 columns, cards to 2. Cards inside use
 * `layout="grid"`. Put the grid inside a section padded with `px-gutter`.
 */
export function CardGrid({
  kind = "posters",
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & { kind?: "posters" | "posters-compact" | "books" | "cards" }) {
  return (
    <div
      className={cn(
        kind === "posters" && "mq-grid-posters",
        kind === "posters-compact" && "mq-grid-posters-compact",
        kind === "books" && "mq-grid-posters-compact",
        kind === "cards" && "mq-grid-cards",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Infinite scroll's tail: one row of skeleton cards INSIDE the same grid,
 * plus a hidden "Loading more" status. Never a "Load more" button.
 * Render it as the last children of a <CardGrid> while the next page loads.
 */
export function GridLoadingMore({
  kind = "poster",
  count = 7,
  label,
}: {
  kind?: "poster" | "landscape" | "book";
  count?: number;
  /** Screen-reader text, e.g. "Loading more movies". Defaults to "Loading more". */
  label?: string;
}) {
  const s = useSection(shellText);
  return (
    <>
      {Array.from({ length: count }, (_, i) =>
        kind === "landscape" ? (
          <LandscapeCardSkeleton key={i} />
        ) : kind === "book" ? (
          <BookCardSkeleton key={i} />
        ) : (
          <PosterCardSkeleton key={i} />
        ),
      )}
      <p role="status" className="sr-only">
        {label ?? s.loadingMore}
      </p>
    </>
  );
}
