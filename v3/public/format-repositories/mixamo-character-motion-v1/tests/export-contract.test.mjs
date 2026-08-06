import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { ExportInputError, renderDownload } from "../runtime/export.mjs";

test("download export rejects invalid selections before rendering", async () => {
  await assert.rejects(
    renderDownload({ characterId: "squilliam", motionId: "not-a-motion", format: "mp4" }),
    ExportInputError,
  );
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
