import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { include } from "../build-kit.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("the package exposes one honest reference-to-packet promotion path", async () => {
  const [promotion, readme, skill, poseReadme, candidateReadme, candidate11Evidence] = await Promise.all([
    fs.readFile(path.join(root, "POSE-PROMOTION.md"), "utf8"),
    fs.readFile(path.join(root, "README.md"), "utf8"),
    fs.readFile(path.join(root, "SKILL.md"), "utf8"),
    fs.readFile(path.join(root, "poses", "README.md"), "utf8"),
    fs.readFile(path.join(root, "poses", "candidates", "README.md"), "utf8"),
    fs.readFile(path.join(root, "evidence", "candidate-11-present-screen-right-pose-first.md"), "utf8"),
  ]);

  assert.match(promotion, /Sequence-ready/);
  assert.match(promotion, /Packet-ready/);
  assert.match(promotion, /An action can be sequence-ready without being packet-ready/);
  assert.match(promotion, /registered means runnable/i);
  assert.match(promotion, /Do not reverse-scrub entry frames and call that a release/);
  assert.match(promotion, /Do not claim that the user watched something while they were away/);
  assert.match(promotion, /Pose-first is an authoring order, not permission to stop at a still/);
  assert.match(promotion, /one-frame destination study cannot use the canonical full-action ID/);
  assert.match(promotion, /cannot satisfy full-action inspection, review, or registration/);
  assert.match(promotion, /authentic non-neutral source entry belongs to the action/);
  assert.match(promotion, /Neutral boundary connectors are separate packet-readiness work/);
  assert.match(promotion, /If the frozen reference shows no release[\s\S]*do not invent one/);
  assert.match(promotion, /fit shoulder, elbow, wrist, palm centroid, palm angle, and torso line independently/);
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
    "blocked",
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

  assert.match(promotion, /03[\s\S]*Review proposed reuse of `confident`[\s\S]*reference-only/);
  assert.match(promotion, /04[\s\S]*Review built rig-native candidate[\s\S]*recipe-candidate/);
  assert.match(promotion, /poses\/candidates\/open-wide\.json/);
  assert.match(promotion, /05[\s\S]*Review `shrug`[\s\S]*registered-needs-review/);
  assert.match(promotion, /06[\s\S]*Review built directional candidate[\s\S]*recipe-candidate/);
  assert.match(promotion, /poses\/candidates\/present-screen-left\.json/);
  assert.match(promotion, /07[\s\S]*Review `key-point`[\s\S]*registered-needs-review/);
  assert.match(promotion, /08[\s\S]*Promote built hold-only native candidate[\s\S]*recipe-candidate/);
  assert.match(promotion, /poses\/candidates\/heartfelt-chest-clasp-hold\.json/);
  assert.match(promotion, /09[\s\S]*Promote recovered recipe[\s\S]*recipe-candidate/);
  assert.match(promotion, /poses\/candidates\/low-side-present\.json[\s\S]*fresh full inspection pass/);
  assert.match(promotion, /10[\s\S]*Big emphasis[\s\S]*The rejected `excited-celebration` is not a substitute/);
  assert.match(promotion, /11[\s\S]*Review built full observed native-rig action[\s\S]*recipe-candidate/);
  assert.match(promotion, /poses\/candidates\/present-screen-right\.json/);
  assert.match(promotion, /all 104 source frames as 83 runtime frames/);
  assert.match(promotion, /authentic cross-chest, nose-touch, and cheek-palm entry/);
  assert.match(promotion, /five-step counter-shift/);
  assert.match(promotion, /reference has no release[\s\S]*does not invent one/);
  assert.match(promotion, /present-screen-right-destination-study\.json[\s\S]*calibration evidence, not the action/);
  assert.match(promotion, /full-action normal-speed review is still pending/);
  assert.match(promotion, /candidate-11-present-screen-right-target\.json/);

  for (const candidateRecipe of [
    "hand-to-chest-self.json",
    "open-wide.json",
    "present-screen-left.json",
    "heartfelt-chest-clasp-hold.json",
    "low-side-present.json",
    "big-emphasis.json",
    "present-screen-right.json",
    "present-screen-right-destination-study.json",
  ]) {
    assert.ok(candidateReadme.includes(`\`${candidateRecipe}\``), `missing candidate recipe ${candidateRecipe}`);
    const recipe = JSON.parse(await fs.readFile(path.join(root, "poses", "candidates", candidateRecipe), "utf8"));
    assert.equal(recipe.promotion, undefined, `${candidateRecipe} must not embed mutable lifecycle state`);
  }

  assert.match(candidateReadme, /Current lifecycle status and the next required gate live only in `\.\.\/\.\.\/POSE-PROMOTION\.md`/);
  assert.doesNotMatch(candidateReadme, /\| Status \|/);
  assert.match(candidateReadme, /11 — Present screen-right, full observed action/);
  assert.match(candidateReadme, /fe832541207b3c08d8a069fddc1889d011e68c780ea93ff579990e032971f09a/);
  assert.match(candidateReadme, /2fb52af797096a93f19d243f6a2541e37c9e4f5064a59a6d0098e59b9f0b702f/);
  assert.match(candidateReadme, /11 study — Present screen-right destination/);
  assert.match(candidateReadme, /b7455539f5bc806ae00ceb76f25cfefb4f914ba7ca9ccfb388cea774c14d4a51/);
  assert.match(candidateReadme, /c1ff392cb97b697588aa2cd5652e506e64622fda8b3aad297856c6358d1552e6/);

  assert.match(candidate11Evidence, /all 104 source frames at 30 fps with 83 runtime frames at 24 fps/);
  assert.match(candidate11Evidence, /Five-step counter-shift[\s\S]*61–70[\s\S]*50–57/);
  assert.match(candidate11Evidence, /passed 83\/83 with zero failures/);
  assert.match(candidate11Evidence, /cross-chest palm is within 0\.39 px/);
  assert.match(candidate11Evidence, /omitted instead of being passed with loose tolerances/);
  assert.match(candidate11Evidence, /complete normal-speed creative review pending/);
  assert.match(candidate11Evidence, /unregistered, unapproved, absent from the safe sequence list, and not packet-ready/);

  assert.match(readme, /Start with `POSE-PROMOTION\.md`/);
  assert.match(skill, /Read `POSE-PROMOTION\.md`/);
  assert.match(skill, /segment every edit, counter-shift, and distinct hold/);
  assert.match(skill, /Build the destination first as a one-frame body-only native-rig hold/);
  assert.match(skill, /Pose-first is the authoring order, not permission to stop at a still/);
  assert.match(skill, /reconstruct every observed phase/);
  assert.match(skill, /authentic non-neutral entry/);
  assert.match(skill, /Neutral boundary connectors are separate packet-readiness work/);
  assert.match(skill, /reference has no release; do not invent one/);
  assert.match(poseReadme, /Read the lifecycle in `\.\.\/POSE-PROMOTION\.md`/);
  assert.match(poseReadme, /Build that destination as a one-frame, body-only candidate/);
  assert.match(poseReadme, /Pose-first is the authoring order, not permission to stop at a still/);
  assert.match(poseReadme, /A one-frame study cannot satisfy full-action inspection, review, or registration/);
  assert.match(poseReadme, /authentic non-neutral entry belongs to the action/);
  assert.match(poseReadme, /Neutral boundary connectors are separate packet-readiness work/);
  assert.equal(include(path.join(root, "POSE-PROMOTION.md")), true);
});
