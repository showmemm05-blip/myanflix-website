/**
 * Checks for the security headers (M-31). Runs on Node's own test runner,
 * no build step: `npm run test:headers`.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

// Node loads a relative TypeScript file only when the path carries its full
// extension, which tsc does not allow in an `import` — so load it this way.
const load = createRequire(import.meta.url);
const headers = load("./headers.ts") as typeof import("./headers");

const {
  buildBaselinePolicy,
  buildContentSecurityPolicy,
  buildSecurityHeaders,
  cacheServerOrigin,
  isEnforced,
  parseExtraOrigins,
} = headers;

function directive(csp: string, name: string): string[] {
  const found = csp
    .split(";")
    .map((d) => d.trim())
    .find((d) => d.startsWith(`${name} `));
  assert.ok(found, `missing directive ${name} in: ${csp}`);
  return found.slice(name.length + 1).split(" ");
}

const LOCAL = { apiBaseUrl: "http://localhost:3001/api" };

/** Directive names present in a serialized policy. */
function directiveNames(csp: string): string[] {
  return csp
    .split(";")
    .map((d) => d.trim())
    .filter((d) => d.length > 0)
    .map((d) => d.split(" ")[0]);
}

function headerMap(list: { key: string; value: string }[]): Map<string, string> {
  return new Map(list.map((h) => [h.key, h.value]));
}

describe("buildSecurityHeaders", () => {
  it("sends every header the audit asked for", () => {
    const keys = buildSecurityHeaders(LOCAL).map((h) => h.key);
    assert.deepEqual(keys, [
      "Content-Security-Policy",
      "Content-Security-Policy-Report-Only",
      "X-Frame-Options",
      "X-Content-Type-Options",
      "Referrer-Policy",
      "Permissions-Policy",
    ]);
  });

  it("without CSP_ENFORCE: blocks framing/plugins/base/form hijack, reports the rest", () => {
    const map = headerMap(buildSecurityHeaders({ ...LOCAL, enforce: undefined }));
    const blocking = map.get("Content-Security-Policy") ?? "";
    const reporting = map.get("Content-Security-Policy-Report-Only") ?? "";

    assert.equal(blocking, buildBaselinePolicy());
    assert.deepEqual(directive(blocking, "frame-ancestors"), ["'none'"]);
    assert.deepEqual(directive(blocking, "object-src"), ["'none'"]);
    assert.deepEqual(directive(blocking, "base-uri"), ["'self'"]);
    assert.deepEqual(directive(blocking, "form-action"), ["'self'"]);

    assert.equal(reporting, buildContentSecurityPolicy(LOCAL));
    assert.ok(reporting.includes("default-src"));
  });

  it("the always-blocking part never says where the page may load from", () => {
    // A wrong origin must not be able to break posters or playback while the
    // full policy is still Report-Only, so no fetch/load directive may be here.
    const names = directiveNames(buildBaselinePolicy());
    assert.deepEqual(names.sort(), ["base-uri", "form-action", "frame-ancestors", "object-src"]);
    for (const n of names) {
      assert.ok(n === "object-src" || !n.endsWith("-src"), `${n} controls loading`);
    }
    assert.ok(!names.includes("default-src"));
  });

  it("with CSP_ENFORCE: one blocking header with the full policy, nothing Report-Only", () => {
    const list = buildSecurityHeaders({ ...LOCAL, enforce: "1" });
    const map = headerMap(list);
    assert.equal(map.get("Content-Security-Policy"), buildContentSecurityPolicy(LOCAL));
    assert.ok(!map.has("Content-Security-Policy-Report-Only"));
    assert.equal(list.filter((h) => h.key.startsWith("Content-Security-Policy")).length, 1);
  });

  it("enforcing never loosens: the full policy carries every baseline rule unchanged", () => {
    const full = buildContentSecurityPolicy(LOCAL);
    for (const name of directiveNames(buildBaselinePolicy())) {
      assert.deepEqual(directive(full, name), directive(buildBaselinePolicy(), name), name);
    }
  });

  it("never allows framing, sniffing or a full referrer", () => {
    const map = new Map(buildSecurityHeaders(LOCAL).map((h) => [h.key, h.value]));
    assert.equal(map.get("X-Frame-Options"), "DENY");
    assert.equal(map.get("X-Content-Type-Options"), "nosniff");
    assert.equal(map.get("Referrer-Policy"), "strict-origin-when-cross-origin");
    assert.match(map.get("Permissions-Policy") ?? "", /camera=\(\)/);
    assert.match(map.get("Permissions-Policy") ?? "", /microphone=\(\)/);
  });
});

describe("buildContentSecurityPolicy", () => {
  it("only runs scripts from the site itself and Google sign-in", () => {
    const csp = buildContentSecurityPolicy(LOCAL);
    assert.deepEqual(directive(csp, "script-src"), [
      "'self'",
      "'unsafe-inline'",
      "https://accounts.google.com",
    ]);
    assert.deepEqual(directive(csp, "object-src"), ["'none'"]);
    assert.deepEqual(directive(csp, "frame-ancestors"), ["'none'"]);
    assert.deepEqual(directive(csp, "base-uri"), ["'self'"]);
    assert.deepEqual(directive(csp, "form-action"), ["'self'"]);
  });

  it("adds 'unsafe-eval' only for next dev", () => {
    const dev = directive(
      buildContentSecurityPolicy({ ...LOCAL, development: true }),
      "script-src",
    );
    assert.ok(dev.includes("'unsafe-eval'"));
    const prod = directive(
      buildContentSecurityPolicy({ ...LOCAL, development: false }),
      "script-src",
    );
    assert.ok(!prod.includes("'unsafe-eval'"));
  });

  it("lets the browser call the API over HTTP and websocket, and nothing else", () => {
    const connect = directive(buildContentSecurityPolicy(LOCAL), "connect-src");
    assert.deepEqual(connect, [
      "'self'",
      "http://localhost:3001",
      "ws://localhost:3001",
      "http://localhost:8080",
      "https://accounts.google.com",
    ]);
    assert.ok(!connect.includes("*"));
  });

  it("derives the cache server (posters + HLS) from the API hostname on :8080", () => {
    assert.equal(cacheServerOrigin("http://192.168.10.122:3001/api"), "http://192.168.10.122:8080");
    assert.equal(
      cacheServerOrigin("https://api.myanflix.example/api"),
      "https://api.myanflix.example:8080",
    );
    const csp = buildContentSecurityPolicy({ apiBaseUrl: "http://192.168.10.122:3001/api" });
    assert.ok(directive(csp, "media-src").includes("http://192.168.10.122:8080"));
    assert.ok(directive(csp, "img-src").includes("http://192.168.10.122:8080"));
    assert.ok(directive(csp, "connect-src").includes("http://192.168.10.122:8080"));
  });

  it("uses wss: for an https API", () => {
    const csp = buildContentSecurityPolicy({ apiBaseUrl: "https://api.myanflix.example/api" });
    assert.ok(directive(csp, "connect-src").includes("wss://api.myanflix.example"));
    assert.ok(directive(csp, "connect-src").includes("https://api.myanflix.example"));
  });

  it("keeps what playback and pictures need: blob: media, blob: worker, data:/blob: images", () => {
    const csp = buildContentSecurityPolicy(LOCAL);
    assert.ok(directive(csp, "media-src").includes("blob:"));
    assert.deepEqual(directive(csp, "worker-src"), ["'self'", "blob:"]);
    const img = directive(csp, "img-src");
    for (const v of [
      "'self'",
      "data:",
      "blob:",
      "https://picsum.photos",
    ]) {
      assert.ok(img.includes(v), `img-src missing ${v}`);
    }
    // Never used by any page, so not allowed (tightened 2026-10-07).
    assert.ok(!img.includes("https://image.tmdb.org"), "img-src should not allow image.tmdb.org");
    assert.deepEqual(directive(csp, "frame-src"), ["https://accounts.google.com"]);
    assert.deepEqual(directive(csp, "font-src"), ["'self'", "data:"]);
  });

  it("adds CSP_EXTRA_ORIGINS to images, media and connect", () => {
    const csp = buildContentSecurityPolicy({
      ...LOCAL,
      extraOrigins: " https://cdn.example  https://stream.example:8443 ",
    });
    for (const d of ["img-src", "media-src", "connect-src"]) {
      const values = directive(csp, d);
      assert.ok(values.includes("https://cdn.example"), `${d} missing cdn`);
      assert.ok(values.includes("https://stream.example:8443"), `${d} missing stream`);
    }
    assert.ok(!directive(csp, "script-src").includes("https://cdn.example"));
  });

  it("falls back to localhost when the API URL is missing or broken", () => {
    const missing = buildContentSecurityPolicy({ apiBaseUrl: undefined });
    assert.ok(directive(missing, "connect-src").includes("http://localhost:3001"));
    const broken = buildContentSecurityPolicy({ apiBaseUrl: "not a url" });
    assert.ok(directive(broken, "connect-src").includes("http://localhost:3001"));
  });

  it("is a single header line with no newlines", () => {
    const csp = buildContentSecurityPolicy(LOCAL);
    assert.ok(!/[\r\n]/.test(csp));
    assert.ok(!csp.endsWith(";"));
  });
});

describe("helpers", () => {
  it("isEnforced accepts 1/true/yes only", () => {
    for (const v of ["1", "true", "TRUE", "yes", true])
      assert.equal(isEnforced(v), true, String(v));
    for (const v of ["", "0", "false", "no", undefined, false])
      assert.equal(isEnforced(v), false, String(v));
  });

  it("parseExtraOrigins splits on spaces and commas", () => {
    assert.deepEqual(parseExtraOrigins("a b,c  ,d"), ["a", "b", "c", "d"]);
    assert.deepEqual(parseExtraOrigins(undefined), []);
    assert.deepEqual(parseExtraOrigins("   "), []);
  });
});
