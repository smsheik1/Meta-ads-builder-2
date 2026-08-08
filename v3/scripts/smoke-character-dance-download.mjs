import assert from "node:assert/strict";
import { mkdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { chromium } from "playwright";

const pageUrl = process.env.DANCE_LAB_URL || "http://localhost:3020/format-lab/character-dance-lab";
const characterId = process.env.DANCE_CHARACTER || "squilliam";
const motionId = process.env.DANCE_MOTION || "rumba-dancing";
const outputDirectory = path.join(tmpdir(), "wiggly-character-dance-download-smoke");
await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  args: ["--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"],
});
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  await page.goto(pageUrl, { waitUntil: "networkidle" });
  const lab = await page.locator('iframe[title="Interactive Character Dance Lab"]').count()
    ? page.frameLocator('iframe[title="Interactive Character Dance Lab"]')
    : page;
  await lab.locator(`#character-selector [data-character-id="${characterId}"]`).click();
  await lab.locator(`#motion-grid [data-motion-id="${motionId}"]`).click();
  await lab.locator("#lab-shell").evaluate((element, selection) => new Promise((resolve) => {
    const ready = () => element.dataset.characterId === selection.characterId && element.dataset.motionId === selection.motionId;
    if (ready()) return resolve();
    const observer = new MutationObserver(() => {
      if (!ready()) return;
      observer.disconnect();
      resolve();
    });
    observer.observe(element, { attributes: true });
  }), { characterId, motionId });

  const outputs = {};
  for (const format of ["mp4", "gif"]) {
    await lab.locator("#download-toggle").click();
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 300_000 }),
      lab.locator(`[data-export-format="${format}"]`).click(),
    ]);
    const output = path.join(outputDirectory, `${characterId}-${motionId}.${format}`);
    await download.saveAs(output);
    assert.equal(await download.failure(), null);
    assert.equal(download.suggestedFilename(), `${characterId}-${motionId}.${format}`);
    outputs[format] = output;
    await lab.locator("#download-toggle").waitFor({ state: "visible" });
    await lab.locator("#download-toggle").evaluate((button) => new Promise((resolve) => {
      if (!button.disabled) return resolve();
      const observer = new MutationObserver(() => {
        if (button.disabled) return;
        observer.disconnect();
        resolve();
      });
      observer.observe(button, { attributes: true });
    }));
  }

  const [mp4, gif] = await Promise.all([readFile(outputs.mp4), readFile(outputs.gif)]);
  assert.equal(mp4.subarray(4, 8).toString("ascii"), "ftyp");
  assert.match(gif.subarray(0, 6).toString("ascii"), /^GIF8[79]a$/);
  assert.ok(mp4.length > 50_000);
  assert.ok(gif.length > 50_000);
  console.log(JSON.stringify({ status: "pass", character: characterId, motion: motionId, outputs, bytes: { mp4: mp4.length, gif: gif.length } }, null, 2));
} finally {
  await browser.close();
}
