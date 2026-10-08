/**
 * Checks that the prefetch housekeeping never kills a download hls.js asked
 * for itself (the Auto quality "stuck at 360p/480p" bug, 2026-10-08), while
 * background prefetch outside the window is still cancelled as before.
 * Runs on Node's own test runner: `node --test lib/streaming/DownloadManager.test.ts`.
 */
import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import type { SegmentMeta } from "./types";

// Node loads a relative TypeScript file only when the path carries its full
// extension, which tsc does not allow in an `import` — so load it this way.
const load = createRequire(import.meta.url);
const { CacheManager } = load("./CacheManager.ts") as typeof import("./CacheManager");
const { DownloadManager } = load("./DownloadManager.ts") as typeof import("./DownloadManager");
const { PrefetchManager } = load("./PrefetchManager.ts") as typeof import("./PrefetchManager");
type SegmentManagerLike = ConstructorParameters<typeof PrefetchManager>[0];

function segment(quality: string, index: number): SegmentMeta {
  return {
    index,
    url: `https://cache.example/${quality}/seg-${index}.ts`,
    startTime: index * 6,
    endTime: index * 6 + 6,
    duration: 6,
  };
}

/** A stand-in for SegmentManager that always lists one fixed quality. */
function fixedSegments(list: SegmentMeta[]): SegmentManagerLike {
  return {
    getSegmentsInRange: (start: number, end: number) =>
      list.filter((seg) => seg.endTime > start && seg.startTime < end),
    lookAheadStart: (currentTime: number) => currentTime,
    resetLoadPosition: () => {},
  } as unknown as SegmentManagerLike;
}

// A fake network: every fetch waits until the test finishes it (or aborts it).
const pending = new Map<string, () => void>();
const fetched: string[] = [];
const realFetch = globalThis.fetch;

function finish(url: string): void {
  const done = pending.get(url);
  assert.ok(done, `no download in progress for ${url}`);
  done();
}

/** Lets queued promise callbacks run. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

/** Resolves to "LOADED" or "CANCELLED" once the download settles. */
function outcome(promise: Promise<ArrayBuffer>): Promise<string> {
  return promise.then(
    () => "LOADED",
    () => "CANCELLED",
  );
}

beforeEach(() => {
  pending.clear();
  fetched.length = 0;
  globalThis.fetch = ((url: string, init?: RequestInit) =>
    new Promise((resolve, reject) => {
      fetched.push(url);
      pending.set(url, () => {
        pending.delete(url);
        resolve({ ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(1000) } as Response);
      });
      init?.signal?.addEventListener("abort", () => {
        pending.delete(url);
        reject(new DOMException("aborted", "AbortError"));
      });
    })) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

// Every test awaits downloads the fake network holds open, so a regression
// would otherwise hang `npm test` forever instead of failing it.
const TEST_TIMEOUT = { timeout: 5000 };

describe("DownloadManager + PrefetchManager", TEST_TIMEOUT, () => {
  it("lets hls.js's own download of another quality finish through a prefetch tick", async () => {
    const cache = new CacheManager(60);
    const downloader = new DownloadManager(cache, 3);
    const playing = Array.from({ length: 10 }, (_, i) => segment("480p", i));
    const prefetch = new PrefetchManager(fixedSegments(playing), cache, downloader, {
      beforeSeconds: 10,
      afterSeconds: 30,
    });

    // Auto steps up: hls.js asks for the 1080p piece while 480p is still playing.
    const upSwitch = outcome(downloader.requestImmediate(segment("1080p", 2)));
    await settle();
    prefetch.update(7); // the next ~1 s playback tick
    downloader.cancelExcept(new Set()); // and a seek-style sweep, for good measure
    await settle();

    finish(segment("1080p", 2).url);
    assert.equal(await upSwitch, "LOADED");
    assert.equal(cache.has(segment("1080p", 2).url), true);
  });

  it("still cancels background prefetch that falls outside the window", async () => {
    const cache = new CacheManager(60);
    const downloader = new DownloadManager(cache, 3);
    const background = outcome(downloader.request(segment("480p", 40), 0));
    await settle();

    downloader.cancelExcept(new Set([segment("480p", 1).url]));
    assert.equal(await background, "CANCELLED");
  });

  it("still cancels a queued background prefetch outside the window", async () => {
    const cache = new CacheManager(60);
    const downloader = new DownloadManager(cache, 1);
    const first = outcome(downloader.request(segment("480p", 1), 0));
    const queued = outcome(downloader.request(segment("480p", 40), 1));
    await settle();

    downloader.cancelExcept(new Set([segment("480p", 1).url]));
    assert.equal(await queued, "CANCELLED");
    finish(segment("480p", 1).url);
    assert.equal(await first, "LOADED");
  });

  it("still lets hls.js cancel its own download", async () => {
    const cache = new CacheManager(60);
    const downloader = new DownloadManager(cache, 3);
    const url = segment("1080p", 2).url;
    const own = outcome(downloader.requestImmediate(segment("1080p", 2)));
    await settle();

    downloader.cancel(url); // what HlsCacheLoader.abort() does
    assert.equal(await own, "CANCELLED");
  });

  it("treats a prefetch that hls.js then asked for as hls.js's own", async () => {
    const cache = new CacheManager(60);
    const downloader = new DownloadManager(cache, 3);
    const seg = segment("1080p", 3);
    const background = outcome(downloader.request(seg, 5));
    await settle();
    const own = outcome(downloader.requestImmediate(seg)); // same URL, deduped

    downloader.cancelExcept(new Set());
    await settle();
    finish(seg.url);
    assert.equal(await own, "LOADED");
    assert.equal(await background, "LOADED");
    assert.equal(fetched.filter((u) => u === seg.url).length, 1, "downloaded once, not twice");
  });

  it("moves a queued prefetch to the front when hls.js asks for it", async () => {
    const cache = new CacheManager(60);
    const downloader = new DownloadManager(cache, 1);
    const busy = outcome(downloader.request(segment("480p", 1), 0));
    const ahead = outcome(downloader.request(segment("480p", 2), 1));
    const wanted = segment("480p", 3);
    const waiting = outcome(downloader.request(wanted, 2));
    await settle();

    // With the one slot busy, hls.js now needs seg 3 right away: it jumps the
    // queue and takes the slot from the background download.
    const own = outcome(downloader.requestImmediate(wanted));
    await settle();
    assert.equal(await busy, "CANCELLED");
    assert.deepEqual([...pending.keys()], [wanted.url]);

    finish(wanted.url);
    assert.equal(await own, "LOADED");
    assert.equal(await waiting, "LOADED");
    await settle();
    finish(segment("480p", 2).url);
    assert.equal(await ahead, "LOADED");
  });
});
