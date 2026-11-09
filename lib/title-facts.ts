/**
 * A TITLE'S GENRE AND LANGUAGE, ONLY WHEN IT HAS THEM (2026-11-09).
 *
 * Both used to be required of every published title, so the pages printed
 * them without a look. They can be empty now: a series created from TMDB
 * gets "" when TMDB's word has no house word (a Telugu or Turkish show has
 * no language word, a talk show no genre), a movie is born from its upload
 * with neither, and Publish does not ask for details. An empty one must
 * leave nothing behind: no "Language" row with a blank beside it, no empty
 * genre chip, no card line that starts with a separator.
 *
 * Plain TypeScript with no React, Next or "@/…" imports, so
 * `node --test lib/title-facts.test.ts` runs it as is.
 */

/** One row of the Details panel, or none when the title has no value for it. */
export function optionalFact(label: string, value: string | null | undefined): { label: string; value: string }[] {
  const text = (value ?? "").trim();
  return text ? [{ label, value: text }] : [];
}

/** The genre chip that leads the hero's chip row, or none for a title without a genre. */
export function genreChip(
  genre: string | null | undefined,
  href: string,
): { key: string; label: string; href: string }[] {
  const text = (genre ?? "").trim();
  return text ? [{ key: `genre:${text}`, label: text, href }] : [];
}

/** "Drama · 2016 · 8 episodes" from the parts that exist; a missing one leaves no separator behind. */
export function metaLine(parts: readonly (string | number | null | undefined)[]): string {
  return parts
    .map((part) => (part == null ? "" : String(part).trim()))
    .filter(Boolean)
    .join(" · ");
}
