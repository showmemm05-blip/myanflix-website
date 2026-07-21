import type { CacheManager } from "./CacheManager";
import type { SegmentMeta } from "./types";

interface QueueItem {
  segment: SegmentMeta;
  priority: number;
  resolve: (data: ArrayBuffer) => void;
  reject: (err: unknown) => void;
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

  constructor(cache: CacheManager, maxConcurrent = 3) {
    this.cache = cache;
    this.maxConcurrent = maxConcurrent;
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
    return this.request(segment, -Infinity);
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
    while (this.activeCount < this.maxConcurrent && this.queue.length > 0) {
      const item = this.queue.shift();
      if (item) this.startDownload(item);
    }
  }

  private async startDownload(item: QueueItem): Promise<void> {
    const { segment } = item;
    this.activeCount++;
    const controller = new AbortController();
    this.controllers.set(segment.url, controller);
    this.cache.markDownloading(segment.url);

    try {
      const response = await fetch(segment.url, { signal: controller.signal });
      if (!response.ok) throw new Error(`Segment fetch failed: ${response.status}`);
      const data = await response.arrayBuffer();
      this.cache.markDownloaded(segment.url, data);
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
    this.activeCount = 0;
  }
}
