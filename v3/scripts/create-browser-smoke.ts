import { chromium, type Browser } from "playwright";
import { buildFallbackDialogueScripts } from "../features/dialogue/dialogueScripts";
import type { StoredWebsiteResearchResult } from "../features/research/types";
import type { AdScene } from "../features/scene/types";
import { createDefaultCanvasInteractionLocks } from "../features/create/canvasInteractionStore";
import { defaultRenderScene } from "../remotion-entry/fixture";

const createSessionStorageKey = "wiggly:v3:create-session";
const defaultBaseUrl = "http://localhost:3020";
const baseUrl = (process.env.CREATE_SMOKE_BASE_URL || defaultBaseUrl).replace(/\/$/, "");

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function assertServerReachable() {
  try {
    const response = await fetch(`${baseUrl}/create`, {
      signal: AbortSignal.timeout(5000),
    });
    assert(response.ok, `Expected ${baseUrl}/create to return 2xx, got ${response.status}.`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error([
      `Create browser smoke could not reach ${baseUrl}/create.`,
      "Start the app first with `npm run dev -w @wiggly/v3`.",
      `Underlying error: ${message}`,
    ].join("\n"));
  }
}

function cloneScene(scene: AdScene): AdScene {
  return JSON.parse(JSON.stringify(scene)) as AdScene;
}

function createSceneFixture(index: number, overrides: {
  headline: string;
  subheadline: string;
  backgroundColor: string;
  textColor: string;
  visualizerColor: string;
  accentColor: string;
}): AdScene {
  const scene = cloneScene(defaultRenderScene);
  return {
    ...scene,
    creative: {
      ...scene.creative,
      angleId: `smoke-angle-${index}`,
      headline: overrides.headline,
      subheadline: overrides.subheadline,
      ctaText: "See the proof",
      selectedPain: "Your competitor shows up in ChatGPT first.",
      selectedProof: "First ChatGPT mention in 14 days.",
    },
    style: {
      ...scene.style,
      backgroundColor: overrides.backgroundColor,
      textColor: overrides.textColor,
      accentColor: overrides.accentColor,
      visualizerColor: overrides.visualizerColor,
    },
    metadata: {
      ...scene.metadata,
      candidateIndex: index,
      generationBatchId: "create-browser-smoke",
      generatedAt: 123 + index,
    },
  };
}

function createResearchResult(scene: AdScene): StoredWebsiteResearchResult {
  return {
    websiteUrl: "https://ogtool.com/",
    finalUrl: "https://ogtool.com/",
    host: "ogtool.com",
    brand: {
      name: scene.brand.name,
      url: scene.brand.url,
      host: scene.brand.host,
      title: scene.brand.title,
      description: scene.brand.description,
      faviconUrl: scene.brand.faviconUrl,
      logoUrl: scene.brand.logoUrl,
      ogImageUrl: scene.brand.ogImageUrl,
      screenshotUrl: scene.brand.screenshotUrl,
      colors: scene.brand.colors,
      fonts: scene.brand.fonts,
      vibeTags: scene.brand.vibeTags,
    },
    brandBrief: {
      brandName: scene.brand.name,
      offer: "Fully managed Reddit and ChatGPT visibility campaigns.",
      audience: "D2C operators trying to show up when buyers ask AI tools for recommendations.",
      buyerMoments: scene.brand.receipts.buyerMoments,
      proof: scene.brand.receipts.specificClaims,
      siteLanguage: scene.brand.receipts.exactSiteLanguage,
      ctaDirection: "Show the proof.",
      visualNotes: ["Soft cream background", "High-contrast dark headline", "Bright audio waveform"],
      droppedNoiseSummary: [],
      confidence: "high",
    },
    evidence: {
      headings: ["ChatGPT mentions in 14 days"],
      paragraphs: ["Managed Reddit and ChatGPT visibility campaigns."],
      receipts: scene.brand.receipts,
      rawMarkdown: "# OGTool\nManaged Reddit and ChatGPT visibility campaigns.",
    },
    metadata: {
      smoke: true,
    },
    branding: {
      smoke: true,
    },
    providerStatus: [
      {
        provider: "firecrawl",
        status: "used",
        reason: "Seeded browser smoke fixture.",
      },
      {
        provider: "gemini-curator",
        status: "used",
        reason: "Seeded browser smoke fixture.",
      },
    ],
    sessionId: "smoke-session",
    researchRunId: "smoke-research",
    brandSnapshotId: "smoke-brand",
  };
}

function createSessionSnapshot() {
  const adScenes = [
    createSceneFixture(0, {
      headline: "Your Competitor Shows Up First",
      subheadline: "First ChatGPT mention in 14 days from managed Reddit and AI visibility campaigns.",
      backgroundColor: "#FBFAF5",
      textColor: "#070B1D",
      visualizerColor: "#82DFFF",
      accentColor: "#82DFFF",
    }),
    createSceneFixture(1, {
      headline: "ChatGPT Mentions In 14 Days",
      subheadline: "Managed Reddit campaigns that turn proof into AI visibility.",
      backgroundColor: "#F2FBF6",
      textColor: "#0D2F1D",
      visualizerColor: "#6EE7B7",
      accentColor: "#6EE7B7",
    }),
    createSceneFixture(2, {
      headline: "Stop Losing The AI Search",
      subheadline: "A clean proof trail for buyers asking AI tools who to trust.",
      backgroundColor: "#FFF7ED",
      textColor: "#241208",
      visualizerColor: "#FB7185",
      accentColor: "#FB7185",
    }),
  ];

  return {
    result: createResearchResult(adScenes[0]),
    adScenes,
    selectedScene: adScenes[0],
    selectedSceneIndex: 0,
    sceneLocks: createDefaultCanvasInteractionLocks(),
    rerollCount: 0,
    adStatusNote: "Seeded browser smoke ads.",
    dialogueScripts: buildFallbackDialogueScripts(adScenes[0], 5),
    selectedDialogueIndex: 0,
    savedAt: Date.now(),
  };
}

async function launchBrowser(): Promise<Browser> {
  try {
    return await chromium.launch();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error([
      "Playwright could not launch Chromium.",
      "Install the browser binary with `npx playwright install chromium`.",
      `Underlying error: ${message}`,
    ].join("\n"));
  }
}

async function main() {
  await assertServerReachable();
  const browser = await launchBrowser();

  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1100 },
    });

    await page.addInitScript(({ key, snapshot }) => {
      window.localStorage.setItem(key, JSON.stringify(snapshot));
    }, {
      key: createSessionStorageKey,
      snapshot: createSessionSnapshot(),
    });

    await page.goto(`${baseUrl}/create`, { waitUntil: "networkidle" });

    const previewViewport = page.locator("[data-preview-ad-viewport]").first();
    const assertPreviewIncludes = async (text: string) => {
      await previewViewport.waitFor({ state: "visible" });
      const content = await previewViewport.textContent();
      assert(content?.includes(text), `Expected preview viewport to include "${text}". Actual preview text: ${content}`);
    };

    await assertPreviewIncludes("Your Competitor Shows Up First");
    await page.getByRole("button", { name: "Download video" }).waitFor({ state: "visible" });
    await page.getByRole("button", { name: /create share link|share link copied/i }).waitFor({ state: "visible" });
    await page.getByRole("combobox", { name: "Choose preview" }).waitFor({ state: "visible" });
    await page.locator("[data-preview-phone-frame]").waitFor({ state: "visible" });
    await page.locator("[data-preview-audio-action='true']").waitFor({ state: "visible" });

    await page.getByTestId("spacebar-reroll-button").click();
    await page.getByText("1 reroll this session").first().waitFor({ state: "visible" });
    await assertPreviewIncludes("ChatGPT Mentions In 14 Days");

    const statusAfterFirstReroll = await page.getByText("1 reroll this session").first().textContent();
    await page.locator("#website-url").fill("ogtool.com");
    await page.locator("#website-url").press("Space");
    assert(
      await page.getByText("1 reroll this session").first().isVisible(),
      `Typing space in the website input should not reroll. Last status: ${statusAfterFirstReroll}`,
    );

    const visualizerSlot = page.locator('[data-preview-selectable-slot="visualizer"]').first();
    await visualizerSlot.getByRole("button", { name: /select visualizer/i }).click();
    await page.getByText(/Spacebar rerolls the/i).waitFor({ state: "visible" });
    const selectedSlotStatus = await page.getByText(/Spacebar rerolls the/i).textContent();
    await page.keyboard.press("Space");
    await page.getByText(/Spacebar rerolls the/i).waitFor({ state: "visible" });
    assert(
      await page.getByText("2 rerolls this session").count() === 0,
      `Selected-slot reroll should stay scoped, not show generic status. Status: ${selectedSlotStatus}`,
    );

    await page.locator("[data-preview-selection-overlay='true']").click({ position: { x: 4, y: 4 } });
    await page.getByText("2 rerolls this session").waitFor({ state: "visible" });

    await page.locator("[data-preview-audio-action='true']").click();
    await page.getByRole("button", { name: /upload your audio/i }).waitFor({ state: "visible" });
    const headlineBeforeModalSpace = await previewViewport.textContent();
    await page.locator("[data-dialogue-editor='modal']").click({ position: { x: 8, y: 8 } });
    await page.keyboard.press("Space");
    const headlineAfterModalSpace = await previewViewport.textContent();
    assert(
      headlineAfterModalSpace === headlineBeforeModalSpace,
      "Spacebar should not reroll while the audio modal is open.",
    );
    await page.getByRole("button", { name: /close/i }).first().click();
    await page.getByRole("button", { name: /upload your audio/i }).waitFor({ state: "hidden" });

    console.log("CREATE_BROWSER_SMOKE_PASS");
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
