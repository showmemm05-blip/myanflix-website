/**
 * WHICH DESCRIPTION A VIEWER READS (owner, 2026-11-06; plan 7.1 in
 * docs/movie-details-tmdb-2026-11-06/PLAN.md).
 *
 * A movie, an episode and a series carry two texts: `description` (English,
 * the one TMDB fills) and `descriptionMm` (Burmese, typed by staff). The API
 * always sends both and knows nothing about the viewer's language, so every
 * place that shows a description picks here:
 *
 *   - Burmese site: the Burmese text, or the English one when there is none;
 *   - English site: the English text, or the Burmese one when there is none.
 *
 * So a title with only one of the two is never blank. A missing field (a
 * backend from before the Burmese column, a book, a cached answer) counts
 * as empty, and so does a text of only spaces. "" means the title has no
 * description at all: callers render nothing for it.
 *
 * Switching the language re-picks from the data already on the page: no
 * request is repeated and no cache key changes.
 *
 * Plain TypeScript with no React, Next or "@/…" imports, so
 * `node --test lib/localized-description.test.ts` runs it as is.
 */
export function localizedDescription(
  item: { description?: string | null; descriptionMm?: string | null },
  language: "en" | "mm",
): string {
  const en = (item.description ?? "").trim();
  const mm = (item.descriptionMm ?? "").trim();
  return language === "mm" ? mm || en : en || mm;
}
