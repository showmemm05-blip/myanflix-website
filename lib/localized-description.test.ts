/**
 * Which description a viewer reads (lib/localized-description.ts): the site
 * language first, the other text as the fallback, and a missing field read
 * as an empty one. Runs on Node's own test runner:
 * `node --test lib/localized-description.test.ts` (part of `npm test`).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

// Node loads a relative TypeScript file only when the path carries its full
// extension, which tsc does not allow in an `import` — so load it this way.
const load = createRequire(import.meta.url);
const { localizedDescription } = load("./localized-description.ts") as typeof import("./localized-description");

const EN = "A thief who enters people’s dreams takes one last job: to plant an idea.";
const MM = "အိပ်မက်ထဲသို့ ဝင်ရောက်နိုင်သော သူခိုးတစ်ဦးသည် နောက်ဆုံးအလုပ်တစ်ခုကို လက်ခံလိုက်သည်။";

describe("localizedDescription", () => {
  it("shows the text of the site language when the title has both", () => {
    const both = { description: EN, descriptionMm: MM };
    assert.equal(localizedDescription(both, "en"), EN);
    assert.equal(localizedDescription(both, "mm"), MM);
  });

  it("Burmese site: falls back to English when no Burmese text was added", () => {
    assert.equal(localizedDescription({ description: EN, descriptionMm: null }, "mm"), EN);
    assert.equal(localizedDescription({ description: EN, descriptionMm: "" }, "mm"), EN);
  });

  it("English site: falls back to Burmese when the title has only that", () => {
    assert.equal(localizedDescription({ description: "", descriptionMm: MM }, "en"), MM);
    assert.equal(localizedDescription({ description: null, descriptionMm: MM }, "en"), MM);
  });

  it("reads a missing field as an empty one (a backend from before the Burmese column)", () => {
    assert.equal(localizedDescription({ description: EN }, "mm"), EN);
    assert.equal(localizedDescription({ description: EN }, "en"), EN);
    assert.equal(localizedDescription({ descriptionMm: MM }, "en"), MM);
    assert.equal(localizedDescription({ descriptionMm: MM }, "mm"), MM);
  });

  it("counts a text of only spaces as empty, so the fallback still applies", () => {
    assert.equal(localizedDescription({ description: EN, descriptionMm: "  \n " }, "mm"), EN);
    assert.equal(localizedDescription({ description: " \t", descriptionMm: MM }, "en"), MM);
  });

  it("trims the text it returns", () => {
    assert.equal(localizedDescription({ description: `  ${EN}\n`, descriptionMm: null }, "en"), EN);
    assert.equal(localizedDescription({ description: EN, descriptionMm: `\n${MM}  ` }, "mm"), MM);
  });

  it("keeps the line breaks inside a text", () => {
    const twoParagraphs = "First paragraph.\n\nSecond paragraph.";
    assert.equal(localizedDescription({ description: twoParagraphs }, "en"), twoParagraphs);
  });

  it("returns an empty string when the title has no description in either language", () => {
    assert.equal(localizedDescription({}, "en"), "");
    assert.equal(localizedDescription({}, "mm"), "");
    assert.equal(localizedDescription({ description: null, descriptionMm: null }, "en"), "");
    assert.equal(localizedDescription({ description: "", descriptionMm: "   " }, "mm"), "");
  });
});
