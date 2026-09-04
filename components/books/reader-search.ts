"use client";

/**
 * In-book search engine — TEXT (EDITOR) books only; page books are raster
 * WebP with no text layer. Pure logic, no UI: the drawer tab (ReaderSearch)
 * owns input debouncing and rendering, this module owns extraction, matching
 * and the sequential chapter walk.
 *
 * Chapters are fetched through the caller-supplied loader, which is expected
 * to wrap the SAME react-query key/fn the reader itself uses
 * (queryClient.fetchQuery with useBookChapter's key) — searching a book
 * therefore warms the reader's own cache instead of duplicating requests.
 */

import { extractBlockTexts } from "./reading-time";

export const SEARCH_MIN_QUERY_LENGTH = 2;
export const SEARCH_MAX_MATCHES = 200;
export const SEARCH_CONTEXT_CHARS = 40;

export interface ReaderSearchMatch {
  chapterId: string;
  /** Index of the chapter in the book's chapter list. */
  chapterIndex: number;
  /** Top-level block index (same space as annotation anchors). */
  blockIndex: number;
  /** Raw-string offsets into the block's plain text. */
  start: number;
  end: number;
  /** Context, split so the UI can <mark> the term without re-searching. */
  before: string;
  term: string;
  after: string;
  /** 0-based occurrence within the chapter — the jump target's TreeWalker index. */
  occurrenceInChapter: number;
}

/**
 * Case-insensitive (toLowerCase — Burmese has no case so it's unaffected),
 * NFC-normalized matching that still reports offsets on the RAW string. The
 * raw/NFC index map is built by an incremental scan per code point: NFC only
 * ever composes a character with marks that FOLLOW it, so normalizing the
 * running tail pair-wise tracks composition without re-normalizing the whole
 * prefix (O(n), not O(n²)). Text stored by the editor is NFC in practice —
 * the map is then the identity and this is a plain scan.
 */
function findInText(
  rawText: string,
  queryNorm: string,
): { start: number; end: number }[] {
  const results: { start: number; end: number }[] = [];
  if (!queryNorm) return results;

  const raw = rawText;
  const norm = raw.normalize("NFC");

  // Fast path: already NFC (the overwhelmingly common case) — offsets match.
  if (norm === raw) {
    const hay = raw.toLowerCase();
    let from = 0;
    for (;;) {
      const idx = hay.indexOf(queryNorm, from);
      if (idx === -1) break;
      results.push({ start: idx, end: idx + queryNorm.length });
      from = idx + Math.max(1, queryNorm.length);
    }
    return results;
  }

  // Slow path: build normalized string incrementally, recording the raw
  // index each normalized unit began at.
  const normChars: string[] = [];
  const rawStart: number[] = [];
  let i = 0;
  while (i < raw.length) {
    const cp = raw.codePointAt(i)!;
    const ch = String.fromCodePoint(cp);
    const chLen = ch.length;
    if (normChars.length > 0) {
      const prev = normChars[normChars.length - 1];
      const combined = (prev + ch).normalize("NFC");
      if (combined.length < prev.length + ch.length) {
        // Composed into the previous unit — same raw start, new content.
        normChars[normChars.length - 1] = combined;
        i += chLen;
        continue;
      }
    }
    normChars.push(ch.normalize("NFC"));
    rawStart.push(i);
    i += chLen;
  }
  const normJoined = normChars.join("");
  const hay = normJoined.toLowerCase();

  // Map each normalized string offset back to a raw offset.
  const normOffsetToRaw: number[] = new Array(normJoined.length + 1);
  {
    let normPos = 0;
    for (let u = 0; u < normChars.length; u++) {
      for (let k = 0; k < normChars[u].length; k++)
        normOffsetToRaw[normPos + k] = rawStart[u];
      normPos += normChars[u].length;
    }
    normOffsetToRaw[normJoined.length] = raw.length;
  }

  let from = 0;
  for (;;) {
    const idx = hay.indexOf(queryNorm, from);
    if (idx === -1) break;
    const endNorm = idx + queryNorm.length;
    // End offset: raw start of the unit AFTER the match (or end of string).
    const endRaw =
      endNorm >= normJoined.length
        ? raw.length
        : normOffsetToRaw[endNorm];
    results.push({ start: normOffsetToRaw[idx], end: endRaw });
    from = idx + Math.max(1, queryNorm.length);
  }
  return results;
}

function contextOf(text: string, start: number, end: number) {
  const beforeStart = Math.max(0, start - SEARCH_CONTEXT_CHARS);
  const afterEnd = Math.min(text.length, end + SEARCH_CONTEXT_CHARS);
  return {
    before: (beforeStart > 0 ? "…" : "") + text.slice(beforeStart, start),
    term: text.slice(start, end),
    after: text.slice(end, afterEnd) + (afterEnd < text.length ? "…" : ""),
  };
}

/** Normalize a user query for matching. Returns null when too short. */
export function normalizeQuery(query: string): string | null {
  const norm = query.trim().normalize("NFC").toLowerCase();
  return norm.length >= SEARCH_MIN_QUERY_LENGTH ? norm : null;
}

/** All matches within one chapter's block texts. */
export function findChapterMatches(
  blocks: string[],
  queryNorm: string,
  chapterId: string,
  chapterIndex: number,
  limit: number = SEARCH_MAX_MATCHES,
): ReaderSearchMatch[] {
  const matches: ReaderSearchMatch[] = [];
  let occurrence = 0;
  for (let blockIndex = 0; blockIndex < blocks.length; blockIndex++) {
    const text = blocks[blockIndex];
    for (const { start, end } of findInText(text, queryNorm)) {
      matches.push({
        chapterId,
        chapterIndex,
        blockIndex,
        start,
        end,
        ...contextOf(text, start, end),
        occurrenceInChapter: occurrence++,
      });
      if (matches.length >= limit) return matches;
    }
  }
  return matches;
}

/**
 * Per-book cache of extracted block texts, keyed by chapterId. Keep it in a
 * ref: extraction walks the whole doc, and a repeat search must not re-walk
 * chapters it has already seen.
 */
export function getBlocksCached(
  cache: Map<string, string[]>,
  chapterId: string,
  doc: unknown,
): string[] {
  const hit = cache.get(chapterId);
  if (hit) return hit;
  const blocks = extractBlockTexts(doc);
  cache.set(chapterId, blocks);
  return blocks;
}

export interface SearchBookOptions {
  query: string;
  /** The book's chapter list, in reading order. */
  chapters: { id: string }[];
  /**
   * Loads one chapter's block texts — wrap queryClient.fetchQuery(chapter
   * key/fn) + getBlocksCached so the reader cache is warmed, never bypassed.
   */
  loadBlocks: (chapterId: string) => Promise<string[]>;
  /** Called after each chapter completes: (chaptersDone, chaptersTotal, matchesSoFar). */
  onProgress?: (done: number, total: number, matches: number) => void;
  /**
   * Stale-run cancellation — the generation-counter pattern: the UI bumps a
   * counter per keystroke and this returns true for superseded runs. A
   * cancelled run resolves with what it had; the caller discards it.
   */
  isCancelled?: () => boolean;
}

/**
 * Sequential chapter walk, grouped-in-order results, hard-capped at
 * SEARCH_MAX_MATCHES (fetching stops at the cap — no point pulling chapters
 * whose matches would be dropped).
 */
export async function searchBook(
  options: SearchBookOptions,
): Promise<ReaderSearchMatch[]> {
  const { query, chapters, loadBlocks, onProgress, isCancelled } = options;
  const queryNorm = normalizeQuery(query);
  const results: ReaderSearchMatch[] = [];
  if (!queryNorm) return results;

  for (let index = 0; index < chapters.length; index++) {
    if (isCancelled?.()) break;
    let blocks: string[];
    try {
      blocks = await loadBlocks(chapters[index].id);
    } catch {
      // One unreachable chapter must not kill the whole search.
      onProgress?.(index + 1, chapters.length, results.length);
      continue;
    }
    if (isCancelled?.()) break;
    results.push(
      ...findChapterMatches(
        blocks,
        queryNorm,
        chapters[index].id,
        index,
        SEARCH_MAX_MATCHES - results.length,
      ),
    );
    onProgress?.(index + 1, chapters.length, results.length);
    if (results.length >= SEARCH_MAX_MATCHES) break;
  }
  return results;
}
