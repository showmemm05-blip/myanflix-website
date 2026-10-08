"use client";

import { StoreDiscover } from "@/components/home/arcade/StoreDiscover";
import { StoreExploreMore } from "@/components/home/arcade/StoreExploreMore";
import { StoreFeatured } from "@/components/home/arcade/StoreFeatured";
import { StoreHero } from "@/components/home/arcade/StoreHero";
import { StoreLive } from "@/components/home/arcade/StoreLive";
import { StorePromos } from "@/components/home/arcade/StorePromos";
import { StoreWatch } from "@/components/home/arcade/StoreWatch";

/**
 * THE ARCADE — the games storefront that was the Home page until 2026-10-08
 * (docs/website-marquee-redesign-2026-10-07/design/Main.dc.html). Kept for
 * the future games rows (owner, 2026-10-08); not referenced from any route.
 *
 * Reading order, top to bottom:
 *   1. Featured-games hero — six games rotating under the see-through bar.
 *   2. Featured games — the four-card shelf ("All games" lands here).
 *   3. Watch on MyanFlix — the hand-off lane into Movies, Series and Books.
 *   4. Happening on MyanFlix — the three spotlights.
 *   5. Live and busy — the busiest four games + the real peak-viewers line.
 *   6. Discover something new — the whole shelf as a poster rail + "Soon" lanes.
 *   7. Explore more — Film, Series, Book, Music.
 *
 * Every game is local data selected at module scope in lib/home/store.ts and
 * every picture is inline SVG — no fetch, no skeleton, no image request. The
 * only network touch is StoreLive's read of the shared public ['peak-users']
 * key.
 */
export function ArcadeHome() {
  return (
    <div className="pb-4">
      <StoreHero />
      <StoreFeatured />
      <StoreWatch />
      <StorePromos />
      <StoreLive />
      <StoreDiscover />
      <StoreExploreMore />
    </div>
  );
}
