"use client";

import type { ReactNode } from "react";

import { AuroraBackdrop } from "@/components/system";
import { cn } from "@/lib/utils";

/**
 * THE ACCOUNT-PAGE MEASURE.
 *
 * Notifications, profile, settings, transactions, the wallet, watch history and
 * the watchlist are one family of screens, so they get one column width. Before
 * this they used five different ones (2xl · 3xl · 4xl · full · full) and the set
 * read as five unrelated pages that happened to share a nav.
 *
 * `max-w-4xl` is the measure: wide enough for the wallet's two-up panels and a
 * four-column poster grid, narrow enough that a notification or a ledger row
 * still has a readable line length. Every page in the family renders through
 * this shell — the outer gutter, the aurora and the column all live here so
 * there is nowhere left to diverge.
 */
export const ACCOUNT_CONTENT_CLASS = "mx-auto flex w-full max-w-4xl flex-col";

export function AccountShell({
  children,
  className,
  backdrop = true,
}: {
  children: ReactNode;
  /** Extra classes for the content column — e.g. a wider gap at `lg`. */
  className?: string;
  /** Skeletons opt out so nothing glows behind a placeholder. */
  backdrop?: boolean;
}) {
  return (
    <div className="relative isolate mx-auto w-full max-w-[1600px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      {backdrop && <AuroraBackdrop />}
      <div className={cn(ACCOUNT_CONTENT_CLASS, "gap-8", className)}>{children}</div>
    </div>
  );
}
