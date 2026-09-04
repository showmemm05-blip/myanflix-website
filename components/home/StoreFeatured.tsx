"use client";

import { RevealSection } from "@/components/home/RevealSection";
import { StoreGameCard } from "@/components/home/StoreGameCard";
import { StoreHeading, StoreSection } from "@/components/home/StoreSection";
import { useLanguage } from "@/lib/context/language-context";
import { FEATURED } from "@/lib/home/store";

/**
 * THE SHELF — four rich game plates, the section a visitor actually shops
 * from. The hero sells one game at a time; this sells four at once, each as
 * a full 16:9 artwork plate with title, meta and price laid over the scrim
 * (StoreGameCard size="featured" owns that anatomy, and its hover: zoom,
 * lift, glow).
 *
 * A two-up grid rather than a streaming row on purpose: rails are for
 * browsing many, shelves are for choosing between few, and four cards in a
 * carousel would hide half the merchandise behind a scroll. On mobile the
 * grid stacks to full-width single-column plates — everything the cards say
 * (badge, meta, price) is plain text over the artwork, so nothing on this
 * shelf is hover-gated away from a thumb.
 *
 * All data is module-scope local (FEATURED), so this section renders
 * complete on first paint in both auth states — no skeleton, no fetch.
 */
export function StoreFeatured() {
  const { t } = useLanguage();

  return (
    <RevealSection y={20} amount={0.15}>
      {/* as="div": RevealSection already renders the <section> landmark.
          The id is the landing point for the hero's "All games" CTA;
          scroll-mt clears the AppShell top bar when the anchor fires. */}
      <StoreSection as="div" pad="standard" id="store-featured" className="scroll-mt-24">
        <StoreHeading
          kicker={t.home.store.featured.kicker}
          title={t.home.store.featured.title}
        />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 sm:gap-6">
          {FEATURED.map((game) => (
            <StoreGameCard key={game.id} game={game} size="featured" />
          ))}
        </div>
      </StoreSection>
    </RevealSection>
  );
}
