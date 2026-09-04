"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

/**
 * Paginated text mode — true CSS-column pagination.
 *
 * The article becomes a multicol container: column-width = the visible
 * column, height fixed, column-fill auto — so overflow grows sideways into
 * further columns, and "turning a page" is a translateX of one column+gap.
 * Nothing is measured per block and nothing is split by script: the browser's
 * fragmentation engine does the layout, which is the only way arbitrary
 * ProseMirror content (tall images, nested lists, Burmese leading floors)
 * paginates correctly.
 *
 * Progress stays in the reader's existing scrollDepth space: depth =
 * page/(pages-1), reported through onDepth — the save shape does not change,
 * and a bookmark saved in one mode restores in the other.
 */

const COLUMN_GAP_PX = 56;

export interface ChapterPaginatorHandle {
  next: () => void;
  prev: () => void;
  first: () => void;
  last: () => void;
  /** Jump to a 0–1 depth (bookmark restore, mode switch hand-off). */
  goToDepth: (depth: number) => void;
  /** Jump to the page containing an element (annotation/search landing). */
  goToElement: (el: Element) => void;
  getPage: () => number;
  getPages: () => number;
}

export const ChapterPaginator = forwardRef<
  ChapterPaginatorHandle,
  {
    children: React.ReactNode;
    /** Outer column: width + margin classes from the settings maps. */
    className?: string;
    /** The article's typography classes (font/prose vars live on the parent). */
    articleClassName?: string;
    /** Where to open, in scrollDepth space. Applied once per mount. */
    initialDepth?: number;
    /** Re-measure cue: any settings value that changes text layout. */
    layoutSignal?: unknown;
    onDepth?: (depth: number) => void;
    onPageInfo?: (page: number, pages: number) => void;
    /** Turning past the last / before the first page. */
    onNextChapter?: () => void;
    onPrevChapter?: () => void;
  }
>(function ChapterPaginator(
  {
    children,
    className,
    articleClassName,
    initialDepth = 0,
    layoutSignal,
    onDepth,
    onPageInfo,
    onNextChapter,
    onPrevChapter,
  },
  ref,
) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLElement>(null);

  const [colWidth, setColWidth] = useState(0);
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(1);
  /** No depth/page reports until the first real measurement: an unmeasured
      chapter is "1 page", and depth 1 of it would read as "finished". */
  const [measured, setMeasured] = useState(false);

  // Refs mirror state for handlers that must read the latest without rebinding.
  const pageRef = useRef(page);
  pageRef.current = page;
  const pagesRef = useRef(pages);
  pagesRef.current = pages;

  const restored = useRef(false);
  const initialDepthRef = useRef(initialDepth);

  // ── Measurement ──────────────────────────────────────────────────────────

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const measure = () => setColWidth(viewport.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  const recompute = useCallback(() => {
    const track = trackRef.current;
    if (!track || colWidth <= 0) return;
    const unit = colWidth + COLUMN_GAP_PX;
    const nextPages = Math.max(1, Math.round((track.scrollWidth + COLUMN_GAP_PX) / unit));
    const prevPages = pagesRef.current;
    const prevPage = pageRef.current;

    let nextPage: number;
    if (!restored.current) {
      restored.current = true;
      nextPage = Math.round(initialDepthRef.current * (nextPages - 1));
    } else {
      // Reflow (resize, font change): keep the reader's DEPTH, not the page
      // number — page 4 of 20 and page 2 of 10 are the same place.
      const depth = prevPages <= 1 ? 0 : prevPage / (prevPages - 1);
      nextPage = Math.round(depth * (nextPages - 1));
    }
    nextPage = Math.min(nextPages - 1, Math.max(0, nextPage));

    // Sync the refs immediately: an imperative goToDepth/goToElement in the
    // same effect flush must see the real page count, not last render's.
    pagesRef.current = nextPages;
    pageRef.current = nextPage;
    setPages(nextPages);
    setPage(nextPage);
    setMeasured(true);
  }, [colWidth]);

  // Re-measure when the column width or any layout-affecting setting moves,
  // and again on every image load — a late image can add whole pages.
  useEffect(() => {
    recompute();
    const track = trackRef.current;
    if (!track) return;
    const onImgLoad = (e: Event) => {
      if ((e.target as HTMLElement).tagName === "IMG") recompute();
    };
    track.addEventListener("load", onImgLoad, true);
    return () => track.removeEventListener("load", onImgLoad, true);
  }, [recompute, layoutSignal, children]);

  // ── Reporting ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!measured) return;
    onDepth?.(pages <= 1 ? 1 : page / (pages - 1));
    onPageInfo?.(page + 1, pages);
  }, [measured, page, pages, onDepth, onPageInfo]);

  // ── Turning ──────────────────────────────────────────────────────────────

  /** Ref-then-state so back-to-back turns (held arrow key) never read stale. */
  const commitPage = useCallback((target: number) => {
    pageRef.current = target;
    setPage(target);
  }, []);

  const turn = useCallback(
    (delta: number) => {
      const current = pageRef.current;
      const total = pagesRef.current;
      const target = current + delta;
      if (target < 0) {
        onPrevChapter?.();
        return;
      }
      if (target > total - 1) {
        onNextChapter?.();
        return;
      }
      commitPage(target);
    },
    [onNextChapter, onPrevChapter, commitPage],
  );

  useImperativeHandle(
    ref,
    () => ({
      next: () => turn(1),
      prev: () => turn(-1),
      first: () => commitPage(0),
      last: () => commitPage(pagesRef.current - 1),
      goToDepth: (depth: number) =>
        commitPage(
          Math.min(
            pagesRef.current - 1,
            Math.max(0, Math.round(depth * (pagesRef.current - 1))),
          ),
        ),
      goToElement: (el: Element) => {
        const track = trackRef.current;
        if (!track || colWidth <= 0) return;
        const trackRect = track.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        // trackRect already carries the current translate, so the difference
        // is the element's untranslated offset in the column run.
        const column = Math.floor(
          (elRect.left - trackRect.left) / (colWidth + COLUMN_GAP_PX),
        );
        commitPage(Math.min(pagesRef.current - 1, Math.max(0, column)));
      },
      getPage: () => pageRef.current,
      getPages: () => pagesRef.current,
    }),
    [turn, colWidth, commitPage],
  );

  // ── Pointer input: click zones (left/right 30%) + horizontal swipe ──────

  const pointerStart = useRef<{ x: number; y: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    pointerStart.current = { x: e.clientX, y: e.clientY };
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;

    // A swipe turns regardless of where it lands.
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      // Only when it isn't a text-selection drag.
      if (window.getSelection()?.isCollapsed !== false) turn(dx < 0 ? 1 : -1);
      return;
    }
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) return; // drag, not a tap

    // Tap: never steal from links, painted highlights, or a live selection.
    const target = e.target as HTMLElement;
    if (target.closest?.("a, mark.reader-highlight, button")) return;
    if (window.getSelection()?.isCollapsed === false) return;

    const viewport = viewportRef.current;
    if (!viewport) return;
    const { left, width } = viewport.getBoundingClientRect();
    const x = (e.clientX - left) / width;
    if (x < 0.3) turn(-1);
    else if (x > 0.7) turn(1);
  };

  return (
    <div className={cn("relative mx-auto", className)}>
      <div
        ref={viewportRef}
        className="overflow-hidden"
        // The 8rem is the bar allowance both readers share: top bar + folio
        // bar + breathing room (the PageReader fit math documents the same).
        style={{ height: "calc(100dvh - 8rem)" }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        <article
          ref={trackRef}
          className={cn("reader-paginator-track h-full", articleClassName)}
          style={{
            columnWidth: colWidth > 0 ? colWidth : undefined,
            columnGap: COLUMN_GAP_PX,
            columnFill: "auto",
            transform: `translateX(${-page * (colWidth + COLUMN_GAP_PX)}px)`,
          }}
        >
          {children}
        </article>
      </div>
    </div>
  );
});
