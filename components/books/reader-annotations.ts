"use client";

/**
 * Bookmarks, highlights and notes — client-side, per user + book.
 *
 * The backend is deliberately out of scope: these live in localStorage under
 * a versioned key whose flat shape maps 1:1 onto a later POST sync. Notes are
 * not a third entity — a note is a highlight carrying text (the Apple Books
 * model), so "add a note" without a selection is impossible by construction.
 *
 * A tiny external store (Map + subscribers + useSyncExternalStore) rather
 * than component state: the toolbar bookmark toggle, the painted marks in
 * the article and the drawer lists all read the same book's annotations and
 * must agree the instant any of them writes.
 */

import { useCallback, useMemo, useSyncExternalStore } from "react";

export type HighlightColor = "yellow" | "green" | "blue" | "pink";

export const HIGHLIGHT_COLORS: HighlightColor[] = [
  "yellow",
  "green",
  "blue",
  "pink",
];

export interface Bookmark {
  id: string;
  editionId: string;
  chapterId: string;
  /** Page books: the bookmarked page. */
  pageNumber?: number;
  /** Text books: scroll depth (0–1) within the chapter. */
  pct?: number;
  excerpt?: string;
  createdAt: number;
}

export interface Highlight {
  id: string;
  editionId: string;
  chapterId: string;
  /** Index of the top-level block (data-block-index stamped by ChapterContent). */
  blockIndex: number;
  /** Offsets into the block's raw textContent — absent for whole-block anchors. */
  start?: number;
  end?: number;
  /** The highlighted text itself (≤240 chars) — also the repair anchor. */
  excerpt: string;
  color: HighlightColor;
  /** Present = this highlight is a note (≤2000 chars). */
  note?: string;
  createdAt: number;
  updatedAt?: number;
}

export interface AnnotationsState {
  version: 1;
  bookmarks: Bookmark[];
  highlights: Highlight[];
}

/** Hard caps — at the cap we refuse (annotationLimit toast), never evict. */
export const BOOKMARK_LIMIT = 200;
export const HIGHLIGHT_LIMIT = 500;
export const EXCERPT_MAX_CHARS = 240;
export const NOTE_MAX_CHARS = 2000;

const EMPTY_STATE: AnnotationsState = Object.freeze({
  version: 1,
  bookmarks: [],
  highlights: [],
});

function storageKey(userId: string | null | undefined, bookId: string): string {
  return `myanflix-reader-annos:v1:${userId || "anon"}:${bookId}`;
}

export function newAnnotationId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    // Insecure context — a timestamp + random suffix is unique enough for a
    // per-device list.
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

export function trimExcerpt(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > EXCERPT_MAX_CHARS
    ? clean.slice(0, EXCERPT_MAX_CHARS)
    : clean;
}

// ── The store ──────────────────────────────────────────────────────────────

const cache = new Map<string, AnnotationsState>();
const listeners = new Map<string, Set<() => void>>();

function sanitize(raw: unknown): AnnotationsState {
  if (typeof raw !== "object" || raw === null) return EMPTY_STATE;
  const r = raw as Record<string, unknown>;
  const bookmarks = Array.isArray(r.bookmarks)
    ? (r.bookmarks.filter(
        (b) =>
          typeof b === "object" &&
          b !== null &&
          typeof (b as Bookmark).id === "string" &&
          typeof (b as Bookmark).chapterId === "string",
      ) as Bookmark[])
    : [];
  const highlights = Array.isArray(r.highlights)
    ? (r.highlights.filter(
        (h) =>
          typeof h === "object" &&
          h !== null &&
          typeof (h as Highlight).id === "string" &&
          typeof (h as Highlight).chapterId === "string" &&
          typeof (h as Highlight).blockIndex === "number",
      ) as Highlight[])
    : [];
  return { version: 1, bookmarks, highlights };
}

function read(key: string): AnnotationsState {
  const cached = cache.get(key);
  if (cached) return cached;
  let state = EMPTY_STATE;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw) state = sanitize(JSON.parse(raw));
  } catch {
    // Unreadable — start empty; the first write replaces it.
  }
  cache.set(key, state);
  return state;
}

function write(key: string, state: AnnotationsState) {
  cache.set(key, state);
  try {
    window.localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // Kept in memory for the session even when storage is blocked.
  }
  listeners.get(key)?.forEach((fn) => fn());
}

export type AnnotationResult =
  | { ok: true }
  | { ok: false; reason: "limit" | "missing" };

// ── Mutations (pure module functions — usable outside React) ──────────────

export function addBookmark(
  userId: string | null | undefined,
  bookId: string,
  bookmark: Omit<Bookmark, "id" | "createdAt">,
): AnnotationResult {
  const key = storageKey(userId, bookId);
  const state = read(key);
  if (state.bookmarks.length >= BOOKMARK_LIMIT)
    return { ok: false, reason: "limit" };
  const entry: Bookmark = {
    ...bookmark,
    excerpt: bookmark.excerpt ? trimExcerpt(bookmark.excerpt) : undefined,
    id: newAnnotationId(),
    createdAt: Date.now(),
  };
  write(key, { ...state, bookmarks: [...state.bookmarks, entry] });
  return { ok: true };
}

export function removeBookmark(
  userId: string | null | undefined,
  bookId: string,
  id: string,
): AnnotationResult {
  const key = storageKey(userId, bookId);
  const state = read(key);
  const bookmarks = state.bookmarks.filter((b) => b.id !== id);
  if (bookmarks.length === state.bookmarks.length)
    return { ok: false, reason: "missing" };
  write(key, { ...state, bookmarks });
  return { ok: true };
}

export function addHighlight(
  userId: string | null | undefined,
  bookId: string,
  highlight: Omit<Highlight, "id" | "createdAt" | "updatedAt">,
): AnnotationResult {
  const key = storageKey(userId, bookId);
  const state = read(key);
  if (state.highlights.length >= HIGHLIGHT_LIMIT)
    return { ok: false, reason: "limit" };
  const entry: Highlight = {
    ...highlight,
    excerpt: trimExcerpt(highlight.excerpt),
    note: highlight.note?.slice(0, NOTE_MAX_CHARS),
    id: newAnnotationId(),
    createdAt: Date.now(),
  };
  write(key, { ...state, highlights: [...state.highlights, entry] });
  return { ok: true };
}

export function updateHighlight(
  userId: string | null | undefined,
  bookId: string,
  id: string,
  patch: Partial<Pick<Highlight, "color" | "note">>,
): AnnotationResult {
  const key = storageKey(userId, bookId);
  const state = read(key);
  let found = false;
  const highlights = state.highlights.map((h) => {
    if (h.id !== id) return h;
    found = true;
    return {
      ...h,
      ...patch,
      note:
        patch.note !== undefined
          ? patch.note.slice(0, NOTE_MAX_CHARS) || undefined
          : h.note,
      updatedAt: Date.now(),
    };
  });
  if (!found) return { ok: false, reason: "missing" };
  write(key, { ...state, highlights });
  return { ok: true };
}

export function removeHighlight(
  userId: string | null | undefined,
  bookId: string,
  id: string,
): AnnotationResult {
  const key = storageKey(userId, bookId);
  const state = read(key);
  const highlights = state.highlights.filter((h) => h.id !== id);
  if (highlights.length === state.highlights.length)
    return { ok: false, reason: "missing" };
  write(key, { ...state, highlights });
  return { ok: true };
}

export function getAnnotations(
  userId: string | null | undefined,
  bookId: string,
): AnnotationsState {
  if (typeof window === "undefined") return EMPTY_STATE;
  return read(storageKey(userId, bookId));
}

// ── The hook ───────────────────────────────────────────────────────────────

/**
 * Live view of one book's annotations plus bound mutators. Every consumer of
 * the same user+book pair re-renders on any write, from anywhere.
 */
export function useAnnotations(
  userId: string | null | undefined,
  bookId: string,
) {
  const key = storageKey(userId, bookId);

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      let set = listeners.get(key);
      if (!set) {
        set = new Set();
        listeners.set(key, set);
      }
      set.add(onStoreChange);
      return () => {
        set.delete(onStoreChange);
        if (set.size === 0) listeners.delete(key);
      };
    },
    [key],
  );

  const getSnapshot = useCallback(() => read(key), [key]);
  // The server never has annotations — SSR renders the empty state.
  const state = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY_STATE);

  return useMemo(
    () => ({
      bookmarks: state.bookmarks,
      highlights: state.highlights,
      addBookmark: (b: Omit<Bookmark, "id" | "createdAt">) =>
        addBookmark(userId, bookId, b),
      removeBookmark: (id: string) => removeBookmark(userId, bookId, id),
      addHighlight: (h: Omit<Highlight, "id" | "createdAt" | "updatedAt">) =>
        addHighlight(userId, bookId, h),
      updateHighlight: (
        id: string,
        patch: Partial<Pick<Highlight, "color" | "note">>,
      ) => updateHighlight(userId, bookId, id, patch),
      removeHighlight: (id: string) => removeHighlight(userId, bookId, id),
    }),
    [state, userId, bookId],
  );
}
