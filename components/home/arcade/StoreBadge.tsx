"use client";

import * as React from "react";

import { useLanguage } from "@/lib/context/language-context";
import { cn } from "@/lib/utils";
import type { GameBadge } from "@/types/game";

/**
 * THE STATUS BADGE of the storefront (Main.dc.html): 24px, radius 6, 12px
 * heavy sentence-case words.
 *
 * - "new" is always a crimson fill with white text.
 * - Over artwork (`surface="art"`, the default) every other status sits on
 *   the dark art-badge slab in its own colour — Live red, Trending amber,
 *   Limited gold, Coming soon blue, Online green.
 * - On a flat panel or a scrim (`surface="tint"`) it becomes the colour at
 *   16% behind the same coloured word (the duo's Limited, the split panel's
 *   Coming soon).
 *
 * Live and Online carry a slow beating dot. It is a CSS animation, so the
 * global reduced-motion guard stills it to a plain dot.
 *
 * `online` is presentation-only: it never appears on a Game (the data
 * vocabulary is GameBadge); it exists for the hero's players-online pill,
 * which passes the figure as `children` (shown after the word, in white).
 */
export type StoreBadgeKind = GameBadge | "online";

const TONE: Record<Exclude<StoreBadgeKind, "new">, { text: string; tint: string; dot: string }> = {
  live: { text: "text-danger", tint: "bg-danger/16", dot: "bg-danger" },
  trending: { text: "text-pending", tint: "bg-pending/16", dot: "bg-pending" },
  limited: { text: "text-gold", tint: "bg-gold/16", dot: "bg-gold" },
  comingSoon: { text: "text-info", tint: "bg-info/16", dot: "bg-info" },
  online: { text: "text-money", tint: "bg-money/16", dot: "bg-money" },
};

export function StoreBadge({
  kind,
  surface = "art",
  className,
  children,
}: {
  kind: StoreBadgeKind;
  surface?: "art" | "tint";
  className?: string;
  /** Shown after the word in white — the hero's online figure. */
  children?: React.ReactNode;
}) {
  const { t } = useLanguage();
  const base =
    "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-badge px-2 text-[12px] leading-4 font-extrabold whitespace-nowrap";

  if (kind === "new") {
    return <span className={cn(base, "bg-crimson text-white", className)}>{t.home.store.badge.new}</span>;
  }

  const tone = TONE[kind];
  const pulse = kind === "live" || kind === "online";

  return (
    <span className={cn(base, tone.text, surface === "art" ? "bg-art-badge" : tone.tint, className)}>
      {pulse && <span aria-hidden className={cn("size-1.5 rounded-full animate-mq-pulse", tone.dot)} />}
      {t.home.store.badge[kind]}
      {children !== undefined && <span className="text-fg nums">{children}</span>}
    </span>
  );
}
