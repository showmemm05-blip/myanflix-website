"use client";

import { StoreDiscover } from "@/components/home/StoreDiscover";
import { StoreExploreMore } from "@/components/home/StoreExploreMore";
import { StoreFeatured } from "@/components/home/StoreFeatured";
import { StoreHero } from "@/components/home/StoreHero";
import { StoreLive } from "@/components/home/StoreLive";
import { StorePromos } from "@/components/home/StorePromos";
import { AuroraBackdrop } from "@/components/system/AuroraBackdrop";

/**
 * THE ARCADE — the homepage as a night-time games storefront.
 *
 * READING ORDER, and why it is this one. The Hero is the marquee: six rotating
 * cinematic plates that state what this place is before a word is read. The
 * Featured shelf is what a visitor actually shops from, so it comes first
 * after the marquee; the Promos are the editorial spreads between shelves; the
 * Live grid is proof the hall is occupied; Discover widens the aisle to the
 * whole shelf plus the announced categories; and Explore More is the
 * deliberately-small hand-off to the rest of the platform, last because
 * movies, books and music are destinations of their own, not this page's job.
 *
 * WHY THE PAGE IS AUTH-AGNOSTIC. Every game on it is local data selected at
 * module scope in lib/home/store.ts — no fetch, no skeleton, first paint is
 * complete signed in or out. The page therefore fires ZERO catalogue requests
 * in both auth states; the only network touch anywhere below is StoreLive's
 * read of the shared public ['peak-users'] key. The single auth read lives
 * inside StoreExploreMore, where it only changes two href strings (movies and
 * books route through /login?next=… for a signed-out visitor, because the
 * catalogue behind them requires a token). Nothing else on the page knows or
 * cares who is looking at it.
 *
 * THE ONE AMBIENT BACKGROUND lives here: AuroraBackdrop variant="hero" as the
 * first child of the relative/isolate root, lighting the gutters around the
 * hero plate and fading into background before StoreFeatured begins. No
 * section paints ambient colour of its own — the Discover teasers' contained
 * wash is inside a card, not ambient.
 *
 * THERE IS NO GAP STACK, inherited from the Dispatch and still load-bearing:
 * every section after the hero opens with its own hairline and its own top
 * padding (StoreSection), so a section that ever returns null takes its rule
 * with it. The root is a bare `pb-20`.
 */
export default function HomePage() {
  return (
    <div className="relative isolate pb-20">
      <AuroraBackdrop variant="hero" />
      <StoreHero />
      <StoreFeatured />
      <StorePromos />
      <StoreLive />
      <StoreDiscover />
      <StoreExploreMore />
    </div>
  );
}
