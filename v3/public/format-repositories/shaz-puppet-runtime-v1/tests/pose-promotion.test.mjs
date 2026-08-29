import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { include } from "../build-kit.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("the package exposes one honest reference-to-packet promotion path", async () => {
  const [promotion, readme, skill, poseReadme] = await Promise.all([
    fs.readFile(path.join(root, "POSE-PROMOTION.md"), "utf8"),
    fs.readFile(path.join(root, "README.md"), "utf8"),
    fs.readFile(path.join(root, "SKILL.md"), "utf8"),
    fs.readFile(path.join(root, "poses", "README.md"), "utf8"),
  ]);

  assert.match(promotion, /Sequence-ready/);
  assert.match(promotion, /Packet-ready/);
  assert.match(promotion, /An action can be sequence-ready without being packet-ready/);
  assert.match(promotion, /registered means runnable/i);
  assert.match(promotion, /Do not reverse-scrub entry frames and call that a release/);
  assert.match(promotion, /Do not claim that the user watched something while they were away/);
  assert.match(promotion, /two materially different unseen audio inputs/);
  assert.match(promotion, /Listing them here does not approve them/);
  assert.match(promotion, /237715f71eed5bb9fc561d8c1766448ec61ff727671ada4324d8dc1ae77f8127/);
  assert.match(promotion, /3840×2160, 30 fps, 125\.500 seconds/);

  for (const status of [
    "reference-only",
    "mapped-to-reviewed-action",
    "recipe-candidate",
    "registered-needs-review",
    "sequence-approved",
    "packet-candidate",
    "packet-approved",
    "rejected",
    "superseded",
  ]) {
    assert.ok(promotion.includes(`\`${status}\``), `missing promotion status ${status}`);
  }

  for (const candidate of ["02", "03", "04", "05", "06", "07", "08", "09", "10", "11"]) {
    assert.match(promotion, new RegExp(`\\| ${candidate} \\|`), `missing candidate ${candidate}`);
  }

  for (const clipSha256 of [
    "b1ba1e99f92915cf7f75b34c3a8288b5a15387e249212b3abfde0df3634aacfc",
    "908bffe828746a6c70556fb01b929a62abbf95e4ecd70b979527b903f3ee4d65",
    "a67b799cc733ea2f8296f5f388bf064bac5c2e38e352b37c85215b7b1dce5592",
    "53086909ab216b61f689a2bb92e6bc7e4d485a30a171c1e3c6a50118288e6ffa",
    "f48bb751f215006cfcde078efd5a179715a849bca5d8145eb157ee3d30ff60a9",
    "7a2252a104d395f1cfc48ef8849a11e1df73264dccb74c97c4c8256df7993582",
    "20056ed75665b64ef628bff8522f3fe17d3e1b2d6a4b03fa884881bf4dc6506d",
    "4e0552b1ea4b4f30228522f0a5bdd2dfedc2d38f132926143ba27b6d0aeccfae",
    "07972d6a4143d576fa6f2f37fa279efa357deba03cfb9e2c00988ecfaad29b41",
    "dc531adc7c95039cf21339427d3b6b1a42109555cac6bb51b65e5a19ae4bf3e1",
  ]) {
    assert.ok(promotion.includes(clipSha256), `missing reference clip SHA ${clipSha256}`);
  }

  assert.match(promotion, /03[\s\S]*Reuse `confident`[\s\S]*mapped-to-reviewed-action/);
  assert.match(promotion, /05[\s\S]*Review `shrug`[\s\S]*registered-needs-review/);
  assert.match(promotion, /07[\s\S]*Review `key-point`[\s\S]*registered-needs-review/);
  assert.match(promotion, /09[\s\S]*Promote existing engineering candidate[\s\S]*recipe-candidate/);
  assert.match(promotion, /10[\s\S]*Big emphasis[\s\S]*The rejected `excited-celebration` is not a substitute/);

  assert.match(readme, /Start with `POSE-PROMOTION\.md`/);
  assert.match(skill, /Read `POSE-PROMOTION\.md`/);
  assert.match(poseReadme, /Read the lifecycle in `\.\.\/POSE-PROMOTION\.md`/);
  assert.equal(include(path.join(root, "POSE-PROMOTION.md")), true);
});
