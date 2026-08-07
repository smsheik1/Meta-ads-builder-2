import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { renderDownload } from "../../mixamo-character-motion-v1/runtime/export.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DURATION = 30;
const FINALE_START = 25;
const FINALE_END = 28;

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

async function renderGraphics({ input, directory, cellPositions, soloWindows }) {
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
  await add("chrome", "between(t,0,30)", chrome.join(""));

  for (let index = 0; index < input.characters.length; index += 1) {
    const character = input.characters[index];
    const position = cellPositions[index];
    const solo = soloWindows[index];
    await add(`active-${index}`, `between(t,${solo.start},${solo.end})`,
      `<rect x="${position.x}" y="${position.y}" width="510" height="635" fill="none" stroke="${character.color}" stroke-width="18"/>`);
    const tauntSize = character.taunt.length > 34 ? 37 : 48;
    await add(`taunt-${index}`, `between(t,${solo.start},${solo.start + 1.8})`, [
      '<rect x="40" y="1560" width="1000" height="170" rx="30" fill="#020b13" fill-opacity="0.9"/>',
      centeredText({ value: `${character.label} SAYS:`, y: 1618, size: 30, fill: character.color, strokeWidth: 2 }),
      centeredText({ value: character.taunt, y: 1690, size: tauntSize, strokeWidth: 3 }),
    ].join(""));
  }

  await add("challenge", "between(t,3,5)", [
    '<rect x="40" y="1550" width="1000" height="185" rx="30" fill="#020b13" fill-opacity="0.92"/>',
    centeredText({ value: "FOUR DANCERS. ONE SONG.", y: 1620, size: 43, strokeWidth: 3 }),
    centeredText({ value: "WHO CAN WIGGLE BEST?", y: 1698, size: 57, fill: "#f8dd40", strokeWidth: 4 }),
  ].join(""));

  const finaleStrokes = input.characters.map((character, index) => {
    const position = cellPositions[index];
    return `<rect x="${position.x}" y="${position.y}" width="510" height="635" fill="none" stroke="${character.color}" stroke-width="18"/>`;
  }).join("");
  await add("finale", "between(t,25,28)", [
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

  await add("cta", "between(t,28,30)", [
    '<rect x="0" y="0" width="1080" height="1920" fill="#02050a" fill-opacity="0.8"/>',
    centeredText({ value: "WHO WON?", y: 760, size: 120, fill: "#f8dd40", strokeWidth: 6 }),
    centeredText({ value: "PUT YOUR WINNER", y: 875, size: 61, strokeWidth: 4 }),
    centeredText({ value: "IN THE COMMENTS BELOW", y: 955, size: 61, strokeWidth: 4 }),
  ].join(""));
  return graphics;
}

function freeze(label, duration, output) {
  return `[${label}]trim=end_frame=1,loop=loop=-1:size=1:start=0,trim=duration=${duration},setpts=PTS-STARTPTS[${output}]`;
}

async function sha256(file) {
  return createHash("sha256").update(await readFile(file)).digest("hex");
}

export async function composeRun({ input, runDirectory, outputPath }) {
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

  const filters = ["color=c=0x061829:s=1080x1920:r=30:d=30[base]"];
  const soloWindows = input.characters.map((_, index) => ({ start: 5 + index * 5, end: 10 + index * 5 }));
  const cellPositions = [
    { x: 20, y: 250 },
    { x: 550, y: 250 },
    { x: 20, y: 885 },
    { x: 550, y: 885 },
  ];
  const graphics = await renderGraphics({
    input,
    directory: path.join(runDirectory, "graphics"),
    cellPositions,
    soloWindows,
  });

  input.characters.forEach((character, index) => {
    const solo = soloWindows[index];
    const middleDuration = FINALE_START - solo.end;
    filters.push(`[${index}:v]split=5[c${index}pre0][c${index}solo0][c${index}mid0][c${index}final0][c${index}post0]`);
    filters.push(freeze(`c${index}pre0`, solo.start, `c${index}pre`));
    filters.push(`[c${index}solo0]trim=duration=${solo.end - solo.start},setpts=PTS-STARTPTS[c${index}solo]`);
    filters.push(freeze(`c${index}mid0`, middleDuration, `c${index}mid`));
    filters.push(`[c${index}final0]trim=duration=${FINALE_END - FINALE_START},setpts=PTS-STARTPTS[c${index}final]`);
    filters.push(freeze(`c${index}post0`, DURATION - FINALE_END, `c${index}post`));
    filters.push(`[c${index}pre][c${index}solo][c${index}mid][c${index}final][c${index}post]concat=n=5:v=1:a=0,scale=1129:635:flags=lanczos,crop=510:635:(iw-510)/2:0,eq=brightness=-0.15:saturation=0.42:enable='not(between(t,${solo.start},${solo.end})+between(t,${FINALE_START},${FINALE_END}))',setsar=1[c${index}]`);
  });

  let current = "base";
  cellPositions.forEach((position, index) => {
    const next = `overlay${index}`;
    filters.push(`[${current}][c${index}]overlay=x=${position.x}:y=${position.y}:shortest=1[${next}]`);
    current = next;
  });

  graphics.forEach((graphic, index) => {
    const next = `graphic${index}`;
    filters.push(`[${current}][${5 + index}:v]overlay=x=0:y=0:enable='${graphic.enable}'[${next}]`);
    current = next;
  });
  filters.push(`[${current}]fps=30,format=yuv420p[vout]`);
  filters.push(`[4:a]atrim=duration=${DURATION},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.12,afade=t=out:st=29.4:d=0.6,loudnorm=I=-15:LRA=10:TP=-1.2[music]`);

  const filterPath = path.join(runDirectory, "filter-complex.txt");
  await writeFile(filterPath, `${filters.join(";\n")}\n`);
  const songPath = path.join(runDirectory, input.songFile);
  await execute("ffmpeg", [
    "-y",
    ...characterClips.flatMap((clip) => ["-stream_loop", "-1", "-i", clip]),
    "-ss", String(input.songExcerptStart), "-i", songPath,
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
    song: { file: input.songFile, excerptStart: input.songExcerptStart, sha256: await sha256(songPath) },
    characters: await Promise.all(input.characters.map(async (character, index) => ({
      ...character,
      solo: soloWindows[index],
      finale: { start: FINALE_START, end: FINALE_END },
      renderedClipSha256: await sha256(characterClips[index]),
    }))),
    outputSha256: await sha256(outputPath),
  };
  await writeFile(path.join(runDirectory, "render-report.json"), `${JSON.stringify(report, null, 2)}\n`);
  return report;
}
