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

    // `keepUrls` is main-timeline only — SegmentManager enumerates the video
    // level hls.js is loading and nothing else — so cancelExcept() aborts any
    // other BACKGROUND download in flight. Downloads hls.js asked for itself
    // (HlsCacheLoader → requestImmediate) are never cancelled here, even when
    // they belong to a different quality during a switch, and evictOutside()
    // never drops a queued/downloading entry, so the piece hls.js is waiting
    // for always survives. Subtitle VTTs stay out of DownloadManager entirely
    // (HlsCacheLoader fetches them directly).
    this.cache.evictOutside(keepUrls);
    this.downloader.cancelExcept(keepUrls);

    if (!this.prefetchEnabled) return;

    // Only the segment under the playhead and the ones after it are ever
    // fetched — they're what's about to play. Segments that end before the
    // playhead stay in `keepUrls` above, so whatever is already cached
    // survives for an instant rewind (in the quality hls.js is loading — a
    // rewind is fetched in that quality, so after a switch the old quality's
    // copies are let go), but nothing behind is downloaded: after
    // a forward seek that would only fetch video the viewer just skipped past
    // (hls.js's own backBufferLength already keeps recently played video).
    // During normal playback those segments were fetched as "ahead" anyway.
    // While a quality switch is on its way to the screen, hls.js already holds
    // the stretch up to where it started loading the new quality (in the old
    // quality) and never asks for it again, so the look-ahead starts there.
    const aheadFrom = this.segmentManager.lookAheadStart(currentTime);
    const ahead = segmentsInWindow
      .filter((segment) => segment.endTime > aheadFrom)
      .sort((a, b) => a.startTime - b.startTime);

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
  }

  /** Semantic alias for the seek case — same reconciliation, called out separately per spec. */
  onSeek(newTime: number): void {
    this.segmentManager.resetLoadPosition();
    this.update(newTime);
  }
}
