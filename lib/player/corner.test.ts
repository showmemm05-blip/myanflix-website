/**
 * The corner-ad timing (lib/player/corner.ts). Every case runs against BOTH
 * copies — this one and the phone's mobile/src/video/corner.ts — and the
 * two files must be byte-identical. Case numbers follow the corner list in
 * docs/in-movie-ads-2026-11-04/SCHEDULER-SPEC.md.
 * Runs on Node's own test runner: `node --test lib/player/corner.test.ts`.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import type { CornerPlanInput, CornerState } from "./corner";

type Corner = typeof import("./corner");

// Node loads a relative TypeScript file only when the path carries its full
// extension, which tsc does not allow in an `import` — so load it this way.
const load = createRequire(import.meta.url);
const WEB_PATH = "./corner.ts";
const PHONE_PATH = "../../../mobile/src/video/corner.ts";
const phoneFile = new URL(PHONE_PATH, import.meta.url);
// Only a whole checkout has the phone copy (the website's Docker context does not).
const hasPhoneCopy = existsSync(phoneFile);

const copies: [string, Corner][] = [["web", load(WEB_PATH) as Corner]];
if (hasPhoneCopy) copies.push(["phone", load(PHONE_PATH) as Corner]);

describe("the two copies", () => {
  it("are byte-identical", { skip: !hasPhoneCopy && "no mobile/ folder beside this checkout" }, () => {
    assert.ok(
      readFileSync(new URL(WEB_PATH, import.meta.url)).equals(readFileSync(phoneFile)),
      "mobile/src/video/corner.ts differs from lib/player/corner.ts — copy one over the other",
    );
  });
});

const D = 7200;
/** Ten seconds, once, closable, first showing after the default minute. */
const ONCE: CornerPlanInput = { showSeconds: 10, repeatSeconds: null, closable: true };

interface TickOptions {
  playing?: boolean;
  canShow?: boolean;
  rate?: number;
  duration?: number;
}

/** One viewing ticked the way a player ticks it, with a log of every phase change. */
class Watching {
  readonly c: Corner;
  state: CornerState;
  /** [position, new phase, showings] for every change of phase. */
  changes: [number, CornerState["phase"], number][] = [];

  constructor(c: Corner, plan: CornerPlanInput | null = ONCE) {
    this.c = c;
    this.state = c.createCornerState(plan);
  }

  tick(position: number, o: TickOptions = {}): this {
    const next = this.c.cornerTick(this.state, {
      position,
      duration: o.duration ?? D,
      playing: o.playing ?? true,
      rate: o.rate ?? 1,
      canShow: o.canShow ?? true,
    });
    if (next.phase !== this.state.phase) this.changes.push([position, next.phase, next.showings]);
    this.state = next;
    return this;
  }

  /** Natural playback: a tick every `step` seconds after `from`, up to and including `to`. */
  play(from: number, to: number, o: TickOptions & { step?: number } = {}): this {
    const step = o.step ?? 0.25;
    const count = Math.round((to - from) / step);
    for (let i = 1; i <= count; i++) this.tick(from + i * step, o);
    return this;
  }
}

for (const [copy, c] of copies) {
  describe(`corner (${copy} copy)`, () => {
    it("the constants the plan fixed", () => {
      assert.equal(c.CORNER_DEFAULT_FIRST_AFTER_SECONDS, 60);
      assert.equal(c.CORNER_DEFAULT_SHOW_SECONDS, 10);
      assert.equal(c.CORNER_MIN_REPEAT_SECONDS, 60);
      assert.equal(c.CORNER_END_GUARD_SECONDS, 120);
      assert.equal(c.CORNER_MAX_STEP_SECONDS, 4);
    });

    it("1. no plan stays off", () => {
      assert.equal(c.createCornerState(null), c.CORNER_OFF);
      assert.equal(c.createCornerState(undefined), c.CORNER_OFF);
      assert.ok(Object.isFrozen(c.CORNER_OFF));
      const w = new Watching(c, null).tick(0).play(0, 300);
      assert.equal(w.state, c.CORNER_OFF);
      assert.deepEqual(w.changes, []);
      assert.equal(c.cornerVisible(w.state, { position: 300, duration: D, canShow: true }), false);
      assert.equal(c.cornerDismiss(c.CORNER_OFF), c.CORNER_OFF);
      assert.equal(c.cornerFail(c.CORNER_OFF), c.CORNER_OFF);
    });

    it("2. not before 60 s watched; showing on the first tick at or past 60", () => {
      const w = new Watching(c).tick(0).play(0, 59.75);
      assert.equal(w.state.phase, "waiting");
      w.tick(60);
      assert.equal(w.state.phase, "showing");
      assert.equal(w.state.showings, 1);
      assert.deepEqual(w.changes, [[60, "showing", 1]]);
      assert.equal(c.cornerVisible(w.state, { position: 60, duration: D, canShow: true }), true);
    });

    it("the minute counts from where the viewing starts (a resume at 50:00)", () => {
      const w = new Watching(c).tick(3000);
      assert.equal(w.state.watched, 0);
      w.play(3000, 3060);
      assert.deepEqual(w.changes, [[3060, "showing", 1]]);
    });

    it("3. seeks (> 4 s), paused ticks and backward steps add no watched time", () => {
      const w = new Watching(c).tick(0).tick(30);
      assert.equal(w.state.watched, 0);
      w.tick(30.25, { playing: false });
      assert.equal(w.state.watched, 0);
      w.tick(20).tick(20);
      assert.equal(w.state.watched, 0);
      w.tick(20.25);
      assert.equal(w.state.watched, 0.25);
      w.tick(24.25); // exactly 4 s still counts
      assert.equal(w.state.watched, 4.25);
      w.tick(28.26);
      assert.equal(w.state.watched, 4.25);
    });

    it("4. visible time counts only while it can show: controls up 3 s of a 10 s showing → ends after 13 s", () => {
      const w = new Watching(c).tick(0).play(0, 60).play(60, 65);
      assert.equal(w.state.shownFor, 5);
      w.play(65, 68, { canShow: false });
      assert.equal(w.state.shownFor, 5);
      assert.equal(w.state.phase, "showing");
      assert.equal(c.cornerVisible(w.state, { position: 68, duration: D, canShow: false }), false);
      w.play(68, 72.75);
      assert.equal(w.state.phase, "showing");
      w.tick(73);
      assert.deepEqual(w.changes, [
        [60, "showing", 1],
        [73, "done", 1],
      ]);
    });

    it("it starts on time even while it cannot be seen; only the seen time counts", () => {
      const w = new Watching(c).tick(0).play(0, 70, { canShow: false });
      assert.equal(w.state.phase, "showing");
      assert.equal(w.state.shownFor, 0);
      w.play(70, 80);
      assert.equal(w.state.phase, "done");
    });

    it("5. at 2× a 10 s showing lasts 20 s of movie", () => {
      const w = new Watching(c).tick(0).play(0, 60, { step: 0.5, rate: 2 });
      w.play(60, 79.5, { step: 0.5, rate: 2 });
      assert.equal(w.state.phase, "showing");
      w.tick(80, { rate: 2 });
      assert.deepEqual(w.changes, [
        [60, "showing", 1],
        [80, "done", 1],
      ]);
    });

    it("a broken rate counts as 1×; a tiny one as 0.25×", () => {
      for (const rate of [Number.NaN, 0, -1]) {
        const w = new Watching(c).tick(0).play(0, 60).play(60, 70, { rate });
        assert.equal(w.state.phase, "done", String(rate));
      }
      const slow = new Watching(c).tick(0).play(0, 60).tick(60.25, { rate: 0.1 });
      assert.equal(slow.state.shownFor, 1);
    });

    it("6. repeat 600: back 600 watched seconds after it left; showings 2", () => {
      const w = new Watching(c, { showSeconds: 10, repeatSeconds: 600, closable: true }).tick(0).play(0, 680);
      assert.deepEqual(w.changes, [
        [60, "showing", 1],
        [70, "waiting", 1],
        [670, "showing", 2],
        [680, "waiting", 2],
      ]);
      assert.equal(w.state.showings, 2);
      assert.equal(w.state.dueAt, 680 + 600);
    });

    it("the repeat counts watched seconds, not position: a seek forward does not bring it back sooner", () => {
      const w = new Watching(c, { showSeconds: 10, repeatSeconds: 600, closable: true }).tick(0).play(0, 70);
      w.tick(4000).play(4000, 4599.75);
      assert.equal(w.state.phase, "waiting");
      w.tick(4600);
      assert.equal(w.state.phase, "showing");
    });

    it("7. once: done after the first showing, and stays done", () => {
      const w = new Watching(c).tick(0).play(0, 70);
      assert.equal(w.state.phase, "done");
      const done = w.state;
      w.play(70, 2000, { step: 1 });
      assert.equal(w.state, done);
    });

    it("8. until closed: still showing after 1000 s; ✕ ends it", () => {
      const w = new Watching(c, { showSeconds: null, repeatSeconds: null, closable: false }).tick(0).play(0, 1060, { step: 1 });
      assert.equal(w.state.phase, "showing");
      assert.equal(w.state.closable, true);
      const closed = c.cornerDismiss(w.state);
      assert.equal(closed.phase, "done");
      assert.equal(c.cornerTick(closed, { position: 1061, duration: D, playing: true, rate: 1, canShow: true }), closed);
    });

    it("9. not closable: ✕ does nothing", () => {
      const w = new Watching(c, { showSeconds: 10, repeatSeconds: null, closable: false }).tick(0).play(0, 61);
      assert.equal(w.state.phase, "showing");
      assert.equal(c.cornerDismiss(w.state), w.state);
    });

    it("✕ only acts while showing", () => {
      const waiting = new Watching(c).tick(0).state;
      assert.equal(c.cornerDismiss(waiting), waiting);
    });

    it("10. the last 2 minutes: not visible, not counting", () => {
      const w = new Watching(c, { showSeconds: 30, repeatSeconds: null, closable: true }).tick(7000).play(7000, 7060);
      assert.equal(w.state.phase, "showing");
      w.play(7060, 7080);
      assert.equal(w.state.shownFor, 20);
      assert.equal(c.cornerVisible(w.state, { position: 7080, duration: D, canShow: true }), true);
      w.play(7080, 7150);
      assert.equal(w.state.shownFor, 20);
      assert.equal(w.state.phase, "showing");
      assert.equal(c.cornerVisible(w.state, { position: 7150, duration: D, canShow: true }), false);
    });

    it("cornerNearEnd: past D − 120 only, never while the length is unknown", () => {
      assert.equal(c.cornerNearEnd(7080, D), false);
      assert.equal(c.cornerNearEnd(7080.25, D), true);
      assert.equal(c.cornerNearEnd(7000, 0), false);
      assert.equal(c.cornerNearEnd(7000, Number.NaN), false);
    });

    it("11. input cleaning", () => {
      const make = (plan: Partial<CornerPlanInput>) => c.createCornerState({ ...ONCE, ...plan });
      for (const showSeconds of [0, -3, Number.NaN, Number.POSITIVE_INFINITY]) {
        assert.equal(make({ showSeconds }).showSeconds, 10, String(showSeconds));
      }
      assert.equal(make({ showSeconds: 15 }).showSeconds, 15);
      assert.equal(make({ repeatSeconds: 30 }).repeatSeconds, 60);
      assert.equal(make({ repeatSeconds: 600 }).repeatSeconds, 600);
      for (const repeatSeconds of [null, 0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
        assert.equal(make({ repeatSeconds }).repeatSeconds, null, String(repeatSeconds));
      }
      assert.equal(make({}).dueAt, 60);
      assert.equal(make({ firstShowAfterSeconds: 5 }).dueAt, 5);
      assert.equal(make({ firstShowAfterSeconds: -1 }).dueAt, 60);
      assert.equal(make({ showSeconds: null, closable: false }).closable, true);
      assert.equal(make({ closable: false }).closable, false);
      const fresh = make({});
      assert.equal(fresh.phase, "waiting");
      assert.equal(fresh.last, null);
      assert.equal(fresh.showings, 0);
    });

    it("first showing after 0 s: on the first watched tick", () => {
      const w = new Watching(c, { ...ONCE, firstShowAfterSeconds: 0 }).tick(0).tick(0.25);
      assert.deepEqual(w.changes, [[0.25, "showing", 1]]);
    });

    it("12. the same object when nothing changes", () => {
      const w = new Watching(c).tick(0).play(0, 30);
      const s = w.state;
      const at = (position: number, playing = true) =>
        c.cornerTick(s, { position, duration: D, playing, rate: 1, canShow: true });
      assert.equal(at(30), s);
      assert.equal(at(30, false), s);
      for (const position of [Number.NaN, -1, Number.POSITIVE_INFINITY]) assert.equal(at(position), s);
      const done = c.cornerFail(s);
      assert.equal(c.cornerFail(done), done);
      assert.equal(c.cornerDismiss(done), done);
    });

    it("a picture that fails ends it for the viewing", () => {
      const waiting = new Watching(c).tick(0).state;
      assert.equal(c.cornerFail(waiting).phase, "done");
      const showing = new Watching(c).tick(0).play(0, 61).state;
      const failed = c.cornerFail(showing);
      assert.equal(failed.phase, "done");
      assert.equal(c.cornerVisible(failed, { position: 61, duration: D, canShow: true }), false);
    });

    it("never changes the state it is given", () => {
      const before = new Watching(c, { showSeconds: 10, repeatSeconds: 600, closable: true }).tick(0).state;
      const copyOfBefore = { ...before };
      const w = new Watching(c);
      w.state = before;
      w.play(0, 700);
      c.cornerDismiss(w.state);
      c.cornerFail(w.state);
      assert.deepEqual(before, copyOfBefore);
    });

    it("13. safeAdLink: http(s) only, trimmed", () => {
      assert.equal(c.safeAdLink("https://shop.example.com/promo?x=1#top"), "https://shop.example.com/promo?x=1#top");
      assert.equal(c.safeAdLink("http://example.com"), "http://example.com");
      assert.equal(c.safeAdLink("  https://example.com/a  "), "https://example.com/a");
      assert.equal(c.safeAdLink("HTTPS://EXAMPLE.COM"), "HTTPS://EXAMPLE.COM");
      for (const bad of [
        "javascript:alert(1)",
        "JavaScript://example.com/%0aalert(1)",
        "data:text/html,<b>hi</b>",
        "/promo",
        "example.com",
        "//example.com",
        "ftp://example.com",
        "",
        "   ",
        "https://",
        "https:///path",
        "https://exa mple.com",
        null,
        undefined,
        42,
        {},
      ]) {
        assert.equal(c.safeAdLink(bad), null, String(bad));
      }
    });
  });
}
