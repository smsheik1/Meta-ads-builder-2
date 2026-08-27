const CHERRY_SYMBOLS = new Set("ABCDEFGHIJKX".split(""));

// The rig contains ten authored mouth drawings, but five cover the useful
// speech silhouettes without importing expression-specific frowns or side mouths.
const SHAZ_FIVE_MOUTH_V1 = Object.freeze({
  A: "1", // closed: M/B/P
  B: "4", // teeth: D/K/T
  C: "5", // small/medium open: EH
  D: "2", // wide open: AH
  E: "3", // rounded: OH
  F: "3", // rounded: W/OO
  G: "4", // teeth: F/V
  H: "5", // open: L
  I: "4", // teeth: EE
  J: "4", // teeth: CH/J/SH
  K: "3", // rounded: R
  X: "1", // rest
});

function parseCherryTsv(text, { fps = 24, totalFrames }) {
  if (!Number.isInteger(fps) || fps < 1 || fps > 120) {
    throw new Error("lipSync fps must be an integer from 1 to 120");
  }
  if (!Number.isInteger(totalFrames) || totalFrames < 1) {
    throw new Error("lipSync totalFrames must be a positive integer");
  }
  if (typeof text !== "string" || text.trim().length === 0) {
    throw new Error("Cherry cue file is empty");
  }
  const cues = [];
  for (const [index, sourceLine] of text.split(/\r?\n/).entries()) {
    const line = sourceLine.trim();
    if (!line) continue;
    const match = line.match(/^([0-9]+(?:\.[0-9]+)?)\s+([A-KX])$/);
    if (!match) throw new Error(`invalid Cherry cue at line ${index + 1}`);
    const timeSeconds = Number(match[1]);
    const symbol = match[2];
    if (!Number.isFinite(timeSeconds) || timeSeconds < 0) {
      throw new Error(`invalid Cherry timestamp at line ${index + 1}`);
    }
    if (!CHERRY_SYMBOLS.has(symbol)) {
      throw new Error(`unsupported Cherry symbol ${symbol} at line ${index + 1}`);
    }
    if (cues.length > 0 && timeSeconds <= cues.at(-1).timeSeconds) {
      throw new Error(`Cherry timestamps must increase at line ${index + 1}`);
    }
    cues.push({ timeSeconds, symbol, mouthDrawing: SHAZ_FIVE_MOUTH_V1[symbol] });
  }
  if (cues.length === 0 || cues[0].timeSeconds !== 0) {
    throw new Error("Cherry cues must begin at 0.000 seconds");
  }
  const durationSeconds = totalFrames / fps;
  // Cherry may emit a terminal cue exactly on the rounded output boundary.
  // That cue owns no rendered frame, so it is valid; anything later is not.
  if (cues.at(-1).timeSeconds > durationSeconds + 1e-9) {
    throw new Error("Cherry cues extend beyond the output duration");
  }

  const frameDrawings = [];
  const frameSymbols = [];
  let cueIndex = 0;
  for (let frame = 0; frame < totalFrames; frame += 1) {
    const timeSeconds = frame / fps;
    while (cueIndex + 1 < cues.length && cues[cueIndex + 1].timeSeconds <= timeSeconds + 1e-9) {
      cueIndex += 1;
    }
    frameDrawings.push(cues[cueIndex].mouthDrawing);
    frameSymbols.push(cues[cueIndex].symbol);
  }
  // End every reusable block on the canonical resting mouth. This changes only
  // the final video frame and prevents an open-mouth freeze at the cut.
  frameDrawings[totalFrames - 1] = SHAZ_FIVE_MOUTH_V1.X;
  frameSymbols[totalFrames - 1] = "X";

  const histogram = {};
  for (const drawing of frameDrawings) histogram[drawing] = (histogram[drawing] ?? 0) + 1;
  return {
    cues,
    frameDrawings,
    frameSymbols,
    histogram,
    mappingId: "shaz-five-mouth-v1",
    mapping: SHAZ_FIVE_MOUTH_V1,
    forcedFinalRestFrame: true,
  };
}

export { CHERRY_SYMBOLS, SHAZ_FIVE_MOUTH_V1, parseCherryTsv };
