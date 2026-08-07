import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { renderDownload } from "../../mixamo-character-motion-v1/runtime/export.mjs";
import { buildTimeline, DURATION } from "./timeline.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLOSING_MOTION_ID = "taunt";

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

function centeredText({ value, y, size, fill = "white", stroke = "#020b13", strokeWidth = 4 }) {
  return `<text class="display" x="540" y="${y}" font-size="${size}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}">${xml(value)}</text>`;
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
    '<rect x="0" y="0" width="1080" height="225" fill="#061829" fill-opacity="0.96"/>',
    centeredText({ value: "BIKINI BOTTOM", y: 64, size: 48, fill: "#59dece", strokeWidth: 3 }),
    centeredText({ value: "DANCE OFF", y: 145, size: 82, fill: "#f8dd40", strokeWidth: 5 }),
    centeredText({ value: `WHO CAN DANCE BEST TO ${input.songTitle.toUpperCase()}?`, y: 205, size: 30, strokeWidth: 3 }),
  ];
  input.characters.forEach((character, index) => {
    const position = cellPositions[index];
    const motionLabel = character.motionId.replaceAll("-", " ").toUpperCase();
    chrome.push(`<rect x="${position.x}" y="${position.y}" width="510" height="635" fill="none" stroke="white" stroke-opacity="0.72" stroke-width="5"/>`);
    chrome.push(`<rect x="${position.x + 12}" y="${position.y + 12}" width="270" height="54" rx="9" fill="${character.color}" fill-opacity="0.96"/>`);
    chrome.push(`<text class="label" x="${position.x + 28}" y="${position.y + 50}" font-size="27" fill="#061829">${xml(character.label)}</text>`);
    chrome.push(`<rect x="${position.x + 5}" y="${position.y + 552}" width="500" height="78" fill="#061829"/>`);
    chrome.push(`<text class="display" x="${position.x + 255}" y="${position.y + 601}" font-size="22" fill="white" stroke="#020b13" stroke-width="2">${xml(motionLabel)}</text>`);
  });
  await add("chrome", `between(t,0,${DURATION})`, chrome.join(""));

  for (let index = 0; index < input.characters.length; index += 1) {
    const character = input.characters[index];
    const previousCharacter = input.characters[index - 1];
    const position = cellPositions[index];
    const round = timeline.rounds[index];
    await add(`active-${index}`, `between(t,${round.roundStart},${round.roundEnd})`,
      `<rect x="${position.x}" y="${position.y}" width="510" height="635" fill="none" stroke="${character.color}" stroke-width="18"/>`);
    const speech = index === 0 ? input.openingLine : character.taunt;
    const speakerLabel = index === 0 ? `${character.label}:` : `${character.label} TO ${previousCharacter.label}:`;
    const speechLines = speech.length > 30 ? wrapWords(speech) : [speech.toUpperCase()];
    await add(`speech-${index}`, `between(t,${round.speechStart},${round.speechEnd})`, [
      '<rect x="40" y="1560" width="1000" height="170" rx="30" fill="#020b13" fill-opacity="0.9"/>',
      centeredText({ value: speakerLabel, y: 1608, size: 28, fill: character.color, strokeWidth: 2 }),
      ...speechLines.map((line, lineIndex) => centeredText({ value: line, y: speechLines.length === 1 ? 1685 : 1663 + lineIndex * 50, size: speechLines.length === 1 ? 48 : 36, strokeWidth: 3 })),
    ].join(""));
  }

  const finaleStrokes = input.characters.map((character, index) => {
    const position = cellPositions[index];
    return `<rect x="${position.x}" y="${position.y}" width="510" height="635" fill="none" stroke="${character.color}" stroke-width="18"/>`;
  }).join("");
  await add("finale", `between(t,${timeline.finale.start},${timeline.finale.end})`, [
    finaleStrokes,
    '<rect x="40" y="1550" width="1000" height="185" rx="30" fill="#020b13" fill-opacity="0.92"/>',
    centeredText({ value: "FINAL ROUND", y: 1620, size: 44, fill: "#59dece", strokeWidth: 3 }),
    centeredText({ value: "EVERYBODY WIGGLE!", y: 1698, size: 58, fill: "#f8dd40", strokeWidth: 4 }),
  ].join(""));

  for (const [index, number] of [3, 2, 1].entries()) {
    await add(`countdown-${number}`, `between(t,${index},${index + 0.98})`, [
      '<rect x="0" y="0" width="1080" height="1920" fill="#02050a" fill-opacity="0.82"/>',
      '<rect x="190" y="390" width="700" height="700" fill="none" stroke="white" stroke-opacity="0.78" stroke-width="8"/>',
      '<line x1="540" y1="390" x2="540" y2="1090" stroke="white" stroke-opacity="0.5" stroke-width="8"/>',
      '<line x1="190" y1="740" x2="890" y2="740" stroke="white" stroke-opacity="0.5" stroke-width="8"/>',
      centeredText({ value: number, y: 875, size: 390, stroke: "#111111", strokeWidth: 5 }),
    ].join(""));
  }

  const closing = timeline.events.find((event) => event.type === "closing");
  const closingLines = wrapWords(input.closingLine);
  const closingPosition = cellPositions.at(-1);
  const closingCharacter = input.characters.at(-1);
  await add("cta", `between(t,${closing.start},${closing.end})`, [
    '<rect x="0" y="0" width="1080" height="1920" fill="#02050a" fill-opacity="0.68"/>',
    `<rect x="${closingPosition.x}" y="${closingPosition.y}" width="510" height="635" fill="none" stroke="${closingCharacter.color}" stroke-width="18"/>`,
    centeredText({ value: "WHO WON?", y: 750, size: 120, fill: "#f8dd40", strokeWidth: 6 }),
    ...closingLines.map((line, index) => centeredText({ value: line, y: 865 + index * 65, size: 48, strokeWidth: 4 })),
  ].join(""));
  return graphics;
}

function freeze(label, duration, output) {
  return `[${label}]trim=end_frame=1,loop=loop=-1:size=1:start=0,trim=duration=${duration},setpts=PTS-STARTPTS[${output}]`;
}

async function sha256(file) {
  return createHash("sha256").update(await readFile(file)).digest("hex");
}

export async function composeRun({ input, dialogueAssets, runDirectory, outputPath }) {
  const timeline = buildTimeline(input, dialogueAssets);
  const clipsDirectory = path.join(runDirectory, "character-clips");
  await mkdir(clipsDirectory, { recursive: true });
  const characterClips = await Promise.all(input.characters.map(async (character) => {
    const destination = path.join(clipsDirectory, `${character.characterId}-${character.motionId}.mp4`);
    try {
      if ((await stat(destination)).size > 20_000) return destination;
    } catch {
      // Render missing clips below.
    }
    const rendered = await renderDownload({
      characterId: character.characterId,
      motionId: character.motionId,
      format: "mp4",
    });
    await writeFile(destination, rendered.bytes);
    return destination;
  }));
  const closingClip = path.join(clipsDirectory, `${input.characters.at(-1).characterId}-${CLOSING_MOTION_ID}.mp4`);
  try {
    if ((await stat(closingClip)).size <= 20_000) throw new Error("Closing clip is incomplete.");
  } catch {
    const rendered = await renderDownload({ characterId: input.characters.at(-1).characterId, motionId: CLOSING_MOTION_ID, format: "mp4" });
    await writeFile(closingClip, rendered.bytes);
  }

  const filters = ["color=c=0x061829:s=1080x1920:r=30:d=30[base]"];
  const cellPositions = [
    { x: 20, y: 250 },
    { x: 550, y: 250 },
    { x: 20, y: 885 },
    { x: 550, y: 885 },
  ];
  const graphics = await renderGraphics({
    input,
    timeline,
    directory: path.join(runDirectory, "graphics"),
    cellPositions,
  });

  input.characters.forEach((character, index) => {
    const round = timeline.rounds[index];
    const middleDuration = timeline.finale.start - round.danceEnd;
    const closingDuration = DURATION - timeline.finale.end;
    const closingEvent = timeline.events.find((event) => event.type === "closing");
    const closingInputIndex = 5 + dialogueAssets.length;
    const isClosingSpeaker = index === input.characters.length - 1;
    filters.push(isClosingSpeaker
      ? `[${index}:v]split=4[c${index}pre0][c${index}solo0][c${index}mid0][c${index}final0]`
      : `[${index}:v]split=5[c${index}pre0][c${index}solo0][c${index}mid0][c${index}final0][c${index}post0]`);
    filters.push(freeze(`c${index}pre0`, round.danceStart, `c${index}pre`));
    filters.push(`[c${index}solo0]trim=duration=${round.danceEnd - round.danceStart},setpts=PTS-STARTPTS[c${index}solo]`);
    filters.push(freeze(`c${index}mid0`, middleDuration, `c${index}mid`));
    filters.push(`[c${index}final0]trim=duration=${timeline.finale.end - timeline.finale.start},setpts=PTS-STARTPTS[c${index}final]`);
    if (isClosingSpeaker) {
      filters.push(`[${closingInputIndex}:v]tpad=stop_mode=clone:stop_duration=${closingDuration},trim=duration=${closingDuration},setpts=PTS-STARTPTS[c${index}post]`);
    } else {
      filters.push(freeze(`c${index}post0`, closingDuration, `c${index}post`));
    }
    const closingActive = isClosingSpeaker ? `+between(t,${closingEvent.start},${closingEvent.end})` : "";
    filters.push(`[c${index}pre][c${index}solo][c${index}mid][c${index}final][c${index}post]concat=n=5:v=1:a=0,scale=1129:635:flags=lanczos,crop=510:635:(iw-510)/2:0,eq=brightness=-0.15:saturation=0.42:enable='not(between(t,${round.roundStart},${round.roundEnd})+between(t,${timeline.finale.start},${timeline.finale.end})${closingActive})',setsar=1[c${index}]`);
  });

  let current = "base";
  cellPositions.forEach((position, index) => {
    const next = `overlay${index}`;
    filters.push(`[${current}][c${index}]overlay=x=${position.x}:y=${position.y}:shortest=1[${next}]`);
    current = next;
  });

  graphics.forEach((graphic, index) => {
    const next = `graphic${index}`;
    filters.push(`[${current}][${6 + dialogueAssets.length + index}:v]overlay=x=0:y=0:enable='${graphic.enable}'[${next}]`);
    current = next;
  });
  filters.push(`[${current}]fps=30,format=yuv420p[vout]`);
  const musicWindows = timeline.events.filter((event) => event.song).map(({ start, end }) => ({ start, end }));
  const musicDuration = musicWindows.reduce((total, window) => total + window.end - window.start, 0);
  filters.push(`[4:a]atrim=duration=${musicDuration},asetpts=PTS-STARTPTS,aresample=48000,loudnorm=I=-15:LRA=10:TP=-1.2,asplit=${musicWindows.length}${musicWindows.map((_, index) => `[music${index}src]`).join("")}`);
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
    const event = timeline.events.find((candidate) => candidate.id === asset.id);
    filters.push(`[${5 + index}:a]aresample=48000,aformat=channel_layouts=stereo,loudnorm=I=-17:LRA=7:TP=-1.5,adelay=${Math.round(event.start * 1000)}:all=1[voice${index}]`);
  });
  filters.push(`anullsrc=r=48000:cl=stereo:d=${DURATION}[silence]`);
  filters.push(`[silence]${musicWindows.map((_, index) => `[music${index}]`).join("")}${dialogueAssets.map((_, index) => `[voice${index}]`).join("")}[beep0][beep1][beep2]amix=inputs=${musicWindows.length + dialogueAssets.length + 4}:duration=first:dropout_transition=0:normalize=0,alimiter=limit=0.95[music]`);

  const filterPath = path.join(runDirectory, "filter-complex.txt");
  await writeFile(filterPath, `${filters.join(";\n")}\n`);
  const songPath = path.join(runDirectory, input.songFile);
  await execute("ffmpeg", [
    "-y",
    ...characterClips.flatMap((clip) => ["-stream_loop", "-1", "-i", clip]),
    "-ss", String(input.songExcerptStart), "-i", songPath,
    ...dialogueAssets.flatMap((asset) => ["-i", asset.file]),
    "-i", closingClip,
    ...graphics.flatMap((graphic) => ["-loop", "1", "-framerate", "30", "-i", graphic.file]),
    "-filter_complex_script", filterPath,
    "-map", "[vout]", "-map", "[music]",
    "-t", String(DURATION),
    "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
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
    dialogue: dialogueAssets.map(({ file, ...asset }) => ({ ...asset, file: path.relative(runDirectory, file) })),
    closingMotion: { characterId: input.characters.at(-1).characterId, motionId: CLOSING_MOTION_ID, renderedClipSha256: await sha256(closingClip) },
    characters: await Promise.all(input.characters.map(async (character, index) => ({
      ...character,
      taunts: index ? input.characters[index - 1].characterId : null,
      round: timeline.rounds[index],
      finale: timeline.finale,
      renderedClipSha256: await sha256(characterClips[index]),
    }))),
    outputSha256: await sha256(outputPath),
  };
  await writeFile(path.join(runDirectory, "render-report.json"), `${JSON.stringify(report, null, 2)}\n`);
  return report;
}
