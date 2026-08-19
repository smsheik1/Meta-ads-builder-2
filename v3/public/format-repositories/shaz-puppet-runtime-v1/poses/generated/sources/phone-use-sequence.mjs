#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { writePoseRecipe } from "../../../runtime/pose-authoring.mjs";
import { loadManifest } from "../../../runtime/rig-v2-renderer.mjs";

const PHONE_PATH = fileURLToPath(new URL("../look-at-phone.json", import.meta.url));
const PHONE_SHA256 = "5610a09d190d234e5b6d5f1bccf17e491088608eda0d1d9cdb4864808190cd08";

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
        "removed the detached four-part pickup bridge; the registered phone action now begins directly with its intact native sleeve topology",
      ],
    },
    quality: {
      ...phone.quality,
      armCompositeMode: "registered-phone-interaction",
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
