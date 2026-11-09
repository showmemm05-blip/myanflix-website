/**
 * The optional TMDB logo (lib/credits/tmdb-logo.ts): no file means no logo
 * (null), and the file in public/credits means its site address. Runs on
 * Node's own test runner against throwaway folders:
 * `node --test lib/credits/tmdb-logo.test.ts` (part of `npm test`).
 */
import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Node loads a relative TypeScript file only when the path carries its full
// extension, which tsc does not allow in an `import` — so load it this way.
const load = createRequire(import.meta.url);
const { TMDB_LOGO_PUBLIC_PATH, tmdbLogoSrc } = load("./tmdb-logo.ts") as typeof import("./tmdb-logo");

describe("tmdbLogoSrc", () => {
  const root = mkdtempSync(join(tmpdir(), "myanflix-tmdb-logo-"));
  after(() => rmSync(root, { recursive: true, force: true }));

  it("is null while the logo file has not been added", () => {
    assert.equal(tmdbLogoSrc(root), null);
  });

  it("is still null when only the folder exists", () => {
    mkdirSync(join(root, "public", "credits"), { recursive: true });
    assert.equal(tmdbLogoSrc(root), null);
  });

  it("is the site address of the file once it is in public/credits", () => {
    writeFileSync(join(root, "public", "credits", "tmdb-logo.svg"), "<svg xmlns=\"http://www.w3.org/2000/svg\"/>");
    assert.equal(tmdbLogoSrc(root), "/credits/tmdb-logo.svg");
    assert.equal(tmdbLogoSrc(root), TMDB_LOGO_PUBLIC_PATH);
  });

  it("looks in the folder the site runs from by default", () => {
    const before = process.cwd();
    process.chdir(root);
    try {
      assert.equal(tmdbLogoSrc(), TMDB_LOGO_PUBLIC_PATH);
    } finally {
      process.chdir(before);
    }
  });
});

describe("TMDB_LOGO_PUBLIC_PATH", () => {
  it("serves the logo from the site itself, never from TMDB's servers", () => {
    assert.ok(TMDB_LOGO_PUBLIC_PATH.startsWith("/"));
    assert.ok(!TMDB_LOGO_PUBLIC_PATH.startsWith("//"));
  });
});
