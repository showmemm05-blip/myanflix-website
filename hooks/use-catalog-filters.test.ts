/**
 * I-10 (security audit 2026-10-06): the catalogue filter parsers only yield
 * values the API's query DTOs accept, from a shared link AND from this
 * browser's saved preferences. Runs on Node's own test runner, no build step:
 *
 *   node --test hooks/use-catalog-filters.test.ts
 *
 * The hook file imports React and Next, which the parsers never call. The
 * in-thread module hooks below map the website's "@/..." alias to the one
 * pure module the parsers need and swap every framework import for a stub,
 * so the hook module loads under plain Node. Limits under test mirror
 * backend movie-query.dto.ts / series-query.dto.ts.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import Module, { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

type ResolveResult = { url: string; shortCircuit?: boolean };
type ResolveHook = (
  specifier: string,
  context: unknown,
  next: (specifier: string, context: unknown) => ResolveResult,
) => ResolveResult;
// @types/node here predates `registerHooks` (Node >= 22.15); the runtime has it.
const { registerHooks } = Module as unknown as {
  registerHooks: (hooks: { resolve: ResolveHook }) => void;
};

const HOOKS_DIR = path.dirname(fileURLToPath(import.meta.url));
const PURE_MODULES: Record<string, string> = {
  "@/components/filters/filter-types": path.join(
    HOOKS_DIR,
    "..",
    "components",
    "filters",
    "filter-types.ts",
  ),
};
const STUB_SOURCE = [
  "const noop = () => undefined;",
  "export const useCallback = noop, useEffect = noop, useMemo = noop, useRef = noop, useState = noop;",
  "export const usePathname = noop, useRouter = noop, useSearchParams = noop;",
  "export const useSearchTerm = noop, useLanguage = noop;",
  "export const actorService = {};",
  'export const BROWSE_TABS = ["movies", "series", "actors"];',
  "export default {};",
].join("\n");
const STUB_URL = `data:text/javascript,${encodeURIComponent(STUB_SOURCE)}`;

registerHooks({
  resolve(specifier, context, next) {
    const pure = PURE_MODULES[specifier];
    if (pure) return { url: pathToFileURL(pure).href, shortCircuit: true };
    if (specifier.startsWith("@/") || specifier === "react" || specifier === "next/navigation") {
      return { url: STUB_URL, shortCircuit: true };
    }
    return next(specifier, context);
  },
});

// Node loads a relative TypeScript file only when the path carries its full
// extension, which tsc does not allow in an `import` — so load it this way.
const load = createRequire(import.meta.url);
const { catalogFilterParsers } = load(
  "./use-catalog-filters.ts",
) as typeof import("./use-catalog-filters");
const { parseMovieFilters, parseSeriesFilters, sanitizeMovieFilters, sanitizeSeriesFilters } =
  catalogFilterParsers;
const { sanitizeSearch } = catalogFilterParsers;

const P = (query: string) => new URLSearchParams(query);
const UUID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";

describe("URL parser only yields values the API accepts", () => {
  it("drops a non-integer year (the finding's exploit link)", () => {
    assert.equal(parseMovieFilters(P("yearFrom=2000.5")).yearFrom, undefined);
    assert.equal(parseMovieFilters(P("yearTo=2010.25")).yearTo, undefined);
    assert.equal(parseSeriesFilters(P("yearFrom=2000.5")).yearFrom, undefined);
  });

  it("drops a non-integer duration but keeps a decimal rating", () => {
    const f = parseMovieFilters(
      P("durationMin=90.5&durationMax=120.1&ratingMin=7.5&ratingMax=9.25"),
    );
    assert.equal(f.durationMin, undefined);
    assert.equal(f.durationMax, undefined);
    assert.equal(f.ratingMin, 7.5);
    assert.equal(f.ratingMax, 9.25);
  });

  it("turns odd number spellings into a valid integer or drops them", () => {
    // What survives is re-spelled as a plain integer in the URL writeback and
    // the query, so the API never sees the odd form.
    for (const [spelling, expected] of [
      ["0x7D0", 2000],
      ["1e3", undefined], // 1000 is below the API's minimum year
      ["2000.0", 2000],
      ["NaN", undefined],
      ["Infinity", undefined],
      ["abc", undefined],
      ["2000.0.1", undefined],
      [" 2000 ", 2000],
    ] as const) {
      assert.equal(parseMovieFilters(P(`yearFrom=${spelling}`)).yearFrom, expected, spelling);
    }
    assert.equal(parseMovieFilters(P("yearFrom=1887")).yearFrom, undefined);
    assert.equal(parseMovieFilters(P("yearTo=2101")).yearTo, undefined);
    assert.equal(parseMovieFilters(P("ratingMax=10.5")).ratingMax, undefined);
  });

  it("still accepts every value the UI can produce", () => {
    const f = parseMovieFilters(
      P(
        "yearFrom=1990&yearTo=2024&durationMin=91&durationMax=120&ratingMin=7&genres=Action,Drama&ageRatings=PG13,R&access=FREE&sort=newest",
      ),
    );
    assert.deepEqual(
      [f.yearFrom, f.yearTo, f.durationMin, f.durationMax, f.ratingMin],
      [1990, 2024, 91, 120, 7],
    );
    assert.deepEqual(f.genres, ["Action", "Drama"]);
    assert.deepEqual(f.ageRatings, ["PG13", "R"]);
    assert.equal(f.accessType, "FREE");
    assert.equal(f.sort, "newest");
  });

  it("caps each list at 20 entries", () => {
    const many = Array.from({ length: 25 }, (_, i) => `g${i}`).join(",");
    assert.equal(parseMovieFilters(P(`genres=${many}`)).genres.length, 20);
    assert.equal(parseMovieFilters(P(`countries=${many}`)).countries.length, 20);
    assert.equal(parseSeriesFilters(P(`languages=${many}`)).languages.length, 20);
  });

  it("folds the legacy ?genre= alias in without exceeding the cap", () => {
    const fifteen = Array.from({ length: 15 }, (_, i) => `g${i}`).join(",");
    const f = parseMovieFilters(P(`genres=${fifteen}&genre=${fifteen},x1,x2,x3,x4,x5,x6`));
    assert.equal(f.genres.length, 20);
    assert.equal(new Set(f.genres).size, 20);
  });

  it("drops entries over 64 chars (directors: 120)", () => {
    const long65 = "x".repeat(65);
    const long120 = "d".repeat(120);
    const long121 = "d".repeat(121);
    assert.deepEqual(parseMovieFilters(P(`genres=Action,${long65}`)).genres, ["Action"]);
    assert.deepEqual(parseMovieFilters(P(`directors=${long120},${long121}`)).directors, [long120]);
  });

  it("de-duplicates so six copies of one age rating cannot exceed ArrayMaxSize(5)", () => {
    assert.deepEqual(parseMovieFilters(P("ageRatings=G,G,G,G,G,G")).ageRatings, ["G"]);
    assert.deepEqual(parseMovieFilters(P("ageRatings=G,NOPE,R")).ageRatings, ["G", "R"]);
  });

  it("keeps only v4 UUID actor ids, at most 10", () => {
    const v1 = "3f2504e0-4f89-11d3-9a0c-0305e82c3301";
    const ids = [
      UUID,
      "not-a-uuid",
      v1,
      ...Array.from({ length: 12 }, (_, i) => UUID.slice(0, -2) + String(i).padStart(2, "0")),
    ];
    const actors = parseMovieFilters(P(`actorIds=${ids.join(",")}`)).actors;
    assert.ok(actors.every((a) => /^[0-9a-f-]{36}$/.test(a.id)));
    assert.ok(!actors.some((a) => a.id === "not-a-uuid" || a.id === v1));
    assert.equal(actors.length, 10);
    // A link-only actor is named by its id until the name is resolved.
    assert.equal(actors[0].name, actors[0].id);
  });

  it("falls back to the default sort and no access filter for unknown values", () => {
    assert.equal(parseMovieFilters(P("sort=evil")).sort, "recentlyAdded");
    assert.equal(parseSeriesFilters(P("sort=rating")).sort, "recentlyAdded");
    assert.equal(parseMovieFilters(P("access=PAID")).accessType, undefined);
  });
});

describe("localStorage restore is sanitised the same way", () => {
  it("drops a bad year that was saved from a crafted link", () => {
    const f = sanitizeMovieFilters({ yearFrom: 2000.5, genres: ["Action"], sort: "newest" });
    assert.equal(f.yearFrom, undefined);
    assert.deepEqual(f.genres, ["Action"]);
    assert.equal(f.sort, "newest");
  });

  it("tolerates a tampered blob (wrong types, unknown sort, junk keys)", () => {
    const f = sanitizeMovieFilters({
      genres: "Action",
      actors: [{ id: "x", name: 1 }, { id: UUID, name: "Real" }, null, 7],
      sort: "evil",
      bogus: 1,
      ratingMin: "abc",
      yearTo: null,
    });
    assert.deepEqual(f.genres, []);
    assert.deepEqual(f.actors, [{ id: UUID, name: "Real" }]);
    assert.equal(f.sort, "recentlyAdded");
    assert.equal(f.ratingMin, undefined);
    assert.equal(f.yearTo, undefined);
    assert.ok(!("bogus" in f));

    const s = sanitizeSeriesFilters({ yearTo: "2010.5", languages: ["en", "en"] });
    assert.equal(s.yearTo, undefined);
    assert.deepEqual(s.languages, ["en"]);
  });

  it("yields plain defaults for a non-object blob", () => {
    for (const junk of [null, "string", 42, [1, 2], undefined]) {
      const f = sanitizeMovieFilters(junk);
      assert.equal(f.sort, "recentlyAdded");
      assert.deepEqual(f.genres, []);
      assert.deepEqual(f.actors, []);
      assert.equal(f.yearFrom, undefined);
    }
  });

  it("keeps the actor name saved with the id (no re-fetch on restore)", () => {
    assert.deepEqual(sanitizeMovieFilters({ actors: [{ id: UUID, name: "Jane" }] }).actors, [
      { id: UUID, name: "Jane" },
    ]);
  });
});

describe("search term", () => {
  it("is cut to the API's 200-char limit, from the URL, from storage and from the field", () => {
    assert.equal(sanitizeSearch("q".repeat(500)).length, 200);
    assert.equal(sanitizeSearch("q".repeat(200)).length, 200);
    assert.equal(sanitizeSearch("hello"), "hello");
    assert.equal(sanitizeSearch(null), "");
    assert.equal(sanitizeSearch(42), "");
  });
});
