import assert from "node:assert/strict";
import {
  normalizeBrandfetchColors,
  normalizeBrandfetchFonts,
  resolveBrandAssets,
  selectBrandfetchLogoCandidates,
} from "../features/research/brandAssets";

const orderedColors = normalizeBrandfetchColors([
  { hex: "#FFFFFF", type: "light" },
  { hex: "#003333", type: "dark" },
  { hex: "#00B95B", type: "brand" },
  { hex: "#006366", type: "accent" },
]);
assert.deepEqual(orderedColors.slice(0, 2), ["#00B95B", "#006366"]);
assert.deepEqual(new Set(orderedColors), new Set(["#00B95B", "#006366", "#003333", "#FFFFFF"]));

assert.deepEqual(normalizeBrandfetchFonts([
  { name: "Inter Display" },
  { name: "Inter" },
]), {
  heading: "Inter Display",
  body: "Inter",
  feel: "display",
});
assert.deepEqual(normalizeBrandfetchFonts(undefined), {
  feel: "unknown",
});

assert.deepEqual(selectBrandfetchLogoCandidates([
  {
    type: "logo",
    theme: "light",
    formats: [
      { src: "https://cdn.example/logo.svg", format: "svg", width: 800, height: 200 },
      { src: "https://cdn.example/logo.png", format: "png", width: 400, height: 100 },
    ],
  },
]), ["https://cdn.example/logo.png"]);

let brandfetchCalls = 0;
const brandfetchFetcher = (async (requestUrl, init) => {
  const url = String(requestUrl);
  if (url === "https://api.brandfetch.io/v2/brands/domain/brandfetch.com") {
    brandfetchCalls += 1;
    assert.equal((init?.headers as Record<string, string>).authorization, "Bearer test-brandfetch-key");
    return new Response(JSON.stringify({
      name: "Brandfetch",
      description: "Brand API",
      qualityScore: 0.9,
      logos: [{
        type: "logo",
        theme: "light",
        formats: [
          { src: "https://cdn.brandfetch.com/logo.svg", format: "svg", width: 800, height: 200 },
          { src: "https://cdn.brandfetch.com/logo.png", format: "png", width: 400, height: 100 },
        ],
      }],
      colors: [
        { hex: "#FFFFFF", type: "light" },
        { hex: "#00B95B", type: "brand" },
      ],
      fonts: [{ name: "Inter Display" }, { name: "Inter" }],
    }), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "x-api-key-quota": "100",
        "x-api-key-approximate-usage": "1",
      },
    });
  }
  if (url === "https://cdn.brandfetch.com/logo.png") {
    return new Response("", { status: 200 });
  }
  throw new Error(`Unexpected fetch: ${url}`);
}) as typeof fetch;

const resolved = await resolveBrandAssets({
  domain: "brandfetch.com",
  apiKey: "test-brandfetch-key",
  fetcher: brandfetchFetcher,
});
assert.equal(brandfetchCalls, 1);
assert.equal(resolved.brand.logoUrl, "https://cdn.brandfetch.com/logo.png");
assert.deepEqual(resolved.brand.colors, ["#00B95B", "#FFFFFF"]);
assert.equal(resolved.brand.fonts?.heading, "Inter Display");
assert.equal((resolved.branding.brandAssetDecision as { finalLogoUrl?: string }).finalLogoUrl, "https://cdn.brandfetch.com/logo.png");
assert.equal(resolved.providerStatus[0]?.provider, "brandfetch");
assert.equal(resolved.providerStatus[0]?.status, "used");

const cached = await resolveBrandAssets({
  domain: "brandfetch.com",
  cachedBrand: {
    logoUrl: "https://cached.example/dead-logo.png",
    colors: ["#00B95B"],
    fonts: { feel: "sans" },
  },
  fetcher: (async () => {
    throw new Error("Brandfetch should not run on cache hit.");
  }) as typeof fetch,
});
assert.equal(cached.brand.logoUrl, null);
assert.deepEqual(cached.brand.colors, ["#00B95B"]);
assert.equal(cached.providerStatus[0]?.provider, "brand-cache");
assert.equal((cached.branding.brandAssetDecision as { finalLogoSource?: string }).finalLogoSource, "initials");

const skipped = await resolveBrandAssets({
  domain: "brandfetch.com",
  apiKey: "",
});
assert.equal(skipped.providerStatus[0]?.status, "skipped");

const failed = await resolveBrandAssets({
  domain: "quota.example",
  apiKey: "test-brandfetch-key",
  fetcher: (async () => new Response("", { status: 429 })) as typeof fetch,
});
assert.equal(failed.providerStatus[0]?.provider, "brandfetch");
assert.equal(failed.providerStatus[0]?.status, "failed");

const deadLogo = await resolveBrandAssets({
  domain: "dead-logo.example",
  apiKey: "test-brandfetch-key",
  fetcher: (async (requestUrl) => {
    const url = String(requestUrl);
    if (url.includes("/v2/brands/domain/")) {
      return new Response(JSON.stringify({
        logos: [{
          type: "logo",
          theme: "light",
          formats: [{ src: "https://cdn.example/dead.png", format: "png" }],
        }],
      }), { status: 200 });
    }
    return new Response("", { status: 404 });
  }) as typeof fetch,
});
assert.equal(deadLogo.brand.logoUrl, null);

console.log("brand-assets tests passed");
