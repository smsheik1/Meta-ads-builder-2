import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  validateScenePlan,
  type OtakuLayoutManifest,
  type OtakuScenePlan,
  type OtakuWorldPack,
} from "../features/experiments/otaku-format/agentRunner";
import { sceneDurationFromAudioMs } from "../scripts/otaku-media";

const packageRoot = path.resolve("public", "format-repositories", "otaku-explainer-v1");
const readJson = <T,>(relativePath: string) => (
  JSON.parse(readFileSync(path.join(packageRoot, relativePath), "utf8")) as T
);

assert.equal(sceneDurationFromAudioMs(3_217), 3_217, "The runner must not add silence after a voice clip.");
assert.throws(() => sceneDurationFromAudioMs(0), /positive number/);

const plan = readJson<OtakuScenePlan>("fixtures/naruto-how-apis-work.json");
const world = readJson<OtakuWorldPack>("worlds/naruto.json");
const layouts = readJson<OtakuLayoutManifest>("layouts.json");
assert.deepEqual(validateScenePlan(plan, world, layouts), []);

console.log("Otaku Format runtime tests passed.");
