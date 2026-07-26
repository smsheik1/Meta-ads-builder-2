import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  normalizeDiscoverySubmission,
  validateDiscoverySubmission,
} from "../features/discovery/submission";

const validSubmission = {
  creatorName: " Maya Chen ",
  contactEmail: " MAYA@EXAMPLE.COM ",
  formatUrl: " https://example.com/format ",
  outputUrls: [
    " https://example.com/ad-one ",
    "https://example.com/ad-two",
    "https://example.com/ad-three",
  ],
  promise: " Turns one clear product truth into a short visual story. ",
  sourceCredit: " Original work. ",
};

const normalized = normalizeDiscoverySubmission(validSubmission);
assert.deepEqual(normalized, {
  creatorName: "Maya Chen",
  contactEmail: "maya@example.com",
  formatUrl: "https://example.com/format",
  outputUrls: [
    "https://example.com/ad-one",
    "https://example.com/ad-two",
    "https://example.com/ad-three",
  ],
  promise: "Turns one clear product truth into a short visual story.",
  sourceCredit: "Original work.",
});
assert.equal(validateDiscoverySubmission(normalized), null);
assert.equal(
  validateDiscoverySubmission({ ...normalized, outputUrls: normalized.outputUrls.slice(0, 2) }),
  "Add exactly three real output links.",
);
assert.equal(
  validateDiscoverySubmission({ ...normalized, outputUrls: [...normalized.outputUrls.slice(0, 2), "not-a-url"] }),
  "Add exactly three real output links.",
);
assert.equal(
  validateDiscoverySubmission({ ...normalized, outputUrls: [normalized.outputUrls[0], normalized.outputUrls[0], normalized.outputUrls[2]] }),
  "Add exactly three real output links.",
);
assert.equal(
  validateDiscoverySubmission({ ...normalized, sourceCredit: "" }),
  "Name the source, or write Original work.",
);
assert.equal(
  validateDiscoverySubmission({ ...normalized, formatUrl: "file:///private/package.zip" }),
  "Add a public Format or package link.",
);

const schema = readFileSync("convex/schema.ts", "utf8");
const functions = readFileSync("convex/discoverySubmissions.ts", "utf8");
const validation = readFileSync("features/discovery/submission.ts", "utf8");
const page = readFileSync("app/submit/page.tsx", "utf8");
const form = readFileSync("app/submit/DiscoverySubmissionForm.tsx", "utf8");

assert.match(schema, /discoverySubmissions: defineTable/);
assert.match(schema, /status: v\.literal\("pending"\)/);
assert.match(schema, /by_status_and_createdAt/);
assert.match(schema, /by_contactEmail_and_formatUrl/);
assert.match(functions, /export const submit/);
assert.match(functions, /status: \"pending\"/);
assert.match(functions, /withIndex\("by_contactEmail_and_formatUrl"/);
assert.match(functions, /status: \"updated\"/);
assert.match(functions, /export const listPending[^]*internalQuery/);
assert.equal(/export const (list|review)[^]*= query\(/.test(functions), false);
assert.equal(validation.includes('from "@/'), false);
assert.match(page, /Show us what repeats/);
assert.match(form, /Three real output links/);
assert.match(form, /Source or remix credit/);
assert.match(form, /Nothing is published automatically/);
assert.equal(/Replicate|Seedance|Fish Audio|AdRenderSurface/.test(`${functions}\n${form}`), false);

console.log("discovery submission tests passed");
