"use client";

import { StoreGameCard } from "@/components/home/arcade/StoreGameCard";
import { StoreHeading, StoreSection } from "@/components/home/arcade/StoreSection";
import { useLanguage } from "@/lib/context/language-context";
import { FEATURED } from "@/lib/home/store";

/**
 * THE SHELF (Main.dc.html §2) — four big 16:9 game cards in two columns
 * (one column on phones). The section is the landing point for the hero's
 * "All games" button (#store-featured); scroll-margin clears the sticky bar.
 *
 * All data is module-scope local (FEATURED), so it renders complete on first
 * paint in both auth states — no skeleton, no fetch.
 */
export function StoreFeatured() {
  const { t } = useLanguage();

  return (
    <StoreSection
      first
      headingId="h-featured"
      id="store-featured"
      className="scroll-mt-[calc(var(--shell-bar-h)+24px)]"
    >
      <StoreHeading id="h-featured" eyebrow={t.home.store.featured.kicker} title={t.home.store.featured.title} />
      <div className="mq-stack mt-5 grid grid-cols-2 gap-x-6 gap-y-8">
        {FEATURED.map((game) => (
          <StoreGameCard key={game.id} game={game} size="featured" />
        ))}
      </div>
    </StoreSection>
  );
}
