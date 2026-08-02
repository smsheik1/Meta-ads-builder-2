import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  resolveShowcaseIngredient,
  validateShowcaseInput,
  type LinkedInShowcaseInput,
} from "../features/formats/linkedin-showcase-wrapper/contracts";

const base: LinkedInShowcaseInput = {
  version: 1,
  approvedVideo: {
    name: "Approved video",
    path: "./final.mp4",
    approved: true,
    approvalNote: "Watched and approved",
  },
  brand: {
    name: "Example",
    logo: { name: "Example logo", path: "./logo.png" },
  },
  featuredProduct: { name: "Featured bottle", path: "./bottle.png" },
  heroProduct: { name: "Fallback offering", path: "./offering.png" },
};

assert.deepEqual(validateShowcaseInput(base), []);
assert.equal(resolveShowcaseIngredient(base)?.role, "featured-product", "The featured product must win when both assets exist.");

const heroOnly = { ...base, featuredProduct: undefined };
assert.deepEqual(validateShowcaseInput(heroOnly), []);
assert.equal(resolveShowcaseIngredient(heroOnly)?.role, "hero-product", "A real hero offering should cover no-product videos.");

const missingIngredient = { ...heroOnly, heroProduct: undefined };
assert.match(validateShowcaseInput(missingIngredient).join(" "), /hero product/i);

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
assert.doesNotMatch(runner, /REPLICATE_API|GEMINI_API|OPENAI_API/);

const composition = readFileSync("features/formats/linkedin-showcase-wrapper/LinkedInShowcase.tsx", "utf8");
assert.match(composition, /OffthreadVideo/);
assert.match(composition, /objectFit: "contain"/);
assert.match(composition, /wigglyLogoUrl/);

console.log("LinkedIn Showcase Wrapper agent runner tests passed");
