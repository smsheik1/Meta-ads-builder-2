import { makerAnalysisFixture } from "../../builder/fixture";
import { createMakerDraftFromAnalysis, type PaddleOcrResult } from "../../builder/referenceAnalysis";
import type { StoredWebsiteResearchResult } from "../../research/types";
import type { MakerFormatTestContract, MakerFormatTestGeneration } from "./testRuntime";

const svgDataUrl = (body: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(body)}`;

const ocrText = (
  id: string,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  textColor = "#111111",
) => ({
  id,
  text,
  confidence: 0.99,
  polygon: [[x, y], [x + width, y], [x + width, y + height], [x, y + height]] as Array<[number, number]>,
  textColor,
});

const makerTestOcr: PaddleOcrResult = {
  width: 1080,
  height: 1080,
  texts: [
    ocrText("text_10", "Codex", 95, 470, 380, 120),
    ocrText("text_11", "🤝", 490, 485, 120, 105),
    ocrText("text_12", "GitHub", 580, 20, 350, 90, "#AAAAAA"),
    ocrText("text_13", "Sheets", 600, 125, 330, 90, "#AAAAAA"),
    ocrText("text_14", "Asana", 630, 230, 300, 90, "#AAAAAA"),
    ocrText("text_15", "Docs", 680, 335, 250, 90, "#AAAAAA"),
    ocrText("text_16", "Slack", 640, 470, 300, 120),
    ocrText("text_17", "Gmail", 650, 605, 290, 90, "#B8B8B8"),
    ocrText("text_18", "Slides", 640, 715, 300, 90, "#DDDDDD"),
    ocrText("text_20", "Work with Codex", 225, 890, 530, 70),
  ],
};

const referenceImage = svgDataUrl('<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080"><rect width="1080" height="1080" fill="white"/></svg>');
const logoImage = svgDataUrl('<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><circle cx="40" cy="40" r="34" fill="none" stroke="black" stroke-width="8"/></svg>');
const blueberryPieImage = svgDataUrl('<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360"><rect width="480" height="360" fill="#fff4e3"/><circle cx="240" cy="190" r="105" fill="#d89a43"/><circle cx="240" cy="190" r="72" fill="#563067"/><text x="240" y="330" text-anchor="middle" font-family="Arial" font-size="28" font-weight="700" fill="#d71920">Blueberry Pie</text></svg>');
const cookieTinImage = svgDataUrl('<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360"><rect width="480" height="360" fill="#eef3ff"/><rect x="120" y="78" width="240" height="210" rx="28" fill="#173c8c"/><circle cx="240" cy="183" r="70" fill="#c98238"/><circle cx="215" cy="160" r="9" fill="#472716"/><circle cx="265" cy="205" r="9" fill="#472716"/><text x="240" y="330" text-anchor="middle" font-family="Arial" font-size="28" font-weight="700" fill="#d71920">Cookie Tin</text></svg>');

export function createMakerFormatTestDraftFixture(id = "maker-format-test-draft") {
  const analysis = structuredClone(makerAnalysisFixture);
  analysis.maker_questions = ["What occasion should this ad focus on?"];
  return createMakerDraftFromAnalysis({
    id,
    fileName: "codex-reference.png",
    analysis,
    artifacts: {
      backgroundImageUrl: referenceImage,
      ocr: makerTestOcr,
      referenceImageUrl: referenceImage,
      refinedAssets: [{
        assetId: "brand_mark",
        imageUrl: logoImage,
        x: 105,
        y: 885,
        width: 82,
        height: 82,
      }],
    },
  });
}

export const makerTestResearchFixture: StoredWebsiteResearchResult = {
  sessionId: "maker-test-session",
  researchRunId: "maker-test-research",
  brandSnapshotId: "maker-test-brand",
  websiteUrl: "https://davids-cookies.test/",
  finalUrl: "https://davids-cookies.test/",
  host: "davids-cookies.test",
  brand: {
    name: "David's Cookies",
    url: "https://davids-cookies.test/",
    host: "davids-cookies.test",
    title: "David's Cookies",
    description: "Fresh-baked cookies and desserts delivered for gifting and celebrations.",
    faviconUrl: null,
    logoUrl: svgDataUrl('<svg xmlns="http://www.w3.org/2000/svg" width="220" height="90"><text x="10" y="62" font-size="46" font-weight="700" fill="#D71920">David\'s</text></svg>'),
    ogImageUrl: null,
    screenshotUrl: null,
    colors: ["#D71920", "#173C8C", "#FFFFFF"],
    fonts: { feel: "display", heading: "Arial", body: "Arial" },
    vibeTags: ["warm", "giftable", "playful"],
  },
  brandBrief: {
    brandName: "David's Cookies",
    offer: "Fresh cookies and desserts delivered to their door.",
    audience: "Gift buyers, families, and dessert lovers.",
    buyerMoments: ["Need a gift that feels personal", "Want a crowd-pleasing dessert", "Need an easy thank-you"],
    proof: ["Fresh-baked", "Gift-ready", "Delivered nationwide"],
    siteLanguage: ["Send something delicious", "Make their day sweeter"],
    ctaDirection: "Shop cookies",
    visualNotes: ["Use David's red and product photography"],
    droppedNoiseSummary: [],
    confidence: "high",
  },
  adAngles: [
    { buyer: "Holiday gift buyer", moment: "Needs a gift", pain: "Generic gifts feel forgettable", proof: "Gift-ready cookie tins", sitePhrase: "Make their day sweeter" },
  ],
  productCatalog: {
    provider: "shopify-products-json",
    sourceUrl: "https://davids-cookies.test/products.json",
    groups: { bestSellers: ["blueberry-pie"] },
    summary: { productCount: 2, bestSellerCount: 1 },
    products: [
      {
        title: "Grande Blueberry Pie",
        handle: "blueberry-pie",
        url: "https://davids-cookies.test/products/blueberry-pie",
        imageUrl: blueberryPieImage,
        imageAlt: "David's Grande Blueberry Pie",
        productType: "Pie",
        vendor: "David's Cookies",
        priceMin: 39.99,
        priceMax: 39.99,
        currency: "USD",
        available: true,
        badges: ["best-seller"],
      },
      {
        title: "Chocolate Chunk Cookie Tin",
        handle: "cookie-tin",
        url: "https://davids-cookies.test/products/cookie-tin",
        imageUrl: cookieTinImage,
        imageAlt: "Chocolate Chunk Cookie Tin",
        productType: "Cookies",
        vendor: "David's Cookies",
        priceMin: 34.99,
        priceMax: 34.99,
        currency: "USD",
        available: true,
        badges: [],
      },
    ],
  },
  evidence: {
    headings: ["Gifts that taste as good as they look"],
    paragraphs: ["Fresh-baked desserts shipped nationwide."],
    receipts: {
      specificClaims: ["Delivered nationwide"],
      buyerMoments: ["Holiday gifting", "Thank-you gifts"],
      exactSiteLanguage: ["Make their day sweeter"],
      namedProof: ["Best-selling blueberry pie"],
    },
    rawMarkdown: "# David's Cookies\nFresh-baked desserts shipped nationwide.",
  },
  metadata: {},
  branding: {},
  providerStatus: [],
};

const angleContent = [
  {
    label: "Holiday gifting",
    summary: "Make the product feel like the easiest personal gift for every holiday gathering.",
    emoji: "🎁",
    cta: "Gift David's Cookies",
    list: ["Christmas", "Hanukkah", "New Year", "Birthdays", "Thank-yous", "Congrats", "Just because"],
  },
  {
    label: "Crowd favorites",
    summary: "Turn the list into the reasons dessert lovers choose this best seller.",
    emoji: "🍪",
    cta: "Try the crowd favorite",
    list: ["Fresh-baked", "Gift-ready", "Shareable", "Best seller", "Ships fast", "Family-sized", "Always welcome"],
  },
  {
    label: "Easy thank-you",
    summary: "Position the product as a warm thank-you that requires almost no planning.",
    emoji: "💛",
    cta: "Send a sweeter thank-you",
    list: ["Clients", "Teachers", "Neighbors", "Hosts", "Teams", "Friends", "Family"],
  },
];

export function createMakerFormatTestGenerationFixture(contract: MakerFormatTestContract): MakerFormatTestGeneration {
  return {
    variations: angleContent.map((angle) => ({
      angleLabel: angle.label,
      angleSummary: angle.summary,
      fields: contract.fields.filter((field) => field.mutable).map((field) => ({
        id: field.id,
        value: /brand/i.test(field.id) ? makerTestResearchFixture.brand.name
          : /symbol|emoji/i.test(field.id) ? angle.emoji
            : /cta/i.test(field.id) ? angle.cta
              : `${makerTestResearchFixture.brand.name}: ${angle.label}`,
      })),
      lists: contract.lists.filter((list) => list.mutable).map((list) => ({
        id: list.id,
        activeItemId: list.activeItemId,
        items: list.items.map((item, itemIndex) => ({
          id: item.id,
          values: item.values.map((value) => ({ key: value.key, value: angle.list[itemIndex] || angle.list.at(-1)! })),
        })),
      })),
      assets: contract.assets.filter((asset) => asset.mutable).map((asset) => ({
        id: asset.id,
        kind: asset.binding === "brand" ? "brand-logo" as const
          : /emoji|symbol/i.test(asset.label) ? "emoji" as const
            : "keep" as const,
        ...(/emoji|symbol/i.test(asset.label) ? { emoji: angle.emoji } : {}),
      })),
    })),
  };
}
