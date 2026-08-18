"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * THE SLIM CONTEXT BAR above the content column.
 *
 * With navigation living on the rail, this bar only has to answer "what can I
 * do here?" — live status and account controls on the right. On phones the
 * left slot carries the brand, because there is no rail to carry it.
 *
 * `title` names the bar for assistive tech (`<header aria-label>`) rather than
 * printing a second copy of the page's own heading: every destination already
 * renders its title once, in its <PageHeader> or hero, and that stays the one
 * visible title — and the one <h1> — on the page.
 *
 * Deliberately thin (56px) and glassy: the artwork below should feel like it
 * runs all the way to the top of the screen.
 */
export function TopBar({
  left,
  title,
  actions,
  className,
}: {
  /** Mobile-side content (brand) — rendered before the actions cluster. */
  left?: ReactNode;
  /** Accessible name for the bar — not rendered as text. */
  title?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header
      aria-label={title}
      className={cn(
        "sticky top-0 z-30 border-b border-white/[0.06] bg-background/75 backdrop-blur-xl",
        className,
      )}
    >
      <div className="flex h-14 items-center gap-2 px-3 sm:px-5 lg:px-6">
        {left}
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">{actions}</div>
      </div>
    </header>
  );
}
