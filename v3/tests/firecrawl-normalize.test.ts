import assert from "node:assert/strict";
import {
  fetchWebsiteResearchWithFirecrawl,
  firecrawlRequestShape,
  isAbortLikeError,
  normalizeFirecrawlPayload,
  toWebsiteResearchErrorMessage,
} from "../features/research/firecrawl";

const result = normalizeFirecrawlPayload("ogtool.com", {
  success: true,
  data: {
    markdown: `
# OGTool
Fully managed Reddit and ChatGPT visibility campaigns.
First ChatGPT mention in 14 days.
D2C founders are trying to show up when buyers ask AI tools for recommendations.
Customer said the team generated 42 citations in two weeks.
Stop losing AI search visibility to competitors.
    `,
    metadata: {
      sourceURL: "https://ogtool.com/",
      ogTitle: "OGTool | ChatGPT Visibility",
      ogDescription: "Fully managed Reddit and ChatGPT visibility campaigns.",
      ogSiteName: "OGTool",
      favicon: "/favicon.ico",
      ogImage: "/og.png",
      themeColor: "#82DFFF",
    },
    branding: {
      logo: "/logo.svg",
      colors: ["#07111F", "#82DFFF"],
      fonts: {
        heading: "Inter",
        body: "Inter",
      },
    },
    screenshot: {
      url: "https://cdn.firecrawl.dev/screenshots/ogtool.png",
    },
  },
});

assert.equal(result.websiteUrl, "https://ogtool.com/");
assert.equal(result.finalUrl, "https://ogtool.com/");
assert.equal(result.brand.name, "OGTool");
assert.equal(result.brand.logoUrl, "https://ogtool.com/logo.svg");
assert.equal(result.brand.faviconUrl, "https://ogtool.com/favicon.ico");
assert.equal(result.brand.ogImageUrl, "https://ogtool.com/og.png");
assert.equal(result.brand.screenshotUrl, "https://cdn.firecrawl.dev/screenshots/ogtool.png");
assert.deepEqual(result.brand.colors, ["#82DFFF", "#07111F"]);
assert.equal(result.brand.fonts.feel, "sans");
assert.ok(result.evidence.receipts.specificClaims.includes("First ChatGPT mention in 14 days."));
assert.ok(result.evidence.receipts.buyerMoments.includes("Stop losing AI search visibility to competitors."));
assert.ok(result.evidence.receipts.namedProof.includes("Customer said the team generated 42 citations in two weeks."));
assert.ok(result.providerStatus[0]?.reason.includes("Firecrawl read"));

const shape = firecrawlRequestShape("https://ogtool.com/");
assert.deepEqual(shape.formats, [
  "markdown",
  "branding",
  {
    type: "screenshot",
    fullPage: true,
  },
]);
assert.equal(shape.onlyMainContent, true);

assert.throws(
  () => normalizeFirecrawlPayload("ogtool.com", { success: true, data: { markdown: "short" } }),
  /Firecrawl returned no useful page copy/,
);

const abortError = new Error("AbortError");
abortError.name = "AbortError";
assert.equal(isAbortLikeError(abortError), true);
assert.match(toWebsiteResearchErrorMessage(abortError), /took too long/);

const abortingFetcher = (async () => {
  throw abortError;
}) as typeof fetch;

await assert.rejects(
  () => fetchWebsiteResearchWithFirecrawl("ogtool.com", {
    apiKey: "test-firecrawl-key",
    fetcher: abortingFetcher,
  }),
  /That site took too long to read/,
);

console.log("firecrawl-normalize tests passed");
