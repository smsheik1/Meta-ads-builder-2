import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { renderDownload } from "../../mixamo-character-motion-v1/runtime/export.mjs";
import { resolveOuterBackground } from "./backgrounds.mjs";
import { CAPTION_HEIGHT, CAPTION_Y, CELL_HEIGHT, CELL_POSITIONS, CELL_WIDTH } from "./layout.mjs";
import { buildTimeline, DURATION } from "./timeline.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const IDLE_SPEED = 0.36;
const RIGHT_COLUMN_SAFE_SHIFT = 76;
const CHARACTER_BACKGROUND_PRESET = "fish-news";

function characterClipName(character, motionId, suffix = "") {
  return `${character.characterId}-${motionId}-${CHARACTER_BACKGROUND_PRESET}${suffix}.mp4`;
}

function execute(program, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(program, args, { cwd: root, stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve() : reject(new Error(`${program} exited ${code}`)));
  });
}

function xml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function graphicSvg(content) {
  return Buffer.from(`<svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg">
    <style>
      .display { font-family: "Arial Black", "Arial", sans-serif; font-weight: 900; text-anchor: middle; paint-order: stroke fill; }
      .label { font-family: "Arial Black", "Arial", sans-serif; font-weight: 900; paint-order: stroke fill; }
    </style>
    ${content}
  </svg>`);
}

function centeredText({ value, x = 540, y, size, fill = "white", stroke = "#020b13", strokeWidth = 4 }) {
  return `<text class="display" x="${x}" y="${y}" font-size="${size}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}">${xml(value)}</text>`;
}

function countdownGraphic(number) {
  return [
    '<rect x="0" y="0" width="1080" height="1920" fill="#02050a" fill-opacity="0.68"/>',
    centeredText({ value: "BIKINI BOTTOM DANCE OFF", y: 640, size: 48, fill: "#59dece", strokeWidth: 4 }),
    centeredText({ value: number, y: 1010, size: 390, fill: "#f8dd40", stroke: "#020b13", strokeWidth: 8 }),
    centeredText({ value: "WHO CAN DANCE BEST?", y: 1115, size: 42, strokeWidth: 4 }),
  ].join("");
}

export function wrapWords(value) {
  const words = value.toUpperCase().split(/\s+/);
  let split = 1;
  for (let index = 1; index < words.length; index += 1) {
    if (Math.abs(words.slice(0, index).join(" ").length - words.slice(index).join(" ").length)
      < Math.abs(words.slice(0, split).join(" ").length - words.slice(split).join(" ").length)) split = index;
  }
  return [words.slice(0, split).join(" "), words.slice(split).join(" ")];
}

async function renderGraphics({ input, timeline, directory, cellPositions }) {
  await mkdir(directory, { recursive: true });
  const graphics = [];
  const add = async (name, enable, content) => {
    const file = path.join(directory, `${name}.png`);
    await sharp(graphicSvg(content)).png().toFile(file);
    graphics.push({ name, enable, file });
  };

  const chrome = [
    '<rect x="0" y="0" width="1080" height="225" fill="#061829" fill-opacity="0.34"/>',
    centeredText({ value: "BIKINI BOTTOM", y: 64, size: 48, fill: "#59dece", strokeWidth: 3 }),
    centeredText({ value: "DANCE OFF", y: 145, size: 82, fill: "#f8dd40", strokeWidth: 5 }),
    centeredText({ value: `WHO CAN DANCE BEST TO ${input.songTitle.toUpperCase()}?`, y: 205, size: 30, strokeWidth: 3 }),
  ];
  input.characters.forEach((character, index) => {
    const position = cellPositions[index];
    const motionLabel = character.motionId.replaceAll("-", " ").toUpperCase();
    chrome.push(`<rect x="${position.x}" y="${position.y}" width="${CELL_WIDTH}" height="${CELL_HEIGHT}" fill="none" stroke="white" stroke-opacity="0.72" stroke-width="5"/>`);
    chrome.push(`<rect x="${position.x + 12}" y="${position.y + 12}" width="270" height="54" rx="9" fill="${character.color}" fill-opacity="0.96"/>`);
    chrome.push(`<text class="label" x="${position.x + 28}" y="${position.y + 50}" font-size="27" fill="#061829">${xml(character.label)}</text>`);
    chrome.push(`<rect x="${position.x + 5}" y="${position.y + CELL_HEIGHT - 83}" width="500" height="78" fill="#061829"/>`);
    chrome.push(`<text class="display" x="${position.x + 255}" y="${position.y + CELL_HEIGHT - 34}" font-size="22" fill="white" stroke="#020b13" stroke-width="2">${xml(motionLabel)}</text>`);
  });
  await add("chrome", `between(t,0,${DURATION})`, chrome.join(""));

  for (let index = 0; index < input.characters.length; index += 1) {
    const character = input.characters[index];
    const previousCharacter = input.characters[index - 1];
    const position = cellPositions[index];
    const round = timeline.rounds[index];
    await add(`active-${index}`, `between(t,${round.roundStart},${round.roundEnd})`,
      `<rect x="${position.x}" y="${position.y}" width="${CELL_WIDTH}" height="${CELL_HEIGHT}" fill="none" stroke="${character.color}" stroke-width="18"/>`);
    const speech = index === 0 ? input.openingLine : character.taunt;
    const speakerLabel = index === 0 ? `${character.label}:` : `${character.label} TO ${previousCharacter.label}:`;
    const speechLines = speech.length > 30 ? wrapWords(speech) : [speech.toUpperCase()];
    await add(`speech-${index}`, `between(t,${round.speechStart},${round.speechEnd})`, [
      `<rect x="40" y="${CAPTION_Y}" width="825" height="${CAPTION_HEIGHT}" rx="24" fill="#020b13" fill-opacity="0.94"/>`,
      centeredText({ value: speakerLabel, x: 452, y: CAPTION_Y + 35, size: 24, fill: character.color, strokeWidth: 2 }),
      ...speechLines.map((line, lineIndex) => centeredText({ value: line, x: 452, y: speechLines.length === 1 ? CAPTION_Y + 94 : CAPTION_Y + 76 + lineIndex * 34, size: speechLines.length === 1 ? 38 : 29, strokeWidth: 3 })),
    ].join(""));
  }

  const finaleStrokes = input.characters.map((character, index) => {
    const position = cellPositions[index];
    return `<rect x="${position.x}" y="${position.y}" width="${CELL_WIDTH}" height="${CELL_HEIGHT}" fill="none" stroke="${character.color}" stroke-width="18"/>`;
  }).join("");
  await add("finale", `between(t,${timeline.finale.start},${timeline.finale.end})`, [
    finaleStrokes,
    '<rect x="0" y="164" width="1080" height="64" fill="#061829"/>',
    centeredText({ value: "FINAL ROUND • EVERYBODY WIGGLE!", y: 206, size: 29, fill: "#f8dd40", strokeWidth: 3 }),
  ].join(""));

  for (const [index, number] of [3, 2, 1].entries()) {
    await add(`countdown-${number}`, `between(t,${index},${index + 0.98})`, countdownGraphic(number));
  }

  await add("loop-bridge-prompt", `between(t,${timeline.loopBridge.start},${timeline.loopBridge.end - 0.2})`, [
    '<rect x="0" y="0" width="1080" height="1920" fill="#02050a" fill-opacity="0.68"/>',
    centeredText({ value: "WHO WON?", y: 790, size: 120, fill: "#f8dd40", strokeWidth: 6 }),
    centeredText({ value: "COMMENT YOUR WINNER.", y: 900, size: 48, strokeWidth: 4 }),
  ].join(""));
  await add("loop-bridge-countdown", `between(t,${timeline.loopBridge.end - 0.2},${timeline.loopBridge.end})`, countdownGraphic(3));

  const closing = timeline.events.find((event) => event.type === "closing");
  const closingLines = wrapWords(input.closingLine);
  const closingPosition = cellPositions.at(-1);
  const closingCharacter = input.characters.at(-1);
  await add("cta", `between(t,${closing.start},${closing.end})`, [
    '<rect x="0" y="0" width="1080" height="1920" fill="#02050a" fill-opacity="0.68"/>',
    `<rect x="${closingPosition.x}" y="${closingPosition.y}" width="${CELL_WIDTH}" height="${CELL_HEIGHT}" fill="none" stroke="${closingCharacter.color}" stroke-width="18"/>`,
    centeredText({ value: "WHO WON?", y: 750, size: 120, fill: "#f8dd40", strokeWidth: 6 }),
    ...closingLines.map((line, index) => centeredText({ value: line, y: 865 + index * 65, size: 48, strokeWidth: 4 })),
  ].join(""));
  return graphics;
}

function motionSegment(label, duration, output, speed = 1) {
  return `[${label}]setpts=(PTS-STARTPTS)/${speed},trim=duration=${duration},setpts=PTS-STARTPTS[${output}]`;
}

function stillSegment(label, duration, output) {
  return `[${label}]trim=end_frame=1,loop=loop=-1:size=1:start=0,trim=duration=${duration},setpts=PTS-STARTPTS[${output}]`;
}

async function sha256(file) {
  return createHash("sha256").update(await readFile(file)).digest("hex");
}

export async function composeRun({ input, dialogueAssets, runDirectory, outputPath }) {
  const timeline = buildTimeline(input, dialogueAssets);
  const outerBackground = await resolveOuterBackground(input.outerBackground);
  const clipsDirectory = path.join(runDirectory, "character-clips");
  await mkdir(clipsDirectory, { recursive: true });
  const characterClips = await Promise.all(input.characters.map(async (character) => {
    const destination = path.join(clipsDirectory, characterClipName(character, character.motionId));
    try {
      if ((await stat(destination)).size > 20_000) return destination;
    } catch {
      // Render missing clips below.
    }
    const rendered = await renderDownload({
      characterId: character.characterId,
      motionId: character.motionId,
      format: "mp4",
      backgroundPreset: CHARACTER_BACKGROUND_PRESET,
    });
    await writeFile(destination, rendered.bytes);
    return destination;
  }));
  const finaleClips = await Promise.all(input.characters.map(async (character) => {
    const destination = path.join(clipsDirectory, characterClipName(character, character.finaleMotionId, "-finale"));
    try {
      if ((await stat(destination)).size > 20_000) return destination;
    } catch {
      // Render missing clips below.
    }
    const rendered = await renderDownload({
      characterId: character.characterId,
      motionId: character.finaleMotionId,
      format: "mp4",
      backgroundPreset: CHARACTER_BACKGROUND_PRESET,
    });
    await writeFile(destination, rendered.bytes);
    return destination;
  }));
  const reactionClips = await Promise.all(input.characters.map(async (character) => {
    const destination = path.join(clipsDirectory, characterClipName(character, character.reactionMotionId, "-reaction"));
    try {
      if ((await stat(destination)).size > 20_000) return destination;
    } catch {
      // Render missing clips below.
    }
    const rendered = await renderDownload({
      characterId: character.characterId,
      motionId: character.reactionMotionId,
      format: "mp4",
      backgroundPreset: CHARACTER_BACKGROUND_PRESET,
    });
    await writeFile(destination, rendered.bytes);
    return destination;
  }));

  const cellPositions = CELL_POSITIONS;
  const graphics = await renderGraphics({
    input,
    timeline,
    directory: path.join(runDirectory, "graphics"),
    cellPositions,
  });
  const songInputIndex = input.characters.length * 3;
  const dialogueInputIndex = songInputIndex + 1;
  const backgroundInputIndex = dialogueInputIndex + dialogueAssets.length;
  const graphicsInputIndex = backgroundInputIndex + 1;
  const filters = [`[${backgroundInputIndex}:v]scale=1080:1920:flags=lanczos,trim=duration=${DURATION},setpts=PTS-STARTPTS[base]`];

  input.characters.forEach((character, index) => {
    const round = timeline.rounds[index];
    const countdownDuration = 3;
    const waitDuration = round.speechStart - countdownDuration;
    const speechDuration = round.speechEnd - round.speechStart;
    const middleDuration = timeline.finale.start - round.danceEnd;
    const hasMiddle = middleDuration > 1 / 30;
    const closingEvent = timeline.events.find((event) => event.type === "closing");
    const closingDuration = closingEvent.end - timeline.finale.end;
    const bridgeDuration = DURATION - closingEvent.end;
    const isClosingSpeaker = index === input.characters.length - 1;
    const reactionInputIndex = input.characters.length * 2 + index;
    const reactionParts = [`c${index}countdown0`];
    if (waitDuration > 1 / 30) reactionParts.push(`c${index}wait0`);
    reactionParts.push(`c${index}speech0`);
    if (hasMiddle) reactionParts.push(`c${index}mid0`);
    reactionParts.push(`c${index}post0`, `c${index}bridge0`);
    filters.push(`[${reactionInputIndex}:v]split=${reactionParts.length}${reactionParts.map((part) => `[${part}]`).join("")}`);
    filters.push(stillSegment(`c${index}countdown0`, countdownDuration, `c${index}countdown`));
    if (waitDuration > 1 / 30) filters.push(motionSegment(`c${index}wait0`, waitDuration, `c${index}wait`, IDLE_SPEED));
    filters.push(motionSegment(`c${index}speech0`, speechDuration, `c${index}speech`));
    filters.push(motionSegment(`${index}:v`, round.danceEnd - round.danceStart, `c${index}solo`));
    if (hasMiddle) filters.push(motionSegment(`c${index}mid0`, middleDuration, `c${index}mid`, IDLE_SPEED));
    filters.push(motionSegment(`${input.characters.length + index}:v`, timeline.finale.end - timeline.finale.start, `c${index}final`));
    filters.push(motionSegment(`c${index}post0`, closingDuration, `c${index}post`, isClosingSpeaker ? 1 : IDLE_SPEED));
    filters.push(stillSegment(`c${index}bridge0`, bridgeDuration, `c${index}bridge`));
    const closingActive = isClosingSpeaker ? `+between(t,${closingEvent.start},${closingEvent.end})` : "";
    const timelineParts = [`c${index}countdown`];
    if (waitDuration > 1 / 30) timelineParts.push(`c${index}wait`);
    timelineParts.push(`c${index}speech`, `c${index}solo`);
    if (hasMiddle) timelineParts.push(`c${index}mid`);
    timelineParts.push(`c${index}final`, `c${index}post`, `c${index}bridge`);
    const safeShift = index % 2 === 1 ? RIGHT_COLUMN_SAFE_SHIFT : 0;
    filters.push(`${timelineParts.map((part) => `[${part}]`).join("")}concat=n=${timelineParts.length}:v=1:a=0,scale=916:${CELL_HEIGHT}:flags=lanczos,crop=${CELL_WIDTH}:${CELL_HEIGHT}:(iw-${CELL_WIDTH})/2+${safeShift}:0,eq=brightness=-0.15:saturation=0.42:enable='not(between(t,${round.roundStart},${round.roundEnd})+between(t,${timeline.finale.start},${timeline.finale.end})${closingActive})',setsar=1[c${index}]`);
  });

  let current = "base";
  cellPositions.forEach((position, index) => {
    const next = `overlay${index}`;
    filters.push(`[${current}][c${index}]overlay=x=${position.x}:y=${position.y}:shortest=1[${next}]`);
    current = next;
  });

  graphics.forEach((graphic, index) => {
    const next = `graphic${index}`;
    const graphicInputIndex = graphicsInputIndex + index;
    filters.push(`[${current}][${graphicInputIndex}:v]overlay=x=0:y=0:enable='${graphic.enable}'[${next}]`);
    current = next;
  });
  filters.push(`[${current}]fps=30,format=yuv420p[vout]`);
  const musicWindows = timeline.events.filter((event) => event.song).map(({ start, end }) => ({ start, end }));
  const musicDuration = musicWindows.reduce((total, window) => total + window.end - window.start, 0);
  filters.push(`[${songInputIndex}:a]atrim=duration=${musicDuration},asetpts=PTS-STARTPTS,aresample=48000,loudnorm=I=-15:LRA=10:TP=-1.2,asplit=${musicWindows.length}${musicWindows.map((_, index) => `[music${index}src]`).join("")}`);
  let sourceStart = 0;
  musicWindows.forEach((window, index) => {
    const segmentDuration = window.end - window.start;
    const fadeOutStart = Math.max(0, segmentDuration - 0.08);
    filters.push(`[music${index}src]atrim=start=${sourceStart}:duration=${segmentDuration},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.04,afade=t=out:st=${fadeOutStart}:d=0.08,adelay=${Math.round(window.start * 1000)}:all=1[music${index}]`);
    sourceStart += segmentDuration;
  });
  filters.push("sine=frequency=700:sample_rate=48000:duration=0.16,volume=0.28,aformat=channel_layouts=stereo,adelay=180:all=1[beep0]");
  filters.push("sine=frequency=700:sample_rate=48000:duration=0.16,volume=0.28,aformat=channel_layouts=stereo,adelay=1180:all=1[beep1]");
  filters.push("sine=frequency=980:sample_rate=48000:duration=0.32,volume=0.32,aformat=channel_layouts=stereo,adelay=2150:all=1[beep2]");
  dialogueAssets.forEach((asset, index) => {
    const timelineEventId = asset.timelineEventId || asset.id;
    const event = timeline.events.find((candidate) => candidate.id === timelineEventId);
    if (!event) throw new Error(`No timeline event for dialogue asset ${asset.id}.`);
    const eventDuration = event.end - event.start;
    const isClosingChorus = timelineEventId === "closing";
    const tempo = asset.durationSeconds / eventDuration;
    if (isClosingChorus && (tempo < 0.5 || tempo > 2)) {
      throw new Error(`Closing voice ${asset.id} needs an unsupported ${tempo.toFixed(3)}x tempo correction.`);
    }
    const chorusTiming = isClosingChorus ? `,atempo=${tempo.toFixed(6)},apad,atrim=duration=${eventDuration},volume=0.5` : "";
    filters.push(`[${dialogueInputIndex + index}:a]aresample=48000,aformat=channel_layouts=stereo,loudnorm=I=-17:LRA=7:TP=-1.5${chorusTiming},adelay=${Math.round(event.start * 1000)}:all=1[voice${index}]`);
  });
  timeline.rounds.forEach((round, index) => {
    filters.push(`aevalsrc=0.14*sin(2*PI*(900+2200*t)*t)*exp(-18*t):s=48000:d=0.22,aformat=channel_layouts=stereo,adelay=${Math.round(round.danceStart * 1000)}:all=1[stinger${index}]`);
  });
  filters.push(`anullsrc=r=48000:cl=stereo:d=${DURATION}[silence]`);
  filters.push(`[silence]${musicWindows.map((_, index) => `[music${index}]`).join("")}${dialogueAssets.map((_, index) => `[voice${index}]`).join("")}${timeline.rounds.map((_, index) => `[stinger${index}]`).join("")}[beep0][beep1][beep2]amix=inputs=${musicWindows.length + dialogueAssets.length + timeline.rounds.length + 4}:duration=first:dropout_transition=0:normalize=0,alimiter=limit=0.95[music]`);

  const filterPath = path.join(runDirectory, "filter-complex.txt");
  await writeFile(filterPath, `${filters.join(";\n")}\n`);
  const songPath = path.join(runDirectory, input.songFile);
  await execute("ffmpeg", [
    "-y",
    ...characterClips.flatMap((clip) => ["-stream_loop", "-1", "-i", clip]),
    ...finaleClips.flatMap((clip) => ["-i", clip]),
    ...reactionClips.flatMap((clip) => ["-stream_loop", "-1", "-i", clip]),
    "-ss", String(input.songExcerptStart), "-i", songPath,
    ...dialogueAssets.flatMap((asset) => ["-i", asset.file]),
    "-loop", "1", "-framerate", "30", "-i", outerBackground.file,
    ...graphics.flatMap((graphic) => ["-loop", "1", "-framerate", "30", "-i", graphic.file]),
    "-filter_complex_script", filterPath,
    "-map", "[vout]", "-map", "[music]",
    "-t", String(DURATION),
    "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
    "-g", "30", "-keyint_min", "30", "-sc_threshold", "0",
    "-force_key_frames", `0,${timeline.loopBridge.end - 0.2}`,
    "-c:a", "aac", "-b:a", "192k",
    "-movflags", "+faststart",
    outputPath,
  ]);

  const report = {
    schemaVersion: 1,
    renderer: "../mixamo-character-motion-v1/runtime/renderer/app.js",
    compositor: "runtime/compose.mjs",
    dimensions: { width: 1080, height: 1920, fps: 30, durationSeconds: DURATION },
    timeline,
    song: { file: input.songFile, excerptStart: input.songExcerptStart, sha256: await sha256(songPath) },
    outerBackground: {
      id: outerBackground.id,
      label: outerBackground.label,
      path: outerBackground.path,
      sha256: await sha256(outerBackground.file),
    },
    dialogue: dialogueAssets.map(({ file, ...asset }) => ({ ...asset, file: path.relative(runDirectory, file) })),
    characters: await Promise.all(input.characters.map(async (character, index) => ({
      ...character,
      taunts: index ? input.characters[index - 1].characterId : null,
      round: timeline.rounds[index],
      finale: timeline.finale,
      renderedClipSha256: await sha256(characterClips[index]),
      finaleRenderedClipSha256: await sha256(finaleClips[index]),
      reactionRenderedClipSha256: await sha256(reactionClips[index]),
    }))),
    outputSha256: await sha256(outputPath),
  };
  await writeFile(path.join(runDirectory, "render-report.json"), `${JSON.stringify(report, null, 2)}\n`);
  return report;
}
