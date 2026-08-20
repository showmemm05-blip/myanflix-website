/**
 * SEARCH TIMING — the one place the app decides *when* a search leaves the browser.
 *
 * Typing is not a request per keystroke. A search field that fires on every
 * character asks the server eight questions to answer one, and the answers
 * arrive out of order. This module owns the whole policy — how long to wait,
 * how short is too short, how long an answer stays good for — so it is tuned
 * in one place rather than re-decided at each call site.
 */
import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * How long the field must be quiet before the term is searched. Trailing edge:
 * the term the user *stopped* on is the one that goes out.
 *
 * The single knob. The mobile app deliberately carries the same number, so a
 * search feels the same on both.
 */
export const SEARCH_DEBOUNCE_MS = 400;

/**
 * Shortest term worth asking the server about. One character matches most of
 * the catalogue, so the round trip buys nothing the unfiltered view isn't
 * already showing — the field shows a hint and waits for the second keystroke.
 */
export const SEARCH_MIN_LENGTH = 2;

/**
 * How long a set of results stays fresh. Re-typing a term that was searched
 * inside this window is served from the React Query cache instead of being
 * asked again — which, with React Query's dedupe of identical in-flight keys,
 * is what keeps the same query from being sent twice.
 *
 * It must never sit BELOW the app-wide default in `lib/query-provider` (60s):
 * this value overrides that default, so a smaller number here would make the
 * catalogue refetch *more* often than it did before, which is the opposite of
 * the point. Mobile's copy of this constant is 30s on purpose — its
 * QueryClient carries no default at all, so there anything above 0 is a win.
 */
export const SEARCH_STALE_TIME_MS = 60_000;

export interface SearchTermState {
  /** The raw field value. Updated synchronously on every keystroke — the input never lags. */
  term: string;
  /** Stable identity, safe to hand straight to a child as `onChange`. */
  setTerm: (value: string) => void;
  /** What the app actually searches for: debounced, trimmed, and `""` until it's long enough. */
  effectiveTerm: string;
  /** True from a keystroke until its term settles — the debounce window is part of the wait. */
  isDebouncing: boolean;
  /** Something typed, but not enough of it yet. Drives a hint, never an error. */
  isTooShort: boolean;
  /** Reset instantly. */
  clear: () => void;
}

/**
 * @param initial seed value (e.g. a shared `?q=` link) — searched on first
 * paint rather than one debounce window later.
 */
export function useSearchTerm(initial = ""): SearchTermState {
  const [term, setTermState] = useState(initial);
  const [settled, setSettled] = useState(() => initial.trim());

  // The trimmed term is what actually goes out, so it — not the raw field — is
  // what the debounce below keys on. Typing (or holding) a trailing space is
  // not a new question; re-arming the timer for it would postpone a search the
  // user finished typing, for as long as they keep the key down.
  const trimmed = term.trim();

  const setTerm = useCallback((value: string) => {
    setTermState(value);
    // Emptying or shortening the field can never produce a request, so there
    // is nothing to wait for. Settle in the SAME tick — both updates are in
    // one event, so React batches them into a single render and the results
    // snap back to the unfiltered view instead of trailing the debounce.
    const trimmedNext = value.trim();
    if (trimmedNext.length < SEARCH_MIN_LENGTH) setSettled(trimmedNext);
  }, []);

  const clear = useCallback(() => {
    setTermState("");
    setSettled("");
  }, []);

  // The trailing edge itself. Each keystroke tears the previous timer down
  // through the cleanup, which also covers unmount.
  useEffect(() => {
    if (trimmed === settled || trimmed.length < SEARCH_MIN_LENGTH) return;
    const timer = setTimeout(() => setSettled(trimmed), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [trimmed, settled]);

  return useMemo(
    () => ({
      term,
      setTerm,
      effectiveTerm: settled.length >= SEARCH_MIN_LENGTH ? settled : "",
      isDebouncing: trimmed !== settled,
      isTooShort: trimmed.length > 0 && trimmed.length < SEARCH_MIN_LENGTH,
      clear,
    }),
    [term, trimmed, settled, setTerm, clear],
  );
}
