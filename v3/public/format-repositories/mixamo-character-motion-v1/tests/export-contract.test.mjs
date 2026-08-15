import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { ExportInputError, renderDownload } from "../runtime/export.mjs";

test("download export rejects invalid selections before rendering", async () => {
  await assert.rejects(
    renderDownload({ characterId: "squilliam", motionId: "not-a-motion", format: "mp4" }),
    ExportInputError,
  );
  await assert.rejects(
    renderDownload({ characterId: "squilliam", motionId: "hip-hop-dancing", format: "mp4", backgroundPreset: "unknown" }),
    ExportInputError,
  );
});

test("the official renderer exposes the Talking Fish News background preset", async () => {
  const [html, app] = await Promise.all([
    readFile(new URL("../runtime/renderer/index.html", import.meta.url), "utf8"),
    readFile(new URL("../runtime/renderer/app.js", import.meta.url), "utf8"),
  ]);
  assert.match(html, /data-background-preset="talking-fish-news"/);
  assert.match(app, /input\.backgroundPreset === "talking-fish-news"/);
});

test("the Fish News preset packages the exact underwater studio art", async () => {
  const [html, app, background] = await Promise.all([
    readFile(new URL("../runtime/renderer/index.html", import.meta.url), "utf8"),
    readFile(new URL("../runtime/renderer/app.js", import.meta.url), "utf8"),
    readFile(new URL("../assets/backgrounds/fish-news-underwater-studio.png", import.meta.url)),
  ]);
  assert.match(html, /data-background-preset="fish-news"/);
  assert.match(html, /url\("\.\.\/\.\.\/assets\/backgrounds\/fish-news-underwater-studio\.png"\)/);
  assert.match(app, /input\.backgroundPreset === "fish-news"/);
  assert.equal(createHash("sha256").update(background).digest("hex"), "3e8e56268cb35ef92d5cd582e603d558aa0c5c92cddc6177e101251ddd3569ab");
  assert.equal(background.readUInt32BE(16), 1200);
  assert.equal(background.readUInt32BE(20), 675);
});

test("the lab exposes one visible MP4/GIF drop-up through the official export endpoint", async () => {
  const [html, app] = await Promise.all([
    readFile(new URL("../runtime/renderer/index.html", import.meta.url), "utf8"),
    readFile(new URL("../runtime/renderer/app.js", import.meta.url), "utf8"),
  ]);
  assert.match(html, /id="download-toggle"/);
  assert.match(html, /data-export-format="mp4"/);
  assert.match(html, /data-export-format="gif"/);
  assert.match(app, /\/api\/format-lab\/character-dance-lab\/export/);
  assert.doesNotMatch(app, /MediaRecorder|captureStream/);
});

test("the interactive renderer owns a recoverable atomic selection lifecycle", async () => {
  const app = await readFile(new URL("../runtime/renderer/app.js", import.meta.url), "utf8");
  assert.match(app, /preserveDrawingBuffer:\s*!labMode/);
  assert.match(app, /selectionState\.generation/);
  assert.match(app, /generation !== selectionState\.generation/);
  assert.match(app, /webglcontextlost/);
  assert.match(app, /webglcontextrestored/);
  assert.match(app, /Math\.max\(0, now - state\.startedAt\)/);
  assert.match(app, /finally\s*{\s*requestAnimationFrame\(animate\)/);
});

test("completed frame exports cannot hang on browser or static-server teardown", async () => {
  const render = await readFile(new URL("../runtime/render.mjs", import.meta.url), "utf8");
  assert.match(render, /finishWithin\(\(\) => browser\.close\(\), "Headless browser"\)/);
  assert.match(render, /server\.closeIdleConnections\?\.\(\)/);
  assert.match(render, /server\.closeAllConnections\?\.\(\)/);
  assert.ok(
    render.indexOf("await closeStaticServer(server)") <
      render.indexOf('await execute("ffmpeg"'),
    "renderer teardown must finish before ffmpeg encoding begins",
  );
  assert.ok(
    render.indexOf("process.stdout.write") < render.indexOf("process.exit(0)"),
    "the successful CLI renderer must flush its receipt before forcing retained Playwright handles closed",
  );
});
