import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  validateScenePlan,
  type OtakuLayoutManifest,
  type OtakuScenePlan,
  type OtakuWorldPack,
} from "../features/experiments/otaku-format/agentRunner";
import {
  evaluateVoiceSignal,
  musicDialogueMarginDb,
  sceneDurationFromAudioMs,
  type AudioSignalReport,
} from "../scripts/otaku-media";

const packageRoot = path.resolve("public", "format-repositories", "otaku-explainer-v1");
const readJson = <T,>(relativePath: string) => (
  JSON.parse(readFileSync(path.join(packageRoot, relativePath), "utf8")) as T
);

assert.equal(sceneDurationFromAudioMs(3_217), 3_217, "The runner must not add silence after a voice clip.");
assert.throws(() => sceneDurationFromAudioMs(0), /positive number/);

const healthyVoice: AudioSignalReport = {
  durationMs: 3_217,
  leadingSilenceMs: 80,
  trailingSilenceMs: 100,
  meanVolumeDb: -21,
  maxVolumeDb: -4,
  tailPeakDb: -24,
  peakCount: 2,
  sampleCount: 80_000,
};
assert.deepEqual(evaluateVoiceSignal(healthyVoice), {
  audible: true,
  edgesAreClean: true,
  endingIsNotAbrupt: true,
  doesNotClip: true,
});
assert.equal(evaluateVoiceSignal({ ...healthyVoice, trailingSilenceMs: 400 }).edgesAreClean, false);
assert.equal(evaluateVoiceSignal({ ...healthyVoice, tailPeakDb: -8 }).endingIsNotAbrupt, false);
assert.equal(evaluateVoiceSignal({
  ...healthyVoice,
  maxVolumeDb: 0,
  peakCount: 500,
}).doesNotClip, false);
assert.ok(musicDialogueMarginDb(
  [healthyVoice],
  { ...healthyVoice, meanVolumeDb: -12 },
  0.1,
) >= 6);
assert.ok(musicDialogueMarginDb(
  [healthyVoice],
  { ...healthyVoice, meanVolumeDb: -12 },
  0.8,
) < 6);

const plan = readJson<OtakuScenePlan>("fixtures/naruto-how-apis-work.json");
const world = readJson<OtakuWorldPack>("worlds/naruto.json");
const layouts = readJson<OtakuLayoutManifest>("layouts.json");
assert.deepEqual(validateScenePlan(plan, world, layouts), []);

console.log("Otaku Format runtime tests passed.");
