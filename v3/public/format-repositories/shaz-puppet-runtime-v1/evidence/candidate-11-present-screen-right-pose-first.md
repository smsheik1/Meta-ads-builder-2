# Candidate 11: full Present screen-right action

Status: mechanically clean `recipe-candidate`; complete normal-speed creative review pending. It is unregistered, unapproved, absent from the safe sequence list, and not packet-ready.

## Why the destination study was not the action

The first correction replaced a Shrug-derived approximation with a measured one-frame destination. That was useful calibration, but it still reduced a 104-frame artist action to a still. The source does more: Shaz begins cross-chest, touches his nose, opens his palm beside his cheek, settles into Hold A, moves through a stepped counter-shift, and ends in Hold B. His arm is moving through the action. The source then cuts without a release.

The destination fit now has the honest study-specific ID `present-screen-right-destination-study`. It remains useful as the exact Hold B calibration target, but it cannot stand in for the canonical action or satisfy full-action review.

## Complete reconstruction

The canonical `present-screen-right` recipe covers all 104 source frames at 30 fps with 83 runtime frames at 24 fps:

| Phase | Source frames | Runtime frames |
| --- | --- | --- |
| Cross-chest entry | 0 | 1 |
| Nose touch | 1–3 | 2–3 |
| Cheek-palm entry | 4–5 | 4–5 |
| Hold A | 6–60 | 6–49 |
| Five-step counter-shift | 61–70 | 50–57 |
| Hold B | 71–103 | 58–83 |

The entry uses native right-arm controls and registered native hand/forearm drawings rather than a borrowed Shrug rise. Its visible landmarks are tightly fitted: the cross-chest palm is within 0.39 px, its sleeve within 0.12 px, and the nose-touch palm within 0.27 px after normalization. Occluded or synthetic “wrist” and torso proxies are omitted instead of being passed with loose tolerances, and the focused test caps every retained entry tolerance. Hold A, the five observed counter positions, and Hold B are authored as stepped rig states. Body and head controls reproduce the observed counter-shift without a hidden whole-character stage jump. The runtime face stays neutral because this candidate owns body language only.

The source requires the right arm to pass in front of the head during the opening. The recipe therefore opts into the narrow native `right-front-of-head` paint order; it does not use an artist frame, sprite, prop, or second renderer. The source contains no release, so the recipe ends on Hold B without inventing one. Neutral entry and release connectors remain separate future packet-readiness work.

Reference normalization remains reproducible: resize the 3840×2160 source to 1280×720, apply the locked uniform head-width scale `137/181`, then translate the scaled artist face centroid onto the runtime face centroid. `candidate-11-present-screen-right-target.json` records the source and normalized geometry for the authentic entry, both holds, all five counter positions, and the Hold B gold frame. The focused regression checks those phase targets independently.

## Exact repository artifacts

- Canonical recipe: `poses/candidates/present-screen-right.json`
  - file SHA-256: `fe832541207b3c08d8a069fddc1889d011e68c780ea93ff579990e032971f09a`
  - semantic recipe SHA-256: `2fb52af797096a93f19d243f6a2541e37c9e4f5064a59a6d0098e59b9f0b702f`
- Generator: `poses/candidates/sources/directional-presents.mjs`
  - SHA-256: `ecedb20a0f504f116562350f03e797e0d16ec6691f12f54d447481c5781f3942`
- Geometry contract: `evidence/candidate-11-present-screen-right-target.json`
  - SHA-256: `6289e74a5ef67bd1565e8a490e5b01d342e579904fd81a35af639e82c3427c4e`
- Separate destination study: `poses/candidates/present-screen-right-destination-study.json`
  - file SHA-256: `b7455539f5bc806ae00ceb76f25cfefb4f914ba7ca9ccfb388cea774c14d4a51`
  - semantic recipe SHA-256: `c1ff392cb97b697588aa2cd5652e506e64622fda8b3aad297856c6358d1552e6`

The official runtime inspected all 83 canonical action frames and passed 83/83 with zero failures. The official render contains 83 frames at 24 fps, uses no artist-rendered frames, and is bound to the semantic recipe hash above.

## Pending normal-speed review

The external review bundle is named
`shaz-primary-11-present-screen-right-v3-full-action`; it is intentionally not
included in the downloadable Format kit.

Its exact primary artifacts are:

- `reference.mp4` — 104 frames at 30 fps, SHA-256 `dc531adc7c95039cf21339427d3b6b1a42109555cac6bb51b65e5a19ae4bf3e1`
- `runtime.mp4` — 83 frames at 24 fps, SHA-256 `add608472d4577ce455dae53658f294b5df5a8b4a2be83e2aede5615ece6b464`
- `source-vs-runtime-1x.mp4` — one complete normal-speed pass, SHA-256 `1bb26525cc007eb82e19059ea9014b63dbaa11f007cc599f8510f389685e3741`
- `source-vs-runtime-1x-three-passes.mp4` — the primary complete normal-speed review video, SHA-256 `eca15d090f6cb2a5a331e1c5ba9085cc002ad3c5bf2d848f86663831c98936e0`
- `dense-phase-sheet.jpg` — phase navigation only, SHA-256 `fb205abf1d8312a6a5f3cf7e461147f813dea94094a5619d804fe2cf7b244955`
- `inspection.json` — official 83-frame pass, SHA-256 `e88e300be12d72a7c061b5c6d28dcc2e81004787c2f3059b250de81cedc0b534`
- `render-receipt.json` — exact official render receipt, SHA-256 `854adeb5217e4c29d104d22798003ca0373b25946125f44b2e5f0dad6e04d9f4`
- `manifest.json` — review-bundle manifest, SHA-256 `d35b37963cb064c01890406528c60081b1fa86e2560c172022f8c3bf05bcf571`

`human-review.json` is still `pending`: no reviewer, no complete creative-review pass, and no approval decision have been recorded. Mechanical inspection and browser playback QA do not change that status. Until the full normal-speed action is explicitly reviewed, do not register it, add it to the safe list, or create an eligible motion packet from it.
