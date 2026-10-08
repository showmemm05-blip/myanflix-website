"use client";

import { useCallback, useSyncExternalStore } from "react";

import { SEARCH_MIN_LENGTH } from "@/hooks/use-search-term";

/** How many past searches the list keeps (the board's six chips; same as the mobile app). */
const RECENT_SEARCH_LIMIT = 6;
/** The API's own term limit — anything longer was never a real search. */
const MAX_TERM_LENGTH = 200;
const KEY_PREFIX = "myanflix-recent-searches:";
/** Same-tab writes don't fire `storage`, so the hook listens for this too. */
const CHANGE_EVENT = "myanflix:recent-searches";
const EMPTY: readonly string[] = Object.freeze([]);

/** The last parsed value per key, so the snapshot keeps its identity while nothing changed. */
let cache: { key: string; raw: string | null; terms: readonly string[] } | null = null;

function readTerms(key: string): readonly string[] {
  let raw: string | null;
  try {
    raw = localStorage.getItem(key);
  } catch {
    return EMPTY;
  }
  if (cache && cache.key === key && cache.raw === raw) return cache.terms;
  let terms: readonly string[] = EMPTY;
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        terms = parsed
          .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
          .map((v) => v.trim().slice(0, MAX_TERM_LENGTH))
          .slice(0, RECENT_SEARCH_LIMIT);
      }
    } catch {
      // Malformed storage reads as "no recent searches".
    }
  }
  cache = { key, raw, terms };
  return terms;
}

function writeTerms(key: string, terms: readonly string[] | null) {
  try {
    if (terms && terms.length > 0) localStorage.setItem(key, JSON.stringify(terms));
    else localStorage.removeItem(key);
  } catch {
    // Storage blocked (private window): the list simply doesn't persist.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

const serverSnapshot = () => EMPTY;

/**
 * RECENT SEARCHES — "Only on this device".
 *
 * Kept in this browser's localStorage and nowhere else (the backend has no
 * search history). The list is filed per account — a guest list and one per
 * signed-in user — so one person's searches are never shown to the next
 * person who signs in on the same computer. Newest first, no duplicates,
 * at most six, and only terms long enough to have actually been searched.
 */
export function useRecentSearches(userId: string | null) {
  const key = `${KEY_PREFIX}${userId ?? "guest"}`;
  const terms = useSyncExternalStore(subscribe, () => readTerms(key), serverSnapshot);

  const remember = useCallback(
    (term: string) => {
      const trimmed = term.trim().slice(0, MAX_TERM_LENGTH);
      if (trimmed.length < SEARCH_MIN_LENGTH) return;
      const current = readTerms(key);
      if (current[0] === trimmed) return;
      const lower = trimmed.toLowerCase();
      writeTerms(
        key,
        [trimmed, ...current.filter((t) => t.toLowerCase() !== lower)].slice(0, RECENT_SEARCH_LIMIT),
      );
    },
    [key],
  );

  const clear = useCallback(() => writeTerms(key, null), [key]);

  return { terms, remember, clear };
}
