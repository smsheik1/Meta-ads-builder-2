import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { chromium } from "playwright";
import {
  discoveryFormatSlugs,
  getDiscoveryFormatProfile,
} from "../features/discovery/formatProof.server";
import { richFormatRepoSlugs } from "../features/discovery/formatRepoPage.server";

const baseUrl = process.env.REPO_SMOKE_BASE_URL || "http://localhost:3020";
const screenshots = mkdtempSync(path.join(tmpdir(), "wiggly-repo-pages-"));
console.log(`Screenshots: ${screenshots}`);
const browser = await chromium.launch({
  headless: true,
  channel: process.env.PLAYWRIGHT_CHANNEL,
});
const specialized = new Set<string>(richFormatRepoSlugs);
try {
  const pending = [...discoveryFormatSlugs];
  let checked = 0;
  await Promise.all(
    Array.from({ length: 3 }, async () => {
      const page = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
      });
      // Media playback is checked interactively; avoid downloading every example in this coverage sweep.
      await page.route(/\.(mp4|mp3|wav|glb)(\?.*)?$/i, (route) =>
        route.abort(),
      );
      for (let slug = pending.shift(); slug; slug = pending.shift()) {
        const format = getDiscoveryFormatProfile(slug)!;
        const response = await page.goto(`${baseUrl}/formats/${slug}`, {
          waitUntil: "domcontentloaded",
        });
        assert.equal(response?.status(), 200, `${slug}: page must load.`);
        await page.locator("#included-assets").waitFor();
        for (const selector of [
          "#accounts-youll-connect",
          "#included-assets",
          "#examples",
          "#run-with-agent",
          ...(specialized.has(slug)
            ? ["#how-it-works", '[id$="-quality"]', '[id$="-repo"]']
            : ["#workflow", "#proof-quality", "#repo-files"]),
        ]) {
          assert.equal(
            await page.locator(selector).count(),
            1,
            `${slug}: missing or duplicate ${selector}`,
          );
        }
        if (format.repositoryHref) {
          assert.ok(
            await page
              .locator(`a[download][href="${format.repositoryHref}"]`)
              .count(),
            `${slug}: missing download control`,
          );
          const archive = await page.request.head(
            `${baseUrl}${format.repositoryHref}`,
          );
          assert.equal(
            archive.status(),
            200,
            `${slug}: download must be served.`,
          );
        }
        const dimensions = await page.evaluate(() => ({
          width: innerWidth,
          content: document.documentElement.scrollWidth,
        }));
        assert.ok(
          dimensions.content <= dimensions.width + 1,
          `${slug}: desktop horizontal overflow`,
        );
        if (++checked % 10 === 0)
          console.log(
            `${checked}/${discoveryFormatSlugs.length} live routes checked`,
          );
      }
      await page.close();
    }),
  );
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  for (const slug of [
    "three-d-breakdown",
    "passport-click",
    "jingle",
    "newsletter-writer",
    "otaku-explainer",
  ]) {
    await page.goto(`${baseUrl}/formats/${slug}`, {
      waitUntil: "domcontentloaded",
    });
    await page
      .locator("#accounts-youll-connect")
      .screenshot({ path: path.join(screenshots, `${slug}-services.png`) });
    await page
      .locator("#included-assets")
      .screenshot({ path: path.join(screenshots, `${slug}-assets.png`) });
    await page
      .locator("#repo-files summary")
      .filter({ hasText: /^README.md$/ })
      .click();
    assert.ok(await page.locator("#repo-files details[open] pre").innerText());
    await page
      .locator("#run-with-agent")
      .screenshot({ path: path.join(screenshots, `${slug}-run.png`) });
    await page
      .locator("#run-with-agent")
      .getByRole("button", { name: "Send to Coding Agent" })
      .click();
    await page.getByRole("menuitem", { name: "Send to Codex" }).waitFor();
    await page.keyboard.press("Escape");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator("#accounts-youll-connect").scrollIntoViewIfNeeded();
    const dimensions = await page.evaluate(() => ({
      width: innerWidth,
      content: document.documentElement.scrollWidth,
    }));
    assert.ok(
      dimensions.content <= dimensions.width + 1,
      `${slug}: mobile horizontal overflow`,
    );
    await page.screenshot({
      path: path.join(screenshots, `${slug}-mobile.png`),
    });
    await page.setViewportSize({ width: 1440, height: 1000 });
  }
  console.log(
    `PASS: all ${discoveryFormatSlugs.length} routes, package downloads, and representative desktop/mobile controls. Screenshots: ${screenshots}`,
  );
} finally {
  await browser.close();
}
