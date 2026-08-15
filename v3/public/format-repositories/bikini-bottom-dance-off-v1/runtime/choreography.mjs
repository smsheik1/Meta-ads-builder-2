import { createHash } from "node:crypto";

export const CHOREOGRAPHY_ALGORITHM_VERSION = "1.0.0";
export const RECENT_RUN_COOLDOWN = 2;

const ROLE_ORDER = ["finale", "solo", "reaction"];

function mulberry32(seed) {
  return function random() {
    let value = seed += 0x6d2b79f5;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

function shuffled(values, random) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function exclusionApplies(exclusion, characterId, motionId, role) {
  return exclusion.characterId === characterId
    && exclusion.motionId === motionId
    && (exclusion.roles || []).includes(role);
}

export function eligibleMotions({ motions, exclusions = [], characterId, role }) {
  return motions.filter((motion) => (
    (role !== "finale" || motion.durationSeconds >= 9)
    && !exclusions.some((exclusion) => exclusionApplies(
      exclusion,
      characterId,
      motion.id,
      role,
    ))
  ));
}

export function createChoreographySeed({
  formatVersion,
  runId,
  songSha256,
  characterIds,
  explicitSeed,
}) {
  const seedMaterial = explicitSeed
    ? `operator:${explicitSeed}`
    : [
      "wiggly-bikini-bottom-dance-off",
      `algorithm:${CHOREOGRAPHY_ALGORITHM_VERSION}`,
      `format:${formatVersion}`,
      `run:${runId}`,
      `song:${songSha256}`,
      `characters:${characterIds.join(",")}`,
    ].join("|");
  const seedSha256 = createHash("sha256").update(seedMaterial).digest("hex");
  return {
    seedMaterial,
    seedSha256,
    seedUint32: Number.parseInt(seedSha256.slice(0, 8), 16) >>> 0,
  };
}

function solveUniqueAssignments(characters, candidateIdsByCharacter, index = 0, used = new Set(), result = new Map()) {
  if (index === characters.length) return result;
  const characterId = characters[index].characterId;
  for (const motionId of candidateIdsByCharacter.get(characterId) || []) {
    if (used.has(motionId)) continue;
    used.add(motionId);
    result.set(characterId, motionId);
    const solved = solveUniqueAssignments(characters, candidateIdsByCharacter, index + 1, used, result);
    if (solved) return solved;
    result.delete(characterId);
    used.delete(motionId);
  }
  return null;
}

function assignRole({
  role,
  characters,
  motions,
  exclusions,
  recentRuns,
  usedInRun,
  random,
}) {
  let activeCooldown = recentRuns.slice(0, RECENT_RUN_COOLDOWN);
  const relaxedRunIds = [];

  while (true) {
    const cooledMotionIds = new Set(activeCooldown.flatMap((run) => (
      (run.selections || []).map((selection) => selection[role]).filter(Boolean)
    )));
    const candidateIdsByCharacter = new Map(characters.map((character) => [
      character.characterId,
      shuffled(eligibleMotions({
        motions,
        exclusions,
        characterId: character.characterId,
        role,
      }).map((motion) => motion.id).filter((motionId) => (
        !cooledMotionIds.has(motionId) && !usedInRun.has(motionId)
      )), random),
    ]));
    const assignments = solveUniqueAssignments(characters, candidateIdsByCharacter);
    if (assignments) return { assignments, relaxedRunIds };
    if (!activeCooldown.length) {
      throw new Error(`Not enough compatible ${role} motions to give all four characters distinct choreography.`);
    }
    const relaxed = activeCooldown.at(-1);
    relaxedRunIds.push(relaxed.runId);
    activeCooldown = activeCooldown.slice(0, -1);
  }
}

export function selectChoreography({
  characters,
  motions,
  exclusions = [],
  recentRuns = [],
  seedUint32,
}) {
  if (characters.length !== 4) throw new Error("Choreography selection requires exactly four characters.");
  const random = mulberry32(seedUint32);
  const usedInRun = new Set();
  const byCharacter = new Map(characters.map((character) => [character.characterId, {}]));
  const relaxations = [];

  for (const role of ROLE_ORDER) {
    const result = assignRole({
      role,
      characters,
      motions,
      exclusions,
      recentRuns,
      usedInRun,
      random,
    });
    for (const [characterId, motionId] of result.assignments) {
      byCharacter.get(characterId)[role] = motionId;
      usedInRun.add(motionId);
    }
    if (result.relaxedRunIds.length) {
      relaxations.push({ role, relaxedRunIds: result.relaxedRunIds });
    }
  }

  return {
    algorithmVersion: CHOREOGRAPHY_ALGORITHM_VERSION,
    cooldownRunIds: recentRuns.slice(0, RECENT_RUN_COOLDOWN).map((run) => run.runId),
    relaxations,
    selections: characters.map((character) => ({
      characterId: character.characterId,
      ...byCharacter.get(character.characterId),
    })),
  };
}

export function choreographySelectionSignature(selections) {
  return createHash("sha256").update(JSON.stringify(selections.map((selection) => ({
    characterId: selection.characterId,
    solo: selection.solo,
    finale: selection.finale,
    reaction: selection.reaction,
  })))).digest("hex");
}
