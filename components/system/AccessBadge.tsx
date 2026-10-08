"use client";

import { useLanguage } from "@/lib/context/language-context";
import { cn } from "@/lib/utils";
import type { AccessType } from "@/types/movie";
import { CheckIcon, CrownIcon } from "./icons";

/**
 * THE ONE ACCESS BADGE — free / premium / subscribed, as Marquee tags.
 *
 *  - FREE                        → green FREE tag
 *  - SUBSCRIPTION                → gold PREMIUM tag with a crown
 *  - SUBSCRIPTION + isSubscribed → neutral tag with a tick — premium, but
 *                                  already unlocked for this viewer
 *
 * `size` sm = the 22px tag; md = a 26px version for detail heroes.
 * `wording` short ("Free"/"Premium") or full ("Free to watch"/"Premium title").
 */
export function AccessBadge({
  accessType,
  isSubscribed = false,
  size = "sm",
  wording = "short",
  className,
}: {
  accessType: AccessType;
  isSubscribed?: boolean;
  size?: "sm" | "md";
  wording?: "short" | "full";
  className?: string;
}) {
  const { t } = useLanguage();
  const isFull = wording === "full";
  const base = cn(
    "inline-flex shrink-0 items-center gap-1 rounded-[4px] font-extrabold whitespace-nowrap",
    size === "md" ? "h-[26px] px-2 text-xs [&_svg]:size-3" : "h-[22px] px-[7px] text-[11px] [&_svg]:size-[11px]",
    isFull ? "normal-case" : "tracking-[0.06em] uppercase [&:lang(my)]:tracking-normal",
  );

  if (accessType === "FREE") {
    return (
      <span data-slot="access-badge" data-access="free" className={cn(base, "bg-money/16 text-money", className)}>
        {isFull ? t.movieDetail.freeToWatch : t.badges.free}
      </span>
    );
  }

  if (isSubscribed) {
    return (
      <span data-slot="access-badge" data-access="subscribed" className={cn(base, "bg-tonal-faint text-fg-body", className)}>
        <CheckIcon />
        {t.badges.subscribed}
      </span>
    );
  }

  return (
    <span data-slot="access-badge" data-access="premium" className={cn(base, "bg-gold/16 text-gold", className)}>
      <CrownIcon />
      {isFull ? t.movieDetail.premiumTitle : t.badges.premium}
    </span>
  );
}
