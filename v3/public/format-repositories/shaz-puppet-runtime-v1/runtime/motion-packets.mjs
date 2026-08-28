import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const PACKET_SCHEMA = "shaz-motion-packet-registry-v1";
const PERFORMANCE_SCHEMA = "shaz-body-language-performance-v1";
const PACKET_ID = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;
const SHA256 = /^[a-f0-9]{64}$/;
const ANCHOR_KINDS = new Set(["phrase", "beat", "pause"]);

function exactKeys(value, allowed, context) {
  const extras = Object.keys(value).filter((key) => !allowed.includes(key));
  if (extras.length > 0) {
    throw new Error(`${context} contains unsupported key(s): ${extras.join(", ")}`);
  }
}

function object(value, context) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${context} must be an object`);
  }
  return value;
}

function boundedString(value, minimum, maximum, context) {
  if (typeof value !== "string" || value.trim().length < minimum || value.length > maximum) {
    throw new Error(`${context} must contain ${minimum}-${maximum} characters`);
  }
  return value.trim();
}

function integer(value, minimum, maximum, context) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${context} must be an integer from ${minimum} to ${maximum}`);
  }
  return value;
}

function numberInRange(value, minimum, maximum, context) {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`${context} must be a number from ${minimum} to ${maximum}`);
  }
  return value;
}

function safeRelativePath(value, context) {
  boundedString(value, 1, 220, context);
  if (path.isAbsolute(value) || value.includes("\\")) {
    throw new Error(`${context} must be a forward-slash relative path`);
  }
  const parts = value.split("/");
  if (parts.some((part) => part === "" || part === "." || part === "..")) {
    throw new Error(`${context} must not contain empty, current, or parent segments`);
  }
  return value;
}

async function fileSha256(file) {
  return crypto.createHash("sha256").update(await fs.readFile(file)).digest("hex");
}

function normalizeSemantics(value, context) {
  object(value, context);
  exactKeys(value, ["intents", "anchors"], context);
  const normalizeTerms = (terms, field) => {
    if (!Array.isArray(terms) || terms.length < 1 || terms.length > 8) {
      throw new Error(`${context}.${field} must contain 1-8 semantic labels`);
    }
    const normalized = terms.map((term, index) => boundedString(
      term,
      2,
      48,
      `${context}.${field}[${index}]`,
    ));
    if (new Set(normalized).size !== normalized.length) {
      throw new Error(`${context}.${field} must not contain duplicates`);
    }
    return normalized;
  };
  return {
    intents: normalizeTerms(value.intents, "intents"),
    anchors: normalizeTerms(value.anchors, "anchors"),
  };
}

function normalizeSource(source, packetId, sourceIndex, poseRegistry) {
  const context = `motion packet ${packetId}.sources[${sourceIndex}]`;
  object(source, context);
  exactKeys(source, ["poseId", "poseFileSha256"], context);
  const poseId = boundedString(source.poseId, 1, 64, `${context}.poseId`);
  const pose = poseRegistry.byId.get(poseId);
  if (!pose) throw new Error(`${context} references unknown registered pose ${poseId}`);
  if (!SHA256.test(source.poseFileSha256 ?? "")) {
    throw new Error(`${context}.poseFileSha256 must be a lowercase SHA-256`);
  }
  if (source.poseFileSha256 !== pose.sha256) {
    throw new Error(`motion packet ${packetId} checksum mismatch for pose ${poseId}`);
  }
  return { poseId, poseFileSha256: source.poseFileSha256, pose };
}

function normalizeStep(step, context, sourcesById) {
  object(step, context);
  exactKeys(step, ["poseId", "poseFrame"], context);
  const source = sourcesById.get(step.poseId);
  if (!source) throw new Error(`${context} references undeclared source ${step.poseId}`);
  const poseFrame = integer(
    step.poseFrame,
    1,
    source.pose.recipe.durationFrames,
    `${context}.poseFrame`,
  );
  return { poseId: step.poseId, poseFrame };
}

function sameStep(left, right) {
  return left.poseId === right.poseId && left.poseFrame === right.poseFrame;
}

function normalizePath(value, packetId, sourcesById) {
  const context = `motion packet ${packetId}.path`;
  object(value, context);
  exactKeys(value, ["entry", "hold", "release"], context);
  const normalizePhase = (steps, phase) => {
    if (!Array.isArray(steps) || steps.length > 120) {
      throw new Error(`${context}.${phase} must contain no more than 120 real recipe frames`);
    }
    const normalized = steps.map((step, index) => normalizeStep(
      step,
      `${context}.${phase}[${index}]`,
      sourcesById,
    ));
    for (let index = 1; index < normalized.length; index += 1) {
      if (sameStep(normalized[index - 1], normalized[index])) {
        throw new Error(`${context}.${phase} repeats a frame; repetitions belong in the explicit hold`);
      }
    }
    return normalized;
  };
  const entry = normalizePhase(value.entry, "entry");
  const release = normalizePhase(value.release, "release");
  object(value.hold, `${context}.hold`);
  exactKeys(
    value.hold,
    ["poseId", "poseFrame", "minimumFrames", "maximumFrames"],
    `${context}.hold`,
  );
  const holdStep = normalizeStep(
    { poseId: value.hold.poseId, poseFrame: value.hold.poseFrame },
    `${context}.hold`,
    sourcesById,
  );
  const minimumFrames = integer(value.hold.minimumFrames, 1, 1800, `${context}.hold.minimumFrames`);
  const maximumFrames = integer(value.hold.maximumFrames, minimumFrames, 1800, `${context}.hold.maximumFrames`);
  if (entry.length > 0 && sameStep(entry.at(-1), holdStep)) {
    throw new Error(`${context}.entry ends on the hold frame; use hold.minimumFrames instead`);
  }
  if (release.length > 0 && sameStep(release[0], holdStep)) {
    throw new Error(`${context}.release begins on the hold frame; use the explicit hold instead`);
  }
  return {
    entry,
    hold: { ...holdStep, minimumFrames, maximumFrames },
    release,
  };
}

function normalizeReturnsTo(value, packetId, sourcesById) {
  const context = `motion packet ${packetId}.returnsTo`;
  object(value, context);
  exactKeys(value, ["packetId", "poseId", "poseFrame"], context);
  return {
    packetId: boundedString(value.packetId, 1, 64, `${context}.packetId`),
    ...normalizeStep(
      { poseId: value.poseId, poseFrame: value.poseFrame },
      context,
      sourcesById,
    ),
  };
}

async function normalizeCertification(value, packetId, root) {
  const context = `motion packet ${packetId}.certification`;
  object(value, context);
  exactKeys(value, ["reviewStatus", "evidencePath", "evidenceSha256"], context);
  if (value.reviewStatus !== "approved") {
    throw new Error(`${context}.reviewStatus must be approved`);
  }
  const evidencePath = safeRelativePath(value.evidencePath, `${context}.evidencePath`);
  if (!SHA256.test(value.evidenceSha256 ?? "")) {
    throw new Error(`${context}.evidenceSha256 must be a lowercase SHA-256`);
  }
  const absoluteEvidencePath = path.resolve(root, evidencePath);
  if (!absoluteEvidencePath.startsWith(`${root}${path.sep}`)) {
    throw new Error(`${context}.evidencePath escapes the Format root`);
  }
  if (await fileSha256(absoluteEvidencePath) !== value.evidenceSha256) {
    throw new Error(`${context} checksum mismatch`);
  }
  return {
    reviewStatus: "approved",
    evidencePath,
    evidenceSha256: value.evidenceSha256,
  };
}

function normalizePolicy(value) {
  object(value, "motion packet policy");
  exactKeys(value, [
    "minimumCooldownFrames",
    "maximumNonNeutralCoverageRatio",
    "maximumNonNeutralEventsPerMinute",
    "maximumPlanFrames",
  ], "motion packet policy");
  return {
    minimumCooldownFrames: integer(
      value.minimumCooldownFrames,
      1,
      120,
      "motion packet policy.minimumCooldownFrames",
    ),
    maximumNonNeutralCoverageRatio: numberInRange(
      value.maximumNonNeutralCoverageRatio,
      0.1,
      0.75,
      "motion packet policy.maximumNonNeutralCoverageRatio",
    ),
    maximumNonNeutralEventsPerMinute: integer(
      value.maximumNonNeutralEventsPerMinute,
      1,
      30,
      "motion packet policy.maximumNonNeutralEventsPerMinute",
    ),
    maximumPlanFrames: integer(
      value.maximumPlanFrames,
      24,
      7200,
      "motion packet policy.maximumPlanFrames",
    ),
  };
}

async function loadMotionPacketRegistry({ root, poseRegistry }) {
  if (!poseRegistry?.byId || !(poseRegistry.byId instanceof Map)) {
    throw new Error("poseRegistry.byId must be a Map returned by loadPoseRegistry");
  }
  const registryPath = path.join(root, "motion-packets", "index.json");
  const raw = JSON.parse(await fs.readFile(registryPath, "utf8"));
  object(raw, "motion packet registry");
  exactKeys(raw, ["schemaVersion", "fps", "neutralPacketId", "policy", "packets"], "motion packet registry");
  if (raw.schemaVersion !== PACKET_SCHEMA) {
    throw new Error(`unsupported motion packet registry schema ${raw.schemaVersion}`);
  }
  if (raw.fps !== 24) throw new Error("motion packet registry fps must be 24");
  const neutralPacketId = boundedString(raw.neutralPacketId, 1, 64, "motion packet registry.neutralPacketId");
  const policy = normalizePolicy(raw.policy);
  if (!Array.isArray(raw.packets) || raw.packets.length < 1 || raw.packets.length > 64) {
    throw new Error("motion packet registry must contain 1-64 packets");
  }

  const byId = new Map();
  for (const [index, record] of raw.packets.entries()) {
    const context = `motion packet registry.packets[${index}]`;
    object(record, context);
    const commonKeys = ["id", "status", "sources", "semantics"];
    if (record.status === "eligible") {
      exactKeys(record, [...commonKeys, "path", "returnsTo", "certification"], context);
    } else if (record.status === "ineligible") {
      exactKeys(record, [...commonKeys, "ineligibleReason"], context);
    } else {
      throw new Error(`${context}.status must be eligible or ineligible`);
    }
    if (!PACKET_ID.test(record.id ?? "") || byId.has(record.id)) {
      throw new Error(`${context}.id is invalid or duplicated: ${record.id}`);
    }
    if (!Array.isArray(record.sources) || record.sources.length < 1 || record.sources.length > 8) {
      throw new Error(`motion packet ${record.id}.sources must contain 1-8 registered poses`);
    }
    const sources = record.sources.map((source, sourceIndex) => normalizeSource(
      source,
      record.id,
      sourceIndex,
      poseRegistry,
    ));
    const sourcesById = new Map(sources.map((source) => [source.poseId, source]));
    if (sourcesById.size !== sources.length) {
      throw new Error(`motion packet ${record.id}.sources contains duplicate pose ids`);
    }
    const semantics = normalizeSemantics(record.semantics, `motion packet ${record.id}.semantics`);
    if (record.status === "ineligible") {
      byId.set(record.id, {
        id: record.id,
        status: "ineligible",
        sources,
        sourcesById,
        semantics,
        ineligibleReason: boundedString(
          record.ineligibleReason,
          16,
          420,
          `motion packet ${record.id}.ineligibleReason`,
        ),
      });
      continue;
    }
    const normalized = {
      id: record.id,
      status: "eligible",
      sources,
      sourcesById,
      semantics,
      path: normalizePath(record.path, record.id, sourcesById),
      returnsTo: normalizeReturnsTo(record.returnsTo, record.id, sourcesById),
      certification: record.certification,
    };
    byId.set(record.id, normalized);
  }

  const neutralPacket = byId.get(neutralPacketId);
  if (!neutralPacket || neutralPacket.status !== "eligible") {
    throw new Error("neutralPacketId must reference an eligible packet");
  }
  if (neutralPacket.path.entry.length !== 0 || neutralPacket.path.release.length !== 0) {
    throw new Error("the neutral packet may contain only its explicit hold frame");
  }
  const neutralAnchor = {
    packetId: neutralPacket.id,
    poseId: neutralPacket.path.hold.poseId,
    poseFrame: neutralPacket.path.hold.poseFrame,
  };
  if (!sameStep(neutralPacket.returnsTo, neutralAnchor)
    || neutralPacket.returnsTo.packetId !== neutralPacket.id) {
    throw new Error("the neutral packet must return to its own hold frame");
  }
  neutralPacket.certification = undefined;

  for (const packet of byId.values()) {
    if (packet.status !== "eligible" || packet.id === neutralPacketId) continue;
    if (packet.path.entry.length < 1 || packet.path.release.length < 1) {
      throw new Error(`eligible non-neutral packet ${packet.id} requires entry and release frames`);
    }
    if (!sameStep(packet.path.entry[0], neutralAnchor)) {
      throw new Error(`eligible non-neutral packet ${packet.id} must enter from the official neutral anchor`);
    }
    if (!sameStep(packet.path.release.at(-1), neutralAnchor)) {
      throw new Error(`eligible non-neutral packet ${packet.id} must release to the official neutral anchor`);
    }
    if (packet.returnsTo.packetId !== neutralPacketId || !sameStep(packet.returnsTo, neutralAnchor)) {
      throw new Error(`eligible non-neutral packet ${packet.id} returnsTo must name the official neutral anchor`);
    }
    for (const source of packet.sources) {
      if (source.pose.recipe.drawings?.Mouth !== undefined) {
        throw new Error(
          `eligible body-language packet ${packet.id} cannot replay source-dialogue Mouth drawings from ${source.poseId}`,
        );
      }
    }
    packet.certification = await normalizeCertification(packet.certification, packet.id, root);
  }

  return {
    path: registryPath,
    sha256: await fileSha256(registryPath),
    schemaVersion: PACKET_SCHEMA,
    fps: 24,
    neutralPacketId,
    neutralPacket,
    policy,
    byId,
  };
}

function validatePerformancePlan(input, {
  packetRegistry,
  audioDurationSeconds,
  defaultBackgroundId = null,
}) {
  object(input, "performance input");
  exactKeys(
    input,
    ["schemaVersion", "title", "fps", "audioFile", "backgroundId", "durationFrames", "events"],
    "performance input",
  );
  if (input.schemaVersion !== PERFORMANCE_SCHEMA) {
    throw new Error(`unsupported performance input schema ${input.schemaVersion}`);
  }
  if (!packetRegistry?.byId || !(packetRegistry.byId instanceof Map)) {
    throw new Error("packetRegistry.byId must be a Map returned by loadMotionPacketRegistry");
  }
  if (input.fps !== 24 || packetRegistry.fps !== 24) {
    throw new Error("performance input and motion packets must use fixed 24fps timing");
  }
  const title = boundedString(input.title, 1, 120, "performance input.title");
  const audioFile = safeRelativePath(input.audioFile, "performance input.audioFile");
  const backgroundId = input.backgroundId ?? defaultBackgroundId;
  if (backgroundId !== null && !PACKET_ID.test(backgroundId)) {
    throw new Error("performance input.backgroundId must name a registered background");
  }
  if (!Number.isFinite(audioDurationSeconds) || audioDurationSeconds <= 0) {
    throw new Error("audioDurationSeconds must be measured from the staged audio file");
  }
  const expectedDurationFrames = Math.max(1, Math.round(audioDurationSeconds * 24));
  const durationFrames = integer(
    input.durationFrames,
    1,
    packetRegistry.policy.maximumPlanFrames,
    "performance input.durationFrames",
  );
  if (durationFrames !== expectedDurationFrames) {
    throw new Error(
      `performance input.durationFrames must be ${expectedDurationFrames}, derived from the measured audio duration`,
    );
  }
  if (!Array.isArray(input.events)) throw new Error("performance input.events must be an array");
  const eventLimit = Math.max(
    1,
    Math.ceil((audioDurationSeconds / 60) * packetRegistry.policy.maximumNonNeutralEventsPerMinute),
  );
  if (input.events.length > eventLimit) {
    throw new Error(`performance input schedules ${input.events.length} events; density limit is ${eventLimit}`);
  }

  let previousEndFrameExclusive = null;
  let coveredFrames = 0;
  const events = input.events.map((event, index) => {
    const context = `performance input.events[${index}]`;
    object(event, context);
    exactKeys(event, ["packetId", "startFrame", "holdFrames", "intent", "anchor", "rationale"], context);
    const packet = packetRegistry.byId.get(event.packetId);
    if (!packet) throw new Error(`${context} references unknown packet ${event.packetId}`);
    if (packet.status !== "eligible") {
      throw new Error(`${context} references ineligible packet ${event.packetId}: ${packet.ineligibleReason}`);
    }
    if (event.packetId === packetRegistry.neutralPacketId) {
      throw new Error(`${context} must not schedule neutral explicitly; neutral fills every unscheduled frame`);
    }
    const startFrame = integer(event.startFrame, 0, durationFrames - 1, `${context}.startFrame`);
    const holdFrames = integer(
      event.holdFrames,
      packet.path.hold.minimumFrames,
      packet.path.hold.maximumFrames,
      `${context}.holdFrames`,
    );
    const intent = boundedString(event.intent, 2, 80, `${context}.intent`);
    const rationale = boundedString(event.rationale, 8, 240, `${context}.rationale`);
    object(event.anchor, `${context}.anchor`);
    exactKeys(event.anchor, ["kind", "label", "frame"], `${context}.anchor`);
    if (!ANCHOR_KINDS.has(event.anchor.kind)) {
      throw new Error(`${context}.anchor.kind must be phrase, beat, or pause`);
    }
    const anchorLabel = boundedString(event.anchor.label, 1, 120, `${context}.anchor.label`);
    const anchorFrame = integer(event.anchor.frame, 0, durationFrames - 1, `${context}.anchor.frame`);
    const holdStartFrame = startFrame + packet.path.entry.length;
    if (anchorFrame !== holdStartFrame) {
      throw new Error(`${context}.anchor.frame must equal the packet apex frame ${holdStartFrame}`);
    }
    const outputFrames = packet.path.entry.length + holdFrames + packet.path.release.length;
    const endFrameExclusive = startFrame + outputFrames;
    if (endFrameExclusive > durationFrames) {
      throw new Error(`${context} ends at frame ${endFrameExclusive}, outside audio frame ${durationFrames}`);
    }
    if (previousEndFrameExclusive !== null) {
      const cooldownFrames = startFrame - previousEndFrameExclusive;
      if (cooldownFrames < packetRegistry.policy.minimumCooldownFrames) {
        throw new Error(
          `${context} leaves ${cooldownFrames} cooldown frames; minimum is ${packetRegistry.policy.minimumCooldownFrames}`,
        );
      }
    }
    previousEndFrameExclusive = endFrameExclusive;
    coveredFrames += outputFrames;
    return {
      index,
      packetId: packet.id,
      packet,
      startFrame,
      holdStartFrame,
      holdFrames,
      endFrameExclusive,
      outputFrames,
      intent,
      anchor: { kind: event.anchor.kind, label: anchorLabel, frame: anchorFrame },
      rationale,
    };
  });
  const coverageRatio = coveredFrames / durationFrames;
  if (coverageRatio > packetRegistry.policy.maximumNonNeutralCoverageRatio) {
    throw new Error(
      `non-neutral motion covers ${coverageRatio.toFixed(3)} of the audio; maximum is ${packetRegistry.policy.maximumNonNeutralCoverageRatio}`,
    );
  }
  return {
    schemaVersion: PERFORMANCE_SCHEMA,
    title,
    fps: 24,
    audioFile,
    backgroundId,
    audioDurationSeconds,
    durationFrames,
    durationSeconds: durationFrames / 24,
    neutralPacketId: packetRegistry.neutralPacketId,
    events,
    coveredFrames,
    coverageRatio,
    maximumEventCount: eventLimit,
  };
}

export {
  PACKET_SCHEMA,
  PERFORMANCE_SCHEMA,
  loadMotionPacketRegistry,
  validatePerformancePlan,
};
