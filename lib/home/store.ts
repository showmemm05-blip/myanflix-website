import { GAMES } from "@/lib/media/games-data";
import type { Game } from "@/types/game";

/**
 * THE STOREFRONT'S ONE SELECTION MODULE. Every section reads these selectors,
 * never GAMES directly — so the day a games API ships, this file and the
 * import above are the whole swap; no component changes.
 *
 * All data is local, so everything is computed once at module scope. No React,
 * no hooks, no fetching: first paint is complete in both auth states.
 */

/**
 * Becomes /games/[id] the day the games route ships; every storefront CTA
 * reads this constant so the swap is one line. Until then it points at the
 * real /media hub — with an honest caveat: signed out, that page's movie and
 * book rails 401 and collapse, leaving only the music rail. A pre-existing
 * gap in an out-of-scope page, not something this link can fix.
 */
export const GAME_HREF = "/media";

/**
 * Resolve a curated id against the shelf. Throws at module init — a typo'd or
 * removed id fails the dev server on the first render, not a reviewer's eye.
 */
function byId(id: string): Game {
  const game = GAMES.find((g) => g.id === id);
  if (!game) throw new Error(`lib/home/store.ts: no game with id "${id}" in GAMES`);
  return game;
}

/**
 * The hero marquee, in a CURATED order — a marquee is merchandising, and a
 * derived order (newest first, most players first) would reshuffle it every
 * time the shelf grows. Six explicit ids beat a clever sort here.
 */
export const HERO_ROTATION: Game[] = [
  "game-lacquer-city",
  "game-monsoon-run",
  "game-the-long-quiet",
  "game-orbital-ferry",
  "game-emberfall",
  "game-delta-drift",
].map(byId);

/** The featured shelf — four rich cards, curated like the marquee. */
export const FEATURED: Game[] = [
  "game-the-long-quiet",
  "game-teahouse-letters",
  "game-paper-tigers",
  "game-the-ninth-floor",
].map(byId);

/**
 * Pick the single game a derived promo slot advertises, or throw at module
 * init when the shelf can no longer feed the banner — a storefront with an
 * empty spotlight is a data defect, not a render branch.
 */
function pickPromo(label: string, candidates: Game[]): Game {
  const game = candidates[0];
  if (!game) throw new Error(`lib/home/store.ts: no game qualifies for the "${label}" promo`);
  return game;
}

/**
 * The three promo banners' casts, DERIVED rather than curated: adding a game
 * with the right badge re-aims a banner without touching a component.
 *
 *   newRelease   — the newest `badge: "new"` row by createdAt.
 *   comingSoon   — the `badge: "comingSoon"` row.
 *   freeToPlay   — free (priceMMK null), not merely unreleased-and-unpriced
 *                  (comingSoon excluded), busiest first.
 *   limitedEvent — the `badge: "limited"` row.
 */
export const PROMOS: {
  newRelease: Game;
  comingSoon: Game;
  freeToPlay: Game;
  limitedEvent: Game;
} = {
  newRelease: pickPromo(
    "newRelease",
    GAMES.filter((g) => g.badge === "new").sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  ),
  comingSoon: pickPromo(
    "comingSoon",
    GAMES.filter((g) => g.badge === "comingSoon"),
  ),
  freeToPlay: pickPromo(
    "freeToPlay",
    GAMES.filter((g) => g.priceMMK === null && g.badge !== "comingSoon").sort(
      (a, b) => (b.playersOnline ?? 0) - (a.playersOnline ?? 0),
    ),
  ),
  limitedEvent: pickPromo(
    "limitedEvent",
    GAMES.filter((g) => g.badge === "limited"),
  ),
};

/**
 * The live grid: every game with a concurrent-player figure, busiest first,
 * capped at four tiles. The figures are static mock data by the honesty rule
 * — they never tick.
 */
export const LIVE_NOW: Game[] = GAMES.filter((g) => g.playersOnline !== null)
  .sort((a, b) => (b.playersOnline ?? 0) - (a.playersOnline ?? 0))
  .slice(0, 4);

/** The discover rail: the whole shelf, newest first. */
export const DISCOVER: Game[] = [...GAMES].sort((a, b) =>
  b.createdAt.localeCompare(a.createdAt),
);
