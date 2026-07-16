import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.MAKER_QA_BASE_URL || "http://localhost:3049";
const capturedDraftsPath = process.env.MAKER_QA_DRAFTS || "/tmp/maker-live-drafts.json";
const outputDir = path.resolve(process.cwd(), "../artifacts/maker-breaking-news-golden-path/qa");
const result = { steps: [], variations: [] };
const capturedDrafts = JSON.parse(await readFile(capturedDraftsPath, "utf8"));
const capturedDraft = Object.values(capturedDrafts)[0];
if (!capturedDraft) throw new Error("The captured live Maker draft is missing.");
const subjectAsset = capturedDraft.analysis.assets.find((asset) => asset.role === "news_subject");
if (!subjectAsset) throw new Error("The captured live Maker draft has no news subject.");

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } });

const record = async (name, detail = {}) => {
  result.steps.push({ name, ...detail });
  await writeFile(path.join(outputDir, "result.json"), JSON.stringify(result, null, 2));
};

try {
  await page.addInitScript((drafts) => localStorage.setItem("wiggly:maker:drafts:v1", JSON.stringify(drafts)), capturedDrafts);
  await page.goto(`${baseUrl}/builder?draft=${capturedDraft.id}`, { waitUntil: "domcontentloaded" });
  await page.locator('[data-maker-builder="true"]').waitFor({ state: "visible", timeout: 20_000 });
  await page.screenshot({ path: path.join(outputDir, "01-reconstructed.png") });
  await record("captured-live-draft-opened", { draftId: capturedDraft.id, url: page.url() });

  await page.getByRole("button", { name: subjectAsset.label, exact: true }).click();
  const subject = page.locator(`[data-static-layer-id="asset-${subjectAsset.id}"]`);
  const before = await subject.boundingBox();
  if (!before) throw new Error("The news subject layer is not visible.");
  await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
  await page.mouse.down();
  await page.mouse.move(before.x - 40, before.y + before.height / 2 + 35, { steps: 8 });
  await page.mouse.up();
  const after = await subject.boundingBox();
  await page.screenshot({ path: path.join(outputDir, "02-subject-moved.png") });
  await record("subject-moved", { before, after });

  await page.getByRole("button", { name: subjectAsset.label, exact: true }).click();
  await page.getByLabel("Image shape", { exact: true }).selectOption("circle");
  await page.getByLabel("Image search", { exact: true }).fill("David's Cookies bakery team");
  await page.getByRole("button", { name: "Search images", exact: true }).click();
  const searchResults = page.getByLabel("Image search results", { exact: true });
  await searchResults.waitFor({ state: "visible", timeout: 20_000 });
  const searchButtons = searchResults.getByRole("button");
  const searchCount = await searchButtons.count();
  if (searchCount === 0) throw new Error("Image search returned no choices.");
  await searchButtons.nth(0).click();
  await page.screenshot({ path: path.join(outputDir, "03-image-replaced.png") });
  await record("image-replaced", { choices: searchCount });

  await page.getByRole("button", { name: "headline", exact: true }).click();
  const headlineInput = page.getByLabel("Text", { exact: true });
  await headlineInput.fill("BREAKING: DAVID'S COOKIES JUST MADE OFFICE GIFTS EASY");
  await page.getByLabel("width", { exact: true }).fill("360");
  await page.getByLabel("width", { exact: true }).press("Enter");
  await page.screenshot({ path: path.join(outputDir, "04-text-fitted.png") });
  await record("text-edited-and-fitted");

  await page.getByRole("link", { name: "Test with a brand", exact: true }).click();
  await page.locator('[data-maker-test-mode="true"]').waitFor({ state: "visible", timeout: 15_000 });
  await page.getByText(capturedDraft.title, { exact: true }).waitFor({ state: "visible", timeout: 15_000 });
  await page.getByLabel("Brand website", { exact: true }).fill("davidscookies.com");
  const readSite = page.getByRole("button", { name: "Read site", exact: true });
  await page.waitForFunction(() => Array.from(document.querySelectorAll("button")).some((button) => button.textContent?.includes("Read site") && !button.disabled));
  await readSite.click();
  await page.locator('[data-maker-test-brand-summary="true"]').waitFor({ state: "visible", timeout: 180_000 });
  await page.screenshot({ path: path.join(outputDir, "05-brand-read.png") });
  await record("brand-read");

  const productSelect = page.getByLabel("Product to advertise", { exact: true });
  if (await productSelect.count()) {
    const productValue = await productSelect.evaluate((select) => {
      const options = [...select.options];
      return options.find((option) => option.value && !option.disabled)?.value || "";
    });
    if (productValue) await productSelect.selectOption(productValue);
    await record("product-selected", { productValue });
  }

  const generate = page.getByRole("button", { name: "Generate test ads", exact: true });
  await generate.waitFor({ state: "visible" });
  if (!(await generate.isEnabled())) throw new Error("Generate test ads is disabled after website research.");
  await generate.click();
  const firstVariation = page.getByText("Variation 1 of 3", { exact: true });
  const generationError = page.getByRole("alert");
  await Promise.race([
    firstVariation.waitFor({ state: "visible", timeout: 180_000 }),
    generationError.waitFor({ state: "visible", timeout: 180_000 }),
  ]);
  if (await generationError.isVisible()) throw new Error(await generationError.innerText());

  const next = page.getByRole("button", { name: "Next variation", exact: true });
  for (let index = 0; index < 3; index += 1) {
    const heading = await page.locator("h2").last().innerText();
    const summary = await page.locator("h2").last().locator("xpath=following-sibling::p[1]").innerText();
    const file = `06-variation-${index + 1}.png`;
    await page.screenshot({ path: path.join(outputDir, file) });
    result.variations.push({ index: index + 1, heading, summary, file });
    await record(`variation-${index + 1}`, { heading, summary });
    if (index < 2) await next.click();
  }

  await page.getByRole("link", { name: "Back to builder", exact: true }).click();
  await page.locator('[data-maker-builder="true"]').waitFor({ state: "visible", timeout: 15_000 });
  await page.getByRole("button", { name: "Publish version", exact: true }).click();
  await page.getByText("Published v1", { exact: true }).waitFor({ state: "visible", timeout: 10_000 });
  await page.screenshot({ path: path.join(outputDir, "07-published.png") });
  await record("format-published", { url: page.url() });
} catch (error) {
  result.error = error instanceof Error ? error.message : String(error);
  await page.screenshot({ path: path.join(outputDir, "failure.png") }).catch(() => {});
  await writeFile(path.join(outputDir, "result.json"), JSON.stringify(result, null, 2));
  throw error;
} finally {
  await browser.close();
}
