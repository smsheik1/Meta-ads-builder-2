import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { captionsFromDialogueScript } from "../features/dialogue/dialogueScripts";
import {
  createVisualizerSceneFromRun,
  estimateVisualizerVoiceCost,
  getSelectedVisualizerDialogue,
  validateVisualizerDialogueOptions,
  validateVisualizerResearch,
  VISUALIZER_DIALOGUE_COUNT,
  VISUALIZER_LINES_PER_DIALOGUE,
  VISUALIZER_TTS_MODEL,
  type VisualizerDialogueOptions,
  type VisualizerDialogueSelection,
  type VisualizerResearch,
} from "../features/formats/visualizer/repoRuntime";
import { validateVisualizerScene } from "../features/formats/visualizer/validate";

const packageRoot = path.resolve("public", "format-repositories", "visualizer-v1");
const fixture = <T,>(name: string) => JSON.parse(
  readFileSync(path.join(packageRoot, "fixtures", name), "utf8"),
) as T;
type Fixture = {
  research: VisualizerResearch;
  dialogueOptions: VisualizerDialogueOptions;
  selection: VisualizerDialogueSelection;
};

for (const name of ["davids-cookies.json", "saas-call-recovery.json"]) {
  const current = fixture<Fixture>(name);
  assert.deepEqual(validateVisualizerResearch(current.research), [], `${name} research should be valid.`);
  assert.deepEqual(
    validateVisualizerDialogueOptions(current.dialogueOptions, current.selection),
    [],
    `${name} dialogue should be valid.`,
  );
  assert.equal(current.dialogueOptions.scripts.length, VISUALIZER_DIALOGUE_COUNT);
  assert.ok(current.dialogueOptions.scripts.every((script) => script.lines.length === VISUALIZER_LINES_PER_DIALOGUE));
}

const davids = fixture<Fixture>("davids-cookies.json");
const selected = getSelectedVisualizerDialogue(davids.dialogueOptions, davids.selection);
const captions = captionsFromDialogueScript(selected, 27_000);
assert.equal(captions.length, VISUALIZER_LINES_PER_DIALOGUE);
assert.deepEqual(captions.map((caption) => caption.text), selected.lines.map((line) => line.text));
assert.deepEqual(captions.map((caption) => caption.speaker), [1, 2, 1, 2, 1, 2]);

const scene = createVisualizerSceneFromRun({
  research: davids.research,
  runId: "davids-proof",
  audio: {
    path: "format-repositories/visualizer-v1/agent-runs/davids-proof/dialogue.wav",
    publicUrl: "/format-repositories/visualizer-v1/agent-runs/davids-proof/dialogue.wav",
    mimeType: "audio/wav",
    durationMs: 27_000,
    transcript: selected.lines.map((line) => `${line.speaker}: ${line.text}`).join("\n"),
    captions,
    analysis: {
      fps: 2,
      levels: [0.1, 0.8, 0.3, 0.6],
      bands: [
        [0.1, 0.2],
        [0.8, 0.6],
        [0.3, 0.4],
        [0.6, 0.5],
      ],
    },
    provider: "upload",
    model: "fixture",
  },
});
assert.equal(scene.format, "visualizer");
assert.equal(scene.audio.status, "generated");
assert.equal(scene.audio.status === "generated" ? scene.audio.captions.length : 0, 6);
assert.equal(validateVisualizerScene(scene).valid, true);
assert.equal(scene.style.visualizer?.type, "waveform-strip");

assert.equal(VISUALIZER_TTS_MODEL, "gemini-3.1-flash-tts-preview");
assert.equal(estimateVisualizerVoiceCost(20), 0.01);
assert.equal(estimateVisualizerVoiceCost(30), 0.015);

const invalidOptions: VisualizerDialogueOptions = {
  scripts: davids.dialogueOptions.scripts.slice(0, 4),
};
assert.match(
  validateVisualizerDialogueOptions(invalidOptions, davids.selection).join(" "),
  /exactly 5 scripts/,
);

const invalidSpeakerOptions: VisualizerDialogueOptions = {
  scripts: davids.dialogueOptions.scripts.map((script, scriptIndex) => (
    scriptIndex === 0
      ? {
        ...script,
        lines: script.lines.map((line, lineIndex) => (
          lineIndex === 0 ? { ...line, speaker: "Sam" } : line
        )),
      }
      : script
  )),
};
assert.match(
  validateVisualizerDialogueOptions(invalidSpeakerOptions, davids.selection).join(" "),
  /line 1 must use Ava/,
);

const requiredFiles = [
  ".env.example",
  "README.md",
  "SKILL.md",
  "format.json",
  "inputs.json",
  "pipeline.json",
  "quality.json",
  "requirements.json",
  "goldens.json",
  "prompts/research.md",
  "prompts/dialogue.md",
  "prompts/selection.md",
  "fixtures/davids-cookies.json",
  "fixtures/davids-dialogue.wav",
  "fixtures/saas-call-recovery.json",
  "goldens/davids-cookies.mp4",
].map((name) => path.join(packageRoot, name));
assert.deepEqual(requiredFiles.filter((file) => !existsSync(file)), []);

const runner = readFileSync("scripts/visualizer-format.ts", "utf8");
const approvalCheckIndex = runner.indexOf('if (!hasFlag("approve-voice"))');
const providerCallIndex = runner.indexOf("generateGeminiDialogueVoiceover(selected)");
assert.ok(approvalCheckIndex >= 0 && providerCallIndex > approvalCheckIndex);
assert.match(runner, /One approved Gemini voice call completed\. No retry was attempted\./);
assert.doesNotMatch(runner, /replicate\.com|api\.replicate|from ["']replicate/i);

const skill = readFileSync(path.join(packageRoot, "SKILL.md"), "utf8");
assert.match(skill, /What website is this conversation ad for\?/);
assert.match(skill, /Research -> Dialogue -> Voice -> Render -> Deliver/);
assert.match(skill, /Ready to make the two voices\?/);
assert.match(skill, /Never retry automatically/);
assert.match(skill, /Never call Replicate/);

console.log("visualizer agent runner tests passed");
