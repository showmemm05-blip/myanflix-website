"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { useLanguage } from "@/lib/context/language-context";
import type { BookPage } from "@/types/book";
import type { FitId, PageDirectionId, RotationId } from "./reader-settings";

// ── Zoom contract ──────────────────────────────────────────────────────────
// One clamp shared by the buttons, the keys and the wheel, so no path can
// zoom past what the others can reach back from.

export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 3;
export const ZOOM_STEP = 0.25;

export function clampZoom(value: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Number(value.toFixed(2))));
}

/**
 * The stage's fit budget: the bars float over the stage, so a fitted sheet
 * leaves them room — 8rem vertical, the same allowance the scroll mode's
 * fit-screen calc (100dvh - 8rem) has always documented, plus a little
 * horizontal breathing space.
 */
const STAGE_ALLOWANCE_Y = 128;
const STAGE_ALLOWANCE_X = 32;

/** Width/height of a page AS DISPLAYED — 90°/270° swap the axes. */
export function rotatedAspect(
  page: BookPage,
  rotation: RotationId,
): { w: number; h: number } {
  return rotation === 90 || rotation === 270
    ? { w: page.height, h: page.width }
    : { w: page.width, h: page.height };
}

/**
 * The page image inside an aspect box that already accounts for rotation.
 * For 90°/270° the box has the SWAPPED aspect, and the image is laid out at
 * the page's own proportions then rotated into place: the inner wrapper's
 * width is the box's height (as a % of box width = pageW/pageH) and vice
 * versa, so the rotated image exactly fills the rotated box.
 */
export function RotatedPageImage({
  page,
  rotation,
  priority = false,
  sizes = "100vw",
}: {
  page: BookPage;
  rotation: RotationId;
  priority?: boolean;
  sizes?: string;
}) {
  if (rotation === 0) {
    return (
      <Image
        src={page.url}
        alt={`${page.pageNumber}`}
        fill
        priority={priority}
        sizes={sizes}
        className="object-contain"
        unoptimized
      />
    );
  }
  if (rotation === 180) {
    return (
      <div className="absolute inset-0" style={{ transform: "rotate(180deg)" }}>
        <Image
          src={page.url}
          alt={`${page.pageNumber}`}
          fill
          priority={priority}
          sizes={sizes}
          className="object-contain"
          unoptimized
        />
      </div>
    );
  }
  return (
    <div
      className="absolute top-1/2 left-1/2"
      style={{
        width: `${(page.width / page.height) * 100}%`,
        height: `${(page.height / page.width) * 100}%`,
        transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
      }}
    >
      <Image
        src={page.url}
        alt={`${page.pageNumber}`}
        fill
        priority={priority}
        sizes={sizes}
        className="object-contain"
        unoptimized
      />
    </div>
  );
}

/**
 * One spread, faded in on mount — the 150ms crossfade on a page turn. Under
 * prefers-reduced-motion the turn is instant twice over: the CSS transition
 * is killed by the global guard, and the wrapper skips the opacity-0 first
 * frame entirely.
 */
function SpreadFade({ children }: { children: React.ReactNode }) {
  const [shown, setShown] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <div
      // margin:auto INSIDE a flex container is the overflow-safe centering:
      // unlike align-items:center, the margins collapse to zero when the
      // zoomed spread outgrows the stage, so panning can reach every edge.
      className="reader-stage-sheet flex"
      style={{ margin: "auto", padding: "4rem 1rem", opacity: shown ? 1 : 0 }}
    >
      {children}
    </div>
  );
}

/**
 * THE PAGE STAGE — the page reader's single/double modes.
 *
 * Renders only the current sheet (or spread) and preloads its neighbours;
 * the windowed vertical list stays the scroll mode's job. The stage itself
 * is the pan container: when the fitted spread outgrows it (zoom, or a tall
 * fit-width scan) it simply scrolls in both axes.
 *
 * Spread pairing is [1], [2,3], [4,5]…: the cover stands alone, the way a
 * printed book opens. `direction` flips both the pair order and which click
 * zone means "next" — the parent owns the actual page arithmetic.
 */
export function PageStage({
  pages,
  currentPage,
  mode,
  fit,
  zoom,
  rotation,
  direction,
  onPrev,
  onNext,
  onZoomChange,
}: {
  pages: BookPage[];
  currentPage: number;
  mode: "single" | "double";
  fit: FitId;
  zoom: number;
  rotation: RotationId;
  direction: PageDirectionId;
  onPrev: () => void;
  onNext: () => void;
  onZoomChange: (next: number) => void;
}) {
  const { t } = useLanguage();
  const r = t.book.reader;
  const containerRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState({ w: 0, h: 0 });

  /** The first page of the spread `currentPage` belongs to. */
  const start =
    mode === "double"
      ? currentPage <= 1
        ? 1
        : currentPage % 2 === 0
          ? currentPage
          : currentPage - 1
      : currentPage;

  const spread = useMemo(() => {
    if (mode !== "double") {
      return pages.filter((p) => p.pageNumber === currentPage);
    }
    if (start === 1) return pages.filter((p) => p.pageNumber === 1);
    const pair = pages.filter(
      (p) => p.pageNumber === start || p.pageNumber === start + 1,
    );
    // RTL editions read the spread right-to-left: [3|2], not [2|3].
    return direction === "rtl" ? [...pair].reverse() : pair;
  }, [pages, mode, currentPage, start, direction]);

  // The stage box, live — fits are computed against it, so a window resize
  // or a fullscreen toggle refits the spread without any bespoke listener.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      const next = { w: Math.round(rect.width), h: Math.round(rect.height) };
      setStage((s) => (s.w === next.w && s.h === next.h ? s : next));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Preload the neighbouring spreads via bare Image objects — by the time a
  // turn happens, the next sheet is already decoded and the crossfade never
  // reveals a blank sheet.
  useEffect(() => {
    for (const p of pages) {
      if (p.pageNumber >= start - 2 && p.pageNumber <= start + 3) {
        const img = new window.Image();
        img.src = p.url;
      }
    }
  }, [pages, start]);

  // ── Wheel zoom, toward the cursor ──────────────────────────────────────
  // preventDefault ONLY when ctrl/cmd is held — plain scroll must never be
  // hijacked. The anchor is applied in a layout effect after the new zoom
  // has laid out, adjusting scroll so the point under the cursor stays put.
  const zoomRef = useRef(zoom);
  useEffect(() => {
    zoomRef.current = zoom;
  });
  const anchorRef = useRef<{ x: number; y: number; prev: number } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const next = clampZoom(zoomRef.current * Math.exp(-e.deltaY * 0.002));
      if (next === zoomRef.current) return;
      anchorRef.current = { x: e.clientX, y: e.clientY, prev: zoomRef.current };
      onZoomChange(next);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [onZoomChange]);

  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor || anchor.prev === zoom) return;
    anchorRef.current = null;
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio = zoom / anchor.prev;
    const cx = anchor.x - rect.left;
    const cy = anchor.y - rect.top;
    el.scrollLeft = (el.scrollLeft + cx) * ratio - cx;
    el.scrollTop = (el.scrollTop + cy) * ratio - cy;
  }, [zoom]);

  // ── Fit math ───────────────────────────────────────────────────────────
  // One common height for the spread; each sheet's width follows its own
  // (rotated) aspect. Zoom multiplies the fitted result, never replaces it.
  const availW = Math.max(0, stage.w - STAGE_ALLOWANCE_X);
  const availH = Math.max(0, stage.h - STAGE_ALLOWANCE_Y);
  const spreadAspect = spread.reduce((sum, p) => {
    const d = rotatedAspect(p, rotation);
    return sum + d.w / d.h;
  }, 0);
  let sheetHeight = 0;
  if (spreadAspect > 0 && availW > 0 && availH > 0) {
    if (fit === "width") sheetHeight = availW / spreadAspect;
    else if (fit === "height") sheetHeight = availH;
    else sheetHeight = Math.min(availW / spreadAspect, availH);
    sheetHeight *= zoom;
  }

  const zoomed = zoom > 1.001;
  const leftIsNext = direction === "rtl";

  return (
    <div className="relative">
      <div ref={containerRef} className="flex h-[100dvh] w-full overflow-auto">
        <SpreadFade key={`${mode}-${start}-${rotation}-${direction}`}>
          {spread.map((page) => {
            const d = rotatedAspect(page, rotation);
            return (
              <div
                key={page.pageNumber}
                className="relative shrink-0 overflow-hidden rounded-sm"
                style={{
                  width: sheetHeight * (d.w / d.h),
                  height: sheetHeight,
                  // The sheet law: white stock, hairline edge, soft shadow —
                  // identical to the scroll mode's PageSlot.
                  background: "#ffffff",
                  boxShadow:
                    "0 1px 2px rgba(0,0,0,0.16), 0 8px 24px -8px rgba(0,0,0,0.28)",
                  outline: "1px solid var(--rule)",
                  outlineOffset: "-1px",
                }}
              >
                <RotatedPageImage page={page} rotation={rotation} priority />
                {/* The folio stays upright under the sheet however the scan
                    is rotated. */}
                <span className="pointer-events-none absolute inset-x-0 bottom-2 text-center text-[11px] text-black/45 nums">
                  {page.pageNumber}
                </span>
              </div>
            );
          })}
        </SpreadFade>
      </div>

      {/* Turn zones — the outer 30% either side. Removed entirely while
          zoomed: a zoomed stage is for panning, and an invisible button over
          a third of it would eat every drag. tabIndex -1: keyboard readers
          already have the arrow keys. */}
      {!zoomed && (
        <>
          <button
            type="button"
            tabIndex={-1}
            aria-label={leftIsNext ? r.nextPage : r.previousPage}
            onClick={leftIsNext ? onNext : onPrev}
            className="absolute inset-y-0 left-0 z-10 w-[30%]"
          />
          <button
            type="button"
            tabIndex={-1}
            aria-label={leftIsNext ? r.previousPage : r.nextPage}
            onClick={leftIsNext ? onPrev : onNext}
            className="absolute inset-y-0 right-0 z-10 w-[30%]"
          />
        </>
      )}
    </div>
  );
}
