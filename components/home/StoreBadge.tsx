"use client";

import * as React from "react";

import { useLanguage } from "@/lib/context/language-context";
import { kickerTracking } from "@/lib/home/type";
import { cn } from "@/lib/utils";
import type { GameBadge } from "@/types/game";

/**
 * THE STATUS CHIP of the storefront — deliberately SHARP (rounded-[4px])
 * against the app's pill Chip, so a game's machine status reads as signage
 * while filters and metadata elsewhere stay soft.
 *
 * The label is SANS and TRANSLATED, never mono: Geist Mono has no Myanmar
 * glyphs and `mm` is the default language, so a mono badge would silently
 * blank for most visitors. Where a figure belongs beside the label (the
 * hero's online count), the caller prepends it via `children` in its own
 * mono span — figure in SLUG, word in sans, the storefront-wide split.
 *
 * `online` is a presentation-only kind: it never appears on a Game (the data
 * vocabulary is GameBadge); it exists for the hero's players-online chip.
 */
export type StoreBadgeKind = GameBadge | "online";

/**
 * Full literal tone map, the Chip idiom — Tailwind only compiles literal
 * class strings, so every role is spelled out.
 */
const TONES: Record<StoreBadgeKind, string> = {
  live: "bg-destructive/15 text-destructive ring-destructive/30",
  new: "bg-primary/15 text-primary ring-primary/30",
  trending: "bg-warning/15 text-warning ring-warning/30",
  limited: "bg-premium/15 text-premium ring-premium/30",
  comingSoon: "bg-info/15 text-info ring-info/30",
  online: "bg-success/15 text-success ring-success/30",
};

const SIZES = {
  md: "h-6 px-2 text-[10px] tracking-[0.14em]",
  sm: "h-5 px-1.5 text-[9px] tracking-[0.12em]",
} as const;

export function StoreBadge({
  kind,
  size = "md",
  className,
  children,
}: {
  kind: StoreBadgeKind;
  size?: keyof typeof SIZES;
  className?: string;
  /** Prepended before the translated label — the hero's mono online count. */
  children?: React.ReactNode;
}) {
  const { t, language } = useLanguage();

  // Only the two "happening right now" states pulse; a badge that is merely
  // descriptive (new, trending…) stays still. The dot is pure CSS
  // (animate-ping), so the global reduced-motion guard freezes it to a
  // static dot for free — no JS timer belongs in a badge.
  const pulse = kind === "live" || kind === "online";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[4px] font-semibold uppercase ring-1 ring-inset",
        SIZES[size],
        TONES[kind],
        className,
      )}
      // Myanmar script is not letter-spaced — the inline style overrides the
      // Latin tracking above for mm and returns undefined for en.
      style={kickerTracking(language)}
    >
      {pulse && (
        <span aria-hidden className="relative flex size-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
          <span className="relative inline-flex size-1.5 rounded-full bg-current" />
        </span>
      )}
      {children}
      {t.home.store.badge[kind]}
    </span>
  );
}
