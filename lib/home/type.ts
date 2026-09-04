/**
 * The storefront's shared TYPE strings (typography, not TypeScript).
 *
 * They live here rather than in app/globals.css for two reasons. Tailwind only
 * ever compiles literal class strings, so a constant is as safe as a hand-typed
 * one — and globals.css is a site-wide contract, while these scales are the
 * homepage's alone. Adding `.slug` and `.deck` utilities there would invite
 * the rest of the app to reach for them, and the homepage would quietly become
 * a design system.
 *
 * There is no third constant. A home-only larger heading scale was tried once
 * and rejected for making the app read as two products; the storefront's
 * headings come from `.text-display` / `.text-title` / `.text-section-title`,
 * unchanged.
 */

/**
 * THE SLUG — the mono voice, used for numerals, dates and Latin tags and
 * nothing else: prices ("12,800 Ks"), player counts, years, ratings, platform
 * tags. Geist Mono has no Myanmar glyphs (app/globals.css sets --font-mono
 * with no Myanmar fallback, unlike --font-sans and --font-heading) and `mm`
 * is this app's DEFAULT language, so a translated word set in this class
 * would silently blank on the default experience. Where a figure and a word
 * sit together, the figure takes SLUG and the word takes sans beside it.
 */
export const SLUG =
  "font-mono text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase nums";

/**
 * THE DECK — the one line under a headline. Inter, generous leading, sized to
 * read as prose rather than as a subtitle. Kept exported for reuse, though
 * the hero deliberately runs its description at a quieter body cut — DECK's
 * text-lg+ is too loud under a display title that sits on artwork.
 */
export const DECK =
  "text-lg leading-[1.45] text-foreground/80 sm:text-xl lg:text-[1.375rem]";

/**
 * BURMESE NEEDS AIR THAT LATIN DOES NOT.
 *
 * The design system's display sizes are set tight on purpose — `.text-display`
 * is `leading-[1.02]` and `.text-title` is `leading-[1.08]`, which is right for
 * Plus Jakarta and wrong for Myanmar script, where stacked medials and vowel
 * signs extend well past the nominal em box. Set at 1.02 the second line of a
 * Burmese headline collides with the first, and `mm` is this app's DEFAULT
 * language — so the collision is what most visitors would actually see.
 *
 * It is applied as an INLINE STYLE rather than a `leading-*` class on purpose:
 * `.text-display` is a custom utility declared later in the same layer, so a
 * Tailwind leading utility loses the cascade to it (verified in the browser —
 * `text-display leading-[1.14]` still computes to 1.02). An inline style is the
 * only thing that reliably wins, and globals.css is out of scope for this page.
 *
 * English keeps the designed value exactly; only Myanmar is relaxed.
 */
export function headingLeading(language: string, size: "display" | "title" | "deck") {
  if (language !== "mm") return undefined;
  if (size === "deck") return { lineHeight: 1.7 };
  return { lineHeight: size === "display" ? 1.32 : 1.4 };
}

/**
 * `.text-kicker` sets `tracking-[0.18em]`, which is right for a Latin eyebrow
 * and wrong for Myanmar: the script is not letter-spaced, and the extra track
 * both hurts legibility and makes a word ~20% wider than it should be —
 * enough to truncate "ဇာတ်လမ်းတွဲ" out of a tight cell on a phone. Applies to
 * every Burmese-capable kicker and badge label on the storefront.
 */
export function kickerTracking(language: string) {
  return language === "mm" ? { letterSpacing: "0.02em" } : undefined;
}
