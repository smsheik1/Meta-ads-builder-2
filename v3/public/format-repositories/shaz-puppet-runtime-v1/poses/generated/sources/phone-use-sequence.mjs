#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { writePoseRecipe } from "../../../runtime/pose-authoring.mjs";
import { loadManifest } from "../../../runtime/rig-v2-renderer.mjs";

const PHONE_PATH = fileURLToPath(new URL("../look-at-phone.json", import.meta.url));
const PHONE_SHA256 = "88f259a2de0bd64dbfc2f805f60b00c3745ce6783ec570a685ab958b8e39375e";

async function loadLockedPhone() {
  const bytes = await fs.readFile(PHONE_PATH);
  const actual = crypto.createHash("sha256").update(bytes).digest("hex");
  if (actual !== PHONE_SHA256) {
    throw new Error(`locked recipe changed: look-at-phone.json ${actual}`);
  }
  return JSON.parse(bytes.toString("utf8"));
}

async function buildPhoneUseSequence(manifest) {
  const phone = await loadLockedPhone();
  if (phone.sourceXstageSha256 !== manifest.source.sha256) {
    throw new Error("look-at-phone recipe targets a different Shaz rig");
  }
  return {
    ...phone,
    id: "phone-use-sequence",
    authorship: {
      ...phone.authorship,
      learnedFrom: [
        ...phone.authorship.learnedFrom,
        "removed the detached screen-space tap hand; the phone action keeps the authored overlay hand and its native sleeve registration",
      ],
    },
    quality: {
      ...phone.quality,
      armCompositeMode: "native-rig",
    },
  };
}

async function main() {
  const [manifestPath, outputPath] = process.argv.slice(2);
  if (!manifestPath || !outputPath) {
    throw new Error("usage: phone-use-sequence.mjs runtime.json output-recipe.json");
  }
  const manifest = await loadManifest(path.resolve(manifestPath));
  process.stdout.write(`${await writePoseRecipe(outputPath, await buildPhoneUseSequence(manifest))}\n`);
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

export { buildPhoneUseSequence };
