/**
 * The pre-roll ad rules (lib/player/preroll.ts): the stage the player
 * derives, the countdown and Skip gate, and the once-only event ledger.
 * Runs on Node's own test runner: `node --test lib/player/preroll.test.ts`.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import type { PrerollAd } from "./preroll";

// Node loads a relative TypeScript file only when the path carries its full
// extension, which tsc does not allow in an `import` — so load it this way.
const load = createRequire(import.meta.url);
const {
  PREROLL_DECISION_TIMEOUT_MS,
  PREROLL_STALL_MS,
  adEventPosition,
  adSecondsLeft,
  claimAdEvent,
  createAdEventLedger,
  prerollStage,
  skipState,
} = load("./preroll.ts") as typeof import("./preroll");

const ad: PrerollAd = {
  playbackId: "pb-1",
  advertisementId: "ad-1",
  title: "Try Premium",
  videoUrl: "https://cache.example/s/1/abc/movies/ads/ad-1/v-1/video.mp4",
  durationSeconds: 30,
  isSkippable: true,
  skipAfterSeconds: 5,
};

describe("the constants the plan fixed", () => {
  it("4 s decision timeout, 10 s stall", () => {
    assert.equal(PREROLL_DECISION_TIMEOUT_MS, 4000);
    assert.equal(PREROLL_STALL_MS, 10_000);
  });
});

describe("prerollStage", () => {
  it("waits for the decision", () => {
    assert.equal(prerollStage({ decided: false, ad: null, phase: "idle" }), "deciding");
  });

  it("no ad due → the title may play at once", () => {
    assert.equal(prerollStage({ decided: true, ad: null, phase: "idle" }), "done");
  });

  it("an ad due waits for the first Play, then plays, then is done", () => {
    assert.equal(prerollStage({ decided: true, ad, phase: "idle" }), "ready");
    assert.equal(prerollStage({ decided: true, ad, phase: "playing" }), "playing");
    assert.equal(prerollStage({ decided: true, ad, phase: "done" }), "done");
  });

  it("done is final whatever the decision says", () => {
    assert.equal(prerollStage({ decided: false, ad: null, phase: "done" }), "done");
    assert.equal(prerollStage({ decided: true, ad: null, phase: "done" }), "done");
  });
});

describe("adSecondsLeft", () => {
  it("counts whole seconds down from the element's duration", () => {
    assert.equal(adSecondsLeft(0, 30, 30), 30);
    assert.equal(adSecondsLeft(10, 30, 30), 20);
    assert.equal(adSecondsLeft(29.2, 30, 30), 1);
    assert.equal(adSecondsLeft(30, 30, 30), 0);
  });

  it("never goes below zero", () => {
    assert.equal(adSecondsLeft(31, 30, 30), 0);
  });

  it("uses the backend's duration until the element knows its own", () => {
    assert.equal(adSecondsLeft(4, 0, 30), 26);
    assert.equal(adSecondsLeft(4, Number.NaN, 30), 26);
    assert.equal(adSecondsLeft(4, Number.POSITIVE_INFINITY, 30), 26);
    assert.equal(adSecondsLeft(4, 25, 30), 21);
  });

  it("is 0 when neither duration is known, and ignores a bad time", () => {
    assert.equal(adSecondsLeft(4, 0, 0), 0);
    assert.equal(adSecondsLeft(Number.NaN, 30, 30), 30);
    assert.equal(adSecondsLeft(-3, 30, 30), 30);
  });
});

describe("skipState", () => {
  it("a non-skippable ad never offers Skip", () => {
    assert.deepEqual(skipState({ isSkippable: false, skipAfterSeconds: null }, 0), { kind: "none" });
    assert.deepEqual(skipState({ isSkippable: false, skipAfterSeconds: 5 }, 99), { kind: "none" });
  });

  it("counts down to the skip-after second, then is ready", () => {
    assert.deepEqual(skipState(ad, 0), { kind: "wait", secondsLeft: 5 });
    assert.deepEqual(skipState(ad, 2), { kind: "wait", secondsLeft: 3 });
    assert.deepEqual(skipState(ad, 4.2), { kind: "wait", secondsLeft: 1 });
    assert.deepEqual(skipState(ad, 4.999), { kind: "wait", secondsLeft: 1 });
    assert.deepEqual(skipState(ad, 5), { kind: "ready" });
    assert.deepEqual(skipState(ad, 20), { kind: "ready" });
  });

  it("skippable with no skip-after is ready at once", () => {
    assert.deepEqual(skipState({ isSkippable: true, skipAfterSeconds: null }, 0), { kind: "ready" });
  });

  it("a bad time counts as 0", () => {
    assert.deepEqual(skipState(ad, Number.NaN), { kind: "wait", secondsLeft: 5 });
  });
});

describe("the event ledger", () => {
  it("sends each event once", () => {
    const ledger = createAdEventLedger("pb-1");
    assert.equal(ledger.playbackId, "pb-1");
    assert.equal(claimAdEvent(ledger, "started"), true);
    assert.equal(claimAdEvent(ledger, "started"), false);
    assert.equal(claimAdEvent(ledger, "completed"), true);
    assert.equal(claimAdEvent(ledger, "completed"), false);
  });

  it("one terminal event per play: nothing after completed / skipped / failed", () => {
    const skipped = createAdEventLedger("pb-2");
    claimAdEvent(skipped, "started");
    assert.equal(claimAdEvent(skipped, "skipped"), true);
    assert.equal(claimAdEvent(skipped, "completed"), false);
    assert.equal(claimAdEvent(skipped, "failed"), false);

    const failed = createAdEventLedger("pb-3");
    assert.equal(claimAdEvent(failed, "failed"), true);
    assert.equal(claimAdEvent(failed, "started"), false);
    assert.equal(claimAdEvent(failed, "completed"), false);
  });

  it("a terminal event without a started before it still goes (the backend decides what it means)", () => {
    const ledger = createAdEventLedger("pb-4");
    assert.equal(claimAdEvent(ledger, "failed"), true);
  });
});

describe("adEventPosition", () => {
  it("whole seconds, never negative, 0 for anything unknown", () => {
    assert.equal(adEventPosition(12.9), 12);
    assert.equal(adEventPosition(0), 0);
    assert.equal(adEventPosition(-1), 0);
    assert.equal(adEventPosition(Number.NaN), 0);
    assert.equal(adEventPosition(undefined), 0);
    assert.equal(adEventPosition(null), 0);
  });
});
