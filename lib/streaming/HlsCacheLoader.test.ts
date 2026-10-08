/**
 * Checks the hls.js fragment loader's stats contract (the Auto quality
 * "stuck at 240p" bug, 2026-10-08): hls.js destroys every loader right after
 * a successful load, and `frag.stats` IS the loader's stats object, so a
 * destroy that flags `aborted` makes AbrController skip the bandwidth sample
 * for every fragment. A finished load must keep `aborted === false`; a load
 * still in flight must still be cancellable.
 * Runs on Node's own test runner: `node --test lib/streaming/HlsCacheLoader.test.ts`.
 */
import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import type { SegmentMeta } from "./types";

const load = createRequire(import.meta.url);
const { CacheManager } = load("./CacheManager.ts") as typeof import("./CacheManager");
const { DownloadManager } = load("./DownloadManager.ts") as typeof import("./DownloadManager");
const { createHlsCacheLoader } = load("./HlsCacheLoader.ts") as typeof import("./HlsCacheLoader");

const SEGMENT: SegmentMeta = {
  index: 3,
  url: "https://cache.example/480p/seg-3.ts",
  startTime: 18,
  endTime: 24,
  duration: 6,
};

/** The slice of hls.js's FragmentLoaderContext the loader reads. */
function mainContext(url: string) {
  return {
    url,
    frag: { type: "main", sn: SEGMENT.index, start: SEGMENT.startTime, duration: SEGMENT.duration },
    headers: {},
  } as unknown as Parameters<InstanceType<ReturnType<typeof createHlsCacheLoader>>["load"]>[0];
}

// A fake network: each fetch waits until the test finishes it (or aborts it).
const pending = new Map<string, () => void>();
const realFetch = globalThis.fetch;

function installFakeFetch(): void {
  globalThis.fetch = ((url: string, init?: { signal?: AbortSignal }) =>
    new Promise((resolve, reject) => {
      const done = () =>
        resolve({ ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(4096) } as Response);
      pending.set(url, done);
      init?.signal?.addEventListener("abort", () => {
        pending.delete(url);
        reject(new DOMException("aborted", "AbortError"));
      });
    })) as typeof fetch;
}

function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`timed out: ${label}`)), 5000)),
  ]);
}

describe("HlsCacheLoader stats after hls.js tidies the loader up", () => {
  afterEach(() => {
    globalThis.fetch = realFetch;
    pending.clear();
  });

  it("a finished load keeps aborted=false after destroy(), so the bandwidth sample is taken", async () => {
    installFakeFetch();
    const cache = new CacheManager(60);
    const downloader = new DownloadManager(cache, 3);
    const Loader = createHlsCacheLoader(cache, downloader);
    const loader = new Loader({} as never);

    const success = new Promise<void>((resolve) => {
      loader.load(mainContext(SEGMENT.url), {} as never, {
        onSuccess: () => resolve(),
        onError: () => resolve(),
        onAbort: () => resolve(),
        onProgress: () => {},
      } as never);
    });
    // The fake network answers once the request is in flight.
    await withTimeout(
      new Promise<void>((resolve) => {
        const tick = () => (pending.has(SEGMENT.url) ? resolve() : setTimeout(tick, 5));
        tick();
      }),
      "request started",
    );
    pending.get(SEGMENT.url)!();
    await withTimeout(success, "onSuccess");

    assert.equal(loader.stats.aborted, false, "stats must not be aborted before destroy");
    assert.equal(loader.stats.loaded, 4096);
    // What hls.js's FragmentLoader.resetLoader does right after onSuccess.
    loader.destroy();
    assert.equal(loader.stats.aborted, false, "destroy() after success must not flag the shared stats as aborted");
    assert.ok(loader.stats.loading.end >= loader.stats.loading.start, "timing stays intact");
  });

  it("a load still in flight is cancelled by abort() and flagged aborted", async () => {
    installFakeFetch();
    const cache = new CacheManager(60);
    const downloader = new DownloadManager(cache, 3);
    const Loader = createHlsCacheLoader(cache, downloader);
    const loader = new Loader({} as never);

    let delivered = false;
    loader.load(mainContext(SEGMENT.url), {} as never, {
      onSuccess: () => {
        delivered = true;
      },
      onError: () => {
        delivered = true;
      },
      onAbort: () => {},
      onProgress: () => {},
    } as never);
    await withTimeout(
      new Promise<void>((resolve) => {
        const tick = () => (pending.has(SEGMENT.url) ? resolve() : setTimeout(tick, 5));
        tick();
      }),
      "request started",
    );

    loader.abort();
    assert.equal(loader.stats.aborted, true, "an in-flight load is flagged aborted");
    assert.equal(pending.has(SEGMENT.url), false, "the network request was cancelled");
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(delivered, false, "nothing is delivered after an abort");
  });
});
