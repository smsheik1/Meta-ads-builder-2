import { chromium, type Browser } from "playwright";

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
      "Start the app first with `npm run dev` from the repo root.",
      `Underlying error: ${message}`,
    ].join("\n"));
  }
}

async function launchBrowser(): Promise<Browser> {
  return chromium.launch({
    headless: !process.env.CREATE_SMOKE_HEADED,
  });
}

async function main() {
  await assertServerReachable();
  const browser = await launchBrowser();

  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1100 },
    });

    await page.goto(`${baseUrl}/create`, { waitUntil: "networkidle" });

    await page.locator("[data-preview-ad-viewport]").first().waitFor({ state: "visible" });
    await page.locator("[data-preview-phone-frame]").waitFor({ state: "visible" });
    const addAudioButton = page.getByRole("button", { name: "Add audio for this ad" });
    await addAudioButton.waitFor({ state: "visible" });
    assert(await addAudioButton.isEnabled(), "Fresh visitor must be able to add audio before submitting a website.");
    await page.getByRole("button", { name: "Download video" }).waitFor({ state: "visible" });
    await page.getByRole("button", { name: /create share link|share link copied/i }).waitFor({ state: "visible" });
    await page.locator("[data-create-format-rail='v3']").waitFor({ state: "visible" });
    await page.getByRole("button", { name: "Text" }).waitFor({ state: "visible" });
    await page.getByRole("button", { name: "Style" }).waitFor({ state: "visible" });
    await page.getByRole("button", { name: "Format" }).waitFor({ state: "visible" });

    const previewBefore = await page.locator("[data-preview-ad-viewport]").first().textContent();
    await page.getByTestId("spacebar-reroll-button").click();
    await page.getByText("1 reroll this session").first().waitFor({ state: "visible" });
    const previewAfter = await page.locator("[data-preview-ad-viewport]").first().textContent();
    assert(previewAfter !== previewBefore, "Spacebar reroll should change the fresh visitor placeholder.");

    const statusAfterFirstReroll = await page.getByText("1 reroll this session").first().textContent();
    await page.locator("#website-url").fill("ogtool.com");
    await page.locator("#website-url").press("Space");
    assert(
      await page.getByText("1 reroll this session").first().isVisible(),
      `Typing space in the website input should not reroll. Last status: ${statusAfterFirstReroll}`,
    );

    await addAudioButton.click();
    await page.locator("[data-dialogue-editor='modal']").waitFor({ state: "visible" });
    await page.getByRole("button", { name: "Close voice script editor" }).click();
    await page.locator("[data-dialogue-editor='modal']").waitFor({ state: "hidden" });

    console.log("CREATE_BROWSER_SMOKE_PASS");
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
