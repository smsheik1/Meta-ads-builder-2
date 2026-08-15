import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  choreographySelectionSignature,
  createChoreographySeed,
  eligibleMotions,
  selectChoreography,
} from "../runtime/choreography.mjs";

const root = new URL("../", import.meta.url);
const motionRoot = new URL("../../mixamo-character-motion-v1/", import.meta.url);
const readJson = async (file, base = root) => JSON.parse(await readFile(new URL(file, base), "utf8"));
const characters = ["spongebob", "patrick", "mr-krabs", "squilliam"].map((characterId) => ({ characterId }));

test("every bundled starter motion is solo-eligible for every motion-ready character", async () => {
  const [manifest, exclusionConfig] = await Promise.all([
    readJson("assets/motions/manifest.json", motionRoot),
    readJson("assets/motion-exclusions.json"),
  ]);
  assert.equal(manifest.motions.length, 25);
  assert.deepEqual(exclusionConfig.exclusions, []);
  for (const character of characters) {
    assert.deepEqual(
      eligibleMotions({
        motions: manifest.motions,
        exclusions: exclusionConfig.exclusions,
        characterId: character.characterId,
        role: "solo",
      }).map((motion) => motion.id).sort(),
      manifest.motions.map((motion) => motion.id).sort(),
    );
  }
});

test("seeded choreography is reproducible, distinct, long enough, and cools recent role usage", async () => {
  const manifest = await readJson("assets/motions/manifest.json", motionRoot);
  const recentRuns = [
    {
      runId: "newest-run",
      selections: characters.map((character, index) => ({
        characterId: character.characterId,
        solo: manifest.motions[index].id,
        finale: manifest.motions.filter((motion) => motion.durationSeconds >= 9)[index].id,
        reaction: manifest.motions[index + 4].id,
      })),
    },
    {
      runId: "older-run",
      selections: characters.map((character, index) => ({
        characterId: character.characterId,
        solo: manifest.motions[index + 8].id,
        finale: manifest.motions.filter((motion) => motion.durationSeconds >= 9)[index + 4].id,
        reaction: manifest.motions[index + 12].id,
      })),
    },
  ];
  const seed = createChoreographySeed({
    formatVersion: "test",
    runId: "test-run",
    songSha256: "a".repeat(64),
    characterIds: characters.map((character) => character.characterId),
  });
  const first = selectChoreography({
    characters,
    motions: manifest.motions,
    recentRuns,
    seedUint32: seed.seedUint32,
  });
  const second = selectChoreography({
    characters,
    motions: manifest.motions,
    recentRuns,
    seedUint32: seed.seedUint32,
  });
  assert.deepEqual(second, first);
  assert.deepEqual(first.cooldownRunIds, ["newest-run", "older-run"]);
  assert.deepEqual(first.relaxations, []);

  const allCurrentIds = first.selections.flatMap(({ solo, finale, reaction }) => [solo, finale, reaction]);
  assert.equal(new Set(allCurrentIds).size, 12);
  for (const role of ["solo", "finale", "reaction"]) {
    assert.equal(new Set(first.selections.map((selection) => selection[role])).size, 4);
    const recentForRole = new Set(recentRuns.flatMap((run) => run.selections.map((selection) => selection[role])));
    assert.ok(first.selections.every((selection) => !recentForRole.has(selection[role])));
  }
  const byId = new Map(manifest.motions.map((motion) => [motion.id, motion]));
  assert.ok(first.selections.every((selection) => byId.get(selection.finale).durationSeconds >= 9));
  assert.match(choreographySelectionSignature(first.selections), /^[0-9a-f]{64}$/);
});

test("cooldown relaxation drops the oldest run first when the eligible pool is tight", () => {
  const motions = Array.from({ length: 12 }, (_, index) => ({
    id: `motion-${index + 1}`,
    durationSeconds: 10,
  }));
  const recentRuns = [
    { runId: "newest", selections: [{ solo: "motion-1", finale: "motion-1", reaction: "motion-1" }] },
    { runId: "oldest", selections: [{ solo: "motion-2", finale: "motion-2", reaction: "motion-2" }] },
  ];
  const result = selectChoreography({ characters, motions, recentRuns, seedUint32: 42 });
  assert.ok(result.relaxations.length > 0);
  assert.ok(result.relaxations.every((relaxation) => relaxation.relaxedRunIds[0] === "oldest"));
  assert.equal(new Set(result.selections.flatMap(({ solo, finale, reaction }) => [solo, finale, reaction])).size, 12);
});
