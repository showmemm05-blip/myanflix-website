"use client";

import { Check, Crown } from "lucide-react";

import { useLanguage } from "@/lib/context/language-context";
import { cn } from "@/lib/utils";
import type { AccessType } from "@/types/movie";
import { chipClass } from "./Chip";

/**
 * THE ONE ACCESS BADGE — free / premium / subscribed, everywhere.
 *
 * Cards, detail heroes, the watchlist and the player all answer the same
 * question ("can I watch this?") and must answer it with the same object, so
 * this is the single implementation:
 *
 *  - FREE                        → emerald outline chip, a quiet reassurance;
 *  - SUBSCRIPTION                → solid gold chip with a crown, the loud one,
 *                                  because it changes what the viewer can do next;
 *  - SUBSCRIPTION + isSubscribed → neutral outline chip with a check — the
 *                                  title is premium but already unlocked.
 *
 * It is driven by the item's own `accessType`; `isSubscribed` is the *viewer's*
 * state and is optional — omit it on surfaces that describe the title rather
 * than the viewer's access to it (browse cards, the player's meta row).
 *
 * `size` is the chip scale: `sm` for dense placements (card overlays, rows),
 * `md` for the detail hero. Positioning stays with the caller via `className`.
 *
 * `wording` picks the copy, not the object: `short` ("Free"/"Premium") for the
 * badge stamped on artwork, where the chip is read at a glance next to a dozen
 * siblings, and `full` ("Free to watch"/"Premium title") for a detail hero,
 * where it sits in a sentence-like metadata row and has room to say it plainly.
 * One component, one visual language, two register of voice.
 */
export function AccessBadge({
  accessType,
  isSubscribed = false,
  size = "sm",
  wording = "short",
  className,
}: {
  accessType: AccessType;
  /** Viewer state: a premium title the viewer already has access to reads "subscribed". */
  isSubscribed?: boolean;
  size?: "sm" | "md";
  wording?: "short" | "full";
  className?: string;
}) {
  const { t } = useLanguage();
  const isFull = wording === "full";
  // The verbose copy has no "subscribed" phrasing of its own — that state is
  // about the viewer, and reads the same at both registers.
  const freeLabel = isFull ? t.movieDetail.freeToWatch : t.badges.free;
  const premiumLabel = isFull ? t.movieDetail.premiumTitle : t.badges.premium;

  if (accessType === "FREE") {
    return (
      <span
        data-slot="access-badge"
        data-access="free"
        className={cn(
          chipClass({ tone: "success", variant: "outline", size }),
          "font-semibold backdrop-blur-md",
          isFull ? "normal-case" : "uppercase",
          className,
        )}
      >
        {freeLabel}
      </span>
    );
  }

  if (isSubscribed) {
    return (
      <span
        data-slot="access-badge"
        data-access="subscribed"
        className={cn(
          chipClass({ tone: "neutral", variant: "outline", size }),
          "font-semibold text-foreground/85 backdrop-blur-md",
          isFull ? "normal-case" : "uppercase",
          className,
        )}
      >
        <Check />
        {t.badges.subscribed}
      </span>
    );
  }

  return (
    <span
      data-slot="access-badge"
      data-access="premium"
      className={cn(
        chipClass({ tone: "premium", variant: "solid", size }),
        "font-semibold shadow-e1",
        isFull ? "normal-case" : "uppercase",
        className,
      )}
    >
      <Crown />
      {premiumLabel}
    </span>
  );
}
