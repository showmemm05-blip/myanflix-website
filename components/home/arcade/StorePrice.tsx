"use client";

import { useLanguage } from "@/lib/context/language-context";
import { formatKyat } from "@/lib/currency";
import { cn } from "@/lib/utils";

/**
 * ONE price treatment for the whole storefront (Main.dc.html): heavy
 * tabular figures — "12,800 Ks" in white, or the translated "Free" in the
 * money green.
 *
 * `null` MEANS free on this shelf (the data model has no separate flag),
 * except for a game that is not out yet: an unreleased game has no price at
 * all, so `unreleased` renders nothing rather than promising "Free".
 */
export function StorePrice({
  priceMMK,
  unreleased = false,
  size = "md",
  className,
}: {
  priceMMK: number | null;
  unreleased?: boolean;
  /** md 16/22 (shelf cards) · sm 14/20 (discover posters). */
  size?: "sm" | "md";
  className?: string;
}) {
  const { t } = useLanguage();
  if (priceMMK === null && unreleased) return null;

  return (
    <span
      className={cn(
        "shrink-0 font-extrabold nums",
        size === "md" ? "text-base leading-[22px]" : "text-sm leading-5",
        priceMMK === null ? "text-money" : "text-fg",
        className,
      )}
    >
      {priceMMK === null ? t.home.store.price.free : formatKyat(priceMMK)}
    </span>
  );
}

/** The spoken price for a card's accessible name ("" for an unreleased game). */
export function priceWords(priceMMK: number | null, unreleased: boolean, free: string): string {
  if (priceMMK === null) return unreleased ? "" : free;
  return formatKyat(priceMMK);
}
