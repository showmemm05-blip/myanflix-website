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
 * A segment fetch that got an HTTP answer, just not a good one. Carries the
 * status so the Hls loader can hand it to hls.js as the response code — the
 * player page keys its recovery on it (403/410 from the cache server mean
 * the signed link is bad or expired, which a retry of the same URL can never
 * fix; only a fresh stream lookup can).
 */
export class SegmentHttpError extends Error {
  // A plain field rather than a constructor parameter property, so the unit
  // tests can load this file under Node's type-stripping (it rejects those).
  readonly status: number;

  constructor(status: number, url: string) {
    super(`Segment fetch failed: ${status} for ${url}`);
    this.name = "SegmentHttpError";
    this.status = status;
  }
}

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
  /**
   * The most urgent priority anyone has asked for, per queued/active URL. A
   * background prefetch that hls.js then asks for itself (requestImmediate on
   * the same URL) is deduped onto the existing download, so this is how that
   * download learns it now belongs to hls.js.
   */
  private priorities = new Map<string, number>();

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
    if (existing) {
      this.raisePriority(segment.url, priority);
      return existing;
    }

    this.cache.ensure(segment);
    this.cache.markQueued(segment.url);

    const promise = new Promise<ArrayBuffer>((resolve, reject) => {
      this.queue.push({ segment, priority, resolve, reject });
      this.queue.sort((a, b) => a.priority - b.priority);
    });
    this.inFlight.set(segment.url, promise);
    this.priorities.set(segment.url, priority);
    this.pump();
    return promise;
  }

  /** Moves an already queued/active download up to `priority` if that is more urgent than what it has. */
  private raisePriority(url: string, priority: number): void {
    const current = this.priorities.get(url);
    if (current === undefined || priority >= current) return;
    this.priorities.set(url, priority);
    if (this.activePriority.has(url)) {
      this.activePriority.set(url, priority);
      return;
    }
    const item = this.queue.find((entry) => entry.segment.url === url);
    if (item) {
      item.priority = priority;
      this.queue.sort((a, b) => a.priority - b.priority);
      this.pump();
    }
  }

  /** True while hls.js itself is waiting on this URL (queued or downloading). */
  private isImmediate(url: string): boolean {
    return this.priorities.get(url) === IMMEDIATE_PRIORITY;
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
      this.priorities.delete(url);
      this.cache.markCancelled(url);
    }
  }

  /**
   * Cancels every background download whose URL isn't in `keepUrls` — called
   * on every tick and seek to drop now-irrelevant prefetch work. Never touches
   * a download hls.js asked for itself: during an Auto quality step up, hls.js
   * fetches the higher quality's piece before the prefetch window has moved to
   * that quality, and killing it here made every step up fail. hls.js cancels
   * its own loads through `cancel()` (HlsCacheLoader.abort).
   */
  cancelExcept(keepUrls: Set<string>): void {
    for (const url of [...this.inFlight.keys()]) {
      if (!keepUrls.has(url) && !this.isImmediate(url)) this.cancel(url);
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
      if (!response.ok) throw new SegmentHttpError(response.status, segment.url);
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
      this.priorities.delete(segment.url);
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
    this.priorities.clear();
    this.activeCount = 0;
  }
}
