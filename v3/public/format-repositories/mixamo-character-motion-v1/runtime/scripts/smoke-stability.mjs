import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { startStaticServer } from "../static-server.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const evidenceDirectory = path.join(root, "agent-runs/_stability-smoke");
await mkdir(evidenceDirectory, { recursive: true });

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
async function assertFrameAdvances(page, shell, label) {
  const frame = Number(await shell.getAttribute("data-current-frame"));
  await page.waitForFunction(
    (previousFrame) => Number(document.querySelector("#lab-shell")?.dataset.currentFrame) !== previousFrame,
    frame,
    { timeout: 2_000 },
  ).catch(() => assert.fail(`${label} must animate within 2 seconds`));
}

let delayedRequests = 0;
const server = await startStaticServer(root, 0, async ({ pathname }) => {
  if (pathname.endsWith(".dae")) {
    delayedRequests += 1;
    await delay(140);
  } else if (/\/assets\/motions\/(?!manifest)[^/]+\.json$/.test(pathname)) {
    delayedRequests += 1;
    await delay(80);
  }
  return false;
});

let browser;
try {
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    args: ["--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const failures = [];
  page.on("pageerror", (error) => failures.push(error.stack || error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && !/WebGLRenderer: Context (Lost|Restored)/.test(message.text())) failures.push(message.text());
  });

  const url = `http://127.0.0.1:${server.address().port}/runtime/renderer/index.html?mode=lab`;
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__DANCE_LAB_READY__ === true, null, { timeout: 30_000 });
  const shell = page.locator("#lab-shell");

  assert.equal(
    await shell.getAttribute("data-selection-phase"),
    "ready",
    await page.locator("#error").textContent(),
  );
  assert.equal(await shell.getAttribute("data-webgl-status"), "ready");
  assert.equal(await page.locator("#canvas").evaluate((canvas) => {
    const context = canvas.getContext("webgl2") || canvas.getContext("webgl");
    return context?.getContextAttributes()?.preserveDrawingBuffer;
  }), false, "Interactive playback must not retain the export-only drawing buffer");

  const selectorsStayedEnabled = await page.evaluate(() => {
    const click = (selector) => document.querySelector(selector).click();
    click('#character-selector [data-character-id="patrick"]');
    click('#motion-grid [data-motion-id="joyful-jump"]');
    click('#character-selector [data-character-id="mr-krabs"]');
    click('#motion-grid [data-motion-id="rumba-dancing"]');
    click('#character-selector [data-character-id="squilliam"]');
    click('#motion-grid [data-motion-id="thriller-part-2"]');
    click('#character-selector [data-character-id="patrick"]');
    click('#motion-grid [data-motion-id="twist-dance"]');
    return [...document.querySelectorAll("#character-selector button, #motion-grid button")]
      .every((button) => !button.disabled);
  });
  assert.equal(selectorsStayedEnabled, true, "A slow selection must remain supersedable");
  await page.waitForFunction(() => {
    const element = document.querySelector("#lab-shell");
    return element?.dataset.selectionPhase === "ready"
      && element.dataset.characterId === "patrick"
      && element.dataset.motionId === "twist-dance";
  }, null, { timeout: 30_000 });
  await page.waitForTimeout(500);
  assert.equal(await shell.getAttribute("data-character-id"), "patrick");
  assert.equal(await shell.getAttribute("data-motion-id"), "twist-dance");

  await assertFrameAdvances(page, shell, "Playback before context loss");

  const canLoseContext = await page.locator("#canvas").evaluate((canvas) => {
    const context = canvas.getContext("webgl2") || canvas.getContext("webgl");
    const extension = context?.getExtension("WEBGL_lose_context");
    if (!extension) return false;
    window.__DANCE_STABILITY_CONTEXT__ = extension;
    extension.loseContext();
    return true;
  });
  assert.equal(canLoseContext, true, "The browser must expose WEBGL_lose_context for recovery testing");
  await page.waitForFunction(() => document.querySelector("#lab-shell")?.dataset.webglStatus === "lost");
  await page.evaluate(() => window.__DANCE_STABILITY_CONTEXT__.restoreContext());
  await page.waitForFunction(() => {
    const element = document.querySelector("#lab-shell");
    return element?.dataset.webglStatus === "ready" && element.dataset.selectionPhase === "ready";
  }, null, { timeout: 30_000 });
  await assertFrameAdvances(page, shell, "Playback after context restoration");

  for (let reload = 0; reload < 5; reload += 1) {
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForFunction(() => window.__DANCE_LAB_READY__ === true, null, { timeout: 30_000 });
    assert.equal(await shell.getAttribute("data-selection-phase"), "ready");
    await assertFrameAdvances(page, shell, `Reload ${reload + 1}`);
  }

  assert.ok(delayedRequests >= 12, `Expected delayed asset traffic across reloads; received ${delayedRequests}`);
  assert.deepEqual(failures, []);
  const screenshot = path.join(evidenceDirectory, "character-dance-stability.png");
  await page.screenshot({ path: screenshot, fullPage: true });
  console.log(JSON.stringify({ status: "pass", reloads: 5, delayedRequests, finalCharacter: "spongebob", finalMotion: "hip-hop-dancing", screenshot }, null, 2));
} finally {
  if (browser) await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
