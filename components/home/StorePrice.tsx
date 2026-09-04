"use client";

import { useLanguage } from "@/lib/context/language-context";
import { formatKyat } from "@/lib/currency";

/**
 * ONE price treatment for the whole storefront: a priced game renders its
 * kyat figure in the mono SLUG voice ("12,800 Ks" — digits plus a Latin
 * unit, so mono is safe), and a free game renders a translated sans tag in
 * the success tone. `null` MEANS free on this shelf — the data model has no
 * separate flag — so the branch lives here once instead of at every callsite.
 */
export function StorePrice({
  priceMMK,
  size = "md",
}: {
  priceMMK: number | null;
  size?: "sm" | "md";
}) {
  const { t } = useLanguage();

  if (priceMMK === null) {
    // Sharp corners like StoreBadge — the free tag is signage, not a pill.
    return (
      <span className="rounded-[4px] bg-success/15 px-2 py-0.5 text-[11px] font-semibold text-success ring-1 ring-success/30 ring-inset">
        {t.home.store.price.free}
      </span>
    );
  }

  return (
    <span
      className={
        size === "sm"
          ? "nums font-mono text-[11px] font-medium text-foreground/90"
          : "nums font-mono text-xs font-medium text-foreground/90"
      }
    >
      {formatKyat(priceMMK)}
    </span>
  );
}
