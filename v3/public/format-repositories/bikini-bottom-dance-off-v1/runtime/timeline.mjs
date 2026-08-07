export const DURATION = 47;
export const COUNTDOWN_END = 3;
export const FINALE_DURATION = 9;
export const LOOP_BRIDGE_DURATION = 1;

export function buildTimeline(input, dialogueAssets) {
  const dialogueById = new Map(dialogueAssets.map((asset) => [asset.id, asset]));
  const dialogue = [
    dialogueById.get("opening"),
    ...input.characters.slice(1).map((character) => dialogueById.get(`taunt-${character.characterId}`)),
    dialogueById.get("closing"),
  ];
  if (dialogue.some((asset) => !asset || !Number.isFinite(asset.durationSeconds))) {
    throw new Error("Every opening, taunt, and closing voice clip needs a measured duration.");
  }
  const speechDuration = dialogue.reduce((total, asset) => total + asset.durationSeconds, 0);
  const danceDuration = (DURATION - COUNTDOWN_END - FINALE_DURATION - LOOP_BRIDGE_DURATION - speechDuration) / input.characters.length;
  if (danceDuration < 5) {
    throw new Error(`Dialogue is too long for a ${DURATION}-second dance-off (${speechDuration.toFixed(3)}s of speech leaves ${danceDuration.toFixed(3)}s per solo).`);
  }

  const events = [{ type: "countdown", id: "countdown", start: 0, end: COUNTDOWN_END, song: false }];
  const rounds = [];
  let cursor = COUNTDOWN_END;
  input.characters.forEach((character, index) => {
    const voice = index === 0 ? dialogueById.get("opening") : dialogueById.get(`taunt-${character.characterId}`);
    const speechType = index === 0 ? "opening" : "taunt";
    const speechStart = cursor;
    cursor += voice.durationSeconds;
    events.push({ type: speechType, id: voice.id, characterId: character.characterId, start: speechStart, end: cursor, song: false });
    const danceStart = cursor;
    cursor += danceDuration;
    events.push({ type: "dance", id: `dance-${character.characterId}`, characterId: character.characterId, start: danceStart, end: cursor, song: true });
    rounds.push({ roundStart: speechStart, roundEnd: cursor, speechStart, speechEnd: danceStart, danceStart, danceEnd: cursor });
  });
  const finaleStart = cursor;
  cursor += FINALE_DURATION;
  events.push({ type: "finale", id: "all-character-finale", start: finaleStart, end: cursor, song: true });
  const closing = dialogueById.get("closing");
  const closingStart = cursor;
  cursor += closing.durationSeconds;
  events.push({ type: "closing", id: closing.id, characterId: input.characters.at(-1).characterId, start: closingStart, end: cursor, song: false });
  const loopBridgeStart = cursor;
  cursor += LOOP_BRIDGE_DURATION;
  events.push({ type: "loop-bridge", id: "round-two-loop-bridge", start: loopBridgeStart, end: cursor, song: false });
  const closingDelta = Math.abs(DURATION - cursor);
  if (closingDelta > 0.02) throw new Error(`Timeline math drifted by ${closingDelta.toFixed(3)}s.`);

  return {
    durationSeconds: DURATION,
    danceDuration,
    rounds,
    finale: { start: finaleStart, end: finaleStart + FINALE_DURATION },
    loopBridge: { start: loopBridgeStart, end: DURATION },
    events,
  };
}
