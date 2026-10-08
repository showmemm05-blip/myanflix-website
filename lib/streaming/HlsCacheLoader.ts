import type {
  FragmentLoaderContext,
  HlsConfig,
  Loader,
  LoaderCallbacks,
  LoaderConfiguration,
  LoaderStats,
} from "hls.js";
import type { CacheManager } from "./CacheManager";
// Type-only on purpose: with no runtime import this file loads under Node's
// type-stripping, which is what lib/streaming/*.test.ts run on.
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
 * `PlaylistLevelType.MAIN` as a literal. hls.js declares that enum as an
 * ambient `const enum`, which TypeScript refuses to import under
 * `isolatedModules` — and the value is part of the manifest format anyway.
 */
const MAIN_FRAGMENT_TYPE = "main";

function isMainFragment(context: FragmentLoaderContext): boolean {
  return (context.frag.type as string) === MAIN_FRAGMENT_TYPE;
}

/**
 * What hls.js's `onError` callback gets. The HTTP status rides along as
 * `code` when there was one (it surfaces as `data.response.code` on the
 * ERROR event, which is how the player tells an expired signed link from a
 * dropped connection); anything else is a network-level failure, `code: 0`,
 * exactly as before.
 */
function loaderError(err: unknown): { code: number; text: string } {
  // DownloadManager's SegmentHttpError and the direct-fetch error below both
  // carry the HTTP status as `status`; read it structurally rather than by
  // `instanceof`, which would need a runtime import (see the import note).
  const status = err instanceof Error ? (err as { status?: unknown }).status : undefined;
  return {
    code: typeof status === "number" ? status : 0,
    text: err instanceof Error ? err.message : String(err),
  };
}

/** A non-2xx answer on the direct (non-cached) fetch path, status attached. */
class DirectFetchError extends Error {
  readonly status: number;

  constructor(status: number, url: string) {
    super(`Segment fetch failed: ${status} for ${url}`);
    this.name = "DirectFetchError";
    this.status = status;
  }
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
 * That applies to the MAIN video timeline only. hls.js routes *every*
 * fragment through `config.fLoader`, subtitle renditions included, but the
 * prefetch system models one timeline: SegmentManager enumerates
 * `levels[loadLevel].details.fragments`, and PrefetchManager reconciles
 * against exactly that set (evicting and cancelling background work outside
 * it). A subtitle "segment" has no place on that video timeline, so alt
 * renditions take a plain fetch, which also keeps them out of the single
 * download slot that playback continuity depends on.
 *
 * hls.js wants a loader *class* (it constructs one per load), so this is a
 * factory that closes over the shared manager instances.
 */
export function createHlsCacheLoader(cache: CacheManager, downloader: DownloadManager) {
  return class HlsCacheLoader implements Loader<FragmentLoaderContext> {
    context: FragmentLoaderContext | null = null;
    stats: LoaderStats = emptyStats();
    private aborted = false;
    /**
     * True once onSuccess/onError has been delivered. hls.js calls
     * `destroy()` on every loader right after a successful load, and the
     * stats object is shared with `frag.stats`: marking it aborted at that
     * point made AbrController.onFragBuffered skip the bandwidth sample for
     * EVERY fragment, so the estimate never left its 1 Mbps starting value
     * and Auto sat on the lowest rendition (owner report, 2026-10-08).
     * hls.js's own XHR loader only flags `aborted` while the request is still
     * open; this mirrors that.
     */
    private done = false;
    private directFetch: AbortController | null = null;

    // hls.js constructs one loader per load and hands it the config; this
    // implementation reads nothing from it.
    constructor(_config: HlsConfig) {}

    load(
      context: FragmentLoaderContext,
      _config: LoaderConfiguration,
      callbacks: LoaderCallbacks<FragmentLoaderContext>,
    ): void {
      this.context = context;
      this.aborted = false;

      if (!isMainFragment(context)) {
        this.loadDirect(context, callbacks);
        return;
      }

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
          this.done = true;
          this.stats.loaded = data.byteLength;
          this.stats.total = data.byteLength;
          this.stats.loading.first = replayDurationMs > 0 ? this.stats.loading.start : performance.now();
          this.stats.loading.end = performance.now();
          callbacks.onSuccess({ url: context.url, data }, this.stats, context, null);
        })
        .catch((err: unknown) => {
          if (this.aborted) return;
          this.done = true;
          callbacks.onError(loaderError(err), context, null, this.stats);
        });
    }

    /**
     * The plain-fetch path for anything that isn't a main-timeline fragment
     * (today: the WebVTT subtitle renditions). Bypasses CacheManager as well
     * as DownloadManager — the cache is keyed and evicted by video-timeline
     * position, which a whole-title subtitle "segment" has no place in.
     */
    private loadDirect(
      context: FragmentLoaderContext,
      callbacks: LoaderCallbacks<FragmentLoaderContext>,
    ): void {
      const controller = new AbortController();
      this.directFetch = controller;
      this.stats.loading.start = performance.now();

      const headers: Record<string, string> = { ...context.headers };
      if (context.rangeStart !== undefined && context.rangeEnd !== undefined) {
        headers.Range = `bytes=${context.rangeStart}-${context.rangeEnd - 1}`;
      }

      fetch(context.url, { signal: controller.signal, headers })
        .then((response) => {
          if (!response.ok) throw new DirectFetchError(response.status, context.url);
          this.stats.loading.first = performance.now();
          return response.arrayBuffer();
        })
        .then((data) => {
          if (this.aborted) return;
          this.done = true;
          this.stats.loaded = data.byteLength;
          this.stats.total = data.byteLength;
          this.stats.loading.end = performance.now();
          callbacks.onSuccess({ url: context.url, data }, this.stats, context, null);
        })
        .catch((err: unknown) => {
          if (this.aborted) return;
          this.done = true;
          callbacks.onError(loaderError(err), context, null, this.stats);
        });
    }

    abort(): void {
      // Nothing to abort once the result has been delivered — and the stats
      // must stay un-aborted so the bandwidth sample is taken (see `done`).
      if (this.done) return;
      this.aborted = true;
      this.stats.aborted = true;
      this.directFetch?.abort();
      if (this.context && isMainFragment(this.context)) downloader.cancel(this.context.url);
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
