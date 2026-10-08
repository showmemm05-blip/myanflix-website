/**
 * The Home showcase's pure rules (hero interleave, promo windows and
 * buttons, the real plan cards). Runs on Node's own test runner, no build
 * step: `node --test components/home/showcase-model.test.ts` (part of
 * `npm test`).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import type { ShowcasePromo, ShowcaseTitle } from "./showcase-model";

// Node loads a relative TypeScript file only when the path carries its full
// extension, which tsc does not allow in an `import` — so load it this way.
const load = createRequire(import.meta.url);
const model = load("./showcase-model.ts") as typeof import("./showcase-model");

const NOW = Date.parse("2026-10-08T12:00:00Z");

function promo(id: string, extra: Partial<ShowcasePromo> = {}): ShowcasePromo {
  return {
    id,
    kind: "HERO",
    titleEn: `Promo ${id}`,
    titleMm: `ပရိုမို ${id}`,
    kickerEn: null,
    kickerMm: null,
    bodyEn: null,
    bodyMm: null,
    ctaLabelEn: null,
    ctaLabelMm: null,
    ctaTarget: "NONE",
    url: null,
    artPreset: "GENERIC",
    imageUrl: null,
    dateText: null,
    startsAt: null,
    endsAt: null,
    target: null,
    ...extra,
  };
}

function title(type: ShowcaseTitle["type"], id: string): ShowcaseTitle {
  return {
    type,
    id,
    title: `Title ${id}`,
    description: "",
    posterUrl: null,
    coverUrl: null,
    thumbnailUrl: null,
    genre: null,
    releaseYear: null,
    durationMinutes: null,
    rating: null,
    accessType: null,
    ageRating: null,
    author: null,
  };
}

describe("interleaveHero", () => {
  const keyOf = (t: string) => t;

  it("alternates title, promo, title, promo and keeps both orders", () => {
    const slides = model.interleaveHero(["a", "b", "c"], [promo("p1"), promo("p2")], keyOf, NOW);
    assert.deepEqual(
      slides.map((s) => s.key),
      ["title-a", "promo-p1", "title-b", "promo-p2", "title-c"],
    );
  });

  it("runs the longer list on at the end", () => {
    const slides = model.interleaveHero(["a"], [promo("p1"), promo("p2"), promo("p3")], keyOf, NOW);
    assert.deepEqual(
      slides.map((s) => s.key),
      ["title-a", "promo-p1", "promo-p2", "promo-p3"],
    );
  });

  it("shows only titles when there are no promos, and only promos when the titles failed", () => {
    assert.equal(model.interleaveHero(["a", "b"], [], keyOf, NOW).length, 2);
    const onlyPromos = model.interleaveHero([], [promo("p1")], keyOf, NOW);
    assert.deepEqual(onlyPromos.map((s) => s.kind), ["promo"]);
  });

  it("leaves out promos outside their window", () => {
    const slides = model.interleaveHero(
      ["a"],
      [
        promo("ended", { endsAt: "2026-10-08T11:59:59Z" }),
        promo("later", { startsAt: "2026-10-09T00:00:00Z" }),
        promo("live", { startsAt: "2026-10-01T00:00:00Z", endsAt: "2026-10-31T00:00:00Z" }),
      ],
      keyOf,
      NOW,
    );
    assert.deepEqual(
      slides.map((s) => s.key),
      ["title-a", "promo-live"],
    );
  });
});

describe("isPromoLive", () => {
  it("treats the end time as exclusive and a missing bound as open", () => {
    assert.equal(model.isPromoLive({ startsAt: null, endsAt: null }, NOW), true);
    assert.equal(model.isPromoLive({ startsAt: null, endsAt: "2026-10-08T12:00:00Z" }, NOW), false);
    assert.equal(model.isPromoLive({ startsAt: "2026-10-08T12:00:00Z", endsAt: null }, NOW), true);
  });
});

describe("promoText", () => {
  it("picks the active language and falls back to the other half", () => {
    const p = promo("x", { kickerEn: "Hello", kickerMm: null, bodyEn: "  ", bodyMm: "  " });
    assert.equal(model.promoText(p, "mm").title, "ပရိုမို x");
    assert.equal(model.promoText(p, "en").title, "Promo x");
    assert.equal(model.promoText(p, "mm").kicker, "Hello");
    assert.equal(model.promoText(p, "en").body, null);
  });
});

describe("promoAction", () => {
  it("maps every button type", () => {
    assert.deepEqual(model.promoAction(promo("s", { ctaTarget: "SUBSCRIBE" })), { kind: "subscribe" });
    assert.deepEqual(model.promoAction(promo("m", { ctaTarget: "ADD_MONEY" })), {
      kind: "link",
      href: "/wallet?deposit=1",
      needsSignIn: true,
    });
    assert.deepEqual(model.promoAction(promo("t", { ctaTarget: "SERIES", target: title("SERIES", "s1") })), {
      kind: "link",
      href: "/series/s1",
      needsSignIn: false,
    });
    assert.deepEqual(model.promoAction(promo("b", { ctaTarget: "BOOK", target: title("BOOK", "b1") })), {
      kind: "link",
      href: "/books/b1",
      needsSignIn: false,
    });
    assert.equal(model.promoAction(promo("n", { ctaTarget: "NONE" })), null);
  });

  it("drops a title button whose title the viewer cannot see", () => {
    assert.equal(model.promoAction(promo("t", { ctaTarget: "MOVIE", target: null })), null);
    assert.equal(model.promoAction(promo("t", { ctaTarget: "MOVIE", target: title("BOOK", "b1") })), null);
  });

  it("opens only http(s) addresses", () => {
    assert.deepEqual(model.promoAction(promo("u", { ctaTarget: "URL", url: "https://example.com/a" })), {
      kind: "external",
      href: "https://example.com/a",
    });
    assert.equal(model.promoAction(promo("u", { ctaTarget: "URL", url: "javascript:alert(1)" })), null);
    assert.equal(model.promoAction(promo("u", { ctaTarget: "URL", url: "not a url" })), null);
    assert.equal(model.promoAction(promo("u", { ctaTarget: "URL", url: null })), null);
  });
});

describe("planCards", () => {
  const plan = (id: string, price: number, durationDays: number, isActive = true) => ({
    id,
    name: id,
    price,
    durationDays,
    isActive,
  });

  it("sorts the real plans shortest first and marks the longest best value", () => {
    const cards = model.planCards([plan("premium", 10000, 30), plan("normal", 4000, 10)]);
    assert.deepEqual(
      cards.map((c) => [c.plan.id, c.perDay, c.perDayExact, c.best]),
      [
        ["normal", 400, true, false],
        ["premium", 333, false, true],
      ],
    );
  });

  it("drops inactive plans and gives a single plan no badge", () => {
    const cards = model.planCards([plan("old", 1000, 5, false), plan("only", 9000, 30)]);
    assert.deepEqual(
      cards.map((c) => [c.plan.id, c.best]),
      [["only", false]],
    );
    assert.deepEqual(model.planCards(undefined), []);
  });
});
