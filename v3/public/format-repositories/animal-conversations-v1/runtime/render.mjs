import { link, mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { execute, exists, hashValue, writeJson } from "./common.mjs";
import { validateRun } from "./validate.mjs";

const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 24;
const RENDERER_VERSION = 4;

export const LAYOUTS = {
  "two-shot": {
    bunny: { height: 560, left: 70, bottom: 1670, mirrorX: true },
    cat: { height: 540, left: 555, bottom: 1670 },
  },
  "cat-close": {
    cat: { height: 1130, left: 1, bottom: 1810 },
  },
  "bunny-close": {
    bunny: { height: 1600, left: 45, bottom: 1810, mirrorX: true },
  },
};

function escapeXml(text) {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function wrapCaption(text, maximum = 27) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maximum && current) {
      lines.push(current);
      current = word;
    } else current = candidate;
  }
  if (current) lines.push(current);
  return lines.slice(0, 5);
}

function captionSvg(beat, episodeLabel) {
  const colors = { cat: "#62C8FF", bunny: "#FF8BCC", both: "#FFE477", none: "#FFFFFF" };
  const lines = wrapCaption(beat.caption || "");
  const fontSize = lines.length >= 4 ? 58 : 66;
  const lineHeight = fontSize + 12;
  const boxHeight = lines.length ? lines.length * lineHeight + 44 : 0;
  const tspans = lines.map((line, index) => `<tspan x="540" dy="${index ? lineHeight : 0}">${escapeXml(line)}</tspan>`).join("");
  return Buffer.from(`<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    ${lines.length ? `<rect x="68" y="96" width="944" height="${boxHeight}" rx="34" fill="#09121f" fill-opacity="0.70"/>` : ""}
    <text x="540" y="${132 + fontSize}" text-anchor="middle" font-family="Arial Rounded MT Bold,Arial,sans-serif" font-size="${fontSize}" font-weight="800" fill="${colors[beat.speaker]}" stroke="#07101c" stroke-width="12" paint-order="stroke" stroke-linejoin="round">${tspans}</text>
    <rect x="173" y="1764" width="734" height="88" rx="44" fill="#09121f" fill-opacity="0.76"/>
    <text x="540" y="1825" text-anchor="middle" font-family="Arial Rounded MT Bold,Arial,sans-serif" font-size="45" font-weight="800" fill="#FFE477" stroke="#07101c" stroke-width="7" paint-order="stroke">${escapeXml(episodeLabel)}</text>
  </svg>`);
}

export function visualState(beat, frameIndex) {
  const localFrame = Math.max(0, frameIndex - Math.round(beat.start * FPS));
  const mouthOpen = Math.floor(localFrame / 3) % 2 === 1;
  const blink = frameIndex % 89 < 3;
  const isSpeaking = (character) => beat.speaker === character || beat.speaker === "both";
  const pose = (character) => {
    if (isSpeaking(character) && mouthOpen) return "mouth-open";
    if (blink) return "blink";
    return "idle";
  };
  const bob = (character) => {
    if (isSpeaking(character)) return Math.floor(localFrame / 6) % 2 ? -8 : 0;
    if (localFrame >= 4 && localFrame < 8) return -12;
    return 0;
  };
  return { catPose: pose("cat"), bunnyPose: pose("bunny"), catBob: bob("cat"), bunnyBob: bob("bunny") };
}

async function prepareAssets({ root, cacheDirectory, background, assets }) {
  const prepared = { characters: { cat: {}, bunny: {} } };
  const backgroundFile = path.join(cacheDirectory, "background.png");
  if (!(await exists(backgroundFile))) {
    await sharp(path.join(root, background.path)).resize(WIDTH, HEIGHT, { fit: "cover", position: "centre" }).png().toFile(backgroundFile);
  }
  prepared.background = backgroundFile;
  for (const camera of Object.keys(LAYOUTS)) {
    for (const [characterId, layout] of Object.entries(LAYOUTS[camera])) {
      prepared.characters[characterId][camera] ||= {};
      const character = assets.characters.find((entry) => entry.id === characterId);
      for (const pose of character.poses) {
        const output = path.join(cacheDirectory, `${characterId}-${camera}-${pose.id}.png`);
        if (!(await exists(output))) {
          const image = sharp(path.join(root, pose.path)).resize({ height: layout.height });
          if (layout.mirrorX) image.flop();
          await image.png().toFile(output);
        }
        prepared.characters[characterId][camera][pose.id] = output;
      }
    }
  }
  return prepared;
}

async function renderState({ prepared, cacheDirectory, beat, beatIndex, state, episodeLabel }) {
  const key = hashValue({ beatIndex, beat, state, episodeLabel }).slice(0, 18);
  const output = path.join(cacheDirectory, `state-${key}.png`);
  if (await exists(output)) return output;
  const layout = LAYOUTS[beat.camera];
  const overlays = [];
  for (const characterId of ["bunny", "cat"]) {
    if (!layout[characterId]) continue;
    const pose = state[`${characterId}Pose`];
    const metadata = await sharp(prepared.characters[characterId][beat.camera][pose]).metadata();
    const position = layout[characterId];
    overlays.push({
      input: prepared.characters[characterId][beat.camera][pose],
      left: position.left,
      top: position.bottom - metadata.height + state[`${characterId}Bob`],
    });
  }
  overlays.push({ input: captionSvg(beat, episodeLabel), left: 0, top: 0 });
  await sharp(prepared.background).composite(overlays).png({ compressionLevel: 7 }).toFile(output);
  return output;
}

export async function renderRun({ root, runDirectory }) {
  const validated = await validateRun({ root, runDirectory });
  const { input, durationSeconds, background, assets, audioFile } = validated;
  const renderHash = hashValue({
    renderer: RENDERER_VERSION,
    input,
    background: background.sha256,
    characterAssets: assets.characters.flatMap((character) => character.poses.map((pose) => pose.sha256)),
  }).slice(0, 16);
  const cacheDirectory = path.join(runDirectory, `.render-cache-${renderHash}`);
  const framesDirectory = path.join(cacheDirectory, "frames");
  await mkdir(framesDirectory, { recursive: true });
  const prepared = await prepareAssets({ root, cacheDirectory, background, assets });
  const frameCount = Math.ceil(durationSeconds * FPS);
  const eventUsage = new Map();
  const uniqueStates = new Set();

  let beatIndex = 0;
  for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
    const time = frameIndex / FPS;
    while (beatIndex < input.timeline.length - 1 && time >= input.timeline[beatIndex].end - 0.0001) beatIndex += 1;
    const beat = input.timeline[beatIndex];
    eventUsage.set(beatIndex, (eventUsage.get(beatIndex) || 0) + 1);
    const state = visualState(beat, frameIndex);
    const source = await renderState({ prepared, cacheDirectory, beat, beatIndex, state, episodeLabel: input.episodeLabel });
    uniqueStates.add(source);
    const destination = path.join(framesDirectory, `frame-${String(frameIndex).padStart(6, "0")}.png`);
    if (!(await exists(destination))) await link(source, destination);
  }

  const output = path.join(runDirectory, "final.mp4");
  await execute("ffmpeg", [
    "-y",
    "-framerate", String(FPS),
    "-i", path.join(framesDirectory, "frame-%06d.png"),
    "-i", audioFile,
    "-map", "0:v:0",
    "-map", "1:a:0",
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-crf", "18",
    "-pix_fmt", "yuv420p",
    "-r", String(FPS),
    "-c:a", "aac",
    "-b:a", "192k",
    "-t", durationSeconds.toFixed(6),
    "-movflags", "+faststart",
    output,
  ]);
  const report = {
    schemaVersion: 1,
    status: "pass",
    renderedAt: new Date().toISOString(),
    rendererVersion: RENDERER_VERSION,
    width: WIDTH,
    height: HEIGHT,
    fps: FPS,
    durationSeconds,
    inputHash: hashValue(input),
    frameCount,
    uniqueVisualStates: uniqueStates.size,
    timelineBeatFrames: Object.fromEntries(eventUsage),
    output: "final.mp4",
  };
  await writeJson(path.join(runDirectory, "render-report.json"), report);
  return { output, report };
}
