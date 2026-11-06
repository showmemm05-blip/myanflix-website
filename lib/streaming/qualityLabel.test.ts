/**
 * The quality menu must name a rung after its folder, not its pixel height
 * (a widescreen film's 1080p rung is 1920×800 since the 2026-10-12 ladder).
 * Runs on Node's own test runner: `node --test lib/streaming/qualityLabel.test.ts`.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

// The same loading trick as HlsCacheLoader.test.ts: Node's runner strips types
// but does not resolve an extension-less ".ts" import.
const load = createRequire(import.meta.url);
const { qualityLabel } = load("./qualityLabel.ts") as typeof import("./qualityLabel");

describe("qualityLabel", () => {
  it("names a widescreen rung after its folder, not its height", () => {
    assert.equal(
      qualityLabel({ height: 800, url: "http://cache/s/1/x/movies/videos/m1/hls/1080p/index.m3u8" }),
      "1080p",
    );
    assert.equal(qualityLabel({ height: 534, url: "https://cache/movies/videos/m1/hls/720p/index.m3u8" }), "720p");
  });

  it("accepts the list form of url and a uri, and ignores query strings", () => {
    assert.equal(qualityLabel({ height: 356, url: ["http://c/hls/480p/index.m3u8?token=abc"] }), "480p");
    assert.equal(qualityLabel({ height: 266, uri: "360p/index.m3u8" }), "360p");
    assert.equal(qualityLabel({ height: 178, url: [], uri: "/x/240p/index.m3u8#frag" }), "240p");
  });

  it("falls back to the pixel height for a playlist not laid out by our encoders", () => {
    assert.equal(qualityLabel({ height: 720, url: "http://other/hls/high/index.m3u8" }), "720p");
    assert.equal(qualityLabel({ height: 480 }), "480p");
    assert.equal(qualityLabel({ height: 1080, url: "http://c/hls/10800p/index.m3u8" }), "1080p");
  });

  it("is unchanged for a normal 16:9 ladder", () => {
    assert.equal(qualityLabel({ height: 720, url: "http://c/hls/720p/index.m3u8" }), "720p");
    assert.equal(qualityLabel({ height: 240, url: "http://c/hls/240p/index.m3u8" }), "240p");
  });
});
