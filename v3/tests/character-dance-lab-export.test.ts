import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { POST } from "../app/api/format-lab/character-dance-lab/export/route";

const repository = "public/format-repositories/mixamo-character-motion-v1";
const renderer = readFileSync(`${repository}/runtime/renderer/app.js`, "utf8");
const html = readFileSync(`${repository}/runtime/renderer/index.html`, "utf8");

assert.equal(existsSync(`${repository}/runtime/export.mjs`), true);
assert.match(renderer, /characterId, motionId, format/);
assert.match(renderer, /\/api\/format-lab\/character-dance-lab\/export/);
assert.match(html, /Download ↑/);
assert.match(html, /MP4 video/);
assert.match(html, /Looping GIF/);
assert.match(html, /body\.lab \.title \{ left: 0; right: 0; bottom: 180px/);

const invalid = await POST(new Request("http://localhost/api/format-lab/character-dance-lab/export", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ characterId: "squilliam", motionId: "rumba-dancing", format: "webm" }),
}));
assert.equal(invalid.status, 400);
assert.deepEqual(await invalid.json(), { error: "Choose a valid character, motion, and download format." });

console.log("Character Dance Lab export tests passed.");
