import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  resolveShowcaseIngredient,
  validateShowcaseInput,
  type LinkedInShowcaseInput,
} from "../features/formats/linkedin-showcase-wrapper/contracts";

const base: LinkedInShowcaseInput = {
  version: 1,
  brandWebsite: "https://example.com/",
  approvedVideo: {
    name: "Approved video",
    path: "./final.mp4",
    approved: true,
    approvalNote: "Watched and approved",
  },
  brand: {
    name: "Example",
    logo: { name: "Example logo", path: "./logo.png", sourceUrl: "https://example.com/logo.png" },
  },
  featuredProduct: { name: "Featured bottle", path: "./bottle.png", sourceUrl: "https://example.com/bottle.png" },
  heroProduct: { name: "Fallback offering", path: "./offering.png", sourceUrl: "https://example.com/offering.png" },
};

assert.deepEqual(validateShowcaseInput(base), []);
assert.equal(resolveShowcaseIngredient(base)?.role, "featured-product", "The featured product must win when both assets exist.");

const heroOnly = { ...base, featuredProduct: undefined };
assert.deepEqual(validateShowcaseInput(heroOnly), []);
assert.equal(resolveShowcaseIngredient(heroOnly)?.role, "hero-product", "A real hero offering should cover no-product videos.");

const missingIngredient = { ...heroOnly, heroProduct: undefined };
assert.match(validateShowcaseInput(missingIngredient).join(" "), /hero product/i);

assert.match(
  validateShowcaseInput({ ...base, brandWebsite: "" }).join(" "),
  /brand website URL/i,
  "A cold run must include the website needed for independent asset sourcing.",
);

assert.match(
  validateShowcaseInput({
    ...base,
    brand: { ...base.brand, logo: { ...base.brand.logo, sourceUrl: "" } },
  }).join(" "),
  /logo needs its exact source URL/i,
  "The independently sourced logo must keep provenance.",
);

const unapproved = {
  ...base,
  approvedVideo: { ...base.approvedVideo, approved: false, approvalNote: "" },
} as unknown as LinkedInShowcaseInput;
assert.match(validateShowcaseInput(unapproved).join(" "), /explicitly approved/i);

const runner = readFileSync("scripts/linkedin-showcase-wrapper-format.ts", "utf8");
assert.match(runner, /ffprobe/);
assert.match(runner, /contact-sheet\.jpg/);
assert.match(runner, /automaticPass/);
assert.match(runner, /approve-final/);
assert.match(runner, /provenance\.json/);
assert.match(runner, /Approve -> Source -> Prepare -> Validate -> Render -> Inspect -> Finalize/);
assert.doesNotMatch(runner, /REPLICATE_API|GEMINI_API|OPENAI_API/);

const skill = readFileSync("public/format-repositories/linkedin-showcase-wrapper-v1/SKILL.md", "utf8");
assert.match(skill, /1\. Run `npm install`\./, "A cold agent must install the standalone kit before running its check.");

const composition = readFileSync("features/formats/linkedin-showcase-wrapper/LinkedInShowcase.tsx", "utf8");
assert.match(composition, /OffthreadVideo/);
assert.match(composition, /objectFit: "contain"/);
assert.match(composition, /wigglyLogoUrl/);

console.log("LinkedIn Showcase Wrapper agent runner tests passed");
