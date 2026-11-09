/**
 * A title's genre and language, only when it has them (lib/title-facts.ts):
 * a series made from TMDB can be published with either one empty, and the
 * pages must then draw nothing for it — no blank Details row, no empty
 * genre chip, no card line that starts with a separator. Runs on Node's own
 * test runner: `node --test lib/title-facts.test.ts` (part of `npm test`).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

// Node loads a relative TypeScript file only when the path carries its full
// extension, which tsc does not allow in an `import` — so load it this way.
const load = createRequire(import.meta.url);
const { genreChip, metaLine, optionalFact } = load("./title-facts.ts") as typeof import("./title-facts");

/** A Telugu talk show created from TMDB and published as it came: no house word for either. */
const bare = { genre: "", language: "", releaseYear: 2016 };
const full = { genre: "Drama", language: "Korean", releaseYear: 2016 };

describe("the Details panel", () => {
  it("a series with no genre and no language gets neither row", () => {
    const facts = [
      ...optionalFact("Genre", bare.genre),
      ...optionalFact("Language", bare.language),
      { label: "Release year", value: String(bare.releaseYear) },
    ];
    assert.deepEqual(facts, [{ label: "Release year", value: "2016" }]);
  });

  it("a title that has them shows both, in place", () => {
    assert.deepEqual(
      [...optionalFact("Genre", full.genre), ...optionalFact("Language", full.language)],
      [
        { label: "Genre", value: "Drama" },
        { label: "Language", value: "Korean" },
      ],
    );
  });

  it("only spaces, null and a missing field all count as empty", () => {
    assert.deepEqual(optionalFact("Genre", "   "), []);
    assert.deepEqual(optionalFact("Genre", null), []);
    assert.deepEqual(optionalFact("Genre", undefined), []);
  });
});

describe("the hero's genre chip", () => {
  it("no genre = no chip, so the row never starts with an empty pill linking to 'genres='", () => {
    assert.deepEqual(genreChip(bare.genre, "/media/movies?tab=series&genres="), []);
  });

  it("a genre gives the one linked chip", () => {
    assert.deepEqual(genreChip(full.genre, "/media/movies?tab=series&genres=Drama"), [
      { key: "genre:Drama", label: "Drama", href: "/media/movies?tab=series&genres=Drama" },
    ]);
  });
});

describe("a card's meta line", () => {
  it("an empty genre leaves no leading separator", () => {
    assert.equal(metaLine([bare.genre, bare.releaseYear, "8 episodes"]), "2016 · 8 episodes");
  });

  it("every part that exists is kept, in order", () => {
    assert.equal(metaLine([full.genre, full.releaseYear, "8 episodes"]), "Drama · 2016 · 8 episodes");
  });

  it("null, undefined and blank parts are all skipped", () => {
    assert.equal(metaLine([null, "  ", undefined, 2016]), "2016");
    assert.equal(metaLine([]), "");
  });
});
