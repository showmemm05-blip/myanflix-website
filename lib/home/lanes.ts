import type { LucideIcon } from "lucide-react";
import { BookOpen, Clapperboard, Disc3, Gamepad2, Mic, Radio, Sparkles, Tv } from "lucide-react";
import type { TranslationShape } from "@/lib/i18n/translations";

/**
 * THE CATEGORY REGISTRY — the storefront's single source of truth for what
 * MyanFlix carries. StoreDiscover's teaser cards and StoreExploreMore's strip
 * are pure functions of this record: a future category (anime, podcasts,
 * live) flips `state` in ONE row here and appears as a Discover teaser; give
 * it a real href and a shipped state and it joins the hand-off strip. No
 * second registry, no per-section category lists.
 */

export type LaneKey =
  | "film"
  | "series"
  | "book"
  | "music"
  | "game"
  | "anime"
  | "podcast"
  | "live";

/**
 * live      — a real API resource; real items reach the page.
 * preview   — a shipped surface backed by local data; shown, ALWAYS labelled,
 *             never given an action. (Music today.)
 * announced — named, not built. Appears as a Discover teaser card only.
 *
 * Three states, not a boolean: music is simultaneously shipped and not real,
 * and a boolean forces that truth to leak out of the registry as per-lane
 * special cases scattered through the sections.
 */
export type LaneState = "live" | "preview" | "announced";

/**
 * WHERE A LANE'S OBJECTS COME FROM — and deliberately NOT the same axis as
 * `state`. `state` is presentation: how loudly a lane is announced. `sourced`
 * is provenance: whether its artwork and titles are real. Games are the case
 * that keeps this axis honest: presented at full weight because the product
 * wants the lane visible, sourced locally because there is no games API yet —
 * which is exactly why the storefront labels its figures as a preview
 * experience rather than claiming them.
 */
export type LaneSource = "api" | "local";

export interface Lane {
  key: LaneKey;
  /** Position in registry-driven rows (Discover teasers). Not a layout input anywhere else. */
  order: number;
  state: LaneState;
  /** Real catalogue, or local placeholder data. */
  sourced: LaneSource;
  icon: LucideIcon;
  /** null while `announced` — teaser cards render unlinked. */
  href: string | null;
  /**
   * Compile-time i18n coupling: because `mm satisfies typeof en`, a lane
   * cannot be added until BOTH languages carry its name and verb. The build
   * fails, rather than a reviewer noticing.
   */
  nameKey: keyof TranslationShape["home"]["lanes"];
  verbKey: keyof TranslationShape["home"]["verbs"];
}

/**
 * Routes verified against app/(public): /movies and /series are REDIRECTS
 * (to /media/movies and /media/movies?type=series) — link the destinations
 * directly so no lane row costs a redirect hop.
 */
export const LANES: Record<LaneKey, Lane> = {
  film:    { key: "film",    order: 1, state: "live",      sourced: "api",   icon: Clapperboard, href: "/media/movies",             nameKey: "film",    verbKey: "watch"  },
  series:  { key: "series",  order: 2, state: "live",      sourced: "api",   icon: Tv,           href: "/media/movies?type=series", nameKey: "series",  verbKey: "watch"  },
  book:    { key: "book",    order: 3, state: "live",      sourced: "api",   icon: BookOpen,     href: "/media/books",              nameKey: "book",    verbKey: "read"   },
  music:   { key: "music",   order: 4, state: "preview",   sourced: "local", icon: Disc3,        href: "/media/music",              nameKey: "music",   verbKey: "listen" },
  // GAMES: href stays "/media" until /media/games exists — a live row pointing
  // at a 404 is a worse defect than a row pointing one level up. The storefront
  // additionally centralises every game CTA in lib/home/store.ts GAME_HREF, so
  // the day the games route ships, that constant and this href are the whole
  // swap.
  game:    { key: "game",    order: 5, state: "live",      sourced: "local", icon: Gamepad2,     href: "/media",                    nameKey: "game",    verbKey: "play"   },
  anime:   { key: "anime",   order: 6, state: "announced", sourced: "local", icon: Sparkles,     href: null,                        nameKey: "anime",   verbKey: "watch"  },
  podcast: { key: "podcast", order: 7, state: "announced", sourced: "local", icon: Mic,          href: null,                        nameKey: "podcast", verbKey: "listen" },
  live:    { key: "live",    order: 8, state: "announced", sourced: "local", icon: Radio,        href: null,                        nameKey: "live",    verbKey: "join"   },
};

export const LANE_ORDER: Lane[] = Object.values(LANES).sort((a, b) => a.order - b.order);
