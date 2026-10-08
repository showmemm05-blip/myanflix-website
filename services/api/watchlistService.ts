/** The backend has no watchlist model yet, so this is persisted client-side only (per-browser). */
const WATCHLIST_KEY = "myanflix_watchlist";

function readIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(WATCHLIST_KEY);
    return new Set<string>(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

// ─ A tiny external store over the saved ids, for React's useSyncExternalStore:
// every write tells the subscribers, and the snapshot is the SAME array until
// the stored list actually changes (React requires a stable snapshot).
const listeners = new Set<() => void>();
const EMPTY_IDS: readonly string[] = Object.freeze([]);
let snapshotRaw: string | null | undefined;
let snapshotIds: readonly string[] = EMPTY_IDS;

function writeIds(ids: Set<string>): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(WATCHLIST_KEY, JSON.stringify([...ids]));
  for (const listener of listeners) listener();
}

function idsSnapshot(): readonly string[] {
  if (typeof window === "undefined") return EMPTY_IDS;
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(WATCHLIST_KEY);
  } catch {
    return EMPTY_IDS;
  }
  if (raw !== snapshotRaw) {
    snapshotRaw = raw;
    snapshotIds = Object.freeze([...readIds()]);
  }
  return snapshotIds;
}

export const watchlistService = {
  getWatchlistIds(): string[] {
    return [...readIds()];
  },

  /** useSyncExternalStore: subscribe to saves and removals. */
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  /** useSyncExternalStore: the saved ids, in the order they were saved (stable between changes). */
  getIdsSnapshot: idsSnapshot,

  /** useSyncExternalStore: the server (and hydration) snapshot — nothing saved. */
  getServerIdsSnapshot(): readonly string[] {
    return EMPTY_IDS;
  },

  addToWatchlist(movieId: string): void {
    const ids = readIds();
    ids.add(movieId);
    writeIds(ids);
  },

  removeFromWatchlist(movieId: string): void {
    const ids = readIds();
    ids.delete(movieId);
    writeIds(ids);
  },
};
