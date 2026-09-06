import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { chromium } from "playwright";

const base = process.env.REPO_SMOKE_BASE_URL || "http://localhost:3020";
const evidence = await mkdtemp(path.join(tmpdir(), "lego-page-qa-"));
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || "chrome" });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
try {
  const response = await page.goto(`${base}/formats/lego-music-video`);
  assert.equal(response.status(), 200);
  await page.getByRole("heading", { name: "Lego Music Video", exact: true }).waitFor();
  for (const id of ["accounts-youll-connect", "included-assets", "examples", "workflow", "proof-quality", "repo-files", "run-with-agent"]) assert.equal(await page.locator(`#${id}`).count(), 1);
  assert.equal(await page.locator("#accounts-youll-connect").getByRole("heading", { name: "ElevenLabs", exact: true }).count(), 1);
  assert.equal(await page.locator("#accounts-youll-connect").getByRole("heading", { name: "NVIDIA NIM", exact: true }).count(), 0);
  await page.locator("#run-with-agent").getByRole("button", { name: "Send to Coding Agent" }).click();
  await page.getByRole("menuitem", { name: "Send to Codex" }).waitFor();
  await page.keyboard.press("Escape");
  await page.locator("#repo-files summary").filter({ hasText: /^README.md$/ }).click();
  assert.match(await page.locator("#repo-files details[open] pre").innerText(), /standalone|official runtime/);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download runnable Repo" }).click();
  const download = await downloadPromise;
  const bytes = await readFile(await download.path());
  const archive = await (await page.request.get(`${base}/format-repositories/lego-music-video-v1/downloads/archive.json`)).json();
  assert.equal(createHash("sha256").update(bytes).digest("hex"), archive.sha256);
  await page.locator("#run-with-agent").screenshot({ path: path.join(evidence, "desktop-run.png") });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.locator("#run-with-agent").scrollIntoViewIfNeeded();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Overflow at ${width}px`);
    await page.screenshot({ path: path.join(evidence, `${width}-run.png`) });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${base}/discover#shelf-lego-music-videos`);
  const shelf = page.getByRole("region", { name: "Lego Music Video", exact: true });
  await shelf.getByRole("heading", { name: "Lego Music Video", exact: true }).waitFor();
  assert.equal(await shelf.getByRole("link", { name: "Open Lego Music Video format", exact: true }).count(), 2);
  await shelf.screenshot({ path: path.join(evidence, "discover.png") });
  await page.goto(`${base}/s/lego-music-video-cookies`);
  const video = page.locator("video").first();
  await video.waitFor();
  await video.evaluate(v => v.play());
  await page.waitForFunction(() => document.querySelector("video")?.currentTime > 1);
  const playback = await video.evaluate(v => ({ duration: v.duration, width: v.videoWidth, height: v.videoHeight, currentTime: v.currentTime, error: v.error?.message || null }));
  assert.equal(playback.width, 1080);
  assert.equal(playback.height, 1920);
  assert.equal(playback.error, null);
  const report = { base, archive, playback, desktopAndMobilePassed: true, directAudiovisualCreativeReview: "not performed by this automated check" };
  await writeFile(path.join(evidence, "report.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({ evidence, ...report }));
} finally { await browser.close(); }
