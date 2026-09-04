import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { bookService } from "@/services/api/bookService";
import { SEARCH_STALE_TIME_MS } from "@/hooks/use-search-term";
import type { BookQuery } from "@/types/book";

/**
 * The one place this key is spelled. Both readers write the PATCH response
 * straight back into it (staleTime is Infinity on purpose, so nothing else
 * would ever refresh it), and a typo between writer and reader would show a
 * stale bookmark rather than fail loudly.
 */
export function readingProgressKey(bookId: string, editionId: string | null) {
  return ["book", bookId, "edition", editionId, "reading-progress"] as const;
}

/**
 * The library query — the books counterpart of `useMovies`, and for the same
 * reasons: keyed per query so a late response can only ever land in its own
 * cache entry, signal-forwarded so a superseded search is aborted mid-flight,
 * and `keepPreviousData` so the shelf never flashes empty between terms.
 */
export function useBooks(query: BookQuery = {}) {
  return useQuery({
    queryKey: ["books", query],
    queryFn: ({ signal }) => bookService.getBooks(query, { signal }),
    placeholderData: keepPreviousData,
    staleTime: SEARCH_STALE_TIME_MS,
  });
}

export function useBook(id: string) {
  return useQuery({
    queryKey: ["book", id],
    queryFn: () => bookService.getBookById(id),
    enabled: Boolean(id),
  });
}

/**
 * The chapter list of one language. Every key below is scoped by edition:
 * two languages of a title are different content, and sharing a cache entry
 * between them would show the wrong chapters after a language switch.
 */
export function useBookChapters(bookId: string, editionId: string | null) {
  return useQuery({
    queryKey: ["book", bookId, "edition", editionId, "chapters"],
    queryFn: ({ signal }) =>
      bookService.getChapters(bookId, editionId!, { signal }),
    enabled: Boolean(bookId && editionId),
    staleTime: 5 * 60_000,
  });
}

/**
 * The numbered contents tree of one language — what every table of contents
 * renders from. Scoped and cached exactly like the flat chapter list, which
 * the readers keep for prev/next.
 */
export function useBookContents(bookId: string, editionId: string | null) {
  return useQuery({
    queryKey: ["book", bookId, "edition", editionId, "contents"],
    queryFn: ({ signal }) =>
      bookService.getContents(bookId, editionId!, { signal }),
    enabled: Boolean(bookId && editionId),
    staleTime: 5 * 60_000,
  });
}

/** One chapter's document. Kept fresh for a while — a chapter never changes mid-read. */
export function useBookChapter(
  bookId: string,
  editionId: string | null,
  chapterId: string | null,
) {
  return useQuery({
    queryKey: ["book", bookId, "edition", editionId, "chapter", chapterId],
    queryFn: ({ signal }) =>
      bookService.getChapter(bookId, editionId!, chapterId!, { signal }),
    enabled: Boolean(bookId && editionId && chapterId),
    staleTime: 5 * 60_000,
  });
}

/**
 * The full page manifest for ONE CHAPTER of a PDF book. Long staleTime because a published
 * book's pages are immutable — only the IMAGES are fetched lazily, and the
 * browser caches those through the cache server for a week.
 */
export function useBookPages(
  bookId: string,
  editionId: string | null,
  chapterId: string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: ["book", bookId, "edition", editionId, "chapter", chapterId, "pages"],
    queryFn: ({ signal }) =>
      bookService.getPages(bookId, editionId!, chapterId!, { signal }),
    enabled: Boolean(bookId && editionId && chapterId) && enabled,
    staleTime: 30 * 60_000,
  });
}

/**
 * Where this reader left off. `enabled` carries the auth gate — the endpoint
 * needs a Bearer token, so a logged-out visitor must not fire it (the
 * `useContinueWatching(Boolean(user))` pattern).
 */
export function useReadingProgress(
  bookId: string,
  editionId: string | null,
  enabled: boolean,
) {
  return useQuery({
    queryKey: readingProgressKey(bookId, editionId),
    queryFn: () => bookService.getReadingProgress(bookId, editionId!),
    enabled: Boolean(bookId && editionId) && enabled,
    // The reader writes this constantly; refetching it would fight the
    // in-memory position the reader is already authoritative for.
    staleTime: Infinity,
  });
}
