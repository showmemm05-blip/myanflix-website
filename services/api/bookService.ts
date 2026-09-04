import { apiClient, API_ORIGIN, type RequestSignalOptions } from "./apiClient";
import type { PaginatedResponse } from "@/types/api";
import type {
  Book,
  BookChapter,
  BookChapterSummary,
  BookContents,
  BookDetail,
  BookPage,
  BookQuery,
  BookReadingProgress,
} from "@/types/book";

/** Page/cover URLs come back absolute already; this only covers the relative-path fallback videoService also guards against. */
function absolute(url: string): string {
  return url.startsWith("http") ? url : `${API_ORIGIN}${url}`;
}

export const bookService = {
  /**
   * The library read. Regular users only ever receive PUBLISHED books —
   * that filter lives in the backend service, not in a query param, so
   * there is nothing to pass here and nothing a client could override.
   */
  getBooks(
    query: BookQuery = {},
    options: RequestSignalOptions = {},
  ): Promise<PaginatedResponse<Book>> {
    return apiClient.get<PaginatedResponse<Book>>("/books", {
      ...options,
      params: query,
    });
  },

  async getBookById(id: string): Promise<BookDetail | null> {
    try {
      return await apiClient.get<BookDetail>(`/books/${id}`);
    } catch {
      return null;
    }
  },

  /**
   * The chapter list of ONE language. Chapters hang off an edition, not off
   * the book, so the language is part of the address rather than a filter.
   */
  getChapters(
    bookId: string,
    editionId: string,
    options: RequestSignalOptions = {},
  ): Promise<BookChapterSummary[]> {
    return apiClient.get<BookChapterSummary[]>(
      `/books/${bookId}/editions/${editionId}/chapters`,
      options,
    );
  },

  /**
   * The numbered contents tree of ONE language: parts, their chapters, and
   * each chapter's sections. A part-less book comes back as `parts: []` with
   * every chapter under `chapters` — the same rows `getChapters` returns.
   */
  getContents(
    bookId: string,
    editionId: string,
    options: RequestSignalOptions = {},
  ): Promise<BookContents> {
    return apiClient.get<BookContents>(
      `/books/${bookId}/editions/${editionId}/contents`,
      options,
    );
  },

  /** One chapter with its ProseMirror document — the written reader's per-chapter fetch. */
  getChapter(
    bookId: string,
    editionId: string,
    chapterId: string,
    options: RequestSignalOptions = {},
  ): Promise<BookChapter> {
    return apiClient.get<BookChapter>(
      `/books/${bookId}/editions/${editionId}/chapters/${chapterId}`,
      options,
    );
  },

  /**
   * Every converted page of a PDF book, in reading order. Returned whole
   * rather than paginated: it is a few hundred bytes per page, and the
   * reader needs the full list up front to size its scroll and jump to an
   * arbitrary page. The IMAGES are what get loaded lazily, not this.
   */
  async getPages(
    bookId: string,
    editionId: string,
    chapterId: string,
    options: RequestSignalOptions = {},
  ): Promise<BookPage[]> {
    const pages = await apiClient.get<BookPage[]>(
      `/books/${bookId}/editions/${editionId}/chapters/${chapterId}/pages`,
      options,
    );
    return pages.map((page) => ({ ...page, url: absolute(page.url) }));
  },

  /** Null when this reader has never opened this language. Requires auth. */
  getReadingProgress(
    bookId: string,
    editionId: string,
  ): Promise<BookReadingProgress | null> {
    return apiClient.get<BookReadingProgress | null>(
      `/books/${bookId}/editions/${editionId}/reading-progress`,
    );
  },

  /** Fire-and-forget from the reader's point of view — see the readers' save throttles. */
  updateReadingProgress(
    bookId: string,
    editionId: string,
    position: {
      chapterId?: string;
      pageNumber?: number;
      /** Omitted (not null) when unknown, so a section-less book sends the body it always did. */
      sectionId?: string;
      progress: number;
    },
  ): Promise<BookReadingProgress> {
    return apiClient.patch<BookReadingProgress>(
      `/books/${bookId}/editions/${editionId}/reading-progress`,
      position,
    );
  },
};
