import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { startStaticServer } from "../static-server.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const evidenceDirectory = path.join(root, "agent-runs/_lab-smoke");
await mkdir(evidenceDirectory, { recursive: true });

const server = await startStaticServer(root);
let browser;
try {
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    args: ["--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await page.goto(`http://127.0.0.1:${server.address().port}/runtime/renderer/index.html?mode=lab`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__DANCE_LAB_READY__ === true, null, { timeout: 30_000 });

  const shell = page.locator("#lab-shell");
  assert.equal(await page.locator("#motion-grid [data-motion-id]").count(), 25);
  assert.equal(await page.locator("#character-selector [data-character-id]").count(), 8);
  assert.equal(await shell.getAttribute("data-loaded-character-count"), "1");
  assert.equal(await shell.getAttribute("data-loaded-motion-count"), "1");

  await page.locator('[data-motion-id="chicken-dance"]').click();
  await page.locator('[data-character-id="mr-krabs"]').click();
  await page.waitForFunction(() => {
    const element = document.querySelector("#lab-shell");
    return element?.dataset.motionId === "chicken-dance"
      && element.dataset.characterId === "mr-krabs"
      && element.dataset.loadedMotionCount === "2"
      && element.dataset.loadedCharacterCount === "2";
  });
  assert.equal(
    await page.locator("#error").isVisible(),
    false,
    await page.locator("#error").textContent(),
  );

  await page.locator('[data-character-id="sonic-modern"]').click();
  await page.waitForFunction(() => document.querySelector("#lab-shell")?.dataset.characterId === "sonic-modern");
  const restartBox = await page.locator("#restart").boundingBox();
  const downloadBox = await page.locator("#download-toggle").boundingBox();
  assert.ok(restartBox && downloadBox && downloadBox.x >= restartBox.x + restartBox.width, "Download must sit to the right of Restart");
  await page.locator("#download-toggle").click();
  assert.equal(await page.locator("#download-menu").isVisible(), true);
  assert.equal(await page.locator("[data-export-format]").count(), 2);
  const titleBox = await page.locator("#title").boundingBox();
  const menuBox = await page.locator("#download-menu").boundingBox();
  const overlaps = titleBox && menuBox
    && titleBox.x < menuBox.x + menuBox.width && titleBox.x + titleBox.width > menuBox.x
    && titleBox.y < menuBox.y + menuBox.height && titleBox.y + titleBox.height > menuBox.y;
  assert.equal(Boolean(overlaps), false, `The open download menu must not cover Sonic's name: ${JSON.stringify({ titleBox, menuBox })}`);

  await page.locator("#download-toggle").click();
  await page.locator('[data-motion-id="joyful-jump"]').click();
  await page.locator('[data-character-id="kermit-sci-fi"]').click();
  await page.waitForFunction(() => {
    const element = document.querySelector("#lab-shell");
    return element?.dataset.motionId === "joyful-jump"
      && element.dataset.characterId === "kermit-sci-fi"
      && element.dataset.loadedMotionCount === "3"
      && element.dataset.loadedCharacterCount === "4";
  });
  assert.equal(await page.locator("#title").textContent(), "Kermit (Sci-Fi)");
  assert.equal(
    await page.locator("#error").isVisible(),
    false,
    await page.locator("#error").textContent(),
  );

  const selectorBox = await page.locator("#character-selector").boundingBox();
  const finalCharacterBox = await page.locator('#character-selector [data-character-id="kermit-sci-fi"]').boundingBox();
  assert.ok(selectorBox && finalCharacterBox && finalCharacterBox.x + finalCharacterBox.width <= selectorBox.x + selectorBox.width + 1,
    "The eighth character must remain inside the visible selector grid");
  await page.waitForTimeout(1_100);

  const screenshot = path.join(evidenceDirectory, "character-dance-lab.png");
  await page.screenshot({ path: screenshot, fullPage: true });
  console.log(JSON.stringify({ status: "pass", motions: 25, characters: 8, activeCharacter: "kermit-sci-fi", activeMotion: "joyful-jump", screenshot }, null, 2));
} finally {
  if (browser) await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
