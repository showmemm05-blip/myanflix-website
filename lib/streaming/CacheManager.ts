import type { CacheEntry, SegmentMeta } from "./types";

/**
 * Owns the in-memory table of segment data + lifecycle state. Single source of
 * truth for "is this segment already cached" — every other component reads
 * and writes through here so there's exactly one place duplicate-download
 * prevention and eviction can be enforced.
 *
 * Eviction is two-tiered:
 *   1. Sliding-window: PrefetchManager tells us which URLs are still wanted
 *      (`evictOutside`); anything downloaded outside that set is dropped, and
 *      so is any leftover cancelled/failed/idle record outside it.
 *   2. LRU safety cap: even within the window, never hold more than
 *      `maxEntries` downloaded segments (guards against pathological window
 *      sizes or fast seeking churn growing memory unbounded).
 *
 * Only DOWNLOADED entries count against the cap. Cancelled/failed records
 * hold no bytes; counting them once let ~60 of them (normal seeking leaves a
 * few per seek) make every new download evict itself straight away, which
 * PrefetchManager then re-requested on the next tick — an endless
 * re-download loop.
 */
export class CacheManager {
  private entries = new Map<string, CacheEntry>();
  private maxEntries: number;

  constructor(maxEntries = 60) {
    this.maxEntries = maxEntries;
  }

  has(url: string): boolean {
    return this.entries.get(url)?.status === "downloaded";
  }

  get(url: string): CacheEntry | undefined {
    const entry = this.entries.get(url);
    if (entry) entry.lastAccessed = Date.now();
    return entry;
  }

  /** Registers a segment's metadata if we haven't seen it before, without touching its download state. */
  ensure(segment: SegmentMeta): CacheEntry {
    let entry = this.entries.get(segment.url);
    if (!entry) {
      entry = { segment, status: "idle", data: null, lastAccessed: Date.now(), downloadDurationMs: null };
      this.entries.set(segment.url, entry);
    }
    return entry;
  }

  markQueued(url: string): void {
    const entry = this.entries.get(url);
    if (entry && entry.status !== "downloaded") entry.status = "queued";
  }

  markDownloading(url: string): void {
    const entry = this.entries.get(url);
    if (entry && entry.status !== "downloaded") entry.status = "downloading";
  }

  markDownloaded(url: string, data: ArrayBuffer, downloadDurationMs: number): void {
    const entry = this.entries.get(url);
    if (!entry) return;
    entry.status = "downloaded";
    entry.data = data;
    entry.lastAccessed = Date.now();
    entry.downloadDurationMs = downloadDurationMs;
    this.enforceMaxEntries(url);
  }

  markFailed(url: string): void {
    const entry = this.entries.get(url);
    if (entry && entry.status !== "downloaded") entry.status = "failed";
  }

  markCancelled(url: string): void {
    const entry = this.entries.get(url);
    if (entry && entry.status !== "downloaded") entry.status = "cancelled";
  }

  /**
   * Sliding-window eviction: drop every entry whose URL isn't in `keepUrls` —
   * downloaded segments, and the cancelled/failed/idle records left behind by
   * seeks and aborted loads. Queued and downloading entries are never touched
   * here: DownloadManager still owns them (`cancelExcept` deals with those).
   * Returns the evicted URLs.
   */
  evictOutside(keepUrls: Set<string>): string[] {
    const evicted: string[] = [];
    for (const [url, entry] of this.entries) {
      if (keepUrls.has(url)) continue;
      if (entry.status === "queued" || entry.status === "downloading") continue;
      this.entries.delete(url);
      evicted.push(url);
    }
    return evicted;
  }

  /**
   * LRU safety cap over DOWNLOADED entries only. Evicts the least recently
   * used downloaded segments until the count is back within `maxEntries`, and
   * never the one that just arrived (`justDownloaded`).
   */
  private enforceMaxEntries(justDownloaded: string): void {
    const downloaded = [...this.entries.entries()].filter(([, entry]) => entry.status === "downloaded");
    let excess = downloaded.length - this.maxEntries;
    if (excess <= 0) return;
    downloaded.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
    for (const [url] of downloaded) {
      if (excess <= 0) break;
      if (url === justDownloaded) continue;
      this.entries.delete(url);
      excess--;
    }
  }

  clear(): void {
    this.entries.clear();
  }

  snapshot(): CacheEntry[] {
    return [...this.entries.values()];
  }
}
