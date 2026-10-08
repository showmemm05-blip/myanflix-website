"use client";

import { useState, type FocusEvent, type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * THE ROTATING HERO'S VOICE — one screen-reader announcement for the hubs'
 * featured heroes (movies, series, books), following the Home hero
 * (StoreHero) and the WAI carousel pattern:
 *
 *  - ONE live region that stays mounted (the hero rebuilds its copy on every
 *    slide, and a region rebuilt each time is often missed); only its words
 *    change — "Title, 2 of 5".
 *  - It is polite only while the hero is NOT moving by itself: the pointer is
 *    over it, focus is inside it, a dialog has paused it, reduced motion is
 *    on (no auto-advance), or there is a single slide. While the pager runs
 *    on its own the region is off, so the page is never talked over every
 *    8 seconds.
 *
 * Hover and focus are tracked on a `display: contents` wrapper, so the hero
 * keeps its own layout (it still pulls itself up under the top bar).
 */
export function HeroAnnouncer({
  slides,
  paused = false,
  announcement,
  children,
}: {
  /** How many slides the hero rotates through. */
  slides: number;
  /** An outside pause (e.g. the subscribe dialog is open over the hero). */
  paused?: boolean;
  /** What to say for the slide showing now. */
  announcement: string;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const running = slides > 1 && !reduce && !paused && !hovered && !focused;

  return (
    <div
      className="contents"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event: FocusEvent<HTMLDivElement>) => {
        // Moving between controls inside the hero keeps it paused; only
        // focus leaving the hero lets it run (and go quiet) again.
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
      }}
    >
      {slides > 1 && (
        <p aria-live={running ? "off" : "polite"} aria-atomic="true" className="sr-only">
          {announcement}
        </p>
      )}
      {children}
    </div>
  );
}
