# Candidate 08 — Heartfelt chest-clasp hold

Status: **`recipe-candidate`**. Mechanically clean. Exact-output creative review is pending. This recipe is not registered, safe-listed, sequence-approved, or packet-eligible.

## Frozen reference and honest scope

- Source: `0826.mov`
- Source SHA-256: `237715f71eed5bb9fc561d8c1766448ec61ff727671ada4324d8dc1ae77f8127`
- Isolated range: 01:08.200–01:11.600 at 30 fps
- Isolated clip: `08-heartfelt.mp4`, 102 frames / 3.400 seconds
- Clip SHA-256: `20056ed75665b64ef628bff8522f3fe17d3e1b2d6a4b03fa884881bf4dc6506d`
- Runtime use of artist-rendered pixels: false

All 102 source frames were inspected. Local frames 1–7 inherit the preceding presentation and face-touch beat. Frame 8 reaches the bilateral chest contact, which remains readable through frame 96. Frames 97–102 are a hard edit to a neutral pose on a different background. The selected runtime action is therefore named for the **chest-clasp hold**, not a complete entry/hold/release action.

The action means warm sincerity, gratitude, or emotionally invested emphasis. Both elbows stay open while two native hands overlap at the upper chest. It is not Candidate 02's one-hand self-reference, and no existing reviewed action was relabeled to obtain it.

Reject for a single-hand chest touch, face-touch mechanics, disconnected cuffs, oversized hands, hidden hand roles, wrong crossover order, baked mouth or blink acting, a fabricated release, or a claim of packet readiness.

## Native rig construction

The full recovered 350-frame Xstage range and the current authored/candidate vocabulary were inspected before authoring. No existing action supplied the same two-hand clasp. The selected construction uses only recovered native controls and drawings:

- deformation source frame 95;
- bilateral native sleeve, cuff, forearm, and hand chains;
- left/right forearm-pivot deltas of +210° / -210°;
- native `Left_Hand` drawing `2`, scaled to 72% at its authored wrist pivot;
- native `Right_Hand` drawing `9` above it;
- declared `both-front-left-under-right` native crossover order; and
- slight root/head drift for a living hold, with mouth, eyes, blinks, camera, and background isolated from the body recipe.

There is no replacement arm art, prop, flattened character sprite, alternate renderer, provider call, or API key.

## Three bounded attempts

| Attempt | Result | Exact evidence |
| --- | --- | --- |
| 1 | Rejected mechanically. The unscaled lower hand failed both fixed limb-proportion checks on all 48 frames: 96 failures total. No threshold changed. | Semantic recipe SHA `993d10d60424218cb49f0ca6c11c9d135b0224e54f46324bcb1716d38b87b60c`; inspection SHA `0fb49e6f89403061db3fc834e8df42f8df40f74c759700e7c27ab7d8b84d1404`. |
| 2 | Passed all mechanical gates after the lower hand was scaled at its native wrist pivot. Preserved as engineering history rather than the final recipe because it still contained a diagnostic blink that belongs on the facial track. | Semantic recipe SHA `f84714a5b3c74e76e2c52c0471a21b5d2f8975cb5764dd5449f38d711696b571`; output SHA `9955524c9c7c158ef7f14da5f3bdcd43866dcf4fcddf2b288dd4c8fd4a7892cc`; inspection SHA `e946febefb1d520c6bb2a87159726096b9f6fd0ea3508da98a9438260e2bb1d0`. |
| 3 | Selected unapproved review candidate. It preserves Attempt 2's native body mechanics, removes the blink, keeps immutable provenance in the recipe, and keeps mutable promotion lifecycle state outside the recipe checksum domain. All frames pass. | Recipe file SHA `2e83aad0b5cef792d0d6ad2e3101c19591677392d58c385c5f5a961ffd09a8fa`; semantic recipe SHA `3cc65e5a1a59cdb0ec725b5d9e97ca1ba863a49e83a1280e2e9b614f16a670b7`. |

The three-attempt ceiling is exhausted. Removing lifecycle fields corrected the checksum domain without changing a control, drawing, deformation frame, or rendered-motion decision; it is not a fourth creative attempt. The superseded lifecycle-coupled bytes remain in the persistent pack as history.

## Selected exact output

- Recipe: `poses/candidates/heartfelt-chest-clasp-hold.json`
- Generator: `poses/candidates/sources/heartfelt-chest-clasp-hold.mjs`
- Recipe file SHA-256: `2e83aad0b5cef792d0d6ad2e3101c19591677392d58c385c5f5a961ffd09a8fa`
- Semantic recipe SHA-256: `3cc65e5a1a59cdb0ec725b5d9e97ca1ba863a49e83a1280e2e9b614f16a670b7`
- Source Xstage SHA-256: `507e8b0fa7b95d36b9429671b6b6a9ffa3dd77f5c559b84eb2b49add04512fca`
- Official-render output: 48 frames, 24 fps, 2.000 seconds, 1280×720, H.264
- Output SHA-256: `772b69e15bace7255ca32a296493a65b62a753498f7418fd630d0e45df1cd021`
- Inspection receipt SHA-256: `0b09c5ad37a237b106b32137c30be0f2b5456cf079636cd9f1713a48323cb3df`
- Inspection: `pass`; 48/48 frames, 17 unchanged gates, zero failures, maximum identical-frame run 1, maximum observed native sleeve crossover 148 pixels
- Canonical full-range render receipt SHA-256: `b044ecf2e616d8b3d8e3c50d7e2100536185f2a45e5174c4f6fcc1e4482f7022`

All 48 frames were freshly rendered in one range by `runtime/render-xstage-range.mjs`, which calls the one official `runtime/rig-v2-renderer.mjs#renderRigFrame`. The canonical receipt binds the new immutable semantic recipe checksum and records all 48 per-frame renderer receipts.

## Persistent unapproved audition bundle

The review pack is under `heartfelt-08-rig-native-review-candidate/` in the shared persistent visualization workspace.

- exact frozen source: `reference/08-heartfelt-exact.mp4`
- exact selected runtime output: `candidate/heartfelt-chest-clasp-hold.mp4`
- three-pass normal-speed comparison: `candidate/side-by-side-normal-speed-three-passes.mp4`, SHA-256 `751244551d5cf00969e80784f20063a1ad8fbe3eb4e5eba710b518667058cb1e`
- single-pass normal-speed comparison: `candidate/side-by-side-normal-speed.mp4`, SHA-256 `c38bdc98199595e4f83305e1d1654e6f12dc50ff8e4df721f31969e57b452efa`
- dense boundary sheet: `candidate/dense-boundary-sheet.jpg`, SHA-256 `ba95ce7010a3c592ca257f61cd63eb9e58fc8dc77f26dedfed23066a201438ba`
- complete candidate contact sheets: `candidate/contact-01-24.jpg` and `candidate/contact-25-48.jpg`
- complete source contact sheets: five images under `reference/`
- inspector, immutable recipe, canonical full-range render receipt, pending lifecycle manifest/review receipt, and rejected/superseded history

The comparison places source on the left and runtime on the right. It uses source-local frames 8–67 and all 48 runtime frames for two synchronized seconds at normal speed; the 30 fps source is temporally sampled at 24 fps without retiming, and source audio is preserved.

## Remaining blocker

A person must watch the exact moving output at normal speed and return an exact-output review decision. Until then the status stays `recipe-candidate`. Even if the hold later becomes sequence-approved, packet promotion remains blocked: the checked-in recipe has no authored entry or release, and the frozen source ends with a hard edit rather than a reusable release boundary.
