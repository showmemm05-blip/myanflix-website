"use client";

import { Users } from "lucide-react";

import { useLanguage } from "@/lib/context/language-context";
import { usePeakUsers } from "@/lib/hooks/use-peak-users";

/**
 * Social-proof chip for the Community section heading: the highest number of
 * members ever watching at the same time, straight from the public
 * GET /peak-users endpoint.
 *
 * Deliberately all-or-nothing — while loading, on fetch failure, or when the
 * number wouldn't impress anyone (0, or something non-finite), it renders
 * nothing at all. A "Peak of 0" or a NaN would be worse than no chip, and the
 * SectionHeading's action slot collapses cleanly when empty.
 *
 * Success (emerald) tone + `nums`: it's a live-audience count, and tabular
 * numerals keep the figure steady if it ever re-renders with fresh data.
 */
export function PeakViewersChip() {
  const { t } = useLanguage();

  const peak = usePeakUsers();
  if (peak === null) return null;

  return (
    <span className="nums flex items-center gap-2 rounded-full bg-success/15 px-3.5 py-1.5 text-xs font-semibold text-success ring-1 ring-success/25 ring-inset">
      <Users className="size-3.5 shrink-0" />
      {t.nav.peakViewers(peak.toLocaleString("en-US"))}
    </span>
  );
}
