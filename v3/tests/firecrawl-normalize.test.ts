import assert from "node:assert/strict";
import {
  buildBrandCuratorPrompt,
  curateWebsiteResearchResult,
  normalizeBrandBriefPayload,
} from "../features/research/brandCurator";
import {
  DEFAULT_FIRECRAWL_TIMEOUT_MS,
  DEFAULT_JINA_READER_TIMEOUT_MS,
  fetchWebsiteResearchWithFirecrawl,
  firecrawlRequestShape,
  isAbortLikeError,
  isWebsiteChromeText,
  normalizeFirecrawlPayload,
  normalizeJinaReaderPayload,
  parseBasicHtmlMetadata,
  toWebsiteResearchErrorMessage,
} from "../features/research/firecrawl";

process.env.BRANDFETCH_API_KEY = "";

assert.ok(
  DEFAULT_FIRECRAWL_TIMEOUT_MS >= 120_000,
  "Firecrawl needs enough budget for heavy hosted funnels that can exceed 60 seconds.",
);
assert.equal(DEFAULT_JINA_READER_TIMEOUT_MS, 8_000);

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
assert.equal(result.brandBrief.offer, "ChatGPT Visibility");
assert.ok(result.brandBrief.proof.includes("First ChatGPT mention in 14 days."));
assert.ok(result.evidence.receipts.specificClaims.includes("First ChatGPT mention in 14 days."));
assert.ok(result.evidence.receipts.buyerMoments.includes("Stop losing AI search visibility to competitors."));
assert.ok(result.evidence.receipts.namedProof.includes("Customer said the team generated 42 citations in two weeks."));
assert.ok(result.providerStatus[0]?.reason.includes("Firecrawl read"));

const firecrawlBrandingObjectResult = normalizeFirecrawlPayload("agentenamel.com", {
  success: true,
  data: {
    markdown: `
# Agent Enamel
An AI-powered receptionist for dental practices.
Answer every missed call before patients call someone else.
Convert missed calls into booked appointments.
Capture after-hours callers automatically.
Dental offices use Agent Enamel when front desks are overloaded.
Protect revenue from missed patient calls.
Give callers a polished first impression.
    `,
    metadata: {
      sourceURL: "https://agentenamel.com/",
      ogTitle: "Agent Enamel",
      ogDescription: "An AI-powered receptionist for dental practices.",
    },
    branding: {
      images: {
        logo: null,
        favicon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext%3EAE%3C/text%3E%3C/svg%3E",
        ogImage: "https://agentenamel.com/og-image.jpg",
      },
      colors: {
        primary: "#00bc7d",
        accent: "#006366",
        textPrimary: "#0f172b",
      },
      fonts: [{
        family: "Inter",
        role: "body",
      }],
      typography: {
        fontFamilies: {
          heading: "Inter",
          primary: "Inter",
        },
      },
    },
  },
});
assert.equal(firecrawlBrandingObjectResult.brand.logoUrl?.startsWith("data:image/svg+xml,"), true);
assert.equal(firecrawlBrandingObjectResult.brand.faviconUrl?.startsWith("data:image/svg+xml,"), true);
assert.equal(firecrawlBrandingObjectResult.brand.logoUrl?.includes("viewBox='0 0 100 100'"), true);
assert.equal(firecrawlBrandingObjectResult.brand.ogImageUrl, "https://agentenamel.com/og-image.jpg");
assert.deepEqual(firecrawlBrandingObjectResult.brand.colors, ["#00BC7D", "#006366", "#0F172B"]);
assert.deepEqual(firecrawlBrandingObjectResult.brand.fonts, {
  heading: "Inter",
  body: "Inter",
  feel: "sans",
});

const shape = firecrawlRequestShape("https://ogtool.com/");
assert.deepEqual(shape.formats, [
  "markdown",
  "branding",
]);
assert.equal(shape.onlyMainContent, true);

const shapeWithScreenshot = firecrawlRequestShape("https://ogtool.com/", {
  includeScreenshot: true,
});
assert.deepEqual(shapeWithScreenshot.formats, [
  "markdown",
  "branding",
  {
    type: "screenshot",
    fullPage: true,
  },
]);
assert.equal(shapeWithScreenshot.onlyMainContent, true);

assert.equal(isWebsiteChromeText("Continue shopping"), true);
assert.equal(isWebsiteChromeText("Regular price~~$0.00~~Sale price"), true);
assert.equal(isWebsiteChromeText("Cookie Delivery | Gift Baskets | Fresh Baked"), false);
assert.equal(isWebsiteChromeText("!Fin messenger UI decorative background image"), true);
assert.equal(isWebsiteChromeText("Something went wrong"), true);
assert.equal(isWebsiteChromeText("Try refreshing the page. If the site still doesn't load, please try again."), true);

const errorPageResult = normalizeFirecrawlPayload("maxjerky.com", {
  success: true,
  data: {
    markdown: `
# Something went wrong
Try refreshing the page. If the site still doesn't load, please try again.
The site is currently experiencing technical difficulties.
    `,
    metadata: {
      sourceURL: "https://www.maxjerky.com/",
      title: "Something went wrong",
      ogTitle: "Something went wrong",
      ogDescription: "Try refreshing the page.",
    },
  },
});
assert.equal(errorPageResult.brand.name, "maxjerky.com");
assert.equal(errorPageResult.brand.title, "maxjerky.com");
assert.equal(errorPageResult.evidence.rawMarkdown, "");
assert.doesNotMatch(errorPageResult.brandBrief.offer, /refreshing|went wrong|technical difficulties/i);

const shopifyResult = normalizeFirecrawlPayload("davidscookies.com", {
  success: true,
  data: {
    markdown: `
# Skip to content
_\\\\* FREE SHIPPING NOT APPLIED TO MULTIPLE ADDRESS ORDERS \\\\*_
Your cart is empty
Continue shopping
Have an account?
Log in to check out faster.
Loading...
Regular price~~$0.00~~Sale price
Add To Cart
# David's Cookies: Cookie Delivery | Gift Baskets | Fresh Baked
We're known for our cookies, but we make so much more, including our fabulous cheesecakes and specialty desserts.
A box of Fresh Baked Cookies from David's Cookies.
    `,
    metadata: {
      sourceURL: "https://davidscookies.com/",
      ogTitle: "David's Cookies: Cookie Delivery | Gift Baskets | Fresh Baked",
      ogDescription: "We're known for our cookies, but we make so much more, including our fabulous cheesecakes and specialty desserts.",
      ogSiteName: "David's Cookies",
    },
  },
});
const shopifyEvidenceText = JSON.stringify({
  headings: shopifyResult.evidence.headings,
  paragraphs: shopifyResult.evidence.paragraphs,
  receipts: shopifyResult.evidence.receipts,
});
assert.ok(!shopifyEvidenceText.includes("Continue shopping"));
assert.ok(!shopifyEvidenceText.includes("Regular price"));
assert.ok(!shopifyEvidenceText.includes("Your cart is empty"));
assert.ok(shopifyResult.evidence.headings.includes("David's Cookies: Cookie Delivery | Gift Baskets | Fresh Baked"));
assert.ok(shopifyResult.evidence.paragraphs.some((paragraph) => paragraph.includes("fabulous cheesecakes")));
assert.equal(shopifyResult.brandBrief.brandName, "David's Cookies");
assert.equal(shopifyResult.brandBrief.offer, "Cookie Delivery");

const markdownImageResult = normalizeFirecrawlPayload("intercom.com", {
  success: true,
  data: {
    markdown: `
# Intercom
The complete AI-first customer service platform.
![Fin messenger UI Decorative background image](https://example.com/fin.png)
![Decorative background image][hero]
Resolve customer questions with AI support agents and human handoff.
    `,
    metadata: {
      sourceURL: "https://intercom.com/",
      ogTitle: "Intercom | AI Customer Service",
      ogDescription: "The complete AI-first customer service platform.",
      ogSiteName: "Intercom",
    },
  },
});
const markdownImageEvidence = JSON.stringify({
  headings: markdownImageResult.evidence.headings,
  paragraphs: markdownImageResult.evidence.paragraphs,
  receipts: markdownImageResult.evidence.receipts,
  rawMarkdown: markdownImageResult.evidence.rawMarkdown,
});
assert.ok(!markdownImageEvidence.includes("Decorative background image"));
assert.ok(!markdownImageEvidence.includes("!Fin messenger"));
assert.ok(markdownImageResult.evidence.paragraphs.some((paragraph) => paragraph.includes("AI support agents")));

const jinaResult = normalizeJinaReaderPayload("ogtool.com", `
Title: OGTool | ChatGPT Visibility

URL Source: https://ogtool.com/

Markdown Content:
# OGTool
Fully managed Reddit and ChatGPT visibility campaigns.
First ChatGPT mention in 14 days.
D2C founders are trying to show up when buyers ask AI tools for recommendations.
Customer said the team generated 42 citations in two weeks.
Stop losing AI search visibility to competitors.
Book a strategy call to see where your brand already appears.
`, {
  ogSiteName: "OGTool",
  ogTitle: "OGTool | ChatGPT Visibility",
  ogDescription: "Fully managed Reddit and ChatGPT visibility campaigns.",
  favicon: "/favicon.ico",
  ogImage: "/og.png",
  themeColor: "#82DFFF",
});
assert.equal(jinaResult.brand.name, "OGTool");
assert.equal(jinaResult.brand.faviconUrl, "https://ogtool.com/favicon.ico");
assert.equal(jinaResult.brand.ogImageUrl, "https://ogtool.com/og.png");
assert.deepEqual(jinaResult.brand.colors, ["#82DFFF"]);
assert.equal(jinaResult.brand.logoUrl, null);
assert.equal(jinaResult.providerStatus[0]?.provider, "jina");
assert.ok(jinaResult.providerStatus[0]?.reason.includes("Jina read"));

const agentEnamelMetadata = parseBasicHtmlMetadata(`
  <html>
    <head>
      <title>Agent Enamel</title>
      <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "Agent Enamel",
          "logo": "https://agentenamel.com/logo.png"
        }
      </script>
      <link rel="icon" href="data:image/svg+xml,%3Csvg fill='%2300b95b'%3E%3C/svg%3E">
    </head>
    <body>
      <span class="text-[#00b95b]">Agent</span>
      <span class="text-[#006366]">Enamel</span>
    </body>
  </html>
`, "https://agentenamel.com/");
assert.equal(agentEnamelMetadata.logo, "https://agentenamel.com/logo.png");
assert.deepEqual(agentEnamelMetadata.colors, ["#00B95B", "#006366"]);

const jinaBrandAssetResult = normalizeJinaReaderPayload("agentenamel.com", `
Title: Agent Enamel

URL Source: https://agentenamel.com/

Markdown Content:
# Agent Enamel
An AI-powered receptionist for dental practices.
Answer every missed call before patients call someone else.
72% of callers who reach voicemail hang up without leaving a message.
Dental offices use Agent Enamel when front desks are overloaded.
Convert missed calls into booked appointments.
Capture after-hours callers automatically.
Protect revenue from missed patient calls.
Give callers a polished first impression.
`, agentEnamelMetadata);
assert.equal(jinaBrandAssetResult.brand.logoUrl, "https://agentenamel.com/logo.png");
assert.deepEqual(jinaBrandAssetResult.brand.colors, ["#00B95B", "#006366"]);

const jinaBankResult = normalizeJinaReaderPayload("https://www.usbank.com", `
Title: Personal Banking, Credit Cards, Loans &amp; Investing | U.S. Bank

URL Source: https://www.usbank.com/

Markdown Content:
# Personal Banking, Credit Cards, Loans &amp; Investing | U.S. Bank
Bank accounts, credit cards, mortgages, loans, and investing services.
Online and mobile banking tools help customers manage money.
Customers compare credit cards, checking accounts, and loan options.
Open a checking account online.
Explore mortgage and home loan options.
Find investing and wealth management services.
Manage accounts through mobile banking.
Get customer support for banking needs.
`);
assert.equal(jinaBankResult.brand.name, "U.S. Bank");
assert.equal(jinaBankResult.brand.title, "Personal Banking, Credit Cards, Loans & Investing | U.S. Bank");
assert.ok(jinaBankResult.brandBrief.offer.includes("Credit Cards, Loans & Investing"));

const curatorPrompt = buildBrandCuratorPrompt(shopifyResult);
assert.ok(curatorPrompt.includes("Study these examples for shape only"));
assert.ok(curatorPrompt.includes("buyerMoments = specific situations, not features"));
assert.ok(curatorPrompt.includes("If a list field has no real evidence, return []"));
assert.ok(curatorPrompt.includes("Do not use a page title, SEO title, or brand name alone as the offer"));
assert.ok(curatorPrompt.includes("visualNotes = concrete observations"));

const normalizedEmptyBrief = normalizeBrandBriefPayload({
  brandName: "Thin Brand",
  offer: "A thin but valid offer.",
  audience: "A thin but valid audience.",
  buyerMoments: [],
  proof: [],
  siteLanguage: [],
  visualNotes: [],
  ctaDirection: "See more",
  droppedNoiseSummary: [],
  confidence: "low",
}, shopifyResult.brandBrief);
assert.deepEqual(normalizedEmptyBrief.buyerMoments, []);
assert.deepEqual(normalizedEmptyBrief.proof, []);
assert.deepEqual(normalizedEmptyBrief.siteLanguage, []);
assert.deepEqual(normalizedEmptyBrief.visualNotes, []);

const normalizedErrorBrief = normalizeBrandBriefPayload({
  brandName: "Something went wrong",
  offer: "Try refreshing the page.",
  audience: "Unknown due to site error.",
  buyerMoments: ["If the site still doesn't load, please try again."],
  proof: ["The site is currently experiencing technical difficulties."],
  siteLanguage: ["Something went wrong"],
  visualNotes: [],
  ctaDirection: "Try refreshing",
  droppedNoiseSummary: [],
  confidence: "low",
}, shopifyResult.brandBrief);
assert.equal(normalizedErrorBrief.brandName, shopifyResult.brandBrief.brandName);
assert.equal(normalizedErrorBrief.offer, shopifyResult.brandBrief.offer);
assert.equal(normalizedErrorBrief.audience, shopifyResult.brandBrief.audience);
assert.deepEqual(normalizedErrorBrief.buyerMoments, shopifyResult.brandBrief.buyerMoments);
assert.deepEqual(normalizedErrorBrief.proof, shopifyResult.brandBrief.proof);
assert.deepEqual(normalizedErrorBrief.siteLanguage, shopifyResult.brandBrief.siteLanguage);
assert.equal(normalizedErrorBrief.ctaDirection, shopifyResult.brandBrief.ctaDirection);

const nimCuratedResult = await curateWebsiteResearchResult(shopifyResult, {
  nvidiaNimApiKey: "test-nim-key",
  nvidiaNimModel: "test-kimi-model",
  nvidiaNimChatCompletion: async ({ prompt }) => {
    assert.ok(prompt.includes("David's Cookies"));
    return JSON.stringify({
      brandName: "David's Cookies",
      offer: "Fresh baked cookies and giftable desserts delivered for memorable occasions.",
      audience: "People sending cookies, gift baskets, and desserts for birthdays and thank-you gifts.",
      buyerMoments: ["Someone forgot the birthday and needs a dessert gift that can still ship."],
      proof: ["We're known for our cookies, but we make so much more, including cheesecakes."],
      siteLanguage: ["Cookie Delivery | Gift Baskets | Fresh Baked"],
      ctaDirection: "Shop cookies",
      visualNotes: [],
      droppedNoiseSummary: ["Continue shopping"],
      confidence: "high",
    });
  },
});
assert.equal(nimCuratedResult.brandBrief.offer, "Fresh baked cookies and giftable desserts delivered for memorable occasions.");
assert.ok(nimCuratedResult.providerStatus.some((status) => (
  status.provider === "nvidia-nim-curator" && status.status === "used"
)));

const nimFailureGeminiBackupCuratedResult = await curateWebsiteResearchResult(shopifyResult, {
  nvidiaNimApiKey: "test-nim-key",
  nvidiaNimModel: "test-kimi-model",
  nvidiaNimChatCompletion: async () => {
    throw new Error("NIM free tier unavailable.");
  },
  geminiApiKey: "test-gemini-key",
  geminiModel: "test-gemini-model",
  geminiGenerateContent: async () => JSON.stringify({
    brandName: "David's Cookies",
    offer: "Fresh baked cookies and giftable desserts delivered for memorable occasions.",
    audience: "People sending cookies and desserts for birthdays and thank-you gifts.",
    buyerMoments: ["Someone forgot the birthday and needs a dessert gift that can still ship."],
    proof: ["We're known for our cookies, but we make so much more, including cheesecakes."],
    siteLanguage: ["Cookie Delivery | Gift Baskets | Fresh Baked"],
    ctaDirection: "Shop cookies",
    visualNotes: [],
    droppedNoiseSummary: [],
    confidence: "high",
  }),
});
assert.equal(nimFailureGeminiBackupCuratedResult.brandBrief.offer, "Fresh baked cookies and giftable desserts delivered for memorable occasions.");
assert.ok(nimFailureGeminiBackupCuratedResult.providerStatus.some((status) => (
  status.provider === "nvidia-nim-curator" && status.status === "failed"
)));
assert.ok(nimFailureGeminiBackupCuratedResult.providerStatus.some((status) => (
  status.provider === "gemini-curator" && status.status === "used"
)));

const curatedShopifyResult = await fetchWebsiteResearchWithFirecrawl("davidscookies.com", {
  apiKey: "test-firecrawl-key",
  fetcher: async () => new Response(JSON.stringify({
    success: true,
    data: {
      markdown: `
# Continue shopping
Your cart is empty
# David's Cookies: Cookie Delivery | Gift Baskets | Fresh Baked
Fresh baked cookies, gift baskets, cheesecakes, and specialty desserts delivered for birthdays, holidays, and thank-you gifts.
      `,
      metadata: {
        sourceURL: "https://davidscookies.com/",
        ogTitle: "David's Cookies: Cookie Delivery | Gift Baskets | Fresh Baked",
        ogDescription: "Fresh baked cookies, gift baskets, cheesecakes, and specialty desserts delivered for birthdays, holidays, and thank-you gifts.",
        ogSiteName: "David's Cookies",
      },
    },
  }), {
    status: 200,
    headers: { "content-type": "application/json" },
  }),
  curator: {
    geminiApiKey: "test-gemini-key",
    nvidiaNimApiKey: "",
    geminiGenerateContent: async ({ prompt }) => {
      assert.ok(prompt.includes("Ignore website chrome"));
      assert.ok(prompt.includes("High-protein snack bars with a soft, marshmallow-like texture."));
      assert.ok(prompt.includes("Scheduling software for teams"));
      return JSON.stringify({
        brandName: "David's Cookies",
        offer: "Fresh baked cookies, gift baskets, cheesecakes, and specialty desserts for delivery.",
        audience: "People sending memorable desserts for birthdays, holidays, and thank-you gifts.",
        buyerMoments: [
          "You need a giftable dessert that feels fresh and easy to send.",
          "Continue shopping",
        ],
        proof: [
          "Fresh baked cookies, gift baskets, cheesecakes, and specialty desserts delivered for birthdays, holidays, and thank-you gifts.",
          "Regular price~~$0.00~~Sale price",
        ],
        siteLanguage: [
          "Cookie Delivery | Gift Baskets | Fresh Baked",
          "Your cart is empty",
        ],
        ctaDirection: "Shop fresh cookies",
        visualNotes: ["Use the David's Cookies dessert-gift positioning."],
        droppedNoiseSummary: ["Continue shopping", "Your cart is empty"],
        confidence: "high",
      });
    },
  },
});
assert.equal(curatedShopifyResult.brandBrief.offer, "Fresh baked cookies, gift baskets, cheesecakes, and specialty desserts for delivery.");
assert.ok(curatedShopifyResult.providerStatus.some((status) => (
  status.provider === "gemini-curator" && status.status === "used"
)));
const productBriefText = JSON.stringify({
  offer: curatedShopifyResult.brandBrief.offer,
  audience: curatedShopifyResult.brandBrief.audience,
  buyerMoments: curatedShopifyResult.brandBrief.buyerMoments,
  proof: curatedShopifyResult.brandBrief.proof,
  siteLanguage: curatedShopifyResult.brandBrief.siteLanguage,
});
assert.ok(!productBriefText.includes("Continue shopping"));
assert.ok(!productBriefText.includes("Regular price"));
assert.ok(!productBriefText.includes("Your cart is empty"));
assert.ok(curatedShopifyResult.brandBrief.droppedNoiseSummary.includes("Continue shopping"));

const firecrawlPrimaryResult = await fetchWebsiteResearchWithFirecrawl("ogtool.com", {
  apiKey: "test-firecrawl-key",
  fetcher: async () => new Response(JSON.stringify({
    success: true,
    data: {
      markdown: `
# OGTool
Fully managed Reddit and ChatGPT visibility campaigns.
First ChatGPT mention in 14 days.
D2C founders are trying to show up when buyers ask AI tools for recommendations.
Customer said the team generated 42 citations in two weeks.
Stop losing AI search visibility to competitors.
Book a strategy call to see where your brand already appears.
Reddit campaigns give ChatGPT the citations it trusts.
Managed campaigns turn Reddit conversations into durable AI-search proof.
The service finds relevant communities, writes useful posts, and tracks citations.
Founders use it when paid ads get pricier and organic discovery matters more.
OGTool connects Reddit visibility to ChatGPT recommendation moments.
      `,
      metadata: {
        sourceURL: "https://ogtool.com/",
        ogTitle: "OGTool | ChatGPT Visibility",
        ogDescription: "Fully managed Reddit and ChatGPT visibility campaigns.",
        ogSiteName: "OGTool",
        ogImage: "https://ogtool.com/og.png",
        themeColor: "#82DFFF",
        favicon: "https://ogtool.com/favicon.ico",
      },
    },
  }), { status: 200 }),
  curator: {
    geminiApiKey: "test-gemini-key",
    nvidiaNimApiKey: "",
    geminiGenerateContent: async ({ prompt }) => {
      assert.ok(prompt.includes("Reddit campaigns give ChatGPT"));
      return JSON.stringify({
        brandName: "OGTool",
        offer: "Fully managed Reddit and ChatGPT visibility campaigns.",
        audience: "D2C founders trying to show up when buyers ask AI tools for recommendations.",
        buyerMoments: ["Stop losing AI search visibility to competitors."],
        proof: ["First ChatGPT mention in 14 days."],
        siteLanguage: ["ChatGPT Visibility"],
        ctaDirection: "Book a call",
        visualNotes: ["Use brand colors: #82DFFF"],
        droppedNoiseSummary: [],
        confidence: "high",
      });
    },
  },
});
assert.equal(firecrawlPrimaryResult.providerStatus[0]?.provider, "firecrawl");
assert.equal(firecrawlPrimaryResult.brandBrief.offer, "Fully managed Reddit and ChatGPT visibility campaigns.");

const brandfetchEnrichedResult = await fetchWebsiteResearchWithFirecrawl("brandfetch.com", {
  apiKey: "test-firecrawl-key",
  fetcher: async () => new Response(JSON.stringify({
    success: true,
    data: {
      markdown: `
# Brandfetch
Brandfetch helps developers fetch brand assets by domain.
Teams use Brandfetch when they need logos, colors, fonts, and brand metadata.
The Brand API returns structured brand data for product experiences.
Developers use it to make generated creative stay visually on brand.
Brandfetch supports brand asset lookup for many companies.
This page has enough useful copy for Firecrawl.
Brand assets should be resolved separately from page copy.
The API helps products avoid broken target-site logo metadata.
      `,
      metadata: {
        sourceURL: "https://brandfetch.com/",
        ogTitle: "Brandfetch",
      },
    },
  }), { status: 200 }),
  brandAssets: {
    enabled: true,
    apiKey: "test-brandfetch-key",
    fetcher: (async (requestUrl) => {
      const url = String(requestUrl);
      if (url === "https://api.brandfetch.io/v2/brands/domain/brandfetch.com") {
        return new Response(JSON.stringify({
          logos: [{
            type: "logo",
            theme: "light",
            formats: [{ src: "https://cdn.brandfetch.com/logo.png", format: "png" }],
          }],
          colors: [
            { hex: "#FFFFFF", type: "light" },
            { hex: "#00B95B", type: "brand" },
          ],
          fonts: [{ name: "Inter Display" }, { name: "Inter" }],
        }), { status: 200 });
      }
      if (url === "https://cdn.brandfetch.com/logo.png") return new Response("", { status: 200 });
      throw new Error(`Unexpected Brandfetch integration fetch: ${url}`);
    }) as typeof fetch,
  },
  curator: {
    geminiApiKey: "",
    nvidiaNimApiKey: "",
  },
});
assert.equal(brandfetchEnrichedResult.brand.logoUrl, "https://cdn.brandfetch.com/logo.png");
assert.equal(brandfetchEnrichedResult.brand.colors[0], "#00B95B");
assert.equal(brandfetchEnrichedResult.brand.fonts.heading, "Inter Display");
assert.deepEqual(brandfetchEnrichedResult.branding.brandAssetFinalDecision, {
  domain: "brandfetch.com",
  finalLogoUrl: "https://cdn.brandfetch.com/logo.png",
  finalLogoSource: "brandfetch-or-cache:logoUrl",
});
assert.ok(brandfetchEnrichedResult.providerStatus.some((status) => (
  status.provider === "brandfetch" && status.status === "used"
)));

const deadImageMetadataResult = await fetchWebsiteResearchWithFirecrawl("agentenamel.com", {
  apiKey: "test-firecrawl-key",
  fetcher: async () => {
    throw new Error("Firecrawl unavailable for explicit Jina fallback test.");
  },
  jina: {
    enabled: true,
    fetcher: async () => new Response(`
Title: Agent Enamel

URL Source: https://agentenamel.com/

Markdown Content:
# Agent Enamel
An AI-powered receptionist for dental practices.
Answer every missed call before patients call someone else.
72% of callers who reach voicemail hang up without leaving a message.
Dental offices use Agent Enamel when front desks are overloaded.
Convert missed calls into booked appointments.
Capture after-hours callers automatically.
Protect revenue from missed patient calls.
Give callers a polished first impression.
Agent Enamel gives practices a consistent phone presence during lunch, after hours, and peak call windows.
Practices can follow up faster because caller details are captured instead of disappearing into voicemail.
The service helps dental teams sound responsive without hiring another full-time receptionist.
New patient calls are answered with enough context to keep the conversation moving toward an appointment.
    `, { status: 200 }),
    htmlMetadataFetcher: async (requestUrl) => {
      if (String(requestUrl) === "https://agentenamel.com/") {
        return new Response(`
          <html>
            <head>
              <title>Agent Enamel</title>
              <meta property="og:image" content="/og-image.jpg">
              <script type="application/ld+json">
                { "@type": "Organization", "logo": "https://agentenamel.com/logo.png" }
              </script>
              <link rel="icon" href="/favicon.ico">
            </head>
          </html>
        `, { status: 200 });
      }

      return new Response("", { status: 404 });
    },
  },
});
assert.equal(deadImageMetadataResult.brand.logoUrl, null);
assert.equal(deadImageMetadataResult.brand.faviconUrl, null);
assert.equal(deadImageMetadataResult.brand.ogImageUrl, null);

let firecrawlFallbackCalled = false;
const fallbackResult = await fetchWebsiteResearchWithFirecrawl("ogtool.com", {
  apiKey: "test-firecrawl-key",
  fetcher: async () => {
    firecrawlFallbackCalled = true;
    return new Response(JSON.stringify({
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
        },
      },
    }), { status: 200 });
  },
  jina: {
    fetcher: async () => new Response("Title: Empty\n\nMarkdown Content:\nMenu\nLogin", { status: 200 }),
    htmlMetadataFetcher: async () => new Response("", { status: 200 }),
  },
});
assert.equal(firecrawlFallbackCalled, true);
assert.equal(fallbackResult.providerStatus[0]?.provider, "firecrawl");

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
