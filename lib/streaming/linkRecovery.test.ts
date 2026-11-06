/**
 * Decision table of the player's recovery budget (audit FE-002 / STR-010 /
 * STR-011 / TEST-007, 2026-10-09): a 403/410 gets one fresh link and then
 * fails, any other network error gets a bounded, backed-off `startLoad()`,
 * a media error a bounded `recoverMediaError()`, every other fatal error
 * fails at once, and a non-fatal error is left to hls.js. Plus the fresh-link
 * rule itself: only a DIFFERENT link counts as renewed.
 * Runs on Node's own test runner: `node --test lib/streaming/linkRecovery.test.ts`.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import type { RecoveryCounts, RecoveryError, StreamQueryClient } from "./linkRecovery";

// Node loads a relative TypeScript file only when the path carries its full
// extension, which tsc does not allow in an `import` — so load it this way.
const load = createRequire(import.meta.url);
const {
  INITIAL_COUNTS,
  MAX_MEDIA_RECOVERIES,
  MAX_START_LOADS,
  MEDIA_ERR_ABORTED,
  MEDIA_ERR_DECODE,
  MEDIA_ERR_NETWORK,
  MEDIA_ERR_SRC_NOT_SUPPORTED,
  START_LOAD_DELAYS_MS,
  createRecoveryBudget,
  decideNativeError,
  decideRecovery,
  requestFreshLink,
} = load("./linkRecovery.ts") as typeof import("./linkRecovery");

const network = (status?: number): RecoveryError => ({ fatal: true, type: "networkError", status });
const media: RecoveryError = { fatal: true, type: "mediaError" };
const counts = (partial: Partial<RecoveryCounts>): RecoveryCounts => ({ ...INITIAL_COUNTS, ...partial });

describe("decideRecovery — the hls.js decision table", () => {
  it("leaves a non-fatal error to hls.js and spends nothing", () => {
    const step = decideRecovery({ fatal: false, type: "networkError", status: 404 }, INITIAL_COUNTS);
    assert.deepEqual(step.decision, { action: "ignore" });
    assert.equal(step.counts, INITIAL_COUNTS);
  });

  it("first 410: asks for a fresh link once, no startLoad", () => {
    const step = decideRecovery(network(410), INITIAL_COUNTS);
    assert.deepEqual(step.decision, { action: "refetchStream" });
    assert.deepEqual(step.counts, counts({ linkRefetches: 1 }));
  });

  it("second 410 (the fresh link was refused too): terminal, reason link", () => {
    const step = decideRecovery(network(410), counts({ linkRefetches: 1 }));
    assert.deepEqual(step.decision, { action: "fail", reason: "link" });
  });

  it("403 behaves exactly like 410: one fresh link, then terminal", () => {
    assert.deepEqual(decideRecovery(network(403), INITIAL_COUNTS).decision, { action: "refetchStream" });
    assert.deepEqual(decideRecovery(network(403), counts({ linkRefetches: 1 })).decision, {
      action: "fail",
      reason: "link",
    });
  });

  it("a 403/410 never touches the startLoad budget, and vice versa", () => {
    const afterRestarts = counts({ startLoads: MAX_START_LOADS });
    assert.deepEqual(decideRecovery(network(410), afterRestarts).decision, { action: "refetchStream" });
    const afterLink = counts({ linkRefetches: 1 });
    assert.deepEqual(decideRecovery(network(404), afterLink).decision, {
      action: "startLoad",
      delayMs: START_LOAD_DELAYS_MS[0],
    });
  });

  it("another network error (404, 5xx, no status): startLoad with a growing pause, then terminal", () => {
    let current = INITIAL_COUNTS;
    const seen: number[] = [];
    for (const status of [404, 502, undefined]) {
      const step = decideRecovery(network(status), current);
      assert.equal(step.decision.action, "startLoad");
      if (step.decision.action === "startLoad") seen.push(step.decision.delayMs);
      current = step.counts;
    }
    assert.deepEqual(seen, [...START_LOAD_DELAYS_MS]);
    assert.equal(current.startLoads, MAX_START_LOADS);
    const exhausted = decideRecovery(network(404), current);
    assert.deepEqual(exhausted.decision, { action: "fail", reason: "network" });
    assert.equal(exhausted.counts, current, "a terminal decision spends nothing more");
  });

  it("every pause is between 1 and 2 seconds and never shorter than the one before", () => {
    assert.equal(START_LOAD_DELAYS_MS.length, MAX_START_LOADS);
    START_LOAD_DELAYS_MS.forEach((delay, index) => {
      assert.ok(delay >= 1000 && delay <= 2000, `delay ${index} = ${delay}`);
      if (index > 0) assert.ok(delay >= START_LOAD_DELAYS_MS[index - 1]);
    });
  });

  it("media error: recoverMediaError, the second time with the audio codec swapped, then terminal", () => {
    const first = decideRecovery(media, INITIAL_COUNTS);
    assert.deepEqual(first.decision, { action: "recoverMediaError", swapAudioCodec: false });
    const second = decideRecovery(media, first.counts);
    assert.deepEqual(second.decision, { action: "recoverMediaError", swapAudioCodec: true });
    assert.equal(second.counts.mediaRecoveries, MAX_MEDIA_RECOVERIES);
    assert.deepEqual(decideRecovery(media, second.counts).decision, { action: "fail", reason: "media" });
  });

  it("key-system, mux and other errors are terminal at once", () => {
    for (const type of ["keySystemError", "muxError", "otherError"]) {
      assert.deepEqual(decideRecovery({ fatal: true, type }, INITIAL_COUNTS).decision, {
        action: "fail",
        reason: "other",
      });
    }
  });

  it("never mutates the counts it was given", () => {
    const given = counts({ startLoads: 1 });
    decideRecovery(network(404), given);
    decideRecovery(media, given);
    decideRecovery(network(410), given);
    assert.deepEqual(given, counts({ startLoads: 1 }));
  });
});

describe("createRecoveryBudget — one player instance's counts", () => {
  it("spends the three budgets independently and reports the running counts", () => {
    const budget = createRecoveryBudget();
    assert.equal(budget.decide(network(404)).action, "startLoad");
    assert.equal(budget.decide(media).action, "recoverMediaError");
    assert.equal(budget.decide(network(410)).action, "refetchStream");
    assert.deepEqual(budget.counts, { startLoads: 1, mediaRecoveries: 1, linkRefetches: 1 });
    assert.deepEqual(budget.decide(network(410)), { action: "fail", reason: "link" });
  });

  it("a fresh budget starts from zero — the cap is per player instance", () => {
    const spent = createRecoveryBudget();
    for (let i = 0; i < MAX_START_LOADS; i++) spent.decide(network(404));
    assert.equal(spent.decide(network(404)).action, "fail");
    assert.equal(createRecoveryBudget().decide(network(404)).action, "startLoad");
  });
});

describe("decideNativeError — Safari's native engine (<video> onError)", () => {
  it("no MediaError on the element, or an abort, is nothing to act on", () => {
    assert.deepEqual(decideNativeError(undefined, false), { action: "ignore" });
    assert.deepEqual(decideNativeError(MEDIA_ERR_ABORTED, false), { action: "ignore" });
  });

  it("a network or unsupported-source error gets one fresh link, then fails as link", () => {
    for (const code of [MEDIA_ERR_NETWORK, MEDIA_ERR_SRC_NOT_SUPPORTED]) {
      assert.deepEqual(decideNativeError(code, false), { action: "refetchStream" });
      assert.deepEqual(decideNativeError(code, true), { action: "fail", reason: "link" });
    }
  });

  it("a decode error is terminal at once, whatever the link state", () => {
    assert.deepEqual(decideNativeError(MEDIA_ERR_DECODE, false), { action: "fail", reason: "media" });
    assert.deepEqual(decideNativeError(MEDIA_ERR_DECODE, true), { action: "fail", reason: "media" });
  });

  it("an unknown code is terminal as other", () => {
    assert.deepEqual(decideNativeError(99, false), { action: "fail", reason: "other" });
  });
});

describe("requestFreshLink — the one fresh link", () => {
  const KEY = ["stream", "m1"] as const;
  const OLD = "https://cache.example/old.m3u8?token=1";

  /** A stand-in for the QueryClient: records the invalidation, then answers getQueryData with `after`. */
  function fakeClient(after: unknown) {
    const invalidated: unknown[] = [];
    let settled = false;
    const client: StreamQueryClient = {
      async invalidateQueries(filters) {
        invalidated.push(filters.queryKey);
        // Like the real one, the refetch takes a tick to settle.
        await new Promise((resolve) => setTimeout(resolve, 0));
        settled = true;
      },
      getQueryData(queryKey) {
        assert.equal(settled, true, "the data is read only once the refetch has settled");
        assert.deepEqual(queryKey, KEY);
        return after;
      },
    };
    return { client, invalidated };
  }

  it("a different link → true, after invalidating the stream query", async () => {
    const { client, invalidated } = fakeClient({ playlistUrl: "https://cache.example/new.m3u8?token=2" });
    assert.equal(await requestFreshLink(client, KEY, OLD), true);
    assert.deepEqual(invalidated, [KEY]);
  });

  it("the same link again (a 403 that is not an expiry) → false", async () => {
    const { client } = fakeClient({ playlistUrl: OLD });
    assert.equal(await requestFreshLink(client, KEY, OLD), false);
  });

  it("a refetch that failed or came back empty → false", async () => {
    for (const after of [undefined, null, {}, { playlistUrl: "" }]) {
      const { client } = fakeClient(after);
      assert.equal(await requestFreshLink(client, KEY, OLD), false, JSON.stringify(after));
    }
  });
});
