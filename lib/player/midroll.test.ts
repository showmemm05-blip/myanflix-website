/**
 * The mid-roll break scheduler (lib/player/midroll.ts). Every case runs
 * against BOTH copies — this one and the phone's mobile/src/video/midroll.ts
 * — and the two files must be byte-identical. Case numbers follow
 * docs/in-movie-ads-2026-11-04/SCHEDULER-SPEC.md.
 * Runs on Node's own test runner: `node --test lib/player/midroll.test.ts`.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import type { MidrollAction, MidrollPlanInput, MidrollState } from "./midroll";

type Midroll = typeof import("./midroll");

// Node loads a relative TypeScript file only when the path carries its full
// extension, which tsc does not allow in an `import` — so load it this way.
const load = createRequire(import.meta.url);
const WEB_PATH = "./midroll.ts";
const PHONE_PATH = "../../../mobile/src/video/midroll.ts";
const phoneFile = new URL(PHONE_PATH, import.meta.url);
// Only a whole checkout has the phone copy (the website's Docker context does not).
const hasPhoneCopy = existsSync(phoneFile);

const copies: [string, Midroll][] = [["web", load(WEB_PATH) as Midroll]];
if (hasPhoneCopy) copies.push(["phone", load(PHONE_PATH) as Midroll]);

describe("the two copies", () => {
  it("are byte-identical", { skip: !hasPhoneCopy && "no mobile/ folder beside this checkout" }, () => {
    assert.ok(
      readFileSync(new URL(WEB_PATH, import.meta.url)).equals(readFileSync(phoneFile)),
      "mobile/src/video/midroll.ts differs from lib/player/midroll.ts — copy one over the other",
    );
  });
});

const I = 1800;
const D = 7200;
const PLAN: MidrollPlanInput = { intervalSeconds: I, doneThroughSeconds: 0 };

interface TickOptions {
  playing?: boolean;
  canInterrupt?: boolean;
  scrubbing?: boolean;
  /** Milliseconds since the previous tick (default 250, the pace of `timeupdate`). */
  gapMs?: number;
}

interface Logged {
  position: number;
  action: MidrollAction;
}

/**
 * One viewing driven the way a player drives it: its own clock, the
 * duration it reports, and a log of every action that is not "none".
 */
class Viewing {
  readonly m: Midroll;
  state: MidrollState;
  duration: number;
  now = 100_000;
  log: Logged[] = [];

  constructor(m: Midroll, plan: MidrollPlanInput | null = PLAN, duration = D) {
    this.m = m;
    this.state = m.createMidrollState(plan);
    this.duration = duration;
  }

  start(at: number): this {
    this.state = this.m.midrollStart(this.state, at);
    return this;
  }

  rebase(at: number): this {
    this.state = this.m.midrollRebase(this.state, at);
    return this;
  }

  /** A user seek, `afterMs` after whatever happened last. */
  seek(from: number, to: number, afterMs = 0): this {
    this.now += afterMs;
    this.state = this.m.midrollNoteSeek(this.state, from, to, this.now);
    return this;
  }

  tick(position: number, o: TickOptions = {}): this {
    this.now += o.gapMs ?? 250;
    const step = this.m.midrollTick(this.state, {
      position,
      duration: this.duration,
      playing: o.playing ?? true,
      nowMs: this.now,
      scrubbing: o.scrubbing ?? false,
      canInterrupt: o.canInterrupt ?? true,
    });
    this.state = step.state;
    if (step.action.kind !== "none") this.log.push({ position, action: step.action });
    return this;
  }

  /** Natural playback: a tick every `step` seconds after `from`, up to and including `to`. */
  play(from: number, to: number, o: TickOptions & { step?: number } = {}): this {
    const step = o.step ?? 0.25;
    const count = Math.round((to - from) / step);
    for (let i = 1; i <= count; i++) this.tick(from + i * step, o);
    return this;
  }

  breaks(): { at: number; k: number; consumed: number[] }[] {
    return this.log.flatMap(({ position, action }) =>
      action.kind === "break" ? [{ at: position, k: action.breakIndex, consumed: [...action.consumed] }] : [],
    );
  }

  prefetches(): { at: number; k: number }[] {
    return this.log.flatMap(({ position, action }) =>
      action.kind === "prefetch" ? [{ at: position, k: action.breakIndex }] : [],
    );
  }

  markers(): number[] {
    return this.m.midrollMarkers(this.state, this.duration);
  }
}

/** A copy of a state's contents, to prove later calls never changed it. */
function snapshot(s: MidrollState) {
  return { ...s, done: new Set(s.done), asked: new Set(s.asked), owed: s.owed && [...s.owed] };
}

for (const [copy, m] of copies) {
  describe(`midroll (${copy} copy)`, () => {
    const playing = (s: MidrollState, position: number, extra: Partial<TickOptions> = {}) =>
      m.midrollTick(s, {
        position,
        duration: D,
        playing: extra.playing ?? true,
        nowMs: 0,
        canInterrupt: extra.canInterrupt ?? true,
      });

    describe("the constants the plan fixed", () => {
      it("60 s minimum, 120 s end guard, 20 s ask-ahead, 4 s natural step, 700 ms settle", () => {
        assert.equal(m.MIDROLL_MIN_INTERVAL_SECONDS, 60);
        assert.equal(m.MIDROLL_DEFAULT_END_GUARD_SECONDS, 120);
        assert.equal(m.MIDROLL_DEFAULT_ASK_AHEAD_SECONDS, 20);
        assert.equal(m.MIDROLL_MAX_NATURAL_STEP_SECONDS, 4);
        assert.equal(m.MIDROLL_SEEK_SETTLE_MS, 700);
      });

      it("quiet gap ≤ 5 min, decision 4 s / backstop 8 s / stale after 8 min, last break 86 400 s", () => {
        assert.equal(m.MIDROLL_QUIET_MAX_SECONDS, 300);
        assert.equal(m.MIDROLL_DECISION_TIMEOUT_MS, 4000);
        assert.equal(m.MIDROLL_DECISION_BACKSTOP_MS, 8000);
        assert.equal(m.MIDROLL_DECISION_MAX_AGE_MS, 480_000);
        assert.equal(m.MIDROLL_MAX_BREAK_SECONDS, 86_400);
      });

      it("the quiet gap is min(5 min, interval / 2)", () => {
        assert.equal(m.midrollQuietSeconds(60), 30);
        assert.equal(m.midrollQuietSeconds(300), 150);
        assert.equal(m.midrollQuietSeconds(600), 300);
        assert.equal(m.midrollQuietSeconds(1800), 300);
        assert.equal(m.midrollQuietSeconds(14_400), 300);
      });
    });

    describe("the plan", () => {
      it("1. no plan → OFF: ticks never act, no markers", () => {
        assert.equal(m.createMidrollState(null), m.MIDROLL_OFF);
        assert.equal(m.createMidrollState(undefined), m.MIDROLL_OFF);
        assert.ok(Object.isFrozen(m.MIDROLL_OFF));
        const v = new Viewing(m, null).start(0).play(0, D, { step: 2 }).seek(D, 100).play(100, 4000, { step: 3 });
        assert.equal(v.state, m.MIDROLL_OFF);
        assert.deepEqual(v.log, []);
        assert.deepEqual(m.midrollMarkers(m.MIDROLL_OFF, D), []);
      });

      it("2. interval 0, −5, NaN, Infinity, 59 → OFF; 60 on; 1800.7 → 1800", () => {
        for (const bad of [0, -5, Number.NaN, Number.POSITIVE_INFINITY, 59, 59.9, "1800" as unknown as number]) {
          assert.equal(m.createMidrollState({ intervalSeconds: bad, doneThroughSeconds: 0 }), m.MIDROLL_OFF, String(bad));
        }
        assert.equal(m.createMidrollState({ intervalSeconds: 60, doneThroughSeconds: 0 }).interval, 60);
        assert.equal(m.createMidrollState({ intervalSeconds: 1800.7, doneThroughSeconds: 0 }).interval, 1800);
      });

      it("3. doneThroughSeconds 3600 → done {1, 2}; NaN → none", () => {
        const done = (doneThroughSeconds: number) =>
          [...m.createMidrollState({ intervalSeconds: I, doneThroughSeconds }).done];
        assert.deepEqual(done(3600), [1, 2]);
        assert.deepEqual(done(3599), [1]);
        assert.deepEqual(done(0), []);
        assert.deepEqual(done(Number.NaN), []);
        assert.deepEqual(done(-1800), []);
      });

      it("the end guard and ask-ahead default to 120 / 20 when missing or broken", () => {
        const s = m.createMidrollState(PLAN);
        assert.equal(s.endGuard, 120);
        assert.equal(s.askAhead, 20);
        const broken = m.createMidrollState({ ...PLAN, endGuardSeconds: -1, askAheadSeconds: 0 });
        assert.equal(broken.endGuard, 120);
        assert.equal(broken.askAhead, 20);
        const nan = m.createMidrollState({ ...PLAN, endGuardSeconds: Number.NaN, askAheadSeconds: Number.NaN });
        assert.equal(nan.endGuard, 120);
        assert.equal(nan.askAhead, 20);
      });

      it("a fresh plan is not started: no position, nothing asked, nothing owed", () => {
        const s = m.createMidrollState(PLAN);
        assert.equal(s.last, null);
        assert.equal(s.seek, null);
        assert.equal(s.owed, null);
        assert.equal(s.asked.size, 0);
      });
    });

    describe("same object when nothing changes", () => {
      it("4. an unchanged tick returns the same state object", () => {
        const v = new Viewing(m).start(0).rebase(1000).tick(1000.25);
        const far = v.state;
        assert.equal(playing(far, 1000.25).state, far); // OS pause: playing, same second
        assert.equal(playing(far, 1000.25, { playing: false }).state, far); // Android paused tick

        v.rebase(1790).tick(1790.25); // asks ahead for break 1
        const near = v.state;
        assert.equal(playing(near, 1790.25).state, near);

        const bursting = m.midrollNoteSeek(near, 1790.25, 3000, 0);
        assert.equal(m.midrollTick(bursting, { position: 3000, duration: D, playing: false, nowMs: 5000, canInterrupt: true }).state, bursting);

        assert.equal(playing(m.MIDROLL_OFF, 1800).state, m.MIDROLL_OFF);
        assert.equal(m.midrollRebase(near, 1790.25), near);
      });

      it("a broken position (NaN, negative, Infinity) changes nothing", () => {
        const s = new Viewing(m).start(0).rebase(1000).state;
        for (const position of [Number.NaN, -1, Number.POSITIVE_INFINITY]) {
          const step = playing(s, position);
          assert.equal(step.state, s);
          assert.equal(step.action.kind, "none");
        }
      });
    });

    describe("natural playback", () => {
      it("5. 1×: exactly one break, on the 1800.0 tick, none after", () => {
        const v = new Viewing(m).start(0).rebase(1795).play(1795, 1830);
        assert.deepEqual(v.breaks(), [{ at: 1800, k: 1, consumed: [1] }]);
      });

      it("6. 2×: ticks every 0.5 s fire at 1800.25", () => {
        const v = new Viewing(m).start(0).rebase(1799.25).play(1799.25, 1805.25, { step: 0.5 });
        assert.deepEqual(v.breaks(), [{ at: 1800.25, k: 1, consumed: [1] }]);
      });

      it("7. asks ahead once, 20 s before the break, and the break follows at 1800", () => {
        const v = new Viewing(m).start(0).rebase(1775).play(1775, 1810);
        assert.deepEqual(v.prefetches(), [{ at: 1780, k: 1 }]);
        assert.deepEqual(v.breaks(), [{ at: 1800, k: 1, consumed: [1] }]);
        assert.deepEqual(v.log.map((l) => l.action.kind), ["prefetch", "break"]);
        assert.deepEqual(v.log[0].action, { kind: "prefetch", breakIndex: 1, breakAtSeconds: 1800 });
        assert.deepEqual(v.log[1].action, { kind: "break", breakIndex: 1, breakAtSeconds: 1800, consumed: [1] });
      });

      it("8. the next natural break (3600) fires too", () => {
        const v = new Viewing(m).start(0).rebase(1795).play(1795, 3610);
        assert.deepEqual(v.breaks(), [
          { at: 1800, k: 1, consumed: [1] },
          { at: 3600, k: 2, consumed: [2] },
        ]);
        assert.deepEqual(v.prefetches(), [{ at: 1795.25, k: 1 }, { at: 3580, k: 2 }]);
      });

      it("9. Android's paused ticks (playing false) do nothing; playing ticks then fire", () => {
        const v = new Viewing(m).start(0).rebase(1790).play(1790, 1799.75).tick(1799.9);
        const paused = v.state;
        for (let i = 0; i < 8; i++) v.tick(1799.9, { playing: false });
        assert.equal(v.state, paused);
        assert.deepEqual(v.breaks(), []);
        v.tick(1800.15);
        assert.deepEqual(v.breaks(), [{ at: 1800.15, k: 1, consumed: [1] }]);
      });

      it("10. an OS pause (playing true, same second) does nothing", () => {
        const v = new Viewing(m).start(0).rebase(1790).play(1790, 1799.75);
        const held = v.state;
        for (let i = 0; i < 8; i++) v.tick(1799.75);
        assert.equal(v.state, held);
        assert.deepEqual(v.breaks(), []);
        v.tick(1800);
        assert.equal(v.breaks().length, 1);
      });

      it("11. a crossing tick while paused is owed; the next playing tick plays it", () => {
        const v = new Viewing(m).start(0).rebase(1799.75).tick(1800, { playing: false });
        assert.deepEqual(v.breaks(), []);
        assert.deepEqual(v.state.owed, [1]);
        assert.ok(v.state.done.has(1));
        v.tick(1800);
        assert.deepEqual(v.breaks(), [{ at: 1800, k: 1, consumed: [1] }]);
        assert.equal(v.state.owed, null);

        const moved = new Viewing(m).start(0).rebase(1799.75).tick(1800, { playing: false }).tick(1800.25);
        assert.deepEqual(moved.breaks(), [{ at: 1800.25, k: 1, consumed: [1] }]);
      });

      it("32. a +1.5 s nudge across 1800 counts as playback and fires", () => {
        const v = new Viewing(m).start(0).rebase(1799).tick(1800.5);
        assert.deepEqual(v.breaks(), [{ at: 1800.5, k: 1, consumed: [1] }]);
      });

      it("a 4 s step is still playback; 4.01 s is a jump", () => {
        const four = new Viewing(m).start(0).rebase(1797).tick(1801);
        assert.deepEqual(four.breaks(), [{ at: 1801, k: 1, consumed: [1] }]);
        const jump = new Viewing(m).start(0).rebase(1796.99).tick(1801);
        assert.deepEqual(jump.breaks(), []);
        assert.ok(!jump.state.done.has(1));
      });

      it("no asking ahead while paused; the first playing tick asks", () => {
        const v = new Viewing(m).start(0).rebase(1790).tick(1790.25, { playing: false });
        assert.deepEqual(v.log, []);
        v.tick(1790.5);
        assert.deepEqual(v.prefetches(), [{ at: 1790.5, k: 1 }]);
      });

      it("33. once a break has played, its breaks never fire again", () => {
        const v = new Viewing(m).start(0).rebase(600).seek(600, 4000).play(4000, 4001);
        assert.deepEqual(v.breaks(), [{ at: 4000.75, k: 2, consumed: [1, 2] }]);
        assert.ok(v.state.done.has(1) && v.state.done.has(2));
        v.seek(4001, 1000).play(1000, 3700, { step: 1 });
        assert.equal(v.breaks().length, 1);
      });
    });

    describe("user seeks", () => {
      it("12. 100 → 1000 crosses nothing: nothing happens", () => {
        const v = new Viewing(m).start(0).rebase(100).seek(100, 1000).play(1000, 1010);
        assert.deepEqual(v.log, []);
        assert.equal(v.state.done.size, 0);
      });

      it("13. 600 → 2000: nothing for 700 ms, then one ad for break 1 once playing", () => {
        const v = new Viewing(m).start(0).rebase(600).seek(600, 2000).tick(2000.25).tick(2000.5);
        assert.deepEqual(v.log, []);
        v.tick(2000.75);
        assert.deepEqual(v.breaks(), [{ at: 2000.75, k: 1, consumed: [1] }]);
        v.play(2000.75, 2100);
        assert.equal(v.breaks().length, 1);
      });

      it("14. 600 → 6000 (D 9000): ONE ad for breaks 1-3; the natural 7200 later fires", () => {
        const v = new Viewing(m, PLAN, 9000).start(0).rebase(600).seek(600, 6000).play(6000, 7210);
        assert.deepEqual(v.breaks(), [
          { at: 6000.75, k: 3, consumed: [1, 2, 3] },
          { at: 7200, k: 4, consumed: [4] },
        ]);
        assert.deepEqual(v.log[0].action, { kind: "break", breakIndex: 3, breakAtSeconds: 5400, consumed: [1, 2, 3] });
      });

      it("15. 600 → 1770: no ad at the landing; asks at 1780, breaks at 1800", () => {
        const v = new Viewing(m).start(0).rebase(600).seek(600, 1770).play(1770, 1810);
        assert.deepEqual(v.prefetches(), [{ at: 1780, k: 1 }]);
        assert.deepEqual(v.breaks(), [{ at: 1800, k: 1, consumed: [1] }]);
      });

      it("a landing inside the ask-ahead window asks on the settling tick", () => {
        const v = new Viewing(m).start(0).rebase(600).seek(600, 1790).play(1790, 1800);
        assert.deepEqual(v.prefetches(), [{ at: 1790.75, k: 1 }]);
        assert.deepEqual(v.breaks(), [{ at: 1800, k: 1, consumed: [1] }]);
      });

      it("16. landing in the end guard (600 → 7150, D 7200) consumes the breaks silently", () => {
        const v = new Viewing(m).start(0).rebase(600).seek(600, 7150).play(7150, D);
        assert.deepEqual(v.log, []);
        assert.deepEqual([...v.state.done].sort(), [1, 2, 3]);
        assert.deepEqual(v.markers(), []);
      });

      it("17. 600 → 3550: an ad for break 1; 3600 is silent (quiet gap); 5400 fires", () => {
        const v = new Viewing(m).start(0).rebase(600).seek(600, 3550).play(3550, 5410);
        assert.deepEqual(v.breaks(), [
          { at: 3550.75, k: 1, consumed: [1] },
          { at: 5400, k: 3, consumed: [3] },
        ]);
        assert.ok(v.state.done.has(2));
        assert.deepEqual(v.prefetches(), [{ at: 5380, k: 3 }]);
      });

      it("18. backward seeks never replay: after the 1800 break, 1900 → 1000 and on through 1800", () => {
        const v = new Viewing(m).start(0).rebase(1795).play(1795, 1900);
        assert.equal(v.breaks().length, 1);
        v.seek(1900, 1000).play(1000, 1810);
        assert.equal(v.breaks().length, 1);
        assert.equal(v.prefetches().length, 1);
      });

      it("19. asked at 1790, back to 1000: no break; playing on to 1800 fires once, asks no more", () => {
        const v = new Viewing(m).start(0).rebase(1789.75).tick(1790);
        assert.deepEqual(v.prefetches(), [{ at: 1790, k: 1 }]);
        v.seek(1790, 1000).play(1000, 1810);
        assert.deepEqual(v.breaks(), [{ at: 1800, k: 1, consumed: [1] }]);
        assert.deepEqual(v.prefetches(), [{ at: 1790, k: 1 }]);
      });

      it("20. a drag 600 → 900 → 1500 → 2500 → 4000 is one seek: {2, [1, 2]} after it settles", () => {
        const drag = new Viewing(m).start(0).rebase(600);
        let from = 600;
        for (const to of [900, 1500, 2500, 4000]) {
          drag.seek(from, to).tick(to, { scrubbing: true });
          from = to;
        }
        for (let i = 0; i < 6; i++) drag.tick(4000, { scrubbing: true });
        assert.deepEqual(drag.log, []);
        drag.play(4000, 4002);

        const one = new Viewing(m).start(0).rebase(600).seek(600, 4000).play(4000, 4002);
        const ks = (v: Viewing) => v.breaks().map(({ k, consumed }) => ({ k, consumed }));
        assert.deepEqual(ks(drag), [{ k: 2, consumed: [1, 2] }]);
        assert.deepEqual(ks(drag), ks(one));
        assert.deepEqual([...drag.state.done].sort(), [1, 2]);
      });

      it("scrubbing holds the burst open however long it lasts", () => {
        const v = new Viewing(m).start(0).rebase(600).seek(600, 4000);
        for (let i = 0; i < 20; i++) v.tick(4000, { scrubbing: true, gapMs: 500 });
        assert.deepEqual(v.log, []);
        assert.notEqual(v.state.seek, null);
      });

      it("the 700 ms count restarts with every seek in the burst", () => {
        const v = new Viewing(m).start(0).rebase(600).seek(600, 2000).tick(2000.25).seek(2000.25, 2600, 400);
        v.tick(2600.25, { gapMs: 400 }); // 800 ms after the first seek, 400 ms after the last
        assert.deepEqual(v.log, []);
        v.tick(2600.5, { gapMs: 300 });
        assert.deepEqual(v.breaks(), [{ at: 2600.5, k: 1, consumed: [1] }]);
      });

      it("21. 600 → 4000 → 900 in one burst: nothing, and nothing consumed", () => {
        const v = new Viewing(m).start(0).rebase(600).seek(600, 4000).seek(4000, 900, 250).play(900, 905);
        assert.deepEqual(v.log, []);
        assert.equal(v.state.done.size, 0);
        assert.deepEqual(v.markers(), [1800, 3600, 5400]);
      });

      it("a burst that comes back to where it began does nothing", () => {
        const v = new Viewing(m).start(0).rebase(1000).seek(1000, 3000).seek(3000, 1000, 250).play(1000, 1005);
        assert.deepEqual(v.log, []);
      });

      it("22. a seek while paused waits across paused ticks, then resolves on the first playing tick", () => {
        const v = new Viewing(m).start(0).rebase(600).tick(600, { playing: false }).seek(600, 2000);
        for (let i = 0; i < 10; i++) v.tick(2000, { playing: false, gapMs: 1000 });
        assert.deepEqual(v.log, []);
        assert.notEqual(v.state.seek, null);
        v.tick(2000.25);
        assert.deepEqual(v.breaks(), [{ at: 2000.25, k: 1, consumed: [1] }]);
      });

      it("a landing exactly on a break second counts as crossing it", () => {
        const v = new Viewing(m).start(0).rebase(600).seek(600, 1800);
        v.tick(1800, { playing: false, gapMs: 1000 }).tick(1800);
        assert.deepEqual(v.breaks(), [{ at: 1800, k: 1, consumed: [1] }]);
      });

      it("a seek over a break inside the quiet gap consumes it silently", () => {
        const v = new Viewing(m).start(1790).seek(1795, 2050).play(2050, 2060);
        assert.deepEqual(v.log, []);
        assert.ok(v.state.done.has(1));
        assert.deepEqual(v.markers(), [3600, 5400]);
      });

      it("a seek that settles while a menu is open is owed until it closes", () => {
        const v = new Viewing(m).start(0).rebase(600).seek(600, 2000).play(2000, 2002, { canInterrupt: false });
        assert.deepEqual(v.log, []);
        assert.deepEqual(v.state.owed, [1]);
        v.tick(2002.25);
        assert.deepEqual(v.breaks(), [{ at: 2002.25, k: 1, consumed: [1] }]);
      });
    });

    describe("the start point", () => {
      it("23. start(2700): break 1 is forgiven, 3600 fires", () => {
        const v = new Viewing(m).start(2700);
        assert.ok(v.state.done.has(1));
        v.play(2700, 3610);
        assert.deepEqual(v.breaks(), [{ at: 3600, k: 2, consumed: [2] }]);
      });

      it("24. start(1790): crossing 1800 is silent (quiet gap), markers [3600, 5400], 3600 fires", () => {
        const v = new Viewing(m).start(1790);
        assert.deepEqual(v.markers(), [3600, 5400]);
        v.play(1790, 3610);
        assert.deepEqual(v.breaks(), [{ at: 3600, k: 2, consumed: [2] }]);
        assert.deepEqual(v.prefetches(), [{ at: 3580, k: 2 }]);
        assert.ok(v.state.done.has(1));
      });

      it("25. start(1800): break 1 is forgiven", () => {
        const v = new Viewing(m).start(1800);
        assert.ok(v.state.done.has(1));
        assert.equal(v.state.quietUntil, 2100);
        assert.deepEqual(v.markers(), [3600, 5400]);
      });

      it("26. a tick before the start starts it there", () => {
        const v = new Viewing(m).tick(2000);
        assert.deepEqual(v.log, []);
        assert.equal(v.state.last, 2000);
        assert.ok(v.state.done.has(1));
        assert.equal(v.state.quietUntil, 2300);
        v.play(2000, 3610);
        assert.deepEqual(v.breaks(), [{ at: 3600, k: 2, consumed: [2] }]);
      });

      it("27. done on the server through 1800: 1800 passes quietly, break 2 is asked near 3600", () => {
        const v = new Viewing(m, { intervalSeconds: I, doneThroughSeconds: 1800 }).start(0).rebase(1770).play(1770, 3610);
        assert.deepEqual(v.prefetches(), [{ at: 3580, k: 2 }]);
        assert.deepEqual(v.breaks(), [{ at: 3600, k: 2, consumed: [2] }]);
      });

      it("a start clears an open burst and anything owed", () => {
        const v = new Viewing(m).start(0).rebase(1799.75).tick(1800, { canInterrupt: false }).seek(1800, 2500);
        assert.deepEqual(v.state.owed, [1]);
        v.start(3000);
        assert.equal(v.state.owed, null);
        assert.equal(v.state.seek, null);
        assert.equal(v.state.last, 3000);
      });
    });

    describe("programmatic jumps", () => {
      it("28. a rebase neither consumes nor quiets: rebase(1795) then play → break at 1800", () => {
        const v = new Viewing(m).start(0).rebase(1000);
        const { done, quietUntil } = v.state;
        v.rebase(2500);
        assert.equal(v.state.done, done);
        assert.equal(v.state.quietUntil, quietUntil);
        assert.deepEqual(v.markers(), [1800, 3600, 5400]);
        v.rebase(1795).play(1795, 1805);
        assert.deepEqual(v.breaks(), [{ at: 1800, k: 1, consumed: [1] }]);
      });

      it("29. a quality switch at 1799: 1799.1 does nothing, 1800 fires once", () => {
        const v = new Viewing(m).start(0).rebase(1779.75).play(1779.75, 1785).rebase(1799);
        assert.deepEqual(v.prefetches(), [{ at: 1780, k: 1 }]);
        v.tick(1799.1);
        assert.equal(v.log.length, 1);
        v.tick(1800).play(1800, 1810);
        assert.deepEqual(v.breaks(), [{ at: 1800, k: 1, consumed: [1] }]);
      });

      it("a rebase keeps owed breaks owed", () => {
        const v = new Viewing(m).start(0).rebase(1799.75).tick(1800, { canInterrupt: false }).rebase(1850);
        assert.deepEqual(v.state.owed, [1]);
        v.tick(1850.25);
        assert.deepEqual(v.breaks(), [{ at: 1850.25, k: 1, consumed: [1] }]);
      });

      it("a rebase ends an open burst without deciding it (as the spec says)", () => {
        const v = new Viewing(m).start(0).rebase(600).seek(600, 4000).rebase(4000).play(4000, 4005);
        assert.deepEqual(v.log, []);
        assert.equal(v.state.done.size, 0);
      });

      it("30. an undeclared jump 1000 → 2500 does nothing and consumes nothing", () => {
        const v = new Viewing(m).start(0).rebase(1000).tick(1000.25).tick(2500).play(2500, 2510);
        assert.deepEqual(v.log, []);
        assert.ok(!v.state.done.has(1));
      });

      it("31. an undeclared jump back to 0, then playing on to 1800 fires", () => {
        const v = new Viewing(m).start(0).rebase(1000).play(1000, 1001).tick(0);
        assert.deepEqual(v.log, []);
        v.play(0, 1801, { step: 1 });
        assert.deepEqual(v.breaks(), [{ at: 1800, k: 1, consumed: [1] }]);
      });
    });

    describe("the decision asked ahead", () => {
      it("34. usable when fresh and for a consumed break; not when 8 min old, not consumed, or missing", () => {
        const askedAt = 50_000;
        const cached = { breakIndex: 1, askedAt };
        assert.equal(m.midrollDecisionUsable(cached, [1], askedAt + 20_000), true);
        // After a jump over several breaks only the LAST one's decision serves.
        assert.equal(m.midrollDecisionUsable(cached, [1, 2], askedAt + 1000), false);
        assert.equal(
          m.midrollDecisionUsable({ breakIndex: 2, askedAt }, [1, 2], askedAt + 1000),
          true,
        );
        assert.equal(m.midrollDecisionUsable(cached, [], askedAt + 1000), false);
        assert.equal(m.midrollDecisionUsable(cached, [1], askedAt + 8 * 60_000 - 1), true);
        assert.equal(m.midrollDecisionUsable(cached, [1], askedAt + 8 * 60_000), false);
        assert.equal(m.midrollDecisionUsable(cached, [2], askedAt + 1000), false);
        assert.equal(m.midrollDecisionUsable(null, [1], askedAt), false);
        assert.equal(m.midrollDecisionUsable(undefined, [1], askedAt), false);
      });

      it("a clock that went backwards asks again", () => {
        assert.equal(m.midrollDecisionUsable({ breakIndex: 1, askedAt: 50_000 }, [1], 49_000), false);
      });
    });

    describe("the movie's length", () => {
      it("35. D 1900: no break, no asking, no markers", () => {
        const v = new Viewing(m, PLAN, 1900).start(0).play(0, 1900);
        assert.deepEqual(v.log, []);
        assert.deepEqual(v.markers(), []);
      });

      it("36. D 2000: 1800 fires", () => {
        const v = new Viewing(m, PLAN, 2000).start(0).rebase(1795).play(1795, 1810);
        assert.deepEqual(v.breaks(), [{ at: 1800, k: 1, consumed: [1] }]);
        assert.deepEqual(m.midrollMarkers(m.midrollStart(m.createMidrollState(PLAN), 0), 2000), [1800]);
      });

      it("the end guard edge: a break exactly at D − 120 still plays", () => {
        const s = m.midrollStart(m.createMidrollState(PLAN), 0);
        assert.deepEqual(m.midrollMarkers(s, 1920), [1800]);
        assert.deepEqual(m.midrollMarkers(s, 1919.75), []);
      });

      it("37. owed while a sheet stays open into the last 2 minutes → dropped", () => {
        const v = new Viewing(m).start(0).rebase(5390).play(5390, 7090, { canInterrupt: false, step: 1 });
        assert.deepEqual(v.breaks(), []);
        assert.deepEqual(v.state.owed, [3]);
        v.play(7090, D);
        assert.deepEqual(v.breaks(), []);
        assert.equal(v.state.owed, null);
      });

      it("38. duration 0 / NaN: crossing 1800 does nothing and consumes nothing; once known, 3600 fires", () => {
        const v = new Viewing(m, PLAN, 0).start(0).rebase(1795).play(1795, 1805);
        assert.deepEqual(v.log, []);
        assert.ok(!v.state.done.has(1));
        assert.deepEqual(v.markers(), []);
        v.duration = Number.NaN;
        v.play(1805, 1810);
        assert.deepEqual(v.log, []);
        v.duration = D;
        v.play(1810, 3610);
        assert.deepEqual(v.breaks(), [{ at: 3600, k: 2, consumed: [2] }]);
      });

      it("an infinite duration counts as unknown (and never loops forever)", () => {
        const v = new Viewing(m, PLAN, Number.POSITIVE_INFINITY).start(0).rebase(1795).play(1795, 1805);
        assert.deepEqual(v.log, []);
        assert.deepEqual(v.markers(), []);
      });

      it("no break past 86 400 s (the API refuses one), and a huge done-through stays cheap", () => {
        const long = m.midrollStart(m.createMidrollState({ intervalSeconds: 14_400, doneThroughSeconds: 0 }), 0);
        assert.deepEqual(m.midrollMarkers(long, 200_000), [14_400, 28_800, 43_200, 57_600, 72_000, 86_400]);
        const huge = m.createMidrollState({ intervalSeconds: 60, doneThroughSeconds: 1e12 });
        assert.equal(huge.done.size, 1440);
        assert.deepEqual(m.midrollMarkers(huge, 1e9), []);
      });
    });

    describe("owed breaks", () => {
      it("39. crossed while it cannot interrupt → owed; blocked ticks do nothing; the first allowed tick plays it", () => {
        const v = new Viewing(m).start(0).rebase(1799.75).tick(1800, { canInterrupt: false });
        assert.deepEqual(v.state.owed, [1]);
        v.play(1800, 1805, { canInterrupt: false });
        assert.deepEqual(v.breaks(), []);
        v.tick(1805.25);
        assert.deepEqual(v.breaks(), [{ at: 1805.25, k: 1, consumed: [1] }]);
        assert.equal(v.state.owed, null);
      });

      it("asking ahead does not wait for a closed menu (it is only the JSON decision)", () => {
        const v = new Viewing(m).start(0).rebase(1779.75).tick(1780, { canInterrupt: false });
        assert.deepEqual(v.prefetches(), [{ at: 1780, k: 1 }]);
      });

      it("an owed break waits for Play too, even with the menu closed", () => {
        const v = new Viewing(m).start(0).rebase(1799.75).tick(1800, { canInterrupt: false });
        v.tick(1800, { playing: false });
        assert.deepEqual(v.log, []);
        v.tick(1800);
        assert.equal(v.breaks().length, 1);
      });

      it("40. I 60: two crossings while blocked → one break {2, [1, 2]}", () => {
        const v = new Viewing(m, { intervalSeconds: 60, doneThroughSeconds: 0 }).start(0).play(0, 125, { canInterrupt: false });
        assert.deepEqual(v.breaks(), []);
        assert.deepEqual(v.state.owed, [1, 2]);
        v.tick(125.25);
        assert.deepEqual(v.breaks(), [{ at: 125.25, k: 2, consumed: [1, 2] }]);
      });
    });

    describe("the owner's 1-minute test", () => {
      it("41. I 60: start(0) → breaks at 60 and 120 (30 s quiet gap)", () => {
        const v = new Viewing(m, { intervalSeconds: 60, doneThroughSeconds: 0 }).start(0).play(0, 125);
        assert.deepEqual(v.breaks(), [
          { at: 60, k: 1, consumed: [1] },
          { at: 120, k: 2, consumed: [2] },
        ]);
        assert.deepEqual(v.prefetches(), [{ at: 40, k: 1 }, { at: 100, k: 2 }]);
      });
    });

    describe("seek-bar markers", () => {
      it("42. start(0) → [1800, 3600, 5400]; after break 1 → [3600, 5400]; server-done left out", () => {
        const v = new Viewing(m).start(0);
        assert.deepEqual(v.markers(), [1800, 3600, 5400]);
        v.rebase(1795).play(1795, 1801);
        assert.deepEqual(v.markers(), [3600, 5400]);
        const server = new Viewing(m, { intervalSeconds: I, doneThroughSeconds: 3600 }).start(0);
        assert.deepEqual(server.markers(), [5400]);
      });
    });

    describe("the plan's own figures", () => {
      it("43. a custom end guard and ask-ahead are honoured", () => {
        const v = new Viewing(m, { ...PLAN, endGuardSeconds: 0, askAheadSeconds: 5 }).start(0);
        assert.deepEqual(v.markers(), [1800, 3600, 5400, 7200]);
        v.rebase(1790).play(1790, 1801);
        assert.deepEqual(v.prefetches(), [{ at: 1795, k: 1 }]);
        assert.deepEqual(v.breaks(), [{ at: 1800, k: 1, consumed: [1] }]);

        const guarded = m.midrollStart(m.createMidrollState({ ...PLAN, endGuardSeconds: 600 }), 0);
        assert.deepEqual(m.midrollMarkers(guarded, 6000), [1800, 3600, 5400]);
        assert.deepEqual(m.midrollMarkers(guarded, 5999), [1800, 3600]);
      });
    });

    describe("purity", () => {
      it("never changes the state it is given", () => {
        const v = new Viewing(m).start(0).rebase(1779.75);
        const before = v.state;
        const copyOfBefore = snapshot(before);
        v.play(1779.75, 1801).seek(1801, 4000).play(4000, 4001).start(100).rebase(200);
        v.tick(1000, { canInterrupt: false });
        assert.ok(v.log.length >= 3);
        assert.deepEqual(snapshot(before), copyOfBefore);
      });

      it("OFF stays OFF through every call", () => {
        const off = m.MIDROLL_OFF;
        assert.equal(m.midrollStart(off, 100), off);
        assert.equal(m.midrollRebase(off, 100), off);
        assert.equal(m.midrollNoteSeek(off, 100, 4000, 0), off);
        assert.equal(playing(off, 100).state, off);
      });
    });
  });
}
