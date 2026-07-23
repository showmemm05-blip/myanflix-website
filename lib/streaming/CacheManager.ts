import type { CacheEntry, DownloadStatus, SegmentMeta } from "./types";

/**
 * Owns the in-memory table of segment data + lifecycle state. Single source of
 * truth for "is this segment already cached" — every other component reads
 * and writes through here so there's exactly one place duplicate-download
 * prevention and eviction can be enforced.
 *
 * Eviction is two-tiered:
 *   1. Sliding-window: PrefetchManager tells us which URLs are still wanted
 *      (`evictOutside`); anything downloaded outside that set is dropped.
 *   2. LRU safety cap: even within the window, never hold more than
 *      `maxEntries` downloaded segments (guards against pathological window
 *      sizes or fast seeking churn growing memory unbounded).
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

  getStatus(url: string): DownloadStatus {
    return this.entries.get(url)?.status ?? "idle";
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
    this.enforceMaxEntries();
  }

  markFailed(url: string): void {
    const entry = this.entries.get(url);
    if (entry && entry.status !== "downloaded") entry.status = "failed";
  }

  markCancelled(url: string): void {
    const entry = this.entries.get(url);
    if (entry && entry.status !== "downloaded") entry.status = "cancelled";
  }

  /** Sliding-window eviction: drop every downloaded segment whose URL isn't in `keepUrls`. Returns the evicted URLs. */
  evictOutside(keepUrls: Set<string>): string[] {
    const evicted: string[] = [];
    for (const [url, entry] of this.entries) {
      if (entry.status === "downloaded" && !keepUrls.has(url)) {
        this.entries.delete(url);
        evicted.push(url);
      }
    }
    return evicted;
  }

  private enforceMaxEntries(): void {
    if (this.entries.size <= this.maxEntries) return;
    const downloaded = [...this.entries.entries()]
      .filter(([, entry]) => entry.status === "downloaded")
      .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
    while (this.entries.size > this.maxEntries && downloaded.length > 0) {
      const [url] = downloaded.shift()!;
      this.entries.delete(url);
    }
  }

  clear(): void {
    this.entries.clear();
  }

  snapshot(): CacheEntry[] {
    return [...this.entries.values()];
  }
}
