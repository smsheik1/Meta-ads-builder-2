import { link, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { execute, exists, hashValue, writeJson } from "./common.mjs";
import { validateRun } from "./validate.mjs";

const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 24;
const RENDERER_VERSION = 16;
const BOUNCE_SECONDS = 0.36;
const SPEECH_ANALYSIS_SAMPLE_RATE = 24000;
const SPEECH_LEVEL_PERCENTILE = 0.9;
const SPEECH_THRESHOLD_RANGE_DB = [-55, -28];
const SPEECH_THRESHOLD_BELOW_STRONG_DB = 18;
const SPEECH_ACTIVITY_PADDING_FRAMES = 2;
const SPEECH_MINIMUM_PAUSE_FRAMES = 3;
const MOUTH_MINIMUM_POSE_FRAMES = 2;
const BLINK_DURATION_FRAMES = 3;
const BLINK_BOUNDARY_SNAP_FRAMES = 12;
const BLINK_MINIMUM_GAP_FRAMES = 72;
const BLINK_COLLISION_FRAMES = 5;
const BLINK_STAGGER_FRAMES = 8;
export const CAPTION_TOP_Y = 1400;
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

export function buildSpeechActivityTrack(frameLevelsDb) {
  if (!frameLevelsDb.length) return { activeFrames: [], strongLevelDb: -180, thresholdDb: -55 };
  const sorted = [...frameLevelsDb].sort((left, right) => left - right);
  const strongLevelDb = sorted[Math.floor((sorted.length - 1) * SPEECH_LEVEL_PERCENTILE)];
  const thresholdDb = Math.max(
    SPEECH_THRESHOLD_RANGE_DB[0],
    Math.min(SPEECH_THRESHOLD_RANGE_DB[1], strongLevelDb - SPEECH_THRESHOLD_BELOW_STRONG_DB),
  );
  const activeFrames = frameLevelsDb.map((_, frameIndex) => {
    const first = Math.max(0, frameIndex - SPEECH_ACTIVITY_PADDING_FRAMES);
    const last = Math.min(frameLevelsDb.length - 1, frameIndex + SPEECH_ACTIVITY_PADDING_FRAMES);
    for (let candidate = first; candidate <= last; candidate += 1) {
      if (frameLevelsDb[candidate] >= thresholdDb) return true;
    }
    return false;
  });
  for (let start = 0; start < activeFrames.length;) {
    if (activeFrames[start]) {
      start += 1;
      continue;
    }
    let end = start + 1;
    while (end < activeFrames.length && !activeFrames[end]) end += 1;
    if (start > 0 && end < activeFrames.length && end - start < SPEECH_MINIMUM_PAUSE_FRAMES) {
      activeFrames.fill(true, start, end);
    }
    start = end;
  }
  return { activeFrames, strongLevelDb, thresholdDb };
}

export function buildMouthAnimationTrack(frameLevelsDb, activeFrames) {
  if (!frameLevelsDb.length || frameLevelsDb.length !== activeFrames.length) return [];
  const activeLevels = frameLevelsDb.filter((_, index) => activeFrames[index]).sort((left, right) => left - right);
  if (!activeLevels.length) return activeFrames.map(() => false);
  const percentile = (value) => activeLevels[Math.floor((activeLevels.length - 1) * value)];
  const openLevelDb = percentile(0.58);
  const measuredCloseLevelDb = percentile(0.32);
  const closeLevelDb = Math.min(measuredCloseLevelDb, openLevelDb - 3);
  const mouthOpenFrames = [];
  let isOpen = false;
  let framesInPose = MOUTH_MINIMUM_POSE_FRAMES;
  for (let frameIndex = 0; frameIndex < frameLevelsDb.length; frameIndex += 1) {
    if (!activeFrames[frameIndex]) {
      isOpen = false;
      framesInPose = MOUTH_MINIMUM_POSE_FRAMES;
    } else if (framesInPose >= MOUTH_MINIMUM_POSE_FRAMES) {
      if (!isOpen && frameLevelsDb[frameIndex] >= openLevelDb) {
        isOpen = true;
        framesInPose = 0;
      } else if (isOpen && frameLevelsDb[frameIndex] <= closeLevelDb) {
        isOpen = false;
        framesInPose = 0;
      }
    }
    mouthOpenFrames.push(isOpen);
    framesInPose += 1;
  }
  return mouthOpenFrames;
}

function pcmFrameLevels(pcm, frameCount) {
  const samplesPerFrame = SPEECH_ANALYSIS_SAMPLE_RATE / FPS;
  return Array.from({ length: frameCount }, (_, frameIndex) => {
    const firstByte = frameIndex * samplesPerFrame * 2;
    const lastByte = Math.min(pcm.length, firstByte + samplesPerFrame * 2);
    let squared = 0;
    let sampleCount = 0;
    for (let byte = firstByte; byte + 1 < lastByte; byte += 2) {
      const sample = pcm.readInt16LE(byte) / 32768;
      squared += sample * sample;
      sampleCount += 1;
    }
    if (!sampleCount) return -180;
    return 20 * Math.log10(Math.sqrt(squared / sampleCount) + 1e-9);
  });
}

async function analyzeSpeechActivity({ audioFile, cacheDirectory, frameCount }) {
  const pcmFile = path.join(cacheDirectory, "speech-activity.pcm");
  if (!(await exists(pcmFile))) {
    await execute("ffmpeg", [
      "-y", "-v", "error", "-i", audioFile, "-vn", "-ac", "1",
      "-ar", String(SPEECH_ANALYSIS_SAMPLE_RATE), "-f", "s16le", pcmFile,
    ], { capture: true });
  }
  const frameLevelsDb = pcmFrameLevels(await readFile(pcmFile), frameCount);
  return { ...buildSpeechActivityTrack(frameLevelsDb), frameLevelsDb };
}

function frameRanges(frames) {
  const ranges = [];
  for (const frame of frames) {
    const previous = ranges.at(-1);
    if (previous && frame === previous[1] + 1) previous[1] = frame;
    else ranges.push([frame, frame]);
  }
  return ranges;
}

export function captionSvg(beat, captionText, episodeLabel) {
  const colors = { cat: "#62C8FF", bunny: "#FF8BCC", both: "#FFE477", none: "#FFFFFF" };
  const captionSpeaker = beat.speaker === "both" ? beat.captionSpeaker : beat.speaker;
  const lines = wrapCaption(captionText, 24);
  const fontSize = lines.length > 1 ? 66 : 76;
  const lineHeight = fontSize + 12;
  const tspans = lines.map((line, index) => `<tspan x="540" dy="${index ? lineHeight : 0}">${escapeXml(line)}</tspan>`).join("");
  return Buffer.from(`<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <text x="540" y="${CAPTION_TOP_Y + fontSize}" text-anchor="middle" font-family="Arial Rounded MT Bold,Arial,sans-serif" font-size="${fontSize}" font-weight="800" fill="${colors[captionSpeaker]}" stroke="#07101c" stroke-width="12" paint-order="stroke" stroke-linejoin="round">${tspans}</text>
    <rect x="173" y="1764" width="734" height="88" rx="44" fill="#09121f" fill-opacity="0.76"/>
    <text x="540" y="1825" text-anchor="middle" font-family="Arial Rounded MT Bold,Arial,sans-serif" font-size="45" font-weight="800" fill="#FFE477" stroke="#07101c" stroke-width="7" paint-order="stroke">${escapeXml(episodeLabel)}</text>
  </svg>`);
}

export function visualState(beat, frameIndex, blinkState = { cat: false, bunny: false }, mouthOpen = true) {
  const localFrame = Math.max(0, frameIndex - Math.round(beat.start * FPS));
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
    audio: validated.receipt.audio.sha256,
    background: background.sha256,
    characterAssets: assets.characters.flatMap((character) => character.poses.map((pose) => pose.sha256)),
  }).slice(0, 16);
  const cacheDirectory = path.join(runDirectory, `.render-cache-${renderHash}`);
  const framesDirectory = path.join(cacheDirectory, "frames");
  await mkdir(framesDirectory, { recursive: true });
  const prepared = await prepareAssets({ root, cacheDirectory, background, assets });
  const frameCount = Math.ceil(durationSeconds * FPS);
  const blinkSchedule = buildBlinkSchedule(input.timeline, frameCount);
  const speechActivity = await analyzeSpeechActivity({ audioFile, cacheDirectory, frameCount });
  const mouthOpenFrames = Array(frameCount).fill(false);
  for (const beat of input.timeline) {
    if (beat.speaker === "none") continue;
    const firstFrame = Math.max(0, Math.round(beat.start * FPS));
    const lastFrame = Math.min(frameCount, Math.round(beat.end * FPS));
    const localTrack = buildMouthAnimationTrack(
      speechActivity.frameLevelsDb.slice(firstFrame, lastFrame),
      speechActivity.activeFrames.slice(firstFrame, lastFrame),
    );
    localTrack.forEach((isOpen, offset) => { mouthOpenFrames[firstFrame + offset] = isOpen; });
  }
  const eventUsage = new Map();
  const uniqueStates = new Set();
  const inactiveSpeakingFrames = [];

  let beatIndex = 0;
  for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
    const time = frameIndex / FPS;
    while (beatIndex < input.timeline.length - 1 && time >= input.timeline[beatIndex].end - 0.0001) beatIndex += 1;
    const beat = input.timeline[beatIndex];
    eventUsage.set(beatIndex, (eventUsage.get(beatIndex) || 0) + 1);
    if (beat.speaker !== "none" && !speechActivity.activeFrames[frameIndex]) inactiveSpeakingFrames.push(frameIndex);
    const state = visualState(beat, frameIndex, blinkStateAtFrame(blinkSchedule, frameIndex), mouthOpenFrames[frameIndex]);
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
    speechActivity: {
      strongLevelDb: Number(speechActivity.strongLevelDb.toFixed(1)),
      thresholdDb: Number(speechActivity.thresholdDb.toFixed(1)),
      activeFrames: speechActivity.activeFrames.filter(Boolean).length,
      inactiveFrames: speechActivity.activeFrames.filter((active) => !active).length,
      inactiveSpeakingFrameRanges: frameRanges(inactiveSpeakingFrames),
    },
    mouthAnimation: {
      method: "audio-envelope-hysteresis",
      minimumPoseFrames: MOUTH_MINIMUM_POSE_FRAMES,
      openFrames: mouthOpenFrames.filter(Boolean).length,
      transitions: mouthOpenFrames.slice(1).filter((isOpen, index) => isOpen !== mouthOpenFrames[index]).length,
    },
    timelineBeatFrames: Object.fromEntries(eventUsage),
    output: "final.mp4",
  };
  await writeJson(path.join(runDirectory, "render-report.json"), report);
  return { output, report };
}
