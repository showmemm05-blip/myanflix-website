import type { TranslationShape } from "@/lib/i18n/translations";

/**
 * Game catalog shapes — extended for the storefront homepage. Still mirrors
 * the payload a future `GET /games` is expected to return, so the local data
 * in `lib/media/games-data.ts` can become a service call without a component
 * change. Every field below is read by a named storefront section; a payload
 * grows fields when a surface needs them, not in advance.
 */

/** The storefront's status vocabulary. `null` on a Game = no badge (quiet catalogue row). */
export type GameBadge = "live" | "new" | "trending" | "limited" | "comingSoon";

/** Where a build runs. Rendered as Latin mono tags ("PC · MOBILE"), never translated. */
export type GamePlatform = "PC" | "Mobile" | "Browser";

/** Live-ops flags StoreLive rows and the promo duo read. Closed set, typed against i18n. */
export type GameEventKey = keyof TranslationShape["home"]["store"]["events"];

export interface Game {
  id: string;
  title: string;
  /** The bare credit. `home.store.hero.byStudio` decides what it is credited FOR. */
  studio: string;
  /** 16:9 at 800×450 — StoreFeatured cards, StoreLive thumbs, StoreDiscover, promo duo. */
  artworkUrl: string;
  /** 16:9 at 1600×900, SAME picsum seed as artworkUrl so both crops are one image — StoreHero stage and the full-bleed promo banner. */
  heroArtworkUrl: string;
  releaseYear: number;
  /** Display word, catalogue vocabulary (the catalogue itself (genre facets are DB-derived since the filter rework)) — hero meta, card meta, discover meta. Untranslated, like the Dispatch's `subject`. */
  genre: string;
  /** ISO. Promo selection sorts on it (newest "new" badge wins the New Release banner); a future GET /games keeps it. */
  createdAt: string;
  /** i18n key into home.store.gameCopy — the compile-time contract: a game cannot ship without BOTH languages carrying its description. Read by StoreHero and both text promos. */
  descriptionKey: keyof TranslationShape["home"]["store"]["gameCopy"];
  /** Read by StoreFeatured/StoreDiscover meta rows and StoreHero meta. */
  platforms: GamePlatform[];
  /** Kyat. null = free — StorePrice renders `formatKyat(price)` or the translated Free label. Read by cards and the Free-to-Play promo picker. */
  priceMMK: number | null;
  /** 0–10, one decimal, or null (unreleased/unrated). Hero meta and featured cards render it in mono beside a star. */
  rating: number | null;
  /** Drives StoreBadge everywhere and promo selection. null = no badge. */
  badge: GameBadge | null;
  /** Static mock concurrent-player figure. null = not a live game. StoreLive membership + hero ONLINE chip. It never ticks. */
  playersOnline: number | null;
  /** Live-ops event this game is running, or null. StoreLive event line + Limited-Time promo label. */
  eventKey: GameEventKey | null;
}
