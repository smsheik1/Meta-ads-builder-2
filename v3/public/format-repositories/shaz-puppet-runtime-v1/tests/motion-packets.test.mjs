import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  loadMotionPacketRegistry,
  validatePerformancePlan,
} from "../runtime/motion-packets.mjs";
import { loadPoseRegistry } from "../runtime/run-common.mjs";
import { loadManifest } from "../runtime/rig-v2-renderer.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function loadRegistries() {
  const manifest = await loadManifest(path.join(root, "rig-v2", "runtime.json"));
  const poseRegistry = await loadPoseRegistry(root, manifest);
  const packetRegistry = await loadMotionPacketRegistry({ root, poseRegistry });
  return { poseRegistry, packetRegistry };
}

function withCertifiedTestPacket(packetRegistry) {
  const neutral = packetRegistry.neutralPacket.path.hold;
  const packet = {
    id: "certified-test-emphasis",
    status: "eligible",
    semantics: { intents: ["emphasis"], anchors: ["phrase"] },
    path: {
      entry: [
        { poseId: neutral.poseId, poseFrame: neutral.poseFrame },
        { poseId: "aha", poseFrame: 1 },
        { poseId: "aha", poseFrame: 7 },
      ],
      hold: { poseId: "aha", poseFrame: 13, minimumFrames: 2, maximumFrames: 24 },
      release: [
        { poseId: "aha", poseFrame: 7 },
        { poseId: "aha", poseFrame: 1 },
        { poseId: neutral.poseId, poseFrame: neutral.poseFrame },
      ],
    },
  };
  return {
    ...packetRegistry,
    byId: new Map([...packetRegistry.byId, [packet.id, packet]]),
  };
}

function validPlan(overrides = {}) {
  return {
    schemaVersion: "shaz-body-language-performance-v1",
    title: "One audio-bound body-language proof",
    fps: 24,
    audioFile: "user-audio.wav",
    durationFrames: 240,
    events: [
      {
        packetId: "certified-test-emphasis",
        startFrame: 48,
        holdFrames: 12,
        intent: "Land one important idea",
        anchor: { kind: "phrase", label: "the key phrase", frame: 51 },
        rationale: "The gesture peaks once on the sentence's semantic emphasis.",
      },
    ],
    ...overrides,
  };
}

test("motion registry checksum-binds the neutral anchor and refuses to certify legacy Aha", async () => {
  const { packetRegistry } = await loadRegistries();
  const neutral = packetRegistry.byId.get("neutral-listening");
  const aha = packetRegistry.byId.get("key-point-aha-candidate");
  const keyPoint = packetRegistry.byId.get("key-point-body-candidate");

  assert.equal(packetRegistry.fps, 24);
  assert.equal(packetRegistry.neutralPacketId, "neutral-listening");
  assert.equal(neutral.status, "eligible");
  assert.deepEqual(neutral.path.entry, []);
  assert.deepEqual(neutral.path.release, []);
  assert.deepEqual(neutral.path.hold, {
    poseId: "neutral-listening",
    poseFrame: 1,
    minimumFrames: 1,
    maximumFrames: 1800,
  });
  assert.equal(
    neutral.sources[0].poseFileSha256,
    "ca91808736aca7c2b4be3881a688abf9c755617bc61c9b21516a8e2361540406",
  );
  assert.equal(aha.status, "ineligible");
  assert.match(aha.ineligibleReason, /no human-reviewed release/);
  assert.equal(keyPoint.status, "ineligible");
  assert.match(keyPoint.ineligibleReason, /direct normal-speed visual review/);
  assert.equal(keyPoint.sources[0].poseFileSha256, "6fc4f1da6fea7392bd8879e39c336c4e54641c2d805993025af9ad6865d9f8c5");
});

test("motion registry rejects checksum drift and invented pose frames", async (t) => {
  const manifest = await loadManifest(path.join(root, "rig-v2", "runtime.json"));
  const poseRegistry = await loadPoseRegistry(root, manifest);
  const source = JSON.parse(await fs.readFile(path.join(root, "motion-packets", "index.json"), "utf8"));
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-motion-packets-"));
  t.after(() => fs.rm(scratch, { recursive: true, force: true }));
  await fs.mkdir(path.join(scratch, "motion-packets"), { recursive: true });

  const checksumDrift = structuredClone(source);
  checksumDrift.packets[0].sources[0].poseFileSha256 = "0".repeat(64);
  await fs.writeFile(
    path.join(scratch, "motion-packets", "index.json"),
    `${JSON.stringify(checksumDrift)}\n`,
  );
  await assert.rejects(
    loadMotionPacketRegistry({ root: scratch, poseRegistry }),
    /checksum mismatch/,
  );

  const inventedFrame = structuredClone(source);
  inventedFrame.packets[0].path.hold.poseFrame = 2;
  await fs.writeFile(
    path.join(scratch, "motion-packets", "index.json"),
    `${JSON.stringify(inventedFrame)}\n`,
  );
  await assert.rejects(
    loadMotionPacketRegistry({ root: scratch, poseRegistry }),
    /poseFrame must be an integer from 1 to 1/,
  );
});

test("eligible non-neutral packets require a checksum-bound review and real neutral boundaries", async (t) => {
  const manifest = await loadManifest(path.join(root, "rig-v2", "runtime.json"));
  const poseRegistry = await loadPoseRegistry(root, manifest);
  const source = JSON.parse(await fs.readFile(path.join(root, "motion-packets", "index.json"), "utf8"));
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "shaz-certified-packet-"));
  t.after(() => fs.rm(scratch, { recursive: true, force: true }));
  await fs.mkdir(path.join(scratch, "motion-packets"), { recursive: true });
  await fs.mkdir(path.join(scratch, "evidence"), { recursive: true });
  const evidence = Buffer.from("fixture review: approved only for contract validation\n");
  const evidencePath = path.join(scratch, "evidence", "fixture-review.txt");
  await fs.writeFile(evidencePath, evidence);
  const evidenceSha256 = crypto.createHash("sha256").update(evidence).digest("hex");
  source.packets.push({
    id: "certified-contract-fixture",
    status: "eligible",
    sources: [
      source.packets[0].sources[0],
      source.packets[2].sources[0],
    ],
    semantics: { intents: ["emphasis"], anchors: ["phrase"] },
    path: {
      entry: [
        { poseId: "neutral-listening", poseFrame: 1 },
        { poseId: "key-point", poseFrame: 1 },
      ],
      hold: { poseId: "key-point", poseFrame: 27, minimumFrames: 2, maximumFrames: 24 },
      release: [
        { poseId: "key-point", poseFrame: 1 },
        { poseId: "neutral-listening", poseFrame: 1 },
      ],
    },
    returnsTo: {
      packetId: "neutral-listening",
      poseId: "neutral-listening",
      poseFrame: 1,
    },
    certification: {
      reviewStatus: "approved",
      evidencePath: "evidence/fixture-review.txt",
      evidenceSha256,
    },
  });
  await fs.writeFile(
    path.join(scratch, "motion-packets", "index.json"),
    `${JSON.stringify(source)}\n`,
  );

  const loaded = await loadMotionPacketRegistry({ root: scratch, poseRegistry });
  assert.equal(loaded.byId.get("certified-contract-fixture").certification.evidenceSha256, evidenceSha256);

  const unsafe = structuredClone(source);
  unsafe.packets.at(-1).path.release = [{ poseId: "key-point", poseFrame: 1 }];
  await fs.writeFile(
    path.join(scratch, "motion-packets", "index.json"),
    `${JSON.stringify(unsafe)}\n`,
  );
  await assert.rejects(
    loadMotionPacketRegistry({ root: scratch, poseRegistry }),
    /must release to the official neutral anchor/,
  );

  const sourceDialogueMouth = structuredClone(source);
  sourceDialogueMouth.packets.at(-1).sources[1] = source.packets[1].sources[0];
  sourceDialogueMouth.packets.at(-1).path.entry[1] = { poseId: "aha", poseFrame: 1 };
  sourceDialogueMouth.packets.at(-1).path.hold = {
    poseId: "aha",
    poseFrame: 13,
    minimumFrames: 2,
    maximumFrames: 24,
  };
  sourceDialogueMouth.packets.at(-1).path.release[0] = { poseId: "aha", poseFrame: 1 };
  await fs.writeFile(
    path.join(scratch, "motion-packets", "index.json"),
    `${JSON.stringify(sourceDialogueMouth)}\n`,
  );
  await assert.rejects(
    loadMotionPacketRegistry({ root: scratch, poseRegistry }),
    /cannot replay source-dialogue Mouth drawings/,
  );
});

test("performance plan is audio-derived, sparse, anchored at the apex, and neutral by default", async () => {
  const { packetRegistry: loaded } = await loadRegistries();
  const packetRegistry = withCertifiedTestPacket(loaded);
  const timeline = validatePerformancePlan(validPlan(), {
    packetRegistry,
    audioDurationSeconds: 10,
  });

  assert.equal(timeline.durationFrames, 240);
  assert.equal(timeline.neutralPacketId, "neutral-listening");
  assert.equal(timeline.events[0].holdStartFrame, 51);
  assert.equal(timeline.events[0].endFrameExclusive, 66);
  assert.equal(timeline.coveredFrames, 18);
  assert.equal(timeline.coverageRatio, 18 / 240);

  const allNeutral = validatePerformancePlan(validPlan({ events: [] }), {
    packetRegistry,
    audioDurationSeconds: 10,
  });
  assert.equal(allNeutral.coveredFrames, 0);
  assert.deepEqual(allNeutral.events, []);
});

test("performance plan rejects unsafe packets, explicit neutral, and timing not derived from audio", async () => {
  const { packetRegistry: loaded } = await loadRegistries();
  const packetRegistry = withCertifiedTestPacket(loaded);

  assert.throws(
    () => validatePerformancePlan(validPlan({
      events: [{
        ...validPlan().events[0],
        packetId: "key-point-aha-candidate",
      }],
    }), { packetRegistry, audioDurationSeconds: 10 }),
    /ineligible packet/,
  );
  assert.throws(
    () => validatePerformancePlan(validPlan({
      events: [{
        ...validPlan().events[0],
        packetId: "neutral-listening",
      }],
    }), { packetRegistry, audioDurationSeconds: 10 }),
    /must not schedule neutral explicitly/,
  );
  assert.throws(
    () => validatePerformancePlan(validPlan({ durationFrames: 239 }), {
      packetRegistry,
      audioDurationSeconds: 10,
    }),
    /must be 240, derived from the measured audio duration/,
  );
  assert.throws(
    () => validatePerformancePlan(validPlan({ fps: 30 }), {
      packetRegistry,
      audioDurationSeconds: 10,
    }),
    /fixed 24fps/,
  );
});

test("performance plan rejects a misplaced apex anchor, tight cooldown, and excessive coverage", async () => {
  const { packetRegistry: loaded } = await loadRegistries();
  const packetRegistry = withCertifiedTestPacket(loaded);
  const baseEvent = validPlan().events[0];

  assert.throws(
    () => validatePerformancePlan(validPlan({
      events: [{
        ...baseEvent,
        anchor: { ...baseEvent.anchor, frame: 52 },
      }],
    }), { packetRegistry, audioDurationSeconds: 10 }),
    /anchor.frame must equal the packet apex frame 51/,
  );

  const first = { ...baseEvent, startFrame: 24, anchor: { ...baseEvent.anchor, frame: 27 } };
  const second = { ...baseEvent, startFrame: 48, anchor: { ...baseEvent.anchor, frame: 51 } };
  assert.throws(
    () => validatePerformancePlan(validPlan({ events: [first, second] }), {
      packetRegistry,
      audioDurationSeconds: 10,
    }),
    /leaves 6 cooldown frames; minimum is 12/,
  );

  assert.throws(
    () => validatePerformancePlan(validPlan({
      events: [{
        ...baseEvent,
        startFrame: 0,
        holdFrames: 24,
        anchor: { ...baseEvent.anchor, frame: 3 },
      }],
      durationFrames: 48,
    }), { packetRegistry, audioDurationSeconds: 2 }),
    /non-neutral motion covers 0\.625 of the audio; maximum is 0\.5/,
  );
});
