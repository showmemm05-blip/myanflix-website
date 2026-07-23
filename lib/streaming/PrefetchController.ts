import type Hls from "hls.js";
import { CacheManager } from "./CacheManager";
import { DownloadManager } from "./DownloadManager";
import { SegmentManager } from "./SegmentManager";
import { PrefetchManager } from "./PrefetchManager";
import { PlaybackTracker } from "./PlaybackTracker";
import { createHlsCacheLoader } from "./HlsCacheLoader";
import type { CacheEntry, PrefetchWindowConfig } from "./types";

export interface PrefetchSystemOptions {
  /** Max concurrent segment downloads on a good connection — the ceiling adaptive concurrency scales down from. */
  maxConcurrentDownloads?: number;
  /** LRU safety cap on cached segments, independent of the sliding window. */
  maxCacheEntries?: number;
}

// Roughly "3G"/constrained vs "decent" bandwidth, in bits/sec. Below these
// thresholds, splitting the pipe across several concurrent segment fetches
// means none of them finish in time — better to give the whole connection to
// whichever segment is most urgent.
const LOW_BANDWIDTH_BPS = 1_000_000;
const MEDIUM_BANDWIDTH_BPS = 3_000_000;

function concurrencyForBandwidth(bandwidthEstimateBps: number, ceiling: number): number {
  if (bandwidthEstimateBps < LOW_BANDWIDTH_BPS) return 1;
  if (bandwidthEstimateBps < MEDIUM_BANDWIDTH_BPS) return Math.min(2, ceiling);
  return ceiling;
}

export interface PrefetchStatus {
  downloadedCount: number;
  downloadingCount: number;
  queuedCount: number;
  /** Span of currently-cached, downloaded segments — null if nothing's downloaded yet. */
  cachedRangeStart: number | null;
  cachedRangeEnd: number | null;
}

export interface PrefetchHandle {
  setWindow: (window: PrefetchWindowConfig) => void;
  getWindow: () => PrefetchWindowConfig;
  getCacheSnapshot: () => CacheEntry[];
  getStatus: () => PrefetchStatus;
  destroy: () => void;
}

/**
 * Entry point for the whole prefetch subsystem. Two-step by necessity: the
 * custom Hls fragment loader has to exist *before* the Hls instance is
 * constructed (it's passed in as `fLoader` config), but SegmentManager needs
 * the Hls instance to exist first (it reads parsed level data off it). So:
 *
 *   const system = createPrefetchSystem({ beforeSeconds: 10, afterSeconds: 10 });
 *   const hls = new Hls({ fLoader: system.loaderClass, ...otherConfig });
 *   hls.attachMedia(video);
 *   hls.loadSource(playlistUrl);
 *   const handle = system.attach(hls, video); // starts tracking playback + prefetching
 *   // ...later, on cleanup...
 *   handle.destroy();
 *   hls.destroy();
 */
export function createPrefetchSystem(window: PrefetchWindowConfig, options: PrefetchSystemOptions = {}) {
  const cache = new CacheManager(options.maxCacheEntries);
  const downloader = new DownloadManager(cache, options.maxConcurrentDownloads);
  const loaderClass = createHlsCacheLoader(cache, downloader);

  return {
    loaderClass,
    cache,
    downloader,

    /** Call once the Hls instance is constructed and media is attached to start playback tracking + prefetching. */
    attach(hls: Hls, video: HTMLVideoElement): PrefetchHandle {
      const segmentManager = new SegmentManager(hls);
      const prefetchManager = new PrefetchManager(segmentManager, cache, downloader, window);
      const concurrencyCeiling = options.maxConcurrentDownloads ?? 3;

      // hls.js's own bandwidth estimate (now fed only honest samples — see
      // HlsCacheLoader) doubles as our signal for how many segments should
      // fetch in parallel: full ceiling on a fast link, strictly one-at-a-time
      // on something 3G-like. Below that same floor, background prefetch is
      // switched off entirely — with only one download slot, a speculative
      // prefetch and hls.js's own just-in-time request for the segment
      // actually about to play would otherwise fight over that one slot,
      // repeatedly cancelling whichever download loses.
      const adaptConcurrency = () => {
        const bandwidthEstimate = hls.bandwidthEstimate;
        downloader.setMaxConcurrent(concurrencyForBandwidth(bandwidthEstimate, concurrencyCeiling));
        prefetchManager.setPrefetchEnabled(bandwidthEstimate >= LOW_BANDWIDTH_BPS);
      };
      adaptConcurrency();

      const tracker = new PlaybackTracker(video, {
        onPositionChange: (time) => {
          adaptConcurrency();
          prefetchManager.update(time);
        },
        onSeek: (time) => prefetchManager.onSeek(time),
      });

      return {
        setWindow: (nextWindow) => prefetchManager.setWindow(nextWindow),
        getWindow: () => prefetchManager.getWindow(),
        getCacheSnapshot: () => cache.snapshot(),
        getStatus: () => {
          const snapshot = cache.snapshot();
          const downloaded = snapshot.filter((entry) => entry.status === "downloaded");
          const downloading = snapshot.filter((entry) => entry.status === "downloading");
          const queued = snapshot.filter((entry) => entry.status === "queued");
          return {
            downloadedCount: downloaded.length,
            downloadingCount: downloading.length,
            queuedCount: queued.length,
            cachedRangeStart: downloaded.length ? Math.min(...downloaded.map((e) => e.segment.startTime)) : null,
            cachedRangeEnd: downloaded.length ? Math.max(...downloaded.map((e) => e.segment.endTime)) : null,
          };
        },
        destroy: () => {
          tracker.destroy();
          segmentManager.destroy();
          downloader.destroy();
          cache.clear();
        },
      };
    },
  };
}

export type { PrefetchWindowConfig, CacheEntry, SegmentMeta, DownloadStatus } from "./types";
