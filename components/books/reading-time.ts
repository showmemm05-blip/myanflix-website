"use client";

/**
 * Reading-time estimates for text (EDITOR) chapters.
 *
 * minutes = ceil(latinWords/220 + myanmarSyllables/170)
 *
 * Two counters because the two scripts measure differently: Latin reading
 * speed is quoted in words, but Burmese has no space-separated words — its
 * natural unit is the syllable. The syllable proxy counts base consonants and
 * independent vowels; asat-final consonants overcount slightly, which is fine
 * for an estimate and keeps the counter deterministic and fast.
 */

const LATIN_WPM = 220;
const MYANMAR_SPM = 170;

/** Any run of Myanmar-block characters (incl. extended blocks). */
const MYANMAR_RUN = /[က-႟ꧠ-꧿ꩠ-ꩿ]+/g;
/** Syllable proxy: base consonants + independent vowels + the two specials. */
const MYANMAR_SYLLABLE = /[က-ဪဿ၎]/g;
/** A token counts as a word only if it contains a letter — "—" or "42" don't. */
const HAS_LETTER = /\p{L}/u;

export interface TextCounts {
  latinWords: number;
  myanmarSyllables: number;
}

export function countText(text: string): TextCounts {
  const myanmarSyllables = (text.match(MYANMAR_SYLLABLE) ?? []).length;
  const latinOnly = text.replace(MYANMAR_RUN, " ");
  let latinWords = 0;
  for (const token of latinOnly.split(/\s+/)) {
    if (token && HAS_LETTER.test(token)) latinWords += 1;
  }
  return { latinWords, myanmarSyllables };
}

export function minutesForCounts(counts: TextCounts): number {
  const raw = counts.latinWords / LATIN_WPM + counts.myanmarSyllables / MYANMAR_SPM;
  if (raw <= 0) return 0;
  return Math.max(1, Math.ceil(raw));
}

// ── TipTap / ProseMirror JSON extraction ───────────────────────────────────

interface PmNode {
  type?: string;
  text?: string;
  content?: PmNode[];
}

function collectText(node: PmNode, parts: string[]) {
  if (typeof node.text === "string") parts.push(node.text);
  if (Array.isArray(node.content))
    for (const child of node.content) collectText(child, parts);
}

/**
 * Plain text of each TOP-LEVEL block, in order — index n here is the same
 * blockIndex the annotation anchors and the search engine use (ChapterContent
 * stamps data-block-index on the rendered counterparts).
 */
export function extractBlockTexts(doc: unknown): string[] {
  const root = doc as PmNode | null;
  if (!root || !Array.isArray(root.content)) return [];
  return root.content.map((block) => {
    const parts: string[] = [];
    collectText(block, parts);
    return parts.join(" ");
  });
}

/** Whole-chapter minutes straight from the stored ProseMirror JSON. */
export function estimateChapterMinutes(doc: unknown): number {
  return minutesForCounts(countText(extractBlockTexts(doc).join(" ")));
}

/**
 * Per-chapter memoization — a chapter's doc never changes mid-read (the
 * query staleTime says as much), so counting it once is enough. Keep the Map
 * in a ref and hand it here.
 */
export function chapterMinutesCached(
  cache: Map<string, number>,
  chapterId: string,
  doc: unknown,
): number {
  const hit = cache.get(chapterId);
  if (hit !== undefined) return hit;
  const minutes = estimateChapterMinutes(doc);
  cache.set(chapterId, minutes);
  return minutes;
}

/** "~m min left": what remains of the current chapter at a given depth. */
export function minutesLeft(chapterMinutes: number, depth: number): number {
  const clamped = Math.min(1, Math.max(0, depth));
  return Math.max(0, Math.ceil(chapterMinutes * (1 - clamped)));
}
