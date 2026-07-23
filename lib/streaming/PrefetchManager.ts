import type { CacheManager } from "./CacheManager";
import type { DownloadManager } from "./DownloadManager";
import type { SegmentManager } from "./SegmentManager";
import type { PrefetchWindowConfig } from "./types";

/**
 * The orchestrator: given the current playback position, decides which
 * segments should exist in the cache (the sliding ±window), reconciles that
 * against what's already cached/downloading, and drives CacheManager +
 * DownloadManager to converge — prefetching what's missing (segments ahead
 * of playback first, since those are the ones about to stall playback if
 * missing) and evicting/cancelling whatever fell outside the window.
 */
export class PrefetchManager {
  private segmentManager: SegmentManager;
  private cache: CacheManager;
  private downloader: DownloadManager;
  private window: PrefetchWindowConfig;
  private prefetchEnabled = true;

  constructor(
    segmentManager: SegmentManager,
    cache: CacheManager,
    downloader: DownloadManager,
    window: PrefetchWindowConfig,
  ) {
    this.segmentManager = segmentManager;
    this.cache = cache;
    this.downloader = downloader;
    this.window = window;
  }

  setWindow(window: PrefetchWindowConfig): void {
    this.window = window;
  }

  getWindow(): PrefetchWindowConfig {
    return this.window;
  }

  /**
   * Turns speculative background prefetch on/off. On a connection too slow to
   * sustain real-time playback, background prefetch only competes with hls.js's
   * own on-demand fetch for the one segment that's actually about to stall
   * playback — any bandwidth spent guessing ahead is bandwidth taken away from
   * that. Disabling it lets DownloadManager's single slot go entirely to
   * whatever HlsCacheLoader asks for just-in-time, instead of racing a
   * half-finished prefetch and having to cancel it.
   */
  setPrefetchEnabled(enabled: boolean): void {
    this.prefetchEnabled = enabled;
  }

  /** Recompute the desired cache window around `currentTime` and reconcile downloads + eviction. Safe to call on every playback tick or seek. */
  update(currentTime: number): void {
    const windowStart = Math.max(0, currentTime - this.window.beforeSeconds);
    const windowEnd = currentTime + this.window.afterSeconds;
    const segmentsInWindow = this.segmentManager.getSegmentsInRange(windowStart, windowEnd);
    const keepUrls = new Set(segmentsInWindow.map((segment) => segment.url));

    this.cache.evictOutside(keepUrls);
    this.downloader.cancelExcept(keepUrls);

    if (!this.prefetchEnabled) return;

    // Segments after the playhead are more urgent (they're what's about to play);
    // segments behind it exist purely for instant rewind, so they're lower priority
    // and ordered by closeness to "now".
    const ahead = segmentsInWindow
      .filter((segment) => segment.startTime >= currentTime)
      .sort((a, b) => a.startTime - b.startTime);
    const behind = segmentsInWindow
      .filter((segment) => segment.startTime < currentTime)
      .sort((a, b) => b.startTime - a.startTime);

    // These are fire-and-forget: PrefetchManager doesn't need the bytes itself,
    // it just wants CacheManager populated (DownloadManager updates that
    // regardless of whether anyone awaits the promise). Getting cancelled —
    // by falling outside the window on the next tick, or by being preempted
    // for something more urgent — is a normal, expected outcome here, not a
    // failure; swallow it so it doesn't surface as an unhandled rejection.
    let priority = 0;
    for (const segment of ahead) {
      if (!this.cache.has(segment.url)) this.downloader.request(segment, priority).catch(() => {});
      priority++;
    }
    for (const segment of behind) {
      if (!this.cache.has(segment.url)) this.downloader.request(segment, priority).catch(() => {});
      priority++;
    }
  }

  /** Semantic alias for the seek case — same reconciliation, called out separately per spec. */
  onSeek(newTime: number): void {
    this.update(newTime);
  }
}
