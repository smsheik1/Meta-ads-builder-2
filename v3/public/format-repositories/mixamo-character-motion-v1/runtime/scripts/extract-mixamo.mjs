import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Matrix4, Quaternion, Vector3 } from "three";

function parseArgs(values) {
  const result = {};
  for (const value of values) {
    if (!value.startsWith("--")) continue;
    const [key, ...parts] = value.slice(2).split("=");
    result[key] = parts.length ? parts.join("=") : true;
  }
  return result;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function attributes(source) {
  return Object.fromEntries([...source.matchAll(/([\w:-]+)="([^"]*)"/g)].map((match) => [match[1], match[2]]));
}

function floatArray(sourceBlock) {
  const value = sourceBlock?.match(/<float_array[^>]*>([\s\S]*?)<\/float_array>/)?.[1];
  return value ? value.trim().split(/\s+/).map(Number) : [];
}

function sourceBlock(xml, id) {
  return xml.match(new RegExp(`<source id="${escapeRegex(id)}">([\\s\\S]*?)<\\/source>`))?.[1];
}

function round(value) {
  return Number(value.toFixed(6));
}

function flattenVectors(vectors) {
  return vectors.flatMap((vector) => [round(vector.x), round(vector.y), round(vector.z)]);
}

function range(values) {
  return round(Math.max(...values) - Math.min(...values));
}

function readHierarchy(xml, animatedBones) {
  const visualScene = xml.match(/<library_visual_scenes>[\s\S]*?<visual_scene[^>]*>([\s\S]*?)<\/visual_scene>/)?.[1];
  if (!visualScene) throw new Error("Mixamo DAE has no visual scene");
  const parentByBone = {};
  const stack = [];
  const tokens = visualScene.matchAll(/<node\b([^>]*)>|<\/node>/g);
  for (const token of tokens) {
    if (token[0].startsWith("</")) {
      stack.pop();
      continue;
    }
    const attrs = attributes(token[1]);
    const candidate = [attrs.name, attrs.sid, attrs.id].find((name) => animatedBones.has(name));
    const parentBone = [...stack].reverse().find((entry) => entry.bone)?.bone || null;
    if (candidate) parentByBone[candidate] = parentBone;
    stack.push({ bone: candidate || null });
  }
  return parentByBone;
}

const args = parseArgs(process.argv.slice(2));
for (const required of ["source", "output", "id", "label"]) {
  if (!args[required]) throw new Error(`Missing --${required}`);
}

const sourcePath = path.resolve(args.source);
const outputPath = path.resolve(args.output);
const sourceBytes = await readFile(sourcePath);
const xml = sourceBytes.toString("utf8");
const unitMeter = Number(xml.match(/<unit[^>]*meter="([^"]+)"/)?.[1] || 1);
const channels = [...xml.matchAll(/<channel\s+source="#[^"]+"\s+target="([^"/]+)\/matrix"/g)];
const boneNames = [...new Set(channels.map((match) => match[1]))];
if (!boneNames.includes("mixamorig_Hips")) throw new Error("Mixamo hips animation was not found");

const localMatrices = {};
let frameCount = 0;
for (const bone of boneNames) {
  const values = floatArray(sourceBlock(xml, `${bone}-Matrix-animation-output-transform`));
  if (!values.length || values.length % 16 !== 0) throw new Error(`${bone} has invalid matrix animation data`);
  const boneFrames = values.length / 16;
  if (!frameCount) frameCount = boneFrames;
  if (boneFrames !== frameCount) throw new Error(`${bone} has ${boneFrames} frames; expected ${frameCount}`);
  localMatrices[bone] = Array.from({ length: boneFrames }, (_, index) => new Matrix4().fromArray(values, index * 16).transpose());
}

const times = floatArray(sourceBlock(xml, "mixamorig_Hips-Matrix-animation-input"));
if (times.length !== frameCount) throw new Error(`Hips has ${times.length} timestamps for ${frameCount} frames`);
const deltas = times.slice(1).map((time, index) => time - times[index]).filter((value) => value > 0);
const sortedDeltas = [...deltas].sort((a, b) => a - b);
const medianDelta = sortedDeltas[Math.floor(sortedDeltas.length / 2)];
const fps = Math.round(1 / medianDelta);
if (fps !== 30) throw new Error(`Expected a 30 fps Mixamo clip; got ${fps}`);

const parentByBone = readHierarchy(xml, new Set(boneNames));
const worldByFrame = [];
for (let frame = 0; frame < frameCount; frame += 1) {
  const memo = new Map();
  const worldFor = (bone) => {
    if (memo.has(bone)) return memo.get(bone);
    const parent = parentByBone[bone];
    const world = parent && localMatrices[parent]
      ? worldFor(parent).clone().multiply(localMatrices[bone][frame])
      : localMatrices[bone][frame].clone();
    memo.set(bone, world);
    return world;
  };
  for (const bone of boneNames) worldFor(bone);
  worldByFrame.push(memo);
}

const firstWorldQuaternions = Object.fromEntries(boneNames.map((bone) => {
  const quaternion = new Quaternion().setFromRotationMatrix(worldByFrame[0].get(bone)).normalize();
  return [bone, quaternion];
}));
const bones = {};
for (const bone of boneNames) {
  const inverseRest = firstWorldQuaternions[bone].clone().invert();
  const values = [];
  for (let frame = 0; frame < frameCount; frame += 1) {
    const current = new Quaternion().setFromRotationMatrix(worldByFrame[frame].get(bone)).normalize();
    const delta = current.multiply(inverseRest).normalize();
    values.push(round(delta.x), round(delta.y), round(delta.z), round(delta.w));
  }
  bones[bone] = { worldDeltaQuaternions: values };
}

const positionAt = (bone, frame) => new Vector3().setFromMatrixPosition(worldByFrame[frame].get(bone)).multiplyScalar(unitMeter);
const rootName = "mixamorig_Hips";
const leftFootName = boneNames.includes("mixamorig_LeftToeBase") ? "mixamorig_LeftToeBase" : "mixamorig_LeftFoot";
const rightFootName = boneNames.includes("mixamorig_RightToeBase") ? "mixamorig_RightToeBase" : "mixamorig_RightFoot";
const leftUpperLegName = "mixamorig_LeftUpLeg";
const rightUpperLegName = "mixamorig_RightUpLeg";
const rootRest = positionAt(rootName, 0);
const leftRest = positionAt(leftFootName, 0);
const rightRest = positionAt(rightFootName, 0);
const roots = Array.from({ length: frameCount }, (_, frame) => positionAt(rootName, frame).sub(rootRest));
const leftFeet = Array.from({ length: frameCount }, (_, frame) => positionAt(leftFootName, frame).sub(leftRest));
const rightFeet = Array.from({ length: frameCount }, (_, frame) => positionAt(rightFootName, frame).sub(rightRest));
const leftUpperLegToFoot = Array.from({ length: frameCount }, (_, frame) => positionAt(leftFootName, frame).sub(positionAt(leftUpperLegName, frame)));
const rightUpperLegToFoot = Array.from({ length: frameCount }, (_, frame) => positionAt(rightFootName, frame).sub(positionAt(rightUpperLegName, frame)));
const absoluteLeftY = Array.from({ length: frameCount }, (_, frame) => positionAt(leftFootName, frame).y);
const absoluteRightY = Array.from({ length: frameCount }, (_, frame) => positionAt(rightFootName, frame).y);
const floorY = Math.min(...absoluteLeftY, ...absoluteRightY);
const contactThreshold = 0.045;
const contactsFor = (absoluteY) => absoluteY.map((value, index) => {
  const before = absoluteY[Math.max(0, index - 1)];
  const after = absoluteY[Math.min(frameCount - 1, index + 1)];
  const verticalSpeed = Math.abs(after - before) * fps * 0.5;
  return value <= floorY + contactThreshold && verticalSpeed <= 0.45 ? 1 : 0;
});
const legLengthAtRest = (names) => names.slice(1).reduce((total, name, index) => (
  total + positionAt(names[index], 0).distanceTo(positionAt(name, 0))
), 0);
const sourceLegLengthsMeters = {
  left: round(legLengthAtRest([leftUpperLegName, "mixamorig_LeftLeg", "mixamorig_LeftFoot", leftFootName])),
  right: round(legLengthAtRest([rightUpperLegName, "mixamorig_RightLeg", "mixamorig_RightFoot", rightFootName])),
};
const sourceLegLengthMeters = round((sourceLegLengthsMeters.left + sourceLegLengthsMeters.right) * 0.5);
const rootRanges = {
  x: range(roots.map((value) => value.x)),
  y: range(roots.map((value) => value.y)),
  z: range(roots.map((value) => value.z)),
};

const output = {
  schemaVersion: 1,
  kind: "mixamo-world-delta-v1",
  id: args.id,
  label: args.label,
  fps,
  frameCount,
  durationSeconds: round(frameCount / fps),
  sourceEndTimeSeconds: round(times.at(-1)),
  source: {
    fileName: path.basename(sourcePath),
    sha256: createHash("sha256").update(sourceBytes).digest("hex"),
    unitMeter,
    importedAt: new Date().toISOString(),
  },
  metrics: { sourceLegLengthMeters, sourceLegLengthsMeters, rootRangesMeters: rootRanges },
  root: { bone: rootName, positions: flattenVectors(roots) },
  feet: {
    left: {
      bone: leftFootName,
      positions: flattenVectors(leftFeet),
      upperLegBone: leftUpperLegName,
      upperLegToFootVectors: flattenVectors(leftUpperLegToFoot),
      floorOffsetFromRestMeters: round(floorY - positionAt(leftFootName, 0).y),
      contacts: contactsFor(absoluteLeftY),
    },
    right: {
      bone: rightFootName,
      positions: flattenVectors(rightFeet),
      upperLegBone: rightUpperLegName,
      upperLegToFootVectors: flattenVectors(rightUpperLegToFoot),
      floorOffsetFromRestMeters: round(floorY - positionAt(rightFootName, 0).y),
      contacts: contactsFor(absoluteRightY),
    },
  },
  bones,
};

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(output)}\n`);
console.log(JSON.stringify({ output: outputPath, id: output.id, frames: frameCount, durationSeconds: output.durationSeconds, bones: boneNames.length, rootRangesMeters: rootRanges }));
