/**
 * Checks that the prefetch list follows the quality hls.js is LOADING, so
 * after an Auto step up the 30 s look-ahead downloads the new quality.
 * Runs on Node's own test runner: `node --test lib/streaming/SegmentManager.test.ts`.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

// Node loads a relative TypeScript file only when the path carries its full
// extension, which tsc does not allow in an `import` — so load it this way.
const load = createRequire(import.meta.url);
const { SegmentManager } = load("./SegmentManager.ts") as typeof import("./SegmentManager");
const { CacheManager } = load("./CacheManager.ts") as typeof import("./CacheManager");
const { DownloadManager } = load("./DownloadManager.ts") as typeof import("./DownloadManager");
const { PrefetchManager } = load("./PrefetchManager.ts") as typeof import("./PrefetchManager");
const hlsModule = load("hls.js") as { default?: typeof import("hls.js").default } & typeof import("hls.js").default;
const Events = (hlsModule.default ?? hlsModule).Events;
type HlsLike = ConstructorParameters<typeof SegmentManager>[0];

function fragments(quality: string, count: number) {
  return Array.from({ length: count }, (_, i) => ({
    sn: i,
    url: `https://cache.example/${quality}/seg-${i}.ts`,
    start: i * 6,
    duration: 6,
  }));
}

type Handler = (event: string, data?: unknown) => void;

/** Just enough of an Hls instance for SegmentManager: levels, the two level indexes, and events. */
class FakeHls {
  levels: { details?: { fragments: ReturnType<typeof fragments> } }[] = [
    { details: { fragments: fragments("480p", 10) } },
    { details: undefined }, // 1080p: playlist not fetched yet
  ];
  loadLevel = 0;
  currentLevel = 0;
  private handlers = new Map<string, Set<Handler>>();

  on(event: string, handler: Handler): void {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler);
  }

  off(event: string, handler: Handler): void {
    this.handlers.get(event)?.delete(handler);
  }

  emit(event: string, data?: unknown): void {
    for (const handler of this.handlers.get(event) ?? []) handler(event, data);
  }

  /** hls.js announcing it is fetching piece `index` of `level` for the main video. */
  loadFragment(level: number, index: number): void {
    const frag = this.levels[level].details!.fragments[index];
    this.emit(Events.FRAG_LOADING, { frag: { ...frag, type: "main", level, bitrateTest: false }, targetBufferTime: frag.start });
  }

  listenerCount(): number {
    let n = 0;
    for (const set of this.handlers.values()) n += set.size;
    return n;
  }
}

function urls(manager: InstanceType<typeof SegmentManager>): string[] {
  return manager.getSegmentsInRange(0, 30).map((seg) => seg.url);
}

/** A network that never answers, so downloads stay in progress until aborted. Returns what was fetched and an undo. */
function holdNetwork(): { fetched: string[]; restore: () => void } {
  const realFetch = globalThis.fetch;
  const fetched: string[] = [];
  globalThis.fetch = ((url: string, init?: RequestInit) =>
    new Promise((_resolve, reject) => {
      fetched.push(url);
      init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
    })) as typeof fetch;
  return { fetched, restore: () => (globalThis.fetch = realFetch) };
}

describe("SegmentManager", { timeout: 5000 }, () => {
  it("follows the level hls.js is loading during an Auto step up", () => {
    const hls = new FakeHls();
    const manager = new SegmentManager(hls as unknown as HlsLike);
    hls.emit(Events.LEVEL_UPDATED);
    assert.ok(urls(manager).every((url) => url.includes("/480p/")));

    // ABR picks 1080p: hls.js switches the loading level first; its playlist
    // is not in yet, so the old list stays rather than going empty.
    hls.loadLevel = 1;
    hls.emit(Events.LEVEL_SWITCHING);
    assert.ok(urls(manager).length > 0);
    assert.ok(urls(manager).every((url) => url.includes("/480p/")));

    // The 1080p playlist arrives; 480p is STILL the one playing.
    hls.levels[1].details = { fragments: fragments("1080p", 10) };
    hls.emit(Events.LEVEL_UPDATED);
    assert.equal(hls.currentLevel, 0);
    assert.ok(urls(manager).length > 0);
    assert.ok(urls(manager).every((url) => url.includes("/1080p/")));

    // Once 1080p reaches the screen nothing changes.
    hls.currentLevel = 1;
    hls.emit(Events.LEVEL_SWITCHED);
    assert.ok(urls(manager).every((url) => url.includes("/1080p/")));
  });

  it("switches straight away when the new level's playlist is already loaded (manual pick)", () => {
    const hls = new FakeHls();
    hls.levels[1].details = { fragments: fragments("1080p", 10) };
    const manager = new SegmentManager(hls as unknown as HlsLike);
    hls.emit(Events.LEVEL_UPDATED);

    hls.loadLevel = 1; // what hls.nextLevel = 1 leads to
    hls.emit(Events.LEVEL_SWITCHING);
    assert.ok(urls(manager).every((url) => url.includes("/1080p/")));
  });

  it("falls back to the playing level before hls.js has picked one to load", () => {
    const hls = new FakeHls();
    hls.loadLevel = -1;
    const manager = new SegmentManager(hls as unknown as HlsLike);
    hls.emit(Events.LEVEL_SWITCHED);
    assert.ok(urls(manager).every((url) => url.includes("/480p/")));
    assert.ok(urls(manager).length > 0);
  });

  it("makes the 30 s look-ahead prefetch the new quality after a step up", async () => {
    const realFetch = globalThis.fetch;
    const fetched: string[] = [];
    // A network that never answers, so downloads stay in progress until aborted.
    globalThis.fetch = ((url: string, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        fetched.push(url);
        init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      })) as typeof fetch;
    try {
      const hls = new FakeHls();
      const manager = new SegmentManager(hls as unknown as HlsLike);
      hls.emit(Events.LEVEL_UPDATED);
      const cache = new CacheManager(60);
      const downloader = new DownloadManager(cache, 3);
      const prefetch = new PrefetchManager(manager, cache, downloader, { beforeSeconds: 10, afterSeconds: 30 });

      prefetch.update(7);
      assert.ok(fetched.length > 0 && fetched.every((url) => url.includes("/480p/")));

      hls.loadLevel = 1;
      hls.levels[1].details = { fragments: fragments("1080p", 10) };
      hls.emit(Events.LEVEL_SWITCHING);
      fetched.length = 0;
      prefetch.update(8);
      await new Promise((resolve) => setTimeout(resolve, 0));
      assert.ok(fetched.length > 0, "something was prefetched");
      assert.ok(fetched.every((url) => url.includes("/1080p/")), "only the new quality is prefetched");
      // The old quality's background downloads were dropped to make room.
      const stillOld = cache.snapshot().filter((e) => e.segment.url.includes("/480p/") && e.status === "downloading");
      assert.equal(stillOld.length, 0);
      downloader.destroy();
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  it("skips the stretch hls.js already holds in the old quality during a step up", async () => {
    const net = holdNetwork();
    try {
      const hls = new FakeHls();
      hls.levels[0].details = { fragments: fragments("480p", 30) };
      const manager = new SegmentManager(hls as unknown as HlsLike);
      hls.emit(Events.LEVEL_UPDATED);
      const cache = new CacheManager(60);
      const downloader = new DownloadManager(cache, 3);
      const prefetch = new PrefetchManager(manager, cache, downloader, { beforeSeconds: 10, afterSeconds: 30 });

      // Playing 480p at 8 s with 480p buffered to ~38 s; Auto steps up and
      // hls.js starts the 1080p fetch at piece 6 (36 s), right after its buffer.
      hls.loadLevel = 1;
      hls.levels[1].details = { fragments: fragments("1080p", 30) };
      hls.emit(Events.LEVEL_SWITCHING);
      hls.loadFragment(1, 6);
      prefetch.update(8);
      await new Promise((resolve) => setTimeout(resolve, 0));
      const wasted = net.fetched.filter((url) => /\/1080p\/seg-[0-5]\.ts$/.test(url));
      assert.deepEqual(wasted, [], "no 1080p copy of video hls.js already has in 480p");
      assert.ok(net.fetched.some((url) => url.endsWith("/1080p/seg-6.ts")));

      // Once 1080p is on screen the look-ahead starts at the playhead again.
      assert.equal(manager.lookAheadStart(37), 37);
      hls.currentLevel = 1;
      hls.emit(Events.LEVEL_SWITCHED);
      assert.equal(manager.lookAheadStart(20), 20);
      downloader.destroy();
    } finally {
      net.restore();
    }
  });

  it("starts at the playhead when hls.js loads the quality that is playing, and after a seek", () => {
    const hls = new FakeHls();
    hls.levels[1].details = { fragments: fragments("1080p", 10) };
    const manager = new SegmentManager(hls as unknown as HlsLike);

    hls.loadFragment(0, 5); // same quality as on screen
    assert.equal(manager.lookAheadStart(8), 8);

    hls.loadLevel = 1;
    hls.loadFragment(1, 5); // switching: 1080p starts at 30 s
    assert.equal(manager.lookAheadStart(8), 30);
    assert.equal(manager.lookAheadStart(40), 40, "never behind the playhead");

    manager.resetLoadPosition(); // what PrefetchManager.onSeek does
    assert.equal(manager.lookAheadStart(2), 2);
  });

  it("removes every listener on destroy", () => {
    const hls = new FakeHls();
    const manager = new SegmentManager(hls as unknown as HlsLike);
    assert.equal(hls.listenerCount(), 4);
    manager.destroy();
    assert.equal(hls.listenerCount(), 0);
  });
});
