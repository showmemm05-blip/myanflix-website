/**
 * Checks the segment cache's eviction rules (perf audit play-01). Runs on
 * Node's own test runner, no build step:
 * `node --test lib/streaming/CacheManager.test.ts`.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import type { SegmentMeta } from "./types";

// Node loads a relative TypeScript file only when the path carries its full
// extension, which tsc does not allow in an `import` — so load it this way.
const load = createRequire(import.meta.url);
const { CacheManager } = load("./CacheManager.ts") as typeof import("./CacheManager");

function segment(index: number): SegmentMeta {
  return {
    index,
    url: `https://cache.example/seg-${index}.ts`,
    startTime: index * 6,
    endTime: index * 6 + 6,
    duration: 6,
  };
}

function download(cache: InstanceType<typeof CacheManager>, seg: SegmentMeta): void {
  cache.ensure(seg);
  cache.markQueued(seg.url);
  cache.markDownloading(seg.url);
  cache.markDownloaded(seg.url, new ArrayBuffer(8), 100);
}

describe("CacheManager", () => {
  it("keeps a new download after 60 cancelled entries have piled up", () => {
    const cache = new CacheManager(60);
    for (let i = 0; i < 60; i++) {
      const seg = segment(i);
      cache.ensure(seg);
      cache.markQueued(seg.url);
      cache.markCancelled(seg.url);
    }
    const fresh = segment(1000);
    download(cache, fresh);
    assert.equal(cache.has(fresh.url), true);
  });

  it("keeps a new download after failed and cancelled entries plus a full cap", () => {
    const cache = new CacheManager(60);
    for (let i = 0; i < 40; i++) {
      const seg = segment(i);
      cache.ensure(seg);
      cache.markFailed(seg.url);
    }
    for (let i = 100; i < 160; i++) download(cache, segment(i));
    const fresh = segment(1000);
    download(cache, fresh);
    assert.equal(cache.has(fresh.url), true);
    const downloaded = cache.snapshot().filter((entry) => entry.status === "downloaded");
    assert.equal(downloaded.length, 60);
  });

  it("evicts only the least recently used downloaded segment when the cap is passed", () => {
    const cache = new CacheManager(3);
    const segs = [segment(0), segment(1), segment(2)];
    segs.forEach((seg) => download(cache, seg));
    // Make the order unambiguous: seg 1 is the oldest, then 0, then 2.
    const byUrl = new Map(cache.snapshot().map((entry) => [entry.segment.url, entry]));
    byUrl.get(segs[1].url)!.lastAccessed = 1;
    byUrl.get(segs[0].url)!.lastAccessed = 2;
    byUrl.get(segs[2].url)!.lastAccessed = 3;

    const fresh = segment(3);
    download(cache, fresh);
    assert.equal(cache.has(fresh.url), true);
    assert.equal(cache.has(segs[1].url), false);
    assert.equal(cache.has(segs[0].url), true);
    assert.equal(cache.has(segs[2].url), true);
  });

  it("never evicts the segment that just arrived, even if its clock is oldest", () => {
    const cache = new CacheManager(1);
    const first = segment(0);
    download(cache, first);
    cache.snapshot()[0].lastAccessed = Number.MAX_SAFE_INTEGER;
    const fresh = segment(1);
    download(cache, fresh);
    assert.equal(cache.has(fresh.url), true);
    assert.equal(cache.has(first.url), false);
  });

  it("evictOutside drops stale records outside the window but leaves live downloads alone", () => {
    const cache = new CacheManager(60);
    const [cancelled, failed, idle, queued, downloading, done, keptCancelled] = [0, 1, 2, 3, 4, 5, 6].map(segment);
    cache.ensure(cancelled);
    cache.markCancelled(cancelled.url);
    cache.ensure(failed);
    cache.markFailed(failed.url);
    cache.ensure(idle);
    cache.ensure(queued);
    cache.markQueued(queued.url);
    cache.ensure(downloading);
    cache.markDownloading(downloading.url);
    download(cache, done);
    cache.ensure(keptCancelled);
    cache.markCancelled(keptCancelled.url);

    const evicted = cache.evictOutside(new Set([keptCancelled.url]));

    assert.deepEqual(new Set(evicted), new Set([cancelled.url, failed.url, idle.url, done.url]));
    const left = new Map(cache.snapshot().map((entry) => [entry.segment.url, entry.status]));
    assert.equal(left.get(queued.url), "queued");
    assert.equal(left.get(downloading.url), "downloading");
    assert.equal(left.get(keptCancelled.url), "cancelled");
    assert.equal(left.size, 3);
  });
});
