import { link, mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { execute, exists, hashValue, writeJson } from "./common.mjs";
import { validateRun } from "./validate.mjs";

const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 24;
const RENDERER_VERSION = 9;
const BOUNCE_SECONDS = 0.36;
const BLINK_DURATION_FRAMES = 3;
const BLINK_BOUNDARY_SNAP_FRAMES = 12;
const BLINK_MINIMUM_GAP_FRAMES = 72;
const BLINK_COLLISION_FRAMES = 5;
const BLINK_STAGGER_FRAMES = 8;
const BLINK_TRACKS = {
  cat: { firstFrame: 53, gapFrames: [84, 109, 91, 126, 97] },
  bunny: { firstFrame: 79, gapFrames: [103, 88, 117, 96, 132] },
};

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

export function captionChunks(text) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const phrases = [];
  let phrase = [];
  for (const word of words) {
    phrase.push(word);
    if (/[.!?]+["']?$/.test(word)) {
      phrases.push(phrase);
      phrase = [];
    }
  }
  if (phrase.length) phrases.push(phrase);

  const chunks = [];
  for (const wordsInPhrase of phrases) {
    for (let index = 0; index < wordsInPhrase.length;) {
      const remaining = wordsInPhrase.length - index;
      const size = remaining === 4 ? 2 : Math.min(3, remaining);
      chunks.push(wordsInPhrase.slice(index, index + size).join(" "));
      index += size;
    }
  }
  return chunks;
}

export function captionTextAtFrame(beat, frameIndex) {
  const chunks = captionChunks(beat.caption || "");
  if (!chunks.length) return "";
  const durationFrames = Math.max(1, Math.round((beat.end - beat.start) * FPS));
  const localFrame = Math.max(0, frameIndex - Math.round(beat.start * FPS));
  const chunkIndex = Math.min(chunks.length - 1, Math.floor(localFrame * chunks.length / durationFrames));
  return chunks[chunkIndex];
}

function characterIsVisible(character, frameIndex, timeline) {
  const time = frameIndex / FPS;
  const beat = timeline.find((entry, index) => time < entry.end - 0.0001 || index === timeline.length - 1);
  return beat?.camera === "two-shot" || beat?.camera === `${character}-close`;
}

function nearestVisibleBreakpoint(character, targetFrame, timeline) {
  const candidates = timeline.slice(0, -1)
    .map((beat) => Math.max(0, Math.round(beat.end * FPS) - 1))
    .filter((frame) => characterIsVisible(character, frame, timeline))
    .filter((frame) => Math.abs(frame - targetFrame) <= BLINK_BOUNDARY_SNAP_FRAMES)
    .sort((left, right) => Math.abs(left - targetFrame) - Math.abs(right - targetFrame) || left - right);
  return candidates[0];
}

export function buildBlinkSchedule(timeline, frameCount) {
  const schedule = { cat: [], bunny: [] };
  for (const character of ["cat", "bunny"]) {
    const track = BLINK_TRACKS[character];
    let targetFrame = track.firstFrame;
    let gapIndex = 0;
    while (targetFrame + BLINK_DURATION_FRAMES <= frameCount) {
      let startFrame = nearestVisibleBreakpoint(character, targetFrame, timeline) ?? targetFrame;
      if (characterIsVisible(character, startFrame, timeline)) {
        const previous = schedule[character].at(-1);
        if (previous === undefined || startFrame - previous >= BLINK_MINIMUM_GAP_FRAMES) {
          let shouldSchedule = true;
          if (character === "bunny" && schedule.cat.some((catFrame) => Math.abs(catFrame - startFrame) <= BLINK_COLLISION_FRAMES)) {
            const staggered = startFrame + BLINK_STAGGER_FRAMES;
            if (staggered + BLINK_DURATION_FRAMES <= frameCount && characterIsVisible(character, staggered, timeline)) startFrame = staggered;
            else shouldSchedule = false;
          }
          if (shouldSchedule) schedule[character].push(startFrame);
        }
      }
      targetFrame += track.gapFrames[gapIndex % track.gapFrames.length];
      gapIndex += 1;
    }
  }
  return schedule;
}

export function blinkStateAtFrame(schedule, frameIndex) {
  const isBlinking = (character) => schedule[character].some(
    (startFrame) => frameIndex >= startFrame && frameIndex < startFrame + BLINK_DURATION_FRAMES,
  );
  return { cat: isBlinking("cat"), bunny: isBlinking("bunny") };
}

function captionSvg(beat, captionText, episodeLabel) {
  const colors = { cat: "#62C8FF", bunny: "#FF8BCC", both: "#FFE477", none: "#FFFFFF" };
  const lines = wrapCaption(captionText, 24);
  const fontSize = lines.length > 1 ? 66 : 76;
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

export function visualState(beat, frameIndex, blinkState = { cat: false, bunny: false }) {
  const localFrame = Math.max(0, frameIndex - Math.round(beat.start * FPS));
  const mouthOpen = Math.floor(localFrame / 3) % 2 === 1;
  const isSpeaking = (character) => beat.speaker === character || beat.speaker === "both";
  const pose = (character) => {
    if (blinkState[character]) return "blink";
    if (isSpeaking(character) && mouthOpen) return "mouth-open";
    return "idle";
  };
  const bounce = Math.min(0, ...(beat.bounceAt || []).map((cue) => {
    const progress = (localFrame / FPS - cue) / BOUNCE_SECONDS;
    if (progress < 0 || progress > 1) return 0;
    const height = beat.camera === "two-shot" ? 12 : 18;
    return -Math.round(Math.sin(progress * Math.PI) * height);
  }));
  const bob = (character) => isSpeaking(character) ? (bounce || 0) : 0;
  return {
    catPose: pose("cat"),
    bunnyPose: pose("bunny"),
    catBob: bob("cat"),
    bunnyBob: bob("bunny"),
    captionText: captionTextAtFrame(beat, frameIndex),
  };
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
  overlays.push({ input: captionSvg(beat, state.captionText, episodeLabel), left: 0, top: 0 });
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
  const blinkSchedule = buildBlinkSchedule(input.timeline, frameCount);
  const eventUsage = new Map();
  const uniqueStates = new Set();

  let beatIndex = 0;
  for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
    const time = frameIndex / FPS;
    while (beatIndex < input.timeline.length - 1 && time >= input.timeline[beatIndex].end - 0.0001) beatIndex += 1;
    const beat = input.timeline[beatIndex];
    eventUsage.set(beatIndex, (eventUsage.get(beatIndex) || 0) + 1);
    const state = visualState(beat, frameIndex, blinkStateAtFrame(blinkSchedule, frameIndex));
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
    blinkScheduleFrames: blinkSchedule,
    timelineBeatFrames: Object.fromEntries(eventUsage),
    output: "final.mp4",
  };
  await writeJson(path.join(runDirectory, "render-report.json"), report);
  return { output, report };
}
