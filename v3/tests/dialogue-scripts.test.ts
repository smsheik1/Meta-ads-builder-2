import assert from "node:assert/strict";
import {
  buildDialogueScriptsPrompt,
  buildFallbackDialogueScripts,
  captionsFromDialogueScript,
  cleanDialogueScriptForVoiceover,
  generateDialogueScriptsForScene,
} from "../features/dialogue/dialogueScripts";
import { defaultRenderScene } from "../remotion-entry/fixture";

const prompt = buildDialogueScriptsPrompt(defaultRenderScene, 5);
assert.ok(prompt.includes("BANNED SHAPE"), "Dialogue prompt must ban the infomercial template.");
assert.ok(prompt.includes("REQUIRED SHAPE"), "Dialogue prompt must force a real conversation shape.");
assert.ok(prompt.includes("specificClaims"), "Dialogue prompt must pass receipt claims.");
assert.ok(prompt.includes(defaultRenderScene.creative.selectedProof), "Dialogue prompt must include selected proof.");
assert.ok(prompt.includes("Never mention Wiggly"), "Dialogue prompt must protect the product boundary.");
assert.ok(prompt.includes("FORMAT-SPECIFIC EXAMPLES"), "Dialogue prompt must include visualizer-specific examples.");
assert.ok(prompt.includes("Local service"), "Dialogue prompt must include a local service example.");
assert.ok(prompt.includes("CACHED AD ANGLES"), "Dialogue prompt must consume cached ad angles.");
assert.ok(prompt.includes("a competitor shows up first in a ChatGPT recommendation"), "Dialogue prompt must pass ad angle moments.");
assert.ok(prompt.includes("Every script must use a different adAngle"), "Dialogue prompt must enforce distinct angles.");
assert.ok(prompt.includes("Each script must be exactly 4 lines"), "Dialogue prompt must avoid undefined extra pitch lines.");
assert.ok(prompt.includes("Speakers strictly alternate: Ava, Sam, Ava, Sam"), "Dialogue prompt must force speaker alternation.");
assert.ok(prompt.includes("Tone must be one of"), "Dialogue prompt must constrain TTS tones.");

const fallbackScripts = buildFallbackDialogueScripts(defaultRenderScene, 5);
assert.equal(fallbackScripts.length, 5);
for (const script of fallbackScripts) {
  assert.ok(script.lines.length >= 4, "Fallback scripts must be conversation-length.");
  assert.ok(new Set(script.lines.map((line) => line.speaker)).size >= 2, "Fallback scripts must use two speakers.");
  assert.ok(script.lines.some((line) => line.text.includes(defaultRenderScene.creative.selectedProof)), "Fallback should use the selected proof.");
}

const captions = captionsFromDialogueScript(fallbackScripts[0]!, 9000);
assert.equal(captions.length, fallbackScripts[0]!.lines.length);
assert.equal(captions[0]!.speaker, 1);
assert.equal(captions[1]!.speaker, 2);
assert.equal(captions.at(-1)!.endMs, 9000);
assert.ok(captions.every((caption) => caption.endMs > caption.startMs), "Captions must have valid timing.");

const dirty = cleanDialogueScriptForVoiceover({
  title: "  Test — script ",
  angle: "  One — angle ",
  lines: [
    { speaker: "", tone: "", text: " Hello — there   " },
    { speaker: "Sam", tone: "calm", text: "  Proof.  " },
  ],
});
assert.equal(dirty.title, "Test, script");
assert.equal(dirty.lines[0]!.speaker, "Ava");
assert.equal(dirty.lines[0]!.tone, "skeptical");
assert.equal(dirty.lines[0]!.text, "Hello, there");

const generated = await generateDialogueScriptsForScene(defaultRenderScene, {
  count: 2,
  apiKey: "test-key",
  geminiGenerateContent: async () => JSON.stringify({
    scripts: [
      {
        title: "Rankings",
        angle: "AI visibility proof",
        lines: [
          { speaker: "Ava", tone: "annoyed", text: "Our competitor is showing up in ChatGPT again." },
          { speaker: "Sam", tone: "calm", text: "Yeah, that was the real gap." },
          { speaker: "Ava", tone: "curious", text: "What changed on your side?" },
          { speaker: "Sam", tone: "plain", text: "First ChatGPT mention in 14 days." },
          { speaker: "Ava", tone: "interested", text: "Send me that." },
        ],
      },
    ],
  }),
});

assert.equal(generated.scripts.length, 2, "Gemini scripts should top up with fallback scripts.");
assert.equal(generated.provider, "gemini");
assert.equal(generated.scripts[0]!.lines[0]!.speaker, "Ava");
assert.equal(generated.scripts[0]!.lines.length, 4);
assert.equal(generated.scripts[0]!.lines[0]!.tone, "skeptical");
assert.equal(generated.scripts[0]!.lines[2]!.tone, "skeptical");
assert.equal(generated.scripts[0]!.lines[3]!.tone, "calm");

console.log("dialogue-scripts tests passed");
