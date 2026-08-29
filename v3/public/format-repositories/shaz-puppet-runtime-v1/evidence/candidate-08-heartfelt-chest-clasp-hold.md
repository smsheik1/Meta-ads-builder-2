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
| 3 | Selected unapproved review candidate. It preserves Attempt 2's native body mechanics, removes the blink, freezes provenance/promotion metadata, and passes every frame. | Recipe file SHA `41b5e2befdfd4c6ac47430503cc502cc9bf0c340edfddbc41d06fa1e283bbb8a`; semantic recipe SHA `0291e18c3e7a848c0a5f6b8c432a470c7319f627451032958a289192d39d8dce`. |

The three-attempt ceiling is exhausted. No fourth recipe was made.

## Selected exact output

- Recipe: `poses/candidates/heartfelt-chest-clasp-hold.json`
- Generator: `poses/candidates/sources/heartfelt-chest-clasp-hold.mjs`
- Recipe file SHA-256: `41b5e2befdfd4c6ac47430503cc502cc9bf0c340edfddbc41d06fa1e283bbb8a`
- Semantic recipe SHA-256: `0291e18c3e7a848c0a5f6b8c432a470c7319f627451032958a289192d39d8dce`
- Source Xstage SHA-256: `507e8b0fa7b95d36b9429671b6b6a9ffa3dd77f5c559b84eb2b49add04512fca`
- Official-render output: 48 frames, 24 fps, 2.000 seconds, 1280×720, H.264
- Output SHA-256: `f168e6f6a2907bdd980ea1e5b8fd33e0632fd914eb253a4b84a16e7676894136`
- Inspection receipt SHA-256: `4956ab07a1695e30de31ba0566e869cc2717a0cecfe962032fd42376fec3a51e`
- Inspection: `pass`; 48/48 frames, 17 unchanged gates, zero failures, maximum identical-frame run 1, maximum observed native sleeve crossover 148 pixels
- Segmented render provenance SHA-256: `d96b15a608629ef7e147bfb206b1593fdd37becbeaad10fe6cfd098a42a27ec7`

The authoring volume could hold only one renderer scratch PNG at a time. Each of the 48 frames was therefore rendered independently by `runtime/render-xstage-range.mjs`, which calls the one official `runtime/rig-v2-renderer.mjs#renderRigFrame`, and retained its official receipt. The frame clips were assembled by FFmpeg stream copy; the ordered raw receipt aggregate SHA-256 is `df764bc167691d609e1e276bf84a60f166c6c673ee40cc15b9d45b1e0e48029c`.

## Persistent unapproved audition bundle

The review pack is under `heartfelt-08-rig-native-review-candidate/` in the shared persistent visualization workspace.

- exact frozen source: `reference/08-heartfelt-exact.mp4`
- exact selected runtime output: `candidate/heartfelt-chest-clasp-hold.mp4`
- normal-speed comparison: `candidate/side-by-side-normal-speed.mp4`, SHA-256 `8366b7797401817b8a174ec36aa3cfebf687b1e1f6ba7279c5e1c13fa0c02fec`
- dense boundary sheet: `candidate/dense-boundary-sheet.jpg`, SHA-256 `4e0d5802e8b5d28ec77b74d4984a6107f5f92e5d81e5d2449d397052afc9d284`
- complete candidate contact sheets: `candidate/contact-01-24.jpg` and `candidate/contact-25-48.jpg`
- complete source contact sheets: five images under `reference/`
- inspector, recipe, render provenance, all 48 official frame receipts, and rejected-attempt history

The comparison places source on the left and runtime on the right. It uses source-local frames 8–67 and all 48 runtime frames for two synchronized seconds at normal speed; the 30 fps source is temporally sampled at 24 fps without retiming, and source audio is preserved.

## Remaining blocker

A person must watch the exact moving output at normal speed and return an exact-output review decision. Until then the status stays `recipe-candidate`. Even if the hold later becomes sequence-approved, packet promotion remains blocked: the checked-in recipe has no authored entry or release, and the frozen source ends with a hard edit rather than a reusable release boundary.
