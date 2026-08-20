"use client";

import { Users } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useLanguage } from "@/lib/context/language-context";
import { compactCount, usePeakUsers } from "@/lib/hooks/use-peak-users";

/**
 * The peak-viewers stat as a rail tile — the rail is the one piece of chrome
 * on screen on every desktop page, which is what makes this the site-wide
 * home for the figure. Mirrors WalletBalanceTile's shape (56px column,
 * icon + compact number, full sentence in the tooltip), but in the success
 * tone and NOT a link: it is a fact, not a destination.
 *
 * Renders nothing until a positive number is known — an empty slot reads
 * better in the rail than a dash.
 */
export function PeakUsersTile() {
  const { t } = useLanguage();
  const peak = usePeakUsers();

  if (peak === null) return null;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <div
            aria-label={t.nav.peakViewers(peak.toLocaleString("en-US"))}
            className="flex w-14 flex-col items-center gap-0.5 rounded-2xl bg-success/12 py-2 ring-1 ring-success/25 ring-inset"
          />
        }
      >
        <Users className="size-4 text-success" />
        <span className="nums max-w-full truncate px-1 text-[11px] font-semibold text-success">
          {compactCount(peak)}
        </span>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={10}>
        {t.nav.peakViewers(peak.toLocaleString("en-US"))}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * The same fact as a full sentence for the site footer — the surface that
 * exists on every page at every breakpoint, including mobile where the rail
 * does not.
 */
export function PeakUsersFooterStat() {
  const { t } = useLanguage();
  const peak = usePeakUsers();

  if (peak === null) return null;

  return (
    <span className="nums inline-flex items-center gap-2 text-xs font-medium text-success">
      <Users className="size-3.5 shrink-0" />
      {t.nav.peakViewers(peak.toLocaleString("en-US"))}
    </span>
  );
}

/**
 * The same fact at phone scale — the mobile top bar is the only chrome always
 * on screen below lg (the rail doesn't exist there and the footer needs a
 * scroll to the very bottom), so a compact pill rides in its actions cluster.
 * Icon + compact count only: the bar also carries the wallet pill, the bell
 * and the avatar, and a full sentence would crowd a 360px screen. The full
 * figure lives in the aria-label and the footer.
 */
export function PeakUsersPill() {
  const { t } = useLanguage();
  const peak = usePeakUsers();

  if (peak === null) return null;

  return (
    <div
      aria-label={t.nav.peakViewers(peak.toLocaleString("en-US"))}
      className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-success/15 px-3 ring-1 ring-success/25 backdrop-blur-md ring-inset"
    >
      <Users className="size-3.5 shrink-0 text-success sm:size-4" />
      <span className="nums text-xs font-semibold text-success sm:text-sm">
        {compactCount(peak)}
      </span>
    </div>
  );
}
