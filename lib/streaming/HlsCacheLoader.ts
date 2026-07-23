import type {
  FragmentLoaderContext,
  HlsConfig,
  Loader,
  LoaderCallbacks,
  LoaderConfiguration,
  LoaderStats,
} from "hls.js";
import type { CacheManager } from "./CacheManager";
import type { DownloadManager } from "./DownloadManager";
import type { SegmentMeta } from "./types";

function emptyStats(): LoaderStats {
  return {
    aborted: false,
    loaded: 0,
    retry: 0,
    total: 0,
    chunkCount: 0,
    bwEstimate: 0,
    loading: { start: 0, first: 0, end: 0 },
    parsing: { start: 0, end: 0 },
    buffering: { start: 0, first: 0, end: 0 },
  };
}

/**
 * Bridges hls.js's own fragment-loading pipeline to our cache: hls.js still
 * decides *when* it needs a fragment (per its internal buffering logic), but
 * instead of hitting the network directly it asks this loader, which serves
 * an instant cache hit if PrefetchManager already downloaded the segment, or
 * falls back to a real (highest-priority) fetch through the same
 * DownloadManager otherwise. Either way the result lands in CacheManager, so
 * there's a single source of truth regardless of who asked for the segment.
 *
 * hls.js wants a loader *class* (it constructs one per load), so this is a
 * factory that closes over the shared manager instances.
 */
export function createHlsCacheLoader(cache: CacheManager, downloader: DownloadManager) {
  return class HlsCacheLoader implements Loader<FragmentLoaderContext> {
    context: FragmentLoaderContext | null = null;
    stats: LoaderStats = emptyStats();
    private aborted = false;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(_config: HlsConfig) {}

    load(
      context: FragmentLoaderContext,
      _config: LoaderConfiguration,
      callbacks: LoaderCallbacks<FragmentLoaderContext>,
    ): void {
      this.context = context;
      this.aborted = false;

      const frag = context.frag;
      const segment: SegmentMeta = {
        index: typeof frag.sn === "number" ? frag.sn : 0,
        url: context.url,
        startTime: frag.start,
        endTime: frag.start + frag.duration,
        duration: frag.duration,
      };

      // A cache hit resolves on the next microtask regardless of how long the
      // segment actually took to fetch over the network during prefetch. If we
      // reported that as a ~0ms load, hls.js's bandwidth estimator would read it
      // as near-infinite bandwidth and keep pushing ABR toward higher renditions
      // even on a slow connection. Backdating loading.start by the real,
      // previously-recorded fetch duration keeps every sample — cache hit or
      // not — an honest reflection of actual network speed.
      const cachedEntry = cache.get(context.url);
      const replayDurationMs =
        cachedEntry?.status === "downloaded" && cachedEntry.data ? (cachedEntry.downloadDurationMs ?? 0) : 0;
      const callStart = performance.now();
      this.stats.loading.start = callStart - replayDurationMs;

      downloader
        .requestImmediate(segment)
        .then((data) => {
          if (this.aborted) return;
          this.stats.loaded = data.byteLength;
          this.stats.total = data.byteLength;
          this.stats.loading.first = replayDurationMs > 0 ? this.stats.loading.start : performance.now();
          this.stats.loading.end = performance.now();
          callbacks.onSuccess({ url: context.url, data }, this.stats, context, null);
        })
        .catch((err: unknown) => {
          if (this.aborted) return;
          callbacks.onError({ code: 0, text: err instanceof Error ? err.message : String(err) }, context, null, this.stats);
        });
    }

    abort(): void {
      this.aborted = true;
      this.stats.aborted = true;
      if (this.context) downloader.cancel(this.context.url);
    }

    destroy(): void {
      this.abort();
    }

    getCacheAge(): number | null {
      const entry = this.context ? cache.get(this.context.url) : undefined;
      return entry ? (Date.now() - entry.lastAccessed) / 1000 : null;
    }

    getResponseHeader(): string | null {
      return null;
    }
  };
}
