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
assert.ok(prompt.includes("Local service"), "Dialogue prompt must include a local service example.");
assert.ok(prompt.includes("CACHED AD ANGLES"), "Dialogue prompt must consume cached ad angles.");
assert.ok(prompt.includes("a competitor shows up first in a ChatGPT recommendation"), "Dialogue prompt must pass ad angle moments.");
assert.ok(prompt.includes("Every script must use a different adAngle"), "Dialogue prompt must enforce distinct angles.");
assert.ok(prompt.includes("Each script must be exactly 6 lines"), "Dialogue prompt must define the full audio script length.");
assert.ok(prompt.includes("Speakers strictly alternate: Ava, Sam, Ava, Sam, Ava, Sam"), "Dialogue prompt must force speaker alternation.");
assert.ok(prompt.includes("Tone must be one of"), "Dialogue prompt must constrain TTS tones.");
assert.ok(prompt.includes("The CTA must come from A asking"), "Dialogue prompt must make CTA pull-based.");
assert.ok(prompt.includes(defaultRenderScene.creative.ctaText), "Dialogue prompt must pass the CTA into ending guidance.");
assert.ok(prompt.includes("plays on mute first"), "Dialogue prompt must account for muted social playback.");
assert.ok(!/\((?:tired|practical|annoyed|plain|focused|warm|rushed)\):/.test(prompt), "Dialogue example tones must stay in the allowed enum.");
assert.ok(prompt.includes("The dishwasher died at 8pm"), "Local-service example should stay away from dental phones.");
assert.ok(prompt.includes("Inventory said twelve left"), "Operator example should stay away from AI-visibility framing.");

const fallbackScripts = buildFallbackDialogueScripts(defaultRenderScene, 5);
assert.equal(fallbackScripts.length, 5);
for (const script of fallbackScripts) {
  assert.equal(script.lines.length, 6, "Fallback scripts must match the dialogue contract.");
  assert.deepEqual(script.lines.map((line) => line.speaker), ["Ava", "Sam", "Ava", "Sam", "Ava", "Sam"]);
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
    { speaker: "Wrong", tone: "", text: " Hello — there   " },
    { speaker: "Wrong", tone: "calm", text: "  Proof.  " },
  ],
});
assert.equal(dirty.title, "Test, script");
assert.equal(dirty.lines[0]!.speaker, "Ava");
assert.equal(dirty.lines[1]!.speaker, "Sam");
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
          { speaker: "Sam", tone: "casual", text: "See the proof." },
          { speaker: "Ava", tone: "relieved", text: "Extra line should be trimmed." },
        ],
      },
    ],
  }),
});

assert.equal(generated.scripts.length, 2, "Gemini scripts should top up with fallback scripts.");
assert.equal(generated.provider, "gemini");
assert.equal(generated.scripts[0]!.lines[0]!.speaker, "Ava");
assert.equal(generated.scripts[0]!.lines.length, 6);
assert.deepEqual(generated.scripts[0]!.lines.map((line) => line.speaker), ["Ava", "Sam", "Ava", "Sam", "Ava", "Sam"]);
assert.equal(generated.scripts[0]!.lines[0]!.tone, "skeptical");
assert.equal(generated.scripts[0]!.lines[2]!.tone, "skeptical");
assert.equal(generated.scripts[0]!.lines[3]!.tone, "calm");

console.log("dialogue-scripts tests passed");
