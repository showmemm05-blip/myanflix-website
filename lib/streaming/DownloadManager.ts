import type { CacheManager } from "./CacheManager";
import type { SegmentMeta } from "./types";

interface QueueItem {
  segment: SegmentMeta;
  priority: number;
  resolve: (data: ArrayBuffer) => void;
  reject: (err: unknown) => void;
}

/** Priority used for the segment hls.js needs right now to keep playing — always jumps the queue. */
const IMMEDIATE_PRIORITY = -Infinity;

/**
 * Concurrency-limited, cancellable, priority-ordered fetch queue for segment
 * bytes. Every caller (PrefetchManager's background prefetch, or the custom
 * Hls loader's just-in-time fetch) goes through `request()`, which dedupes
 * against in-flight/queued work for the same URL so a segment is never
 * downloaded twice concurrently.
 */
export class DownloadManager {
  private cache: CacheManager;
  private maxConcurrent: number;
  private activeCount = 0;
  private queue: QueueItem[] = [];
  private inFlight = new Map<string, Promise<ArrayBuffer>>();
  private controllers = new Map<string, AbortController>();
  private activePriority = new Map<string, number>();

  constructor(cache: CacheManager, maxConcurrent = 3) {
    this.cache = cache;
    this.maxConcurrent = maxConcurrent;
  }

  /**
   * Adjusts how many segments may download in parallel. Call this with a lower
   * number when the connection is slow — splitting a constrained pipe across
   * several concurrent fetches means none of them finish quickly, which is
   * exactly what stalls playback; a single fetch gets the whole pipe instead.
   */
  setMaxConcurrent(n: number): void {
    this.maxConcurrent = Math.max(1, n);
    this.pump();
  }

  /** Queue a segment for download. Lower `priority` values are served first. Resolves instantly if already cached. */
  request(segment: SegmentMeta, priority: number): Promise<ArrayBuffer> {
    const cached = this.cache.get(segment.url);
    if (cached?.status === "downloaded" && cached.data) return Promise.resolve(cached.data);

    const existing = this.inFlight.get(segment.url);
    if (existing) return existing;

    this.cache.ensure(segment);
    this.cache.markQueued(segment.url);

    const promise = new Promise<ArrayBuffer>((resolve, reject) => {
      this.queue.push({ segment, priority, resolve, reject });
      this.queue.sort((a, b) => a.priority - b.priority);
    });
    this.inFlight.set(segment.url, promise);
    this.pump();
    return promise;
  }

  /** Used by the Hls fragment loader — same dedupe/cache-first behavior, just always highest priority. */
  requestImmediate(segment: SegmentMeta): Promise<ArrayBuffer> {
    return this.request(segment, IMMEDIATE_PRIORITY);
  }

  /** Cancels a single segment's queued or in-flight download, if any. */
  cancel(url: string): void {
    const controller = this.controllers.get(url);
    if (controller) {
      controller.abort();
      return;
    }
    const index = this.queue.findIndex((item) => item.segment.url === url);
    if (index >= 0) {
      const [item] = this.queue.splice(index, 1);
      item.reject(new Error("cancelled"));
      this.inFlight.delete(url);
      this.cache.markCancelled(url);
    }
  }

  /** Cancels every queued/active download whose URL isn't in `keepUrls` — called on seek to drop now-irrelevant work. */
  cancelExcept(keepUrls: Set<string>): void {
    for (const url of [...this.inFlight.keys()]) {
      if (!keepUrls.has(url)) this.cancel(url);
    }
  }

  private pump(): void {
    while (this.queue.length > 0) {
      if (this.activeCount < this.maxConcurrent) {
        const item = this.queue.shift();
        if (item) this.startDownload(item);
        continue;
      }

      // All slots are busy. If the segment hls.js needs *right now* is stuck
      // behind background prefetch, don't make playback wait for a slot to
      // free up on its own — cancel the least-urgent active download (a
      // prefetch-ahead segment, not another immediate one) to make room.
      // That segment isn't lost: it's still in the cache window and will be
      // re-requested on the next tick.
      const nextItem = this.queue[0];
      if (nextItem.priority === IMMEDIATE_PRIORITY) {
        const worst = this.worstActiveEntry();
        if (worst && worst[1] > IMMEDIATE_PRIORITY) {
          this.cancel(worst[0]);
        }
      }
      break;
    }
  }

  private worstActiveEntry(): [string, number] | null {
    let result: [string, number] | null = null;
    for (const entry of this.activePriority) {
      if (!result || entry[1] > result[1]) result = entry;
    }
    return result;
  }

  private async startDownload(item: QueueItem): Promise<void> {
    const { segment, priority } = item;
    this.activeCount++;
    const controller = new AbortController();
    this.controllers.set(segment.url, controller);
    this.activePriority.set(segment.url, priority);
    this.cache.markDownloading(segment.url);
    const startedAt = performance.now();

    try {
      const response = await fetch(segment.url, { signal: controller.signal });
      if (!response.ok) throw new Error(`Segment fetch failed: ${response.status}`);
      const data = await response.arrayBuffer();
      this.cache.markDownloaded(segment.url, data, performance.now() - startedAt);
      item.resolve(data);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        this.cache.markCancelled(segment.url);
      } else {
        this.cache.markFailed(segment.url);
      }
      item.reject(err);
    } finally {
      this.activeCount--;
      this.controllers.delete(segment.url);
      this.activePriority.delete(segment.url);
      this.inFlight.delete(segment.url);
      this.pump();
    }
  }

  destroy(): void {
    for (const controller of this.controllers.values()) controller.abort();
    for (const item of this.queue) item.reject(new Error("destroyed"));
    this.queue = [];
    this.inFlight.clear();
    this.controllers.clear();
    this.activePriority.clear();
    this.activeCount = 0;
  }
}
