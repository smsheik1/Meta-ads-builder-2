import { fileURLToPath } from "node:url";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import {
  isStoredWebsiteResearchFailure,
  type StoredWebsiteResearchResponse,
} from "../features/research/types";
import {
  getRuntimeConvexUrl,
  loadRuntimeEnv,
} from "./runtime-health";

const filename = fileURLToPath(import.meta.url);

const defaultUrls = [
  "ogtool.com",
  "built.com",
  "gymshark.com",
  "davidscookies.com",
  "cal.com",
];

const genericBrandNames = new Set([
  "brand",
  "your brand",
  "website",
  "company",
  "business",
]);

const parseUrls = () => {
  const rawUrls = process.env.RESEARCH_SMOKE_URLS;
  if (!rawUrls) return defaultUrls;

  return rawUrls
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);
};

const smokeAnonymousId = () => (
  `research-smoke-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
);

const assertUsefulText = (label: string, value: string | null | undefined, minLength = 8) => {
  if (!value || value.trim().length < minLength) {
    throw new Error(`${label} is missing or too weak.`);
  }
};

const assertUsefulArray = (label: string, values: string[], minItems = 1) => {
  if (values.length < minItems) {
    throw new Error(`${label} needs at least ${minItems} item(s), got ${values.length}.`);
  }
};

const assertResearchReady = (url: string, result: StoredWebsiteResearchResponse) => {
  if (isStoredWebsiteResearchFailure(result)) {
    throw new Error(`${url} failed research: ${result.error}`);
  }

  if (!result || typeof result !== "object" || !("brand" in result)) {
    throw new Error(`${url} returned an unexpected research payload: ${JSON.stringify(result).slice(0, 400)}`);
  }

  assertUsefulText(`${url} brand.name`, result.brand.name, 2);
  if (genericBrandNames.has(result.brand.name.trim().toLowerCase())) {
    throw new Error(`${url} returned generic brand name: ${result.brand.name}.`);
  }

  assertUsefulText(`${url} brandBrief.offer`, result.brandBrief.offer);
  assertUsefulText(`${url} brandBrief.audience`, result.brandBrief.audience);
  assertUsefulArray(`${url} brandBrief.buyerMoments`, result.brandBrief.buyerMoments);
  assertUsefulArray(`${url} brandBrief.proof`, result.brandBrief.proof);
  assertUsefulArray(`${url} brandBrief.siteLanguage`, result.brandBrief.siteLanguage);
  assertUsefulArray(`${url} evidence.paragraphs`, result.evidence.paragraphs, 3);

  const providers = new Map(result.providerStatus.map((status) => [status.provider, status.status]));
  if (providers.get("firecrawl") !== "used") {
    throw new Error(`${url} did not use Firecrawl successfully.`);
  }
  if (!providers.has("gemini-curator")) {
    throw new Error(`${url} did not report Gemini curator status.`);
  }
};

export async function runResearchSmoke() {
  await loadRuntimeEnv();
  const convexUrl = getRuntimeConvexUrl();
  if (!convexUrl) throw new Error("Set V3_CONVEX_URL or NEXT_PUBLIC_V3_CONVEX_URL before research smoke.");

  const urls = parseUrls();
  if (!urls.length) throw new Error("No research smoke URLs configured.");

  const client = new ConvexHttpClient(convexUrl);
  console.log(`research_smoke_convex ${new URL(convexUrl).hostname}`);
  console.log(`research_smoke_urls ${urls.join(", ")}`);

  for (const url of urls) {
    const startedAt = Date.now();
    const result = await client.action(api.researchRuns.runWebsiteResearch, {
      anonymousId: smokeAnonymousId(),
      url,
    }) as StoredWebsiteResearchResponse;

    assertResearchReady(url, result);
    if (isStoredWebsiteResearchFailure(result)) continue;

    const elapsedSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);
    console.log([
      "PASS",
      url,
      `${elapsedSeconds}s`,
      `brand=${result.brand.name}`,
      `offer=${result.brandBrief.offer}`,
      `proof=${result.brandBrief.proof.length}`,
      `moments=${result.brandBrief.buyerMoments.length}`,
    ].join(" | "));
  }
}

if (process.argv[1] === filename) {
  await runResearchSmoke();
}
